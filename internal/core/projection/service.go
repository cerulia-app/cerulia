package projection

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"cerulia/internal/core/model"
	"cerulia/internal/store"
)

type Service struct {
	reader store.Reader
	now    func() time.Time
}

func NewService(reader store.Reader) *Service {
	if reader == nil {
		reader = store.NewMemoryStore()
	}
	return &Service{
		reader: reader,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (service *Service) GetCharacterHome(ctx context.Context, actorDid string, ownerDid string) (CharacterHomeView, error) {
	resolvedOwner := strings.TrimSpace(ownerDid)
	if resolvedOwner == "" {
		resolvedOwner = strings.TrimSpace(actorDid)
	}
	if resolvedOwner == "" {
		return CharacterHomeView{}, ErrForbidden
	}
	if actorDid != "" && resolvedOwner != actorDid {
		return CharacterHomeView{}, ErrForbidden
	}

	branches, branchModels, err := service.branchesByOwner(ctx, resolvedOwner)
	if err != nil {
		return CharacterHomeView{}, err
	}
	if len(branches) == 0 {
		return CharacterHomeView{}, store.ErrNotFound
	}

	primaryRef := branches[0].CharacterBranchRef
	currentEpisodes, err := service.currentEpisodes(ctx)
	if err != nil {
		return CharacterHomeView{}, err
	}
	currentConversions, err := service.currentConversions(ctx)
	if err != nil {
		return CharacterHomeView{}, err
	}
	currentReuseGrants, err := service.currentReuseGrants(ctx)
	if err != nil {
		return CharacterHomeView{}, err
	}
	publications, err := service.publicationSummaries(ctx, "", "", "owner-steward", true, actorDid)
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return CharacterHomeView{}, err
	}

	branchSet := map[string]struct{}{}
	for _, branch := range branches {
		branchSet[branch.CharacterBranchRef] = struct{}{}
	}

	recentEpisodes := make([]EpisodeSummary, 0)
	linkedCampaignRefs := map[string]struct{}{}
	for _, episode := range currentEpisodes {
		if _, ok := branchSet[episode.CharacterBranchRef]; !ok {
			continue
		}
		recentEpisodes = append(recentEpisodes, episode)
		if episode.CampaignRef != "" {
			linkedCampaignRefs[episode.CampaignRef] = struct{}{}
		}
	}
	sort.Slice(recentEpisodes, func(left int, right int) bool {
		return recentEpisodes[left].CreatedAt.After(recentEpisodes[right].CreatedAt)
	})
	if len(recentEpisodes) > 10 {
		recentEpisodes = recentEpisodes[:10]
	}

	recentConversions := make([]ConversionSummary, 0)
	for _, conversion := range currentConversions {
		if _, ok := branchSet[conversion.TargetBranchRef]; !ok {
			continue
		}
		recentConversions = append(recentConversions, conversion)
	}
	sort.Slice(recentConversions, func(left int, right int) bool {
		return recentConversions[left].ConvertedAt.After(recentConversions[right].ConvertedAt)
	})
	if len(recentConversions) > 10 {
		recentConversions = recentConversions[:10]
	}

	reuseGrants := make([]ReuseGrantSummary, 0)
	for _, grant := range currentReuseGrants {
		if _, ok := branchSet[grant.CharacterBranchRef]; !ok {
			continue
		}
		reuseGrants = append(reuseGrants, grant)
	}
	sort.Slice(reuseGrants, func(left int, right int) bool {
		return reuseGrants[left].GrantedAt.After(reuseGrants[right].GrantedAt)
	})

	publicationRows := make([]PublicationSummary, 0)
	publicationSubjects := map[string]struct{}{}
	for _, branch := range branches {
		publicationSubjects[branch.CharacterBranchRef] = struct{}{}
	}
	for _, episode := range recentEpisodes {
		publicationSubjects[episode.CharacterEpisodeRef] = struct{}{}
	}
	for _, publication := range publications {
		if _, ok := publicationSubjects[publication.SubjectRef]; !ok {
			continue
		}
		publicationRows = append(publicationRows, publication)
	}
	sort.Slice(publicationRows, func(left int, right int) bool {
		return publicationRows[left].PublishedAt.After(publicationRows[right].PublishedAt)
	})

	linkedCampaigns := make([]CampaignSummary, 0)
	for ref := range linkedCampaignRefs {
		campaign, err := service.campaignSummary(ctx, ref, true)
		if err != nil {
			continue
		}
		linkedCampaigns = append(linkedCampaigns, campaign)
	}
	sort.Slice(linkedCampaigns, func(left int, right int) bool {
		return linkedCampaigns[left].Title < linkedCampaigns[right].Title
	})

	advancementRefs, err := service.activeAdvancementRefsForBranch(ctx, primaryRef)
	if err != nil {
		return CharacterHomeView{}, err
	}

	primary := branches[0]
	if branchModel, ok := branchModels[primaryRef]; ok && branchModel.RetiredAt != nil {
		for _, branch := range branches {
			if branchModels[branch.CharacterBranchRef].RetiredAt == nil {
				primary = branch
				break
			}
		}
	}

	return CharacterHomeView{
		OwnerDid:              resolvedOwner,
		PrimaryBranch:         primary,
		Branches:              branches,
		RecentEpisodes:        recentEpisodes,
		RecentConversions:     recentConversions,
		ReuseGrants:           reuseGrants,
		Publications:          publicationRows,
		LinkedCampaigns:       linkedCampaigns,
		RecentAdvancementRefs: advancementRefs,
	}, nil
}

func (service *Service) GetCampaignView(ctx context.Context, actorDid string, campaignRef string, mode string) (CampaignView, error) {
	resolvedMode := mode
	if resolvedMode == "" {
		resolvedMode = "owner-steward"
	}

	_, campaignModel, err := decodeStable[model.Campaign](ctx, service.reader, campaignRef)
	if err != nil {
		return CampaignView{}, err
	}
	if resolvedMode == "owner-steward" {
		if actorDid == "" || !sameActor(actorDid, campaignModel.StewardDids...) {
			return CampaignView{}, ErrForbidden
		}
	}

	publishedArtifacts, err := service.campaignPublishedArtifacts(ctx, campaignRef, resolvedMode, actorDid)
	if err != nil {
		return CampaignView{}, err
	}
	if resolvedMode == "public" && len(publishedArtifacts) == 0 {
		return CampaignView{}, store.ErrNotFound
	}

	campaignSummary := CampaignSummary{
		CampaignRef: campaignRef,
		Title:       campaignModel.Title,
		Visibility:  campaignModel.Visibility,
		ArchivedAt:  campaignModel.ArchivedAt,
	}
	view := CampaignView{
		Mode:               resolvedMode,
		Campaign:           campaignSummary,
		PublishedArtifacts: publishedArtifacts,
	}

	if resolvedMode == "owner-steward" {
		view.Campaign.HouseRef = campaignModel.HouseRef
		view.Campaign.WorldRef = campaignModel.WorldRef
		view.Campaign.RulesetNSID = campaignModel.RulesetNSID
		view.Campaign.RulesetManifestRef = campaignModel.RulesetManifestRef
		view.RuleProvenance = &RuleProvenance{
			SharedRuleProfileRefs: append([]string(nil), campaignModel.SharedRuleProfileRefs...),
			RulesetManifestRef:    campaignModel.RulesetManifestRef,
		}
		view.DefaultReusePolicy = campaignModel.DefaultReusePolicyKind
		view.StewardDids = append([]string(nil), campaignModel.StewardDids...)

		currentEpisodes, err := service.currentEpisodes(ctx)
		if err != nil {
			return CampaignView{}, err
		}
		recentContinuity := make([]EpisodeSummary, 0)
		branchRefs := map[string]struct{}{}
		for _, episode := range currentEpisodes {
			if episode.CampaignRef != campaignRef {
				continue
			}
			recentContinuity = append(recentContinuity, episode)
			branchRefs[episode.CharacterBranchRef] = struct{}{}
		}
		sort.Slice(recentContinuity, func(left int, right int) bool {
			return recentContinuity[left].CreatedAt.After(recentContinuity[right].CreatedAt)
		})
		view.RecentContinuity = recentContinuity

		branches, branchModels, err := service.branchesByOwner(ctx, "")
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			return CampaignView{}, err
		}
		activeBranches := make([]BranchSummary, 0)
		for _, branch := range branches {
			if _, ok := branchRefs[branch.CharacterBranchRef]; !ok {
				continue
			}
			if branchModels[branch.CharacterBranchRef].RetiredAt != nil {
				continue
			}
			activeBranches = append(activeBranches, branch)
		}
		view.ActiveBranches = activeBranches
		view.ArchivedCounts = &ArchivedCounts{Episodes: 0, Publications: countRetiredPublications(publishedArtifacts)}
	}

	return view, nil
}

