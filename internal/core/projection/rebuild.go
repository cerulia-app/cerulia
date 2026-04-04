package projection

import (
	"context"
	"fmt"
	"reflect"
	"sort"

	"cerulia/internal/core/model"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

type publicationNode struct {
	ref         string
	subjectRef  string
	subjectKind string
	supersedes  string
	requestID   string
}

type RebuildReport struct {
	PublicationChains      int `json:"publicationChains"`
	CurrentHeads           int `json:"currentHeads"`
	CharacterHomes         int `json:"characterHomes"`
	CharacterEpisodePages  int `json:"characterEpisodePages"`
	ReuseGrantPages        int `json:"reuseGrantPages"`
	CampaignOwnerViews     int `json:"campaignOwnerViews"`
	CampaignPublicViews    int `json:"campaignPublicViews"`
	PublicationOwnerLists  int `json:"publicationOwnerLists"`
	PublicationPublicLists int `json:"publicationPublicLists"`
}

type rebuildSnapshot struct {
	CharacterHomes      map[string]CharacterHomeView
	CharacterEpisodes   map[string]Page[EpisodeSummary]
	ReuseGrants         map[string]Page[ReuseGrantSummary]
	CampaignOwnerViews  map[string]CampaignView
	CampaignPublicViews map[string]campaignPublicSnapshot
	PublicationOwners   map[string]Page[PublicationSummary]
	PublicationPublics  map[string]Page[PublicationSummary]
}

type campaignPublicSnapshot struct {
	Found bool
	View  CampaignView
}

type replayReader struct {
	stable       map[string]store.StableRecord
	appendOnly   map[string]store.AppendRecord
	currentHeads map[string]ledger.HeadRecord
}

func BuildPublicationCurrentHeads(ctx context.Context, reader store.Reader) ([]ledger.HeadRecord, error) {
	records, err := reader.ListAppendByCollection(ctx, model.CollectionPublication)
	if err != nil {
		return nil, err
	}

	groups := map[string]map[string]publicationNode{}
	for _, record := range records {
		value, err := model.UnmarshalAppend[model.Publication](record)
		if err != nil {
			return nil, fmt.Errorf("decode publication %s: %w", record.Ref, err)
		}
		if value.SubjectRef == "" || value.SubjectKind == "" {
			return nil, fmt.Errorf("publication %s is missing subject identity", record.Ref)
		}
		if record.GoverningRef != value.SubjectRef {
			return nil, fmt.Errorf("publication %s governingRef mismatch", record.Ref)
		}
		key := publicationGroupKey(value.SubjectRef, value.SubjectKind)
		if _, ok := groups[key]; !ok {
			groups[key] = map[string]publicationNode{}
		}
		groups[key][record.Ref] = publicationNode{
			ref:         record.Ref,
			subjectRef:  value.SubjectRef,
			subjectKind: value.SubjectKind,
			supersedes:  value.SupersedesRef,
			requestID:   value.RequestID,
		}
	}

	headKeys := make([]string, 0, len(groups))
	for key := range groups {
		headKeys = append(headKeys, key)
	}
	sort.Strings(headKeys)

	heads := make([]ledger.HeadRecord, 0, len(headKeys))
	for _, key := range headKeys {
		head, err := buildPublicationHead(groups[key])
		if err != nil {
			return nil, err
		}
		heads = append(heads, head)
	}

	return heads, nil
}

func ValidateRebuild(ctx context.Context, reader store.Reader) (RebuildReport, error) {
	report := RebuildReport{}

	rebuiltHeads, err := BuildPublicationCurrentHeads(ctx, reader)
	if err != nil {
		return report, err
	}
	currentHeads, err := reader.ListCurrentHeads(ctx)
	if err != nil {
		return report, err
	}
	if err := compareCurrentHeads(rebuiltHeads, currentHeads); err != nil {
		return report, err
	}
	liveSnapshot, report, err := captureRebuildSnapshot(ctx, reader, rebuiltHeads)
	if err != nil {
		return report, err
	}
	replayedReader, err := replayCanonicalStore(ctx, reader, rebuiltHeads)
	if err != nil {
		return report, err
	}
	replayedSnapshot, replayedReport, err := captureRebuildSnapshot(ctx, replayedReader, rebuiltHeads)
	if err != nil {
		return report, err
	}
	if report != replayedReport {
		return report, fmt.Errorf("rebuild replay report mismatch: live=%+v replay=%+v", report, replayedReport)
	}
	if !reflect.DeepEqual(liveSnapshot, replayedSnapshot) {
		return report, fmt.Errorf("rebuild replay drift detected")
	}

	return report, nil
}

func buildPublicationHead(group map[string]publicationNode) (ledger.HeadRecord, error) {
	if len(group) == 0 {
		return ledger.HeadRecord{}, fmt.Errorf("publication chain is empty")
	}

	children := map[string]string{}
	rootRef := ""
	for ref, node := range group {
		if node.supersedes == "" {
			if rootRef != "" {
				return ledger.HeadRecord{}, fmt.Errorf("publication subject %s has multiple roots", node.subjectRef)
			}
			rootRef = ref
			continue
		}
		parent, ok := group[node.supersedes]
		if !ok {
			return ledger.HeadRecord{}, fmt.Errorf("publication %s supersedes missing ref %s", ref, node.supersedes)
		}
		if parent.subjectRef != node.subjectRef || parent.subjectKind != node.subjectKind {
			return ledger.HeadRecord{}, fmt.Errorf("publication %s supersedes a different subject", ref)
		}
		if existingChild, ok := children[node.supersedes]; ok {
			return ledger.HeadRecord{}, fmt.Errorf("publication chain forks at %s via %s and %s", node.supersedes, existingChild, ref)
		}
		children[node.supersedes] = ref
	}
	if rootRef == "" {
		return ledger.HeadRecord{}, fmt.Errorf("publication chain is missing a root")
	}

	currentRef := ""
	for ref := range group {
		if _, ok := children[ref]; ok {
			continue
		}
		if currentRef != "" {
			return ledger.HeadRecord{}, fmt.Errorf("publication subject %s has multiple current heads", group[ref].subjectRef)
		}
		currentRef = ref
	}
	if currentRef == "" {
		return ledger.HeadRecord{}, fmt.Errorf("publication chain is missing a current head")
	}

	visited := map[string]struct{}{}
	for cursor := currentRef; cursor != ""; cursor = group[cursor].supersedes {
		if _, ok := visited[cursor]; ok {
			return ledger.HeadRecord{}, fmt.Errorf("publication chain contains a cycle at %s", cursor)
		}
		visited[cursor] = struct{}{}
	}
	if len(visited) != len(group) {
		return ledger.HeadRecord{}, fmt.Errorf("publication chain for %s is disconnected", group[currentRef].subjectRef)
	}

	current := group[currentRef]
	return ledger.HeadRecord{
		SubjectRef:     current.subjectRef,
		SubjectKind:    current.subjectKind,
		CurrentHeadRef: current.ref,
		ChainRootRef:   rootRef,
		RequestID:      current.requestID,
	}, nil
}

func compareCurrentHeads(expected []ledger.HeadRecord, actual []ledger.HeadRecord) error {
	sort.Slice(actual, func(left int, right int) bool {
		if actual[left].SubjectKind == actual[right].SubjectKind {
			return actual[left].SubjectRef < actual[right].SubjectRef
		}
		return actual[left].SubjectKind < actual[right].SubjectKind
	})
	if len(expected) != len(actual) {
		return fmt.Errorf("current head count mismatch: expected %d, got %d", len(expected), len(actual))
	}
	for index := range expected {
		if expected[index] != actual[index] {
			return fmt.Errorf("current head mismatch at %d: expected %+v, got %+v", index, expected[index], actual[index])
		}
	}
	return nil
}

func publicationActorForSubject(ctx context.Context, reader store.Reader, subjectRef string, subjectKind string) (string, error) {
	switch subjectKind {
	case "campaign":
		_, campaign, err := decodeStable[model.Campaign](ctx, reader, subjectRef)
		if err != nil {
			return "", err
		}
		if len(campaign.StewardDids) == 0 {
			return "", fmt.Errorf("campaign %s has no steward", subjectRef)
		}
		return campaign.StewardDids[0], nil
	case "character-branch":
		_, branch, err := decodeStable[model.CharacterBranch](ctx, reader, subjectRef)
		if err != nil {
			return "", err
		}
		return branch.OwnerDid, nil
	case "character-episode":
		_, episode, err := decodeAppend[model.CharacterEpisode](ctx, reader, subjectRef)
		if err != nil {
			return "", err
		}
		if episode.RecordedByDid != "" {
			return episode.RecordedByDid, nil
		}
		_, branch, err := decodeStable[model.CharacterBranch](ctx, reader, episode.CharacterBranchRef)
		if err != nil {
			return "", err
		}
		return branch.OwnerDid, nil
	default:
		return "", fmt.Errorf("unsupported publication subject kind %q", subjectKind)
	}
}

func publicationGroupKey(subjectRef string, subjectKind string) string {
	return subjectKind + "\x00" + subjectRef
}

func sortedKeys(values map[string]struct{}) []string {
	items := make([]string, 0, len(values))
	for value := range values {
		items = append(items, value)
	}
	sort.Strings(items)
	return items
}

func captureRebuildSnapshot(ctx context.Context, reader store.Reader, rebuiltHeads []ledger.HeadRecord) (rebuildSnapshot, RebuildReport, error) {
	service := NewService(reader)
	snapshot := rebuildSnapshot{
		CharacterHomes:      map[string]CharacterHomeView{},
		CharacterEpisodes:   map[string]Page[EpisodeSummary]{},
		ReuseGrants:         map[string]Page[ReuseGrantSummary]{},
		CampaignOwnerViews:  map[string]CampaignView{},
		CampaignPublicViews: map[string]campaignPublicSnapshot{},
		PublicationOwners:   map[string]Page[PublicationSummary]{},
		PublicationPublics:  map[string]Page[PublicationSummary]{},
	}
	report := RebuildReport{
		PublicationChains: len(rebuiltHeads),
		CurrentHeads:      len(rebuiltHeads),
	}

	branches, err := reader.ListStableByCollection(ctx, model.CollectionCharacterBranch)
	if err != nil {
		return snapshot, report, err
	}
	owners := map[string]struct{}{}
	for _, record := range branches {
		value, err := model.UnmarshalStable[model.CharacterBranch](record)
		if err != nil {
			return snapshot, report, err
		}
		owners[value.OwnerDid] = struct{}{}
	}
	for _, ownerDid := range sortedKeys(owners) {
		home, err := service.GetCharacterHome(ctx, ownerDid, ownerDid)
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild character home %s: %w", ownerDid, err)
		}
		snapshot.CharacterHomes[ownerDid] = home
		report.CharacterHomes++
	}

	for _, branchRecord := range branches {
		branch, err := model.UnmarshalStable[model.CharacterBranch](branchRecord)
		if err != nil {
			return snapshot, report, err
		}
		episodes, err := collectAllPages(func(cursor string) (Page[EpisodeSummary], error) {
			return service.ListCharacterEpisodes(ctx, branch.OwnerDid, branchRecord.Ref, 100, cursor)
		})
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild character episodes %s: %w", branchRecord.Ref, err)
		}
		snapshot.CharacterEpisodes[branchRecord.Ref] = episodes
		report.CharacterEpisodePages++
		reuseGrants, err := collectAllPages(func(cursor string) (Page[ReuseGrantSummary], error) {
			return service.ListReuseGrants(ctx, branch.OwnerDid, branchRecord.Ref, "all", 100, cursor)
		})
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild reuse grants %s: %w", branchRecord.Ref, err)
		}
		snapshot.ReuseGrants[branchRecord.Ref] = reuseGrants
		report.ReuseGrantPages++
	}

	campaigns, err := reader.ListStableByCollection(ctx, model.CollectionCampaign)
	if err != nil {
		return snapshot, report, err
	}
	for _, campaignRecord := range campaigns {
		campaign, err := model.UnmarshalStable[model.Campaign](campaignRecord)
		if err != nil {
			return snapshot, report, err
		}
		actorDid := ""
		if len(campaign.StewardDids) > 0 {
			actorDid = campaign.StewardDids[0]
		}
		ownerView, err := service.GetCampaignView(ctx, actorDid, campaignRecord.Ref, "owner-steward")
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild campaign owner view %s: %w", campaignRecord.Ref, err)
		}
		snapshot.CampaignOwnerViews[campaignRecord.Ref] = ownerView
		report.CampaignOwnerViews++

		publications, err := collectAllPages(func(cursor string) (Page[PublicationSummary], error) {
			return service.ListPublications(ctx, "", campaignRecord.Ref, "campaign", "public", false, 100, cursor)
		})
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild campaign publication list %s: %w", campaignRecord.Ref, err)
		}
		publicView, err := service.GetCampaignView(ctx, "", campaignRecord.Ref, "public")
		hasPublicCampaignHead := len(publications.Items) > 0
		switch {
		case hasPublicCampaignHead && err != nil:
			return snapshot, report, fmt.Errorf("rebuild campaign public view %s: %w", campaignRecord.Ref, err)
		case !hasPublicCampaignHead && err == nil:
			return snapshot, report, fmt.Errorf("campaign %s returned public view without a public campaign head", campaignRecord.Ref)
		case !hasPublicCampaignHead && err == store.ErrNotFound:
			snapshot.CampaignPublicViews[campaignRecord.Ref] = campaignPublicSnapshot{Found: false}
		case err != nil:
			return snapshot, report, fmt.Errorf("rebuild campaign public view %s: %w", campaignRecord.Ref, err)
		default:
			snapshot.CampaignPublicViews[campaignRecord.Ref] = campaignPublicSnapshot{Found: true, View: publicView}
		}
		report.CampaignPublicViews++
	}

	for _, head := range rebuiltHeads {
		key := publicationGroupKey(head.SubjectRef, head.SubjectKind)
		actorDid, err := publicationActorForSubject(ctx, reader, head.SubjectRef, head.SubjectKind)
		if err != nil {
			return snapshot, report, err
		}
		ownerPage, err := collectAllPages(func(cursor string) (Page[PublicationSummary], error) {
			return service.ListPublications(ctx, actorDid, head.SubjectRef, head.SubjectKind, "owner-steward", true, 100, cursor)
		})
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild owner publication list %s: %w", head.SubjectRef, err)
		}
		snapshot.PublicationOwners[key] = ownerPage
		report.PublicationOwnerLists++
		publicPage, err := collectAllPages(func(cursor string) (Page[PublicationSummary], error) {
			return service.ListPublications(ctx, "", head.SubjectRef, head.SubjectKind, "public", false, 100, cursor)
		})
		if err != nil {
			return snapshot, report, fmt.Errorf("rebuild public publication list %s: %w", head.SubjectRef, err)
		}
		snapshot.PublicationPublics[key] = publicPage
		report.PublicationPublicLists++
	}

	return snapshot, report, nil
}

