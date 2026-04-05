package projection

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"cerulia/internal/core/character"
	"cerulia/internal/core/model"
	shareddomain "cerulia/internal/core/sharing"
	"cerulia/internal/store"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
)

func decodeStable[T any](ctx context.Context, reader store.Reader, ref string) (store.StableRecord, T, error) {
	if _, err := store.ParseRef(ref); err != nil {
		var zero T
		return store.StableRecord{}, zero, ErrInvalidInput
	}
	record, err := reader.GetStable(ctx, ref)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	value, err := model.UnmarshalStable[T](record)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	return record, value, nil
}

func decodeAppend[T any](ctx context.Context, reader store.Reader, ref string) (store.AppendRecord, T, error) {
	if _, err := store.ParseRef(ref); err != nil {
		var zero T
		return store.AppendRecord{}, zero, ErrInvalidInput
	}
	record, err := reader.GetAppend(ctx, ref)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	value, err := model.UnmarshalAppend[T](record)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	return record, value, nil
}

func (service *Service) branchesByOwner(ctx context.Context, ownerDid string) ([]BranchSummary, map[string]model.CharacterBranch, error) {
	records, err := service.reader.ListStableByCollection(ctx, model.CollectionCharacterBranch)
	if err != nil {
		return nil, nil, err
	}
	latestEpisodes, err := service.latestEpisodeByBranch(ctx)
	if err != nil {
		return nil, nil, err
	}
	currentBranchPublications, err := service.currentPublicationRefBySubject(ctx, "character-branch")
	if err != nil {
		return nil, nil, err
	}
	items := make([]branchRecord, 0)
	models := map[string]model.CharacterBranch{}
	for _, record := range records {
		value, err := model.UnmarshalStable[model.CharacterBranch](record)
		if err != nil {
			return nil, nil, err
		}
		if ownerDid != "" && value.OwnerDid != ownerDid {
			continue
		}
		items = append(items, branchRecord{Ref: record.Ref, Record: value})
		models[record.Ref] = value
	}
	sort.Slice(items, func(left int, right int) bool {
		leftRecord := items[left].Record
		rightRecord := items[right].Record
		if leftRecord.CreatedAt.Equal(rightRecord.CreatedAt) {
			return items[left].Ref < items[right].Ref
		}
		return leftRecord.CreatedAt.After(rightRecord.CreatedAt)
	})
	summaries := make([]BranchSummary, 0, len(items))
	campaignTitles := map[string]string{}
	for _, item := range items {
		summary, err := service.branchSummaryForModel(
			ctx,
			item.Ref,
			item.Record,
			latestEpisodes,
			currentBranchPublications,
			campaignTitles,
			true,
		)
		if err != nil {
			return nil, nil, err
		}
		summaries = append(summaries, summary)
	}
	return summaries, models, nil
}

func (service *Service) currentEpisodes(ctx context.Context) ([]EpisodeSummary, error) {
	records, err := service.reader.ListAppendByCollection(ctx, model.CollectionCharacterEpisode)
	if err != nil {
		return nil, err
	}
	current := currentSupersededRecords[model.CharacterEpisode](records, func(value model.CharacterEpisode) string { return value.SupersedesRef })
	items := make([]EpisodeSummary, 0, len(current))
	for _, item := range current {
		items = append(items, EpisodeSummary{
			CharacterEpisodeRef: item.Ref,
			CharacterBranchRef:  item.Value.CharacterBranchRef,
			CampaignRef:         item.Value.CampaignRef,
			ScenarioLabel:       item.Value.ScenarioLabel,
			OutcomeSummary:      item.Value.OutcomeSummary,
			CreatedAt:           item.Value.CreatedAt,
		})
	}
	return items, nil
}

