package projection

import (
	"context"
	"errors"
	"sort"
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
	for _, item := range items {
		summaries = append(summaries, BranchSummary{
			CharacterBranchRef: item.Ref,
			BaseSheetRef:       item.Record.BaseSheetRef,
			BranchLabel:        item.Record.BranchLabel,
			BranchKind:         item.Record.BranchKind,
			OwnerDid:           item.Record.OwnerDid,
			Revision:           item.Record.Revision,
		})
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

	heads, err := service.reader.ListCurrentHeads(ctx)
	if err != nil {
		return nil, err
	}
	conversions, err := service.currentConversions(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]PublicationSummary, 0)
	for _, head := range heads {
		if head.SubjectKind != "campaign" && head.SubjectKind != "character-branch" && head.SubjectKind != "character-episode" {
			continue
		}
		if subjectRef != "" && head.SubjectRef != subjectRef {
			continue
		}
		if subjectKind != "" && head.SubjectKind != subjectKind {
			continue
		}
		_, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, head.CurrentHeadRef)
		if err != nil {
			if resolvedMode == "public" {
				continue
			}
			return nil, err
		}
		if resolvedMode == "public" {
			if !publicationIsPublic(head.CurrentHeadRef, publicationModel) {
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
		item := PublicationSummary{
			PublicationRef:       head.CurrentHeadRef,
			SubjectRef:           publicationModel.SubjectRef,
			SubjectKind:          publicationModel.SubjectKind,
			EntryURL:             publicationModel.EntryURL,
			PreferredSurfaceKind: publicationModel.PreferredSurfaceKind,
			Surfaces:             toProjectionSurfaces(publicationModel.Surfaces),
			Status:               publicationModel.Status,
			PublishedAt:          publicationModel.PublishedAt,
			RetiredAt:            publicationModel.RetiredAt,
		}
		if conversion := findConversionForSubject(conversions, publicationModel.SubjectRef, publicationModel.SubjectKind); conversion != nil {
			item.SourceRulesetManifestRef = conversion.SourceRulesetManifestRef
			item.TargetRulesetManifestRef = conversion.TargetRulesetManifestRef
			item.GrantBacked = conversion.ReuseGrantRef != ""
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
	heads, err := service.reader.ListCurrentHeads(ctx)
	if err != nil {
		return nil, err
	}
	conversions, err := service.currentConversions(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]PublicationSummary, 0)
	hasCampaignPublicHead := false
	for _, head := range heads {
		if head.SubjectRef != campaignRef {
			if _, ok := continuity.EpisodeRefs[head.SubjectRef]; !ok {
				continue
			}
		}
		if head.SubjectKind != "campaign" && head.SubjectKind != "character-episode" {
			continue
		}
		_, publicationModel, err := decodeAppend[model.Publication](ctx, service.reader, head.CurrentHeadRef)
		if err != nil {
			if mode == "public" {
				continue
			}
			return nil, err
		}
		if mode == "public" {
			if !publicationIsPublic(head.CurrentHeadRef, publicationModel) {
				continue
			}
			if head.SubjectRef == campaignRef {
				hasCampaignPublicHead = true
			}
		} else if publicationModel.Status == "retired" && !includeRetired {
			continue
		}
		item := PublicationSummary{
			PublicationRef:       head.CurrentHeadRef,
			SubjectRef:           publicationModel.SubjectRef,
			SubjectKind:          publicationModel.SubjectKind,
			EntryURL:             publicationModel.EntryURL,
			PreferredSurfaceKind: publicationModel.PreferredSurfaceKind,
			Surfaces:             toProjectionSurfaces(publicationModel.Surfaces),
			Status:               publicationModel.Status,
			PublishedAt:          publicationModel.PublishedAt,
			RetiredAt:            publicationModel.RetiredAt,
		}
		if conversion := findConversionForSubject(conversions, publicationModel.SubjectRef, publicationModel.SubjectKind); conversion != nil {
			item.SourceRulesetManifestRef = conversion.SourceRulesetManifestRef
			item.TargetRulesetManifestRef = conversion.TargetRulesetManifestRef
			item.GrantBacked = conversion.ReuseGrantRef != ""
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