func replayCanonicalStore(ctx context.Context, reader store.Reader, rebuiltHeads []ledger.HeadRecord) (store.Reader, error) {
	replayed := &replayReader{
		stable:       map[string]store.StableRecord{},
		appendOnly:   map[string]store.AppendRecord{},
		currentHeads: map[string]ledger.HeadRecord{},
	}
	stableCollections := []string{
		model.CollectionWorld,
		model.CollectionHouse,
		model.CollectionCampaign,
		model.CollectionRulesetManifest,
		model.CollectionRuleProfile,
		model.CollectionCharacterSheet,
		model.CollectionCharacterBranch,
	}
	appendCollections := []string{
		model.CollectionCharacterAdvancement,
		model.CollectionCharacterEpisode,
		model.CollectionCharacterConversion,
		model.CollectionPublication,
		model.CollectionReuseGrant,
	}
	for _, collection := range stableCollections {
		records, err := reader.ListStableByCollection(ctx, collection)
		if err != nil {
			return nil, err
		}
		for _, record := range records {
			replayed.stable[record.Ref] = cloneReplayStable(record)
		}
	}
	for _, collection := range appendCollections {
		records, err := reader.ListAppendByCollection(ctx, collection)
		if err != nil {
			return nil, err
		}
		for _, record := range records {
			replayed.appendOnly[record.Ref] = cloneReplayAppend(record)
		}
	}
	for _, head := range rebuiltHeads {
		replayed.currentHeads[publicationGroupKey(head.SubjectRef, head.SubjectKind)] = head
	}
	return replayed, nil
}