func (service *Service) currentConversions(ctx context.Context) ([]ConversionSummary, error) {
	records, err := service.reader.ListAppendByCollection(ctx, model.CollectionCharacterConversion)
	if err != nil {
		return nil, err
	}
	current := currentSupersededRecords[model.CharacterConversion](records, func(value model.CharacterConversion) string { return value.SupersedesRef })
	items := make([]ConversionSummary, 0, len(current))
	for _, item := range current {
		authorityKind, err := service.conversionAuthorityKind(ctx, item.Value)
		if err != nil {
			return nil, err
		}
		items = append(items, ConversionSummary{
			CharacterConversionRef:   item.Ref,
			SourceSheetRef:           item.Value.SourceSheetRef,
			SourceSheetVersion:       item.Value.SourceSheetVersion,
			SourceBranchRef:          item.Value.SourceBranchRef,
			TargetSheetRef:           item.Value.TargetSheetRef,
			TargetSheetVersion:       item.Value.TargetSheetVersion,
			TargetBranchRef:          item.Value.TargetBranchRef,
			SourceRulesetManifestRef: item.Value.SourceRulesetManifestRef,
			TargetRulesetManifestRef: item.Value.TargetRulesetManifestRef,
			ConvertedByDid:           item.Value.ConvertedByDid,
			AuthorityKind:            authorityKind,
			ConvertedAt:              item.Value.ConvertedAt,
			ReuseGrantRef:            item.Value.ReuseGrantRef,
		})
	}
	return items, nil
}

func (service *Service) currentReuseGrants(ctx context.Context) ([]ReuseGrantSummary, error) {
	records, err := service.reader.ListAppendByCollection(ctx, model.CollectionReuseGrant)
	if err != nil {
		return nil, err
	}
	current := currentSupersededRecords[model.ReuseGrant](records, func(value model.ReuseGrant) string { return value.RevokesRef })
	items := make([]ReuseGrantSummary, 0, len(current))
	for _, item := range current {
		items = append(items, ReuseGrantSummary{
			ReuseGrantRef:     item.Ref,
			SourceCampaignRef: item.Value.SourceCampaignRef,
			TargetKind:        item.Value.TargetKind,
			TargetRef:         item.Value.TargetRef,
			TargetDid:         item.Value.TargetDid,
			ReuseMode:         item.Value.ReuseMode,
			GrantedAt:         item.Value.GrantedAt,
			ExpiresAt:         item.Value.ExpiresAt,
			RevokedAt:         item.Value.RevokedAt,
		})
		items[len(items)-1].CharacterBranchRef = item.Value.CharacterBranchRef
	}
	return items, nil
}

func (service *Service) publicationSummaries(ctx context.Context, subjectRef string, subjectKind string, mode string, includeRetired bool, actorDid string) ([]PublicationSummary, error) {
	resolvedMode := mode
	if resolvedMode == "" {
		resolvedMode = "owner-steward"
	}
	if resolvedMode == "public" && includeRetired {
		return nil, ErrInvalidInput
	}
	if resolvedMode != "public" && actorDid != "" && subjectRef != "" {
		if err := service.authorizePublicationFilter(ctx, actorDid, subjectRef, subjectKind); err != nil && !errors.Is(err, store.ErrNotFound) {
			return nil, err
		}
	}

	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return nil, err
	}
	conversions, err := service.currentConversions(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]PublicationSummary, 0)
	for headKey, currentHeadRef := range currentHeads {
		parts := strings.SplitN(headKey, "\n", 2)
		if len(parts) != 2 {
			continue
		}
		currentSubjectKind := parts[0]
		currentSubjectRef := parts[1]
		if currentSubjectKind != "campaign" && currentSubjectKind != "character-branch" && currentSubjectKind != "character-episode" {
			continue
		}
		if subjectRef != "" && currentSubjectRef != subjectRef {
			continue
		}
		if subjectKind != "" && currentSubjectKind != subjectKind {
			continue
		}
		record, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentHeadRef)
		if err != nil {
			if resolvedMode == "public" {
				continue
			}
			return nil, err
		}
		if resolvedMode == "public" {
			if !publicationIsPublic(currentHeadRef, publicationModel) {
				continue
			}
		} else if actorDid != "" {
			if err := authorizePublicationRead(ctx, service.reader, actorDid, publicationModel.SubjectRef, publicationModel.SubjectKind); err != nil {
				continue
			}
		}
		if publicationModel.Status == "retired" && !includeRetired {
			continue
		}
		item, err := service.publicationSummaryFromRecord(
			ctx,
			record,
			publicationModel,
			currentHeads,
			conversions,
			resolvedMode != "public",
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].PublishedAt.Equal(items[right].PublishedAt) {
			return items[left].PublicationRef < items[right].PublicationRef
		}
		return items[left].PublishedAt.After(items[right].PublishedAt)
	})
	return items, nil
}