func (service *Service) ListCharacterEpisodes(ctx context.Context, actorDid string, branchRef string, limit int, cursor string) (Page[EpisodeSummary], error) {
	_, branchModel, err := decodeStable[model.CharacterBranch](ctx, service.reader, branchRef)
	if err != nil {
		return Page[EpisodeSummary]{}, err
	}
	if actorDid == "" || !sameActor(actorDid, branchModel.OwnerDid) {
		return Page[EpisodeSummary]{}, ErrForbidden
	}

	currentEpisodes, err := service.currentEpisodes(ctx)
	if err != nil {
		return Page[EpisodeSummary]{}, err
	}
	items := make([]EpisodeSummary, 0)
	for _, episode := range currentEpisodes {
		if episode.CharacterBranchRef == branchRef {
			items = append(items, episode)
		}
	}
	sort.Slice(items, func(left int, right int) bool {
		return items[left].CreatedAt.After(items[right].CreatedAt)
	})
	return paginate(items, limit, cursor)
}

func (service *Service) ListReuseGrants(ctx context.Context, actorDid string, branchRef string, state string, limit int, cursor string) (Page[ReuseGrantSummary], error) {
	_, branchModel, err := decodeStable[model.CharacterBranch](ctx, service.reader, branchRef)
	if err != nil {
		return Page[ReuseGrantSummary]{}, err
	}
	if actorDid == "" || !sameActor(actorDid, branchModel.OwnerDid) {
		return Page[ReuseGrantSummary]{}, ErrForbidden
	}

	items, err := service.currentReuseGrants(ctx)
	if err != nil {
		return Page[ReuseGrantSummary]{}, err
	}
	filtered := make([]ReuseGrantSummary, 0)
	now := service.now().UTC()
	for _, item := range items {
		if item.CharacterBranchRef != branchRef {
			continue
		}
		if !matchesReuseState(item, state, now) {
			continue
		}
		filtered = append(filtered, item)
	}
	sort.Slice(filtered, func(left int, right int) bool {
		return filtered[left].GrantedAt.After(filtered[right].GrantedAt)
	})
	return paginate(filtered, limit, cursor)
}