func (reader *replayReader) GetStable(_ context.Context, ref string) (store.StableRecord, error) {
	record, ok := reader.stable[ref]
	if !ok {
		return store.StableRecord{}, store.ErrNotFound
	}
	return cloneReplayStable(record), nil
}

func (reader *replayReader) ListStableByCollection(_ context.Context, collection string) ([]store.StableRecord, error) {
	items := make([]store.StableRecord, 0)
	for _, record := range reader.stable {
		if record.Collection != collection {
			continue
		}
		items = append(items, cloneReplayStable(record))
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].UpdatedAt.Equal(items[right].UpdatedAt) {
			return items[left].Ref < items[right].Ref
		}
		return items[left].UpdatedAt.After(items[right].UpdatedAt)
	})
	return items, nil
}

func (reader *replayReader) GetAppend(_ context.Context, ref string) (store.AppendRecord, error) {
	record, ok := reader.appendOnly[ref]
	if !ok {
		return store.AppendRecord{}, store.ErrNotFound
	}
	return cloneReplayAppend(record), nil
}

func (reader *replayReader) ListAppendByCollection(_ context.Context, collection string) ([]store.AppendRecord, error) {
	items := make([]store.AppendRecord, 0)
	for _, record := range reader.appendOnly {
		if record.Collection != collection {
			continue
		}
		items = append(items, cloneReplayAppend(record))
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].CreatedAt.Equal(items[right].CreatedAt) {
			return items[left].Ref > items[right].Ref
		}
		return items[left].CreatedAt.After(items[right].CreatedAt)
	})
	return items, nil
}