func (service *Service) conversionAuthorityKind(ctx context.Context, conversion model.CharacterConversion) (string, error) {
	if conversion.ReuseGrantRef != "" {
		return "grant-backed", nil
	}
	_, targetBranch, err := decodeStable[model.CharacterBranch](ctx, service.reader, conversion.TargetBranchRef)
	if err != nil {
		return "", err
	}
	if sameActor(conversion.ConvertedByDid, targetBranch.OwnerDid) {
		return "same-owner", nil
	}
	return "campaign-steward", nil
}

func (service *Service) authorizePublicationFilter(ctx context.Context, actorDid string, subjectRef string, subjectKind string) error {
	resolvedKind, err := publicationSubjectKind(subjectRef)
	if err != nil {
		return err
	}
	if subjectKind != "" && subjectKind != resolvedKind {
		return ErrInvalidInput
	}
	return authorizePublicationRead(ctx, service.reader, actorDid, subjectRef, resolvedKind)
}

func publicationSubjectKind(subjectRef string) (string, error) {
	parts, err := store.ParseRef(subjectRef)
	if err != nil {
		return "", ErrInvalidInput
	}
	switch parts.Collection {
	case model.CollectionCampaign:
		return "campaign", nil
	case model.CollectionCharacterBranch:
		return "character-branch", nil
	case model.CollectionCharacterEpisode:
		return "character-episode", nil
	default:
		return "", ErrInvalidInput
	}
}

type campaignContinuity struct {
	Episodes             []EpisodeSummary
	EpisodeRefs          map[string]struct{}
	BranchRefs           map[string]struct{}
	ArchivedEpisodeCount int
}

func (service *Service) campaignContinuity(ctx context.Context, campaignRef string) (campaignContinuity, error) {
	episodeRecords, err := service.reader.ListAppendByCollection(ctx, model.CollectionCharacterEpisode)
	if err != nil {
		return campaignContinuity{}, err
	}
	decodedEpisodes := make([]currentRecord[model.CharacterEpisode], 0, len(episodeRecords))
	superseded := map[string]struct{}{}
	for _, record := range episodeRecords {
		value, err := model.UnmarshalAppend[model.CharacterEpisode](record)
		if err != nil {
			continue
		}
		decodedEpisodes = append(decodedEpisodes, currentRecord[model.CharacterEpisode]{Ref: record.Ref, Value: value})
		if parent := value.SupersedesRef; parent != "" {
			superseded[parent] = struct{}{}
		}
	}

	continuity := campaignContinuity{
		Episodes:    make([]EpisodeSummary, 0),
		EpisodeRefs: map[string]struct{}{},
		BranchRefs:  map[string]struct{}{},
	}
	for _, item := range decodedEpisodes {
		if item.Value.CampaignRef != campaignRef {
			continue
		}
		if _, archived := superseded[item.Ref]; archived {
			continuity.ArchivedEpisodeCount++
			continue
		}
		continuity.Episodes = append(continuity.Episodes, EpisodeSummary{
			CharacterEpisodeRef: item.Ref,
			CharacterBranchRef:  item.Value.CharacterBranchRef,
			CampaignRef:         item.Value.CampaignRef,
			ScenarioLabel:       item.Value.ScenarioLabel,
			OutcomeSummary:      item.Value.OutcomeSummary,
			CreatedAt:           item.Value.CreatedAt,
		})
		continuity.EpisodeRefs[item.Ref] = struct{}{}
		continuity.BranchRefs[item.Value.CharacterBranchRef] = struct{}{}
	}
	sort.Slice(continuity.Episodes, func(left int, right int) bool {
		return continuity.Episodes[left].CreatedAt.After(continuity.Episodes[right].CreatedAt)
	})

	return continuity, nil
}