func (service *Service) ListPublications(ctx context.Context, actorDid string, subjectRef string, subjectKind string, mode string, includeRetired bool, limit int, cursor string) (Page[PublicationSummary], error) {
	items, err := service.publicationSummaries(ctx, subjectRef, subjectKind, mode, includeRetired, actorDid)
	if err != nil {
		return Page[PublicationSummary]{}, err
	}
	return paginate(items, limit, cursor)
}

func (service *Service) ExportServiceLog(ctx context.Context, governingRef string, requestID string, limit int, cursor string) (Page[ServiceLogRow], error) {
	entries, err := service.reader.ListServiceLogs(ctx)
	if err != nil {
		return Page[ServiceLogRow]{}, err
	}
	items := make([]ServiceLogRow, 0)
	for _, entry := range entries {
		if entry.GoverningRef != governingRef {
			continue
		}
		if requestID != "" && entry.RequestID != requestID {
			continue
		}
		items = append(items, ServiceLogRow{
			RequestID:         entry.RequestID,
			OperationNSID:     entry.OperationNSID,
			ResultKind:        string(entry.ResultKind),
			GoverningRef:      entry.GoverningRef,
			ActorDid:          entry.ActorDID,
			CreatedAt:         entry.CreatedAt,
			EmittedRecordRefs: append([]string(nil), entry.EmittedRecordRefs...),
			ReasonCode:        entry.ReasonCode,
			Message:           entry.Message,
			RawPayload:        jsonRaw(entry.RawPayload),
		})
	}
	if len(items) == 0 {
		return Page[ServiceLogRow]{}, store.ErrNotFound
	}
	return paginate(items, limit, cursor)
}

func paginate[T any](items []T, limit int, cursor string) (Page[T], error) {
	resolvedLimit := limit
	if resolvedLimit <= 0 {
		resolvedLimit = 50
	}
	if resolvedLimit > 100 {
		resolvedLimit = 100
	}
	offset := 0
	if cursor != "" {
		value, err := strconv.Atoi(cursor)
		if err != nil || value < 0 {
			return Page[T]{}, ErrInvalidInput
		}
		offset = value
	}
	if offset >= len(items) {
		return Page[T]{Items: []T{}}, nil
	}
	end := offset + resolvedLimit
	if end > len(items) {
		end = len(items)
	}
	page := Page[T]{Items: append([]T(nil), items[offset:end]...)}
	if end < len(items) {
		page.Cursor = strconv.Itoa(end)
	}
	return page, nil
}

func sameActor(actorDid string, allowed ...string) bool {
	trimmed := strings.TrimSpace(actorDid)
	if trimmed == "" {
		return false
	}
	for _, candidate := range allowed {
		if trimmed == strings.TrimSpace(candidate) {
			return true
		}
	}
	return false
}

func jsonRaw(payload []byte) any {
	if len(payload) == 0 {
		return nil
	}
	var decoded any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return string(payload)
	}
	return decoded
}