func (reader *replayReader) GetCurrentHead(_ context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error) {
	head, ok := reader.currentHeads[publicationGroupKey(subjectRef, subjectKind)]
	if !ok {
		return nil, nil
	}
	clone := head
	return &clone, nil
}

func (reader *replayReader) ListCurrentHeads(_ context.Context) ([]ledger.HeadRecord, error) {
	items := make([]ledger.HeadRecord, 0, len(reader.currentHeads))
	for _, head := range reader.currentHeads {
		items = append(items, head)
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].SubjectKind == items[right].SubjectKind {
			return items[left].SubjectRef < items[right].SubjectRef
		}
		return items[left].SubjectKind < items[right].SubjectKind
	})
	return items, nil
}

func (reader *replayReader) ListServiceLogs(_ context.Context) ([]ledger.ServiceLogEntry, error) {
	return nil, nil
}

func cloneReplayStable(record store.StableRecord) store.StableRecord {
	clone := record
	clone.Body = append([]byte(nil), record.Body...)
	return clone
}

func cloneReplayAppend(record store.AppendRecord) store.AppendRecord {
	clone := record
	clone.Body = append([]byte(nil), record.Body...)
	return clone
}

func collectAllPages[T any](fetch func(cursor string) (Page[T], error)) (Page[T], error) {
	items := make([]T, 0)
	cursor := ""
	for {
		page, err := fetch(cursor)
		if err != nil {
			return Page[T]{}, err
		}
		items = append(items, page.Items...)
		if page.Cursor == "" {
			break
		}
		cursor = page.Cursor
	}
	return Page[T]{Items: items}, nil
}