func (service *Service) campaignPublicationSummaries(ctx context.Context, campaignRef string, mode string, includeRetired bool) ([]PublicationSummary, error) {
	continuity, err := service.campaignContinuity(ctx, campaignRef)
	if err != nil {
		return nil, err
	}
	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return nil, err
	}
	conversions, err := service.currentConversions(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]PublicationSummary, 0)
	hasCampaignPublicHead := false
	for headKey, currentHeadRef := range currentHeads {
		parts := strings.SplitN(headKey, "\n", 2)
		if len(parts) != 2 {
			continue
		}
		currentSubjectKind := parts[0]
		currentSubjectRef := parts[1]
		if currentSubjectRef != campaignRef {
			if _, ok := continuity.EpisodeRefs[currentSubjectRef]; !ok {
				continue
			}
		}
		if currentSubjectKind != "campaign" && currentSubjectKind != "character-episode" {
			continue
		}
		record, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentHeadRef)
		if err != nil {
			if mode == "public" {
				continue
			}
			return nil, err
		}
		if mode == "public" {
			if !publicationIsPublic(currentHeadRef, publicationModel) {
				continue
			}
			if currentSubjectRef == campaignRef {
				hasCampaignPublicHead = true
			}
		} else if publicationModel.Status == "retired" && !includeRetired {
			continue
		}
		item, err := service.publicationSummaryFromRecord(
			ctx,
			record,
			publicationModel,
			currentHeads,
			conversions,
			mode != "public",
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].PublishedAt.Equal(items[right].PublishedAt) {
			return items[left].PublicationRef < items[right].PublicationRef
		}
		return items[left].PublishedAt.After(items[right].PublishedAt)
	})
	if mode == "public" && !hasCampaignPublicHead {
		return nil, store.ErrNotFound
	}
	return items, nil
}

func (service *Service) campaignPublishedArtifacts(ctx context.Context, campaignRef string, mode string) ([]PublicationSummary, error) {
	return service.campaignPublicationSummaries(ctx, campaignRef, mode, false)
}

func (service *Service) campaignRetiredPublicationCount(ctx context.Context, campaignRef string) (int, error) {
	publications, err := service.campaignPublicationSummaries(ctx, campaignRef, "owner-steward", true)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, publication := range publications {
		if publication.Status == "retired" {
			count++
		}
	}
	return count, nil
}

func (service *Service) campaignSummary(ctx context.Context, ref string, includePrivate bool) (CampaignSummary, error) {
	_, campaignModel, err := decodeStable[model.Campaign](ctx, service.reader, ref)
	if err != nil {
		return CampaignSummary{}, err
	}
	summary := CampaignSummary{
		CampaignRef: ref,
		Title:       campaignModel.Title,
		Visibility:  campaignModel.Visibility,
		ArchivedAt:  campaignModel.ArchivedAt,
	}
	if includePrivate {
		summary.HouseRef = campaignModel.HouseRef
		summary.WorldRef = campaignModel.WorldRef
		summary.RulesetNSID = campaignModel.RulesetNSID
		summary.RulesetManifestRef = campaignModel.RulesetManifestRef
	}
	return summary, nil
}

func (service *Service) branchSummaryForModel(
	ctx context.Context,
	ref string,
	branch model.CharacterBranch,
	latestEpisodes map[string]EpisodeSummary,
	currentBranchPublications map[string]string,
	campaignTitles map[string]string,
	includePrivateCampaign bool,
) (BranchSummary, error) {
	_, sheetModel, err := decodeStable[model.CharacterSheet](ctx, service.reader, branch.BaseSheetRef)
	if err != nil {
		return BranchSummary{}, err
	}
	summary := BranchSummary{
		CharacterBranchRef:    ref,
		BaseSheetRef:          branch.BaseSheetRef,
		BranchLabel:           branch.BranchLabel,
		BranchKind:            branch.BranchKind,
		OwnerDid:              branch.OwnerDid,
		Revision:              branch.Revision,
		DisplayName:           sheetModel.DisplayName,
		RulesetNSID:           sheetModel.RulesetNSID,
		CurrentPublicationRef: currentBranchPublications[ref],
		RetiredAt:             branch.RetiredAt,
	}
	if includePrivateCampaign {
		summary.ExternalSheetURI = sheetModel.ExternalSheetURI
		summary.ImportedFrom = branch.ImportedFrom
	}
	if latestEpisode, ok := latestEpisodes[ref]; ok {
		if includePrivateCampaign {
			summary.LatestEpisodeSummary = latestEpisode.OutcomeSummary
		}
		summary.LatestCampaignRef = latestEpisode.CampaignRef
		if latestEpisode.CampaignRef != "" {
			if includePrivateCampaign {
				if campaignTitles[latestEpisode.CampaignRef] == "" {
					campaign, err := service.campaignSummary(ctx, latestEpisode.CampaignRef, true)
					if err == nil {
						campaignTitles[latestEpisode.CampaignRef] = campaign.Title
					}
				}
				summary.LatestCampaignTitle = campaignTitles[latestEpisode.CampaignRef]
			} else {
				campaign, err := service.campaignPublicSummary(ctx, latestEpisode.CampaignRef)
				if err == nil {
					summary.LatestCampaignRef = campaign.CampaignRef
					summary.LatestCampaignTitle = campaign.Title
				} else {
					summary.LatestCampaignRef = ""
				}
			}
		}
	}
	return summary, nil
}

func (service *Service) branchSummaryByRef(
	ctx context.Context,
	branchRef string,
	includePrivateCampaign bool,
) (BranchSummary, error) {
	_, branchModel, err := decodeStable[model.CharacterBranch](ctx, service.reader, branchRef)
	if err != nil {
		return BranchSummary{}, err
	}
	latestEpisodes, err := service.latestEpisodeByBranch(ctx)
	if err != nil {
		return BranchSummary{}, err
	}
	var currentBranchPublications map[string]string
	if includePrivateCampaign {
		currentBranchPublications, err = service.currentPublicationRefBySubject(ctx, "character-branch")
	} else {
		currentBranchPublications, err = service.publicCurrentPublicationRefBySubject(ctx, "character-branch")
	}
	if err != nil {
		return BranchSummary{}, err
	}
	return service.branchSummaryForModel(
		ctx,
		branchRef,
		branchModel,
		latestEpisodes,
		currentBranchPublications,
		map[string]string{},
		includePrivateCampaign,
	)
}

func (service *Service) latestEpisodeByBranch(ctx context.Context) (map[string]EpisodeSummary, error) {
	episodes, err := service.currentEpisodes(ctx)
	if err != nil {
		return nil, err
	}
	latestEpisodes := map[string]EpisodeSummary{}
	for _, episode := range episodes {
		current, exists := latestEpisodes[episode.CharacterBranchRef]
		if !exists || episode.CreatedAt.After(current.CreatedAt) {
			latestEpisodes[episode.CharacterBranchRef] = episode
		}
	}
	return latestEpisodes, nil
}

func (service *Service) currentHeadMap(ctx context.Context) (map[string]string, error) {
	heads, err := service.reader.ListCurrentHeads(ctx)
	if err != nil {
		return nil, err
	}
	currentHeads := map[string]string{}
	for _, head := range heads {
		currentHeads[publicationHeadKey(head.SubjectRef, head.SubjectKind)] = head.CurrentHeadRef
	}
	return currentHeads, nil
}

func (service *Service) currentPublicationRefBySubject(ctx context.Context, subjectKind string) (map[string]string, error) {
	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return nil, err
	}
	items := map[string]string{}
	for headKey, currentHeadRef := range currentHeads {
		parts := strings.SplitN(headKey, "\n", 2)
		if len(parts) != 2 || parts[0] != subjectKind {
			continue
		}
		items[parts[1]] = currentHeadRef
	}
	return items, nil
}

func (service *Service) publicCurrentPublicationRefBySubject(ctx context.Context, subjectKind string) (map[string]string, error) {
	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return nil, err
	}
	items := map[string]string{}
	for headKey, currentHeadRef := range currentHeads {
		parts := strings.SplitN(headKey, "\n", 2)
		if len(parts) != 2 || parts[0] != subjectKind {
			continue
		}
		_, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentHeadRef)
		if err != nil || !publicationIsPublic(currentHeadRef, publicationModel) {
			continue
		}
		items[parts[1]] = currentHeadRef
	}
	return items, nil
}

func (service *Service) campaignPublicSummary(ctx context.Context, campaignRef string) (CampaignSummary, error) {
	currentCampaignPublications, err := service.currentPublicationRefBySubject(ctx, "campaign")
	if err != nil {
		return CampaignSummary{}, err
	}
	currentPublicationRef := currentCampaignPublications[campaignRef]
	if currentPublicationRef == "" {
		return CampaignSummary{}, store.ErrNotFound
	}
	_, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentPublicationRef)
	if err != nil {
		return CampaignSummary{}, err
	}
	if !publicationIsPublic(currentPublicationRef, publicationModel) {
		return CampaignSummary{}, store.ErrNotFound
	}
	summary, err := service.campaignSummary(ctx, campaignRef, false)
	if err != nil {
		return CampaignSummary{}, err
	}
	publishedArtifactCount, err := service.campaignPublicArtifactCount(ctx, campaignRef)
	if err != nil {
		return CampaignSummary{}, err
	}
	summary.CurrentPublicationRef = currentPublicationRef
	summary.PublishedArtifactCount = publishedArtifactCount
	return summary, nil
}

func (service *Service) campaignPublicArtifactCount(ctx context.Context, campaignRef string) (int, error) {
	continuity, err := service.campaignContinuity(ctx, campaignRef)
	if err != nil {
		return 0, err
	}
	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return 0, err
	}
	hasCampaignPublicHead := false
	count := 0
	for headKey, currentHeadRef := range currentHeads {
		parts := strings.SplitN(headKey, "\n", 2)
		if len(parts) != 2 {
			continue
		}
		currentSubjectKind := parts[0]
		currentSubjectRef := parts[1]
		if currentSubjectKind != "campaign" && currentSubjectKind != "character-episode" {
			continue
		}
		if currentSubjectRef != campaignRef {
			if _, ok := continuity.EpisodeRefs[currentSubjectRef]; !ok {
				continue
			}
		}
		_, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentHeadRef)
		if err != nil {
			continue
		}
		if !publicationIsPublic(currentHeadRef, publicationModel) {
			continue
		}
		count++
		if currentSubjectRef == campaignRef {
			hasCampaignPublicHead = true
		}
	}
	if !hasCampaignPublicHead {
		return 0, store.ErrNotFound
	}
	return count, nil
}

func (service *Service) publicationSummaryFromRecord(
	ctx context.Context,
	record store.AppendRecord,
	publication model.Publication,
	currentHeads map[string]string,
	conversions []ConversionSummary,
	includePrivateCampaign bool,
) (PublicationSummary, error) {
	item := PublicationSummary{
		PublicationRef:       record.Ref,
		SubjectRef:           publication.SubjectRef,
		SubjectKind:          publication.SubjectKind,
		EntryURL:             publication.EntryURL,
		PreferredSurfaceKind: publication.PreferredSurfaceKind,
		Surfaces:             toProjectionSurfaces(publication.Surfaces),
		Status:               publication.Status,
		PublishedAt:          publication.PublishedAt,
		RetiredAt:            publication.RetiredAt,
		SupersedesRef:        publication.SupersedesRef,
	}
	if publication.Status == "retired" {
		item.RetiredReason = publication.Note
	}
	currentPublicationRef := currentHeads[publicationHeadKey(publication.SubjectRef, publication.SubjectKind)]
	if includePrivateCampaign {
		item.CurrentPublicationRef = currentPublicationRef
	} else if currentPublicationRef != "" {
		_, currentPublicationModel, err := decodeAppend[model.Publication](ctx, service.reader, currentPublicationRef)
		if err == nil && publicationIsPublic(currentPublicationRef, currentPublicationModel) {
			item.CurrentPublicationRef = currentPublicationRef
		}
	}
	if conversion := findConversionForSubject(conversions, publication.SubjectRef, publication.SubjectKind); conversion != nil {
		item.SourceRulesetManifestRef = conversion.SourceRulesetManifestRef
		item.TargetRulesetManifestRef = conversion.TargetRulesetManifestRef
		item.GrantBacked = conversion.ReuseGrantRef != ""
	}

	switch publication.SubjectKind {
	case "campaign":
		var campaign CampaignSummary
		var err error
		if includePrivateCampaign {
			campaign, err = service.campaignSummary(ctx, publication.SubjectRef, true)
		} else {
			campaign, err = service.campaignPublicSummary(ctx, publication.SubjectRef)
		}
		if err == nil {
			item.SubjectTitle = campaign.Title
			item.CampaignRef = campaign.CampaignRef
			item.CampaignTitle = campaign.Title
		}
	case "character-branch":
		branch, err := service.branchSummaryByRef(ctx, publication.SubjectRef, includePrivateCampaign)
		if err == nil {
			item.SubjectTitle = branch.DisplayName
			item.CampaignRef = branch.LatestCampaignRef
			item.CampaignTitle = branch.LatestCampaignTitle
		}
	case "character-episode":
		_, episodeModel, err := decodeAppend[model.CharacterEpisode](ctx, service.reader, publication.SubjectRef)
		if err == nil {
			branch, err := service.branchSummaryByRef(ctx, episodeModel.CharacterBranchRef, includePrivateCampaign)
			if err == nil {
				item.SubjectTitle = branch.DisplayName
			}
			if episodeModel.CampaignRef != "" {
				if includePrivateCampaign {
					campaign, err := service.campaignSummary(ctx, episodeModel.CampaignRef, true)
					if err == nil {
						item.CampaignRef = campaign.CampaignRef
						item.CampaignTitle = campaign.Title
					}
				} else {
					campaign, err := service.campaignPublicSummary(ctx, episodeModel.CampaignRef)
					if err == nil {
						item.CampaignRef = campaign.CampaignRef
						item.CampaignTitle = campaign.Title
					}
				}
			}
		}
	}

	return item, nil
}

func (service *Service) publicationLibrarySummaries(
	ctx context.Context,
	actorDid string,
	subjectRef string,
	subjectKind string,
	mode string,
) ([]PublicationSummary, error) {
	resolvedMode := mode
	if resolvedMode == "" {
		resolvedMode = "owner-steward"
	}
	if resolvedMode != "public" && actorDid != "" && subjectRef != "" {
		if err := service.authorizePublicationFilter(ctx, actorDid, subjectRef, subjectKind); err != nil && !errors.Is(err, store.ErrNotFound) {
			return nil, err
		}
	}
	records, err := service.reader.ListAppendByCollection(ctx, model.CollectionPublication)
	if err != nil {
		return nil, err
	}
	currentHeads, err := service.currentHeadMap(ctx)
	if err != nil {
		return nil, err
	}
	conversions, err := service.currentConversions(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]PublicationSummary, 0)
	for _, record := range records {
		publicationModel, err := model.UnmarshalAppend[model.Publication](record)
		if err != nil {
			return nil, err
		}
		if subjectRef != "" && publicationModel.SubjectRef != subjectRef {
			continue
		}
		if subjectKind != "" && publicationModel.SubjectKind != subjectKind {
			continue
		}
		if resolvedMode == "public" {
			if !publicationIsValid(record.Ref, publicationModel) {
				continue
			}
		} else if actorDid != "" {
			if err := authorizePublicationRead(ctx, service.reader, actorDid, publicationModel.SubjectRef, publicationModel.SubjectKind); err != nil {
				continue
			}
		}
		item, err := service.publicationSummaryFromRecord(
			ctx,
			record,
			publicationModel,
			currentHeads,
			conversions,
			resolvedMode != "public",
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].PublishedAt.Equal(items[right].PublishedAt) {
			return items[left].PublicationRef < items[right].PublicationRef
		}
		return items[left].PublishedAt.After(items[right].PublishedAt)
	})
	return items, nil
}

func publicationHeadKey(subjectRef string, subjectKind string) string {
	return subjectKind + "\n" + subjectRef
}

func (service *Service) activeAdvancementRefsForBranch(ctx context.Context, branchRef string) ([]string, error) {
	records, err := service.reader.ListAppendByCollection(ctx, model.CollectionCharacterAdvancement)
	if err != nil {
		return nil, err
	}
	entries := make([]character.Advancement, 0)
	for _, record := range records {
		value, err := model.UnmarshalAppend[model.CharacterAdvancement](record)
		if err != nil {
			return nil, err
		}
		if value.CharacterBranchRef != branchRef {
			continue
		}
		entries = append(entries, character.Advancement{Ref: record.Ref, CharacterBranchRef: value.CharacterBranchRef, EffectiveAt: value.EffectiveAt, SupersedesRef: value.SupersedesRef})
	}
	active, err := character.ActiveAdvancementSequence(branchRef, entries)
	if err != nil {
		return nil, err
	}
	refs := make([]string, 0, len(active))
	for _, entry := range active {
		refs = append(refs, entry.Ref)
	}
	return refs, nil
}

func authorizePublicationRead(ctx context.Context, reader store.Reader, actorDid string, subjectRef string, subjectKind string) error {
	switch subjectKind {
	case "campaign":
		_, campaignModel, err := decodeStable[model.Campaign](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, campaignModel.StewardDids...) {
			return ErrForbidden
		}
	case "character-branch":
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, branchModel.OwnerDid) {
			return ErrForbidden
		}
	case "character-episode":
		_, episodeModel, err := decodeAppend[model.CharacterEpisode](ctx, reader, subjectRef)
		if err != nil {
			return err
		}
		_, branchModel, err := decodeStable[model.CharacterBranch](ctx, reader, episodeModel.CharacterBranchRef)
		if err != nil {
			return err
		}
		if !sameActor(actorDid, episodeModel.RecordedByDid, branchModel.OwnerDid) {
			return ErrForbidden
		}
	default:
		return ErrInvalidInput
	}
	return nil
}

type currentRecord[T any] struct {
	Ref   string
	Value T
}

type branchRecord struct {
	Ref    string
	Record model.CharacterBranch
}

func currentSupersededRecords[T any](records []store.AppendRecord, supersedes func(T) string) []currentRecord[T] {
	decoded := make([]currentRecord[T], 0, len(records))
	superseded := map[string]struct{}{}
	for _, record := range records {
		value, err := model.UnmarshalAppend[T](record)
		if err != nil {
			continue
		}
		decoded = append(decoded, currentRecord[T]{Ref: record.Ref, Value: value})
		if parent := supersedes(value); parent != "" {
			superseded[parent] = struct{}{}
		}
	}
	current := make([]currentRecord[T], 0, len(decoded))
	for _, item := range decoded {
		if _, ok := superseded[item.Ref]; ok {
			continue
		}
		current = append(current, item)
	}
	return current
}

func matchesReuseState(item ReuseGrantSummary, state string, now time.Time) bool {
	switch state {
	case "", "active":
		return item.RevokedAt == nil && (item.ExpiresAt == nil || item.ExpiresAt.After(now))
	case "revoked":
		return item.RevokedAt != nil
	case "expired":
		return item.RevokedAt == nil && item.ExpiresAt != nil && !item.ExpiresAt.After(now)
	case "all":
		return true
	default:
		return false
	}
}

func toProjectionSurfaces(values []model.SurfaceDescriptor) []SurfaceDescriptor {
	items := make([]SurfaceDescriptor, 0, len(values))
	for _, value := range values {
		items = append(items, SurfaceDescriptor{
			SurfaceKind: value.SurfaceKind,
			PurposeKind: value.PurposeKind,
			SurfaceURI:  value.SurfaceURI,
			Status:      value.Status,
			RetiredAt:   value.RetiredAt,
		})
	}
	return items
}

func findConversionForSubject(conversions []ConversionSummary, subjectRef string, subjectKind string) *ConversionSummary {
	targetBranchRef := subjectRef
	if subjectKind == "character-episode" {
		return nil
	}
	var matched *ConversionSummary
	for index := range conversions {
		conversion := conversions[index]
		if conversion.TargetBranchRef != targetBranchRef {
			continue
		}
		if matched == nil || conversion.ConvertedAt.After(matched.ConvertedAt) {
			matched = &conversion
		}
	}
	return matched
}

func countRetiredPublications(items []PublicationSummary) int {
	count := 0
	for _, item := range items {
		if item.Status == "retired" {
			count++
		}
	}
	return count
}

func publicationIsPublic(ref string, value model.Publication) bool {
	return value.Status == "active" && publicationIsValid(ref, value)
}

func publicationIsValid(ref string, value model.Publication) bool {
	return shareddomain.ValidatePublication(shareddomain.Publication{
		Ref:                  ref,
		SubjectRef:           value.SubjectRef,
		SubjectKind:          value.SubjectKind,
		ReuseGrantRef:        value.ReuseGrantRef,
		EntryURL:             value.EntryURL,
		PreferredSurfaceKind: value.PreferredSurfaceKind,
		Surfaces:             toDomainPublicationSurfaces(value.Surfaces),
		Status:               value.Status,
		SupersedesRef:        value.SupersedesRef,
		PublishedAt:          value.PublishedAt,
		RetiredAt:            value.RetiredAt,
	}) == nil
}

func toDomainPublicationSurfaces(values []model.SurfaceDescriptor) []shareddomain.SurfaceDescriptor {
	items := make([]shareddomain.SurfaceDescriptor, 0, len(values))
	for _, value := range values {
		items = append(items, shareddomain.SurfaceDescriptor{
			SurfaceKind: value.SurfaceKind,
			PurposeKind: value.PurposeKind,
			SurfaceURI:  value.SurfaceURI,
			Status:      value.Status,
			RetiredAt:   value.RetiredAt,
		})
	}
	return items
}
