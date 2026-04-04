package projection

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	corecommand "cerulia/internal/core/command"
	"cerulia/internal/core/model"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

func TestValidateRebuildReplaysLongRunningAuditScenario(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	service := corecommand.NewService(dataStore)
	scenario := executeFinalGateScenario(t, ctx, service)
	assertScenarioServiceLog(t, ctx, dataStore, 13)

	before := snapshotProjectionState(t, ctx, dataStore, scenario)
	report, err := ValidateRebuild(ctx, dataStore)
	if err != nil {
		t.Fatalf("validate rebuild: %v", err)
	}
	if report != (RebuildReport{
		PublicationChains:      2,
		CurrentHeads:           2,
		CharacterHomes:         1,
		CharacterEpisodePages:  1,
		ReuseGrantPages:        1,
		CampaignOwnerViews:     1,
		CampaignPublicViews:    1,
		PublicationOwnerLists:  2,
		PublicationPublicLists: 2,
	}) {
		t.Fatalf("unexpected rebuild report: %+v", report)
	}

	replayedStore := replayStoreFromCanonical(t, ctx, dataStore)
	if _, err := ValidateRebuild(ctx, replayedStore); err != nil {
		t.Fatalf("validate replayed rebuild: %v", err)
	}
	after := snapshotProjectionState(t, ctx, replayedStore, scenario)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("projection rebuild drifted:\n before=%+v\n after=%+v", before, after)
	}

	if len(before.CharacterHome.RecentAdvancementRefs) != 1 || before.CharacterHome.RecentAdvancementRefs[0] != scenario.AdvancementRefCurrent {
		t.Fatalf("expected only corrected advancement ref, got %+v", before.CharacterHome.RecentAdvancementRefs)
	}
	if len(before.CharacterEpisodes.Items) != 1 || before.CharacterEpisodes.Items[0].CharacterEpisodeRef != scenario.EpisodeRefCurrent {
		t.Fatalf("expected only current episode, got %+v", before.CharacterEpisodes.Items)
	}
	if len(before.ReuseGrants.Items) != 1 || before.ReuseGrants.Items[0].RevokedAt == nil {
		t.Fatalf("expected revoked reuse grant summary, got %+v", before.ReuseGrants.Items)
	}
	if len(before.OwnerPublications.Items) != 1 || before.OwnerPublications.Items[0].PublicationRef != scenario.RetiredEpisodePublicationRef || before.OwnerPublications.Items[0].Status != "retired" {
		t.Fatalf("expected retired episode publication in owner list, got %+v", before.OwnerPublications.Items)
	}
	if len(before.PublicPublications.Items) != 0 {
		t.Fatalf("expected retired episode publication to be hidden from public list, got %+v", before.PublicPublications.Items)
	}
	if before.PublicCampaign.Mode != "public" || len(before.PublicCampaign.PublishedArtifacts) != 1 || before.PublicCampaign.PublishedArtifacts[0].SubjectRef != scenario.CampaignRef {
		t.Fatalf("expected only campaign publication in public campaign view, got %+v", before.PublicCampaign)
	}
	if before.OwnerCampaign.ArchivedCounts == nil || before.OwnerCampaign.ArchivedCounts.Publications != 1 || before.OwnerCampaign.ArchivedCounts.Episodes != 1 {
		t.Fatalf("expected archived counts for retired publication and superseded episode, got %+v", before.OwnerCampaign.ArchivedCounts)
	}
}

type finalGateScenario struct {
	OwnerDid                     string
	StewardDid                   string
	CampaignRef                  string
	BranchRef                    string
	AdvancementRefCurrent        string
	EpisodeRefCurrent            string
	RetiredEpisodePublicationRef string
}

type projectionSnapshot struct {
	CharacterHome      CharacterHomeView
	CharacterEpisodes  Page[EpisodeSummary]
	ReuseGrants        Page[ReuseGrantSummary]
	OwnerCampaign      CampaignView
	PublicCampaign     CampaignView
	OwnerPublications  Page[PublicationSummary]
	PublicPublications Page[PublicationSummary]
}

func executeFinalGateScenario(t *testing.T, ctx context.Context, service *corecommand.Service) finalGateScenario {
	t.Helper()
	ownerDid := "did:plc:owner-final-gate"
	stewardDid := "did:plc:steward-final-gate"

	campaignAck, err := service.CreateCampaign(ctx, stewardDid, corecommand.CreateCampaignInput{
		Title:                  "Final Gate Campaign",
		Visibility:             "public",
		RulesetNSID:            "app.cerulia.rules.core",
		RulesetManifestRef:     "at://did:plc:rules/app.cerulia.core.rulesetManifest/final-gate",
		DefaultReusePolicyKind: "same-campaign-default",
		StewardDids:            []string{stewardDid},
		RequestID:              "final-gate-campaign",
	})
	campaignRef := acceptedRef(t, campaignAck, err)
	sheetAck, err := service.ImportCharacterSheet(ctx, ownerDid, corecommand.ImportCharacterSheetInput{
		OwnerDid:    ownerDid,
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Final Gate Hero",
		RequestID:   "final-gate-sheet",
	})
	sheetRef := acceptedRef(t, sheetAck, err)
	branchAck, err := service.CreateCharacterBranch(ctx, ownerDid, corecommand.CreateCharacterBranchInput{
		OwnerDid:     ownerDid,
		BaseSheetRef: sheetRef,
		BranchKind:   "campaign-fork",
		BranchLabel:  "Main Branch",
		RequestID:    "final-gate-branch",
	})
	branchRef := acceptedRef(t, branchAck, err)
	advancementAck1, err := service.RecordCharacterAdvancement(ctx, ownerDid, corecommand.RecordCharacterAdvancementInput{
		CharacterBranchRef: branchRef,
		AdvancementKind:    "milestone",
		DeltaPayloadRef:    "https://cerulia.example/delta/1",
		ApprovedByDid:      ownerDid,
		EffectiveAt:        time.Date(2026, time.April, 4, 10, 0, 0, 0, time.UTC),
		RequestID:          "final-gate-advancement-1",
	})
	advancementRef1 := acceptedRef(t, advancementAck1, err)
	advancementAck2, err := service.RecordCharacterAdvancement(ctx, ownerDid, corecommand.RecordCharacterAdvancementInput{
		CharacterBranchRef: branchRef,
		AdvancementKind:    "correction",
		DeltaPayloadRef:    "https://cerulia.example/delta/2",
		ApprovedByDid:      ownerDid,
		EffectiveAt:        time.Date(2026, time.April, 4, 11, 0, 0, 0, time.UTC),
		SupersedesRef:      advancementRef1,
		RequestID:          "final-gate-advancement-2",
	})
	advancementRef2 := acceptedRef(t, advancementAck2, err)
	episodeAck1, err := service.RecordCharacterEpisode(ctx, ownerDid, corecommand.RecordCharacterEpisodeInput{
		CharacterBranchRef:       branchRef,
		CampaignRef:              campaignRef,
		ScenarioLabel:            "Session One",
		RulesetManifestRef:       "at://did:plc:rules/app.cerulia.core.rulesetManifest/final-gate",
		EffectiveRuleProfileRefs: []string{},
		OutcomeSummary:           "Initial outcome",
		AdvancementRefs:          []string{advancementRef1},
		RecordedByDid:            ownerDid,
		RequestID:                "final-gate-episode-1",
	})
	episodeRef1 := acceptedRef(t, episodeAck1, err)
	episodeAck2, err := service.RecordCharacterEpisode(ctx, ownerDid, corecommand.RecordCharacterEpisodeInput{
		CharacterBranchRef:       branchRef,
		CampaignRef:              campaignRef,
		ScenarioLabel:            "Session One Corrected",
		RulesetManifestRef:       "at://did:plc:rules/app.cerulia.core.rulesetManifest/final-gate",
		EffectiveRuleProfileRefs: []string{},
		OutcomeSummary:           "Corrected outcome",
		AdvancementRefs:          []string{advancementRef2},
		SupersedesRef:            episodeRef1,
		RecordedByDid:            ownerDid,
		RequestID:                "final-gate-episode-2",
	})
	episodeRef2 := acceptedRef(t, episodeAck2, err)
	grantAck, err := service.GrantReuse(ctx, ownerDid, corecommand.GrantReuseInput{
		CharacterBranchRef: branchRef,
		SourceCampaignRef:  campaignRef,
		TargetKind:         "actor",
		TargetDid:          ownerDid,
		ReuseMode:          "fork-only",
		RequestID:          "final-gate-reuse-grant",
	})
	grantRef := acceptedRef(t, grantAck, err)
	revokeAck, err := service.RevokeReuse(ctx, ownerDid, corecommand.RevokeReuseInput{
		ReuseGrantRef:    grantRef,
		RevokeReasonCode: "policy-change",
		RequestID:        "final-gate-reuse-revoke",
	})
	acceptedRef(t, revokeAck, err)
	campaignPublicationAck, err := service.PublishSubject(ctx, stewardDid, corecommand.PublishSubjectInput{
		SubjectRef:           campaignRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://cerulia.example/publications/final-gate-campaign",
		PreferredSurfaceKind: "app-card",
		Surfaces:             activePublicationSurfaces("https://cerulia.example/publications/final-gate-campaign"),
		RequestID:            "final-gate-publish-campaign",
	})
	acceptedRef(t, campaignPublicationAck, err)
	episodePublicationAck1, err := service.PublishSubject(ctx, ownerDid, corecommand.PublishSubjectInput{
		SubjectRef:           episodeRef2,
		SubjectKind:          "character-episode",
		EntryURL:             "https://cerulia.example/publications/final-gate-episode-1",
		PreferredSurfaceKind: "app-card",
		Surfaces:             activePublicationSurfaces("https://cerulia.example/publications/final-gate-episode-1"),
		RequestID:            "final-gate-publish-episode-1",
	})
	episodePublicationRef1 := acceptedPublicationRef(t, episodePublicationAck1, err)
	episodePublicationAck2, err := service.PublishSubject(ctx, ownerDid, corecommand.PublishSubjectInput{
		SubjectRef:             episodeRef2,
		SubjectKind:            "character-episode",
		EntryURL:               "https://cerulia.example/publications/final-gate-episode-2",
		PreferredSurfaceKind:   "app-card",
		Surfaces:               activePublicationSurfaces("https://cerulia.example/publications/final-gate-episode-2"),
		ExpectedCurrentHeadRef: episodePublicationRef1,
		RequestID:              "final-gate-publish-episode-2",
	})
	episodePublicationRef2 := acceptedPublicationRef(t, episodePublicationAck2, err)
	retireAck, err := service.RetirePublication(ctx, ownerDid, corecommand.RetirePublicationInput{
		PublicationRef: episodePublicationRef2,
		RequestID:      "final-gate-retire-episode-publication",
	})
	retiredPublicationRef := acceptedPublicationRef(t, retireAck, err)

	return finalGateScenario{
		OwnerDid:                     ownerDid,
		StewardDid:                   stewardDid,
		CampaignRef:                  campaignRef,
		BranchRef:                    branchRef,
		AdvancementRefCurrent:        advancementRef2,
		EpisodeRefCurrent:            episodeRef2,
		RetiredEpisodePublicationRef: retiredPublicationRef,
	}
}

func snapshotProjectionState(t *testing.T, ctx context.Context, reader store.Reader, scenario finalGateScenario) projectionSnapshot {
	t.Helper()
	service := NewService(reader)
	home, err := service.GetCharacterHome(ctx, scenario.OwnerDid, scenario.OwnerDid)
	if err != nil {
		t.Fatalf("get character home: %v", err)
	}
	episodes, err := service.ListCharacterEpisodes(ctx, scenario.OwnerDid, scenario.BranchRef, 100, "")
	if err != nil {
		t.Fatalf("list character episodes: %v", err)
	}
	reuseGrants, err := service.ListReuseGrants(ctx, scenario.OwnerDid, scenario.BranchRef, "all", 100, "")
	if err != nil {
		t.Fatalf("list reuse grants: %v", err)
	}
	ownerCampaign, err := service.GetCampaignView(ctx, scenario.StewardDid, scenario.CampaignRef, "owner-steward")
	if err != nil {
		t.Fatalf("get owner campaign view: %v", err)
	}
	publicCampaign, err := service.GetCampaignView(ctx, "", scenario.CampaignRef, "public")
	if err != nil {
		t.Fatalf("get public campaign view: %v", err)
	}
	ownerPublications, err := service.ListPublications(ctx, scenario.OwnerDid, scenario.EpisodeRefCurrent, "character-episode", "owner-steward", true, 100, "")
	if err != nil {
		t.Fatalf("list owner publications: %v", err)
	}
	publicPublications, err := service.ListPublications(ctx, "", scenario.EpisodeRefCurrent, "character-episode", "public", false, 100, "")
	if err != nil {
		t.Fatalf("list public publications: %v", err)
	}
	return projectionSnapshot{
		CharacterHome:      home,
		CharacterEpisodes:  episodes,
		ReuseGrants:        reuseGrants,
		OwnerCampaign:      ownerCampaign,
		PublicCampaign:     publicCampaign,
		OwnerPublications:  ownerPublications,
		PublicPublications: publicPublications,
	}
}

func replayStoreFromCanonical(t *testing.T, ctx context.Context, reader store.Reader) store.Reader {
	t.Helper()
	rebuiltHeads, err := BuildPublicationCurrentHeads(ctx, reader)
	if err != nil {
		t.Fatalf("build publication heads: %v", err)
	}
	replayed, err := replayCanonicalStore(ctx, reader, rebuiltHeads)
	if err != nil {
		t.Fatalf("replay canonical store: %v", err)
	}
	return replayed
}

func TestBuildPublicationCurrentHeadsRejectsForkedChain(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	subjectRef := store.BuildRef("did:plc:steward-fork", model.CollectionCampaign, "campaign-fork")
	rootRef := seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:     "did:plc:steward-fork",
		SubjectRef:  subjectRef,
		SubjectKind: "campaign",
		RecordKey:   "publication-root",
		RequestID:   "fork-root",
	})
	seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:       "did:plc:steward-fork",
		SubjectRef:    subjectRef,
		SubjectKind:   "campaign",
		RecordKey:     "publication-child-a",
		RequestID:     "fork-child-a",
		SupersedesRef: rootRef,
	})
	seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:       "did:plc:steward-fork",
		SubjectRef:    subjectRef,
		SubjectKind:   "campaign",
		RecordKey:     "publication-child-b",
		RequestID:     "fork-child-b",
		SupersedesRef: rootRef,
	})

	_, err := BuildPublicationCurrentHeads(ctx, dataStore)
	if err == nil || !strings.Contains(err.Error(), "fork") {
		t.Fatalf("expected forked chain error, got %v", err)
	}
}

func TestValidateRebuildRejectsCurrentHeadMismatch(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	subjectRef := store.BuildRef("did:plc:steward-mismatch", model.CollectionCampaign, "campaign-mismatch")
	rootRef := seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:     "did:plc:steward-mismatch",
		SubjectRef:  subjectRef,
		SubjectKind: "campaign",
		RecordKey:   "publication-root",
		RequestID:   "mismatch-root",
	})
	childRef := seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:       "did:plc:steward-mismatch",
		SubjectRef:    subjectRef,
		SubjectKind:   "campaign",
		RecordKey:     "publication-child",
		RequestID:     "mismatch-child",
		SupersedesRef: rootRef,
	})
	seedCurrentHead(t, ctx, dataStore, ledger.HeadRecord{
		SubjectRef:     subjectRef,
		SubjectKind:    "campaign",
		CurrentHeadRef: rootRef,
		ChainRootRef:   rootRef,
		RequestID:      "mismatch-head",
	})

	_, err := ValidateRebuild(ctx, dataStore)
	if err == nil || !strings.Contains(err.Error(), childRef) {
		t.Fatalf("expected current head mismatch mentioning %s, got %v", childRef, err)
	}
}

func TestValidateRebuildRejectsUnsupportedPublicationSubjectKind(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	subjectRef := store.BuildRef("did:plc:unknown", model.CollectionPublication, "unsupported-subject")
	publicationRef := seedPublicationRecord(t, ctx, dataStore, publicationSeed{
		RepoDID:     "did:plc:unknown",
		SubjectRef:  subjectRef,
		SubjectKind: "unknown-kind",
		RecordKey:   "publication-unsupported",
		RequestID:   "unsupported-publication",
	})
	seedCurrentHead(t, ctx, dataStore, ledger.HeadRecord{
		SubjectRef:     subjectRef,
		SubjectKind:    "unknown-kind",
		CurrentHeadRef: publicationRef,
		ChainRootRef:   publicationRef,
		RequestID:      "unsupported-publication",
	})

	_, err := ValidateRebuild(ctx, dataStore)
	if err == nil || !strings.Contains(err.Error(), "unsupported publication subject kind") {
		t.Fatalf("expected unsupported subject kind error, got %v", err)
	}
}

func TestValidateRebuildSupportsCharacterBranchPublication(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	service := corecommand.NewService(dataStore)

	sheetAck, err := service.ImportCharacterSheet(ctx, "did:plc:branch-owner", corecommand.ImportCharacterSheetInput{
		OwnerDid:    "did:plc:branch-owner",
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Branch Hero",
		RequestID:   "branch-publication-sheet",
	})
	sheetRef := acceptedRef(t, sheetAck, err)
	branchAck, err := service.CreateCharacterBranch(ctx, "did:plc:branch-owner", corecommand.CreateCharacterBranchInput{
		OwnerDid:     "did:plc:branch-owner",
		BaseSheetRef: sheetRef,
		BranchKind:   "campaign-fork",
		BranchLabel:  "Public Branch",
		RequestID:    "branch-publication-branch",
	})
	branchRef := acceptedRef(t, branchAck, err)
	_, err = service.PublishSubject(ctx, "did:plc:branch-owner", corecommand.PublishSubjectInput{
		SubjectRef:           branchRef,
		SubjectKind:          "character-branch",
		EntryURL:             "https://cerulia.example/publications/branch-public",
		PreferredSurfaceKind: "app-card",
		Surfaces:             activePublicationSurfaces("https://cerulia.example/publications/branch-public"),
		RequestID:            "branch-publication-publish",
	})
	if err != nil {
		t.Fatalf("publish branch: %v", err)
	}

	report, err := ValidateRebuild(ctx, dataStore)
	if err != nil {
		t.Fatalf("validate branch publication rebuild: %v", err)
	}
	if report.PublicationChains != 1 || report.PublicationOwnerLists != 1 || report.PublicationPublicLists != 1 {
		t.Fatalf("unexpected branch publication report: %+v", report)
	}
}

func TestCollectAllPagesFollowsCursorUntilExhaustion(t *testing.T) {
	page, err := collectAllPages(func(cursor string) (Page[int], error) {
		switch cursor {
		case "":
			return Page[int]{Items: []int{1, 2}, Cursor: "2"}, nil
		case "2":
			return Page[int]{Items: []int{3, 4}}, nil
		default:
			return Page[int]{}, nil
		}
	})
	if err != nil {
		t.Fatalf("collect all pages: %v", err)
	}
	if !reflect.DeepEqual(page.Items, []int{1, 2, 3, 4}) {
		t.Fatalf("expected all items to be collected, got %+v", page.Items)
	}
}

type publicationSeed struct {
	RepoDID       string
	SubjectRef    string
	SubjectKind   string
	RecordKey     string
	RequestID     string
	SupersedesRef string
}

func seedPublicationRecord(t *testing.T, ctx context.Context, dataStore store.Store, seed publicationSeed) string {
	t.Helper()
	ref := store.BuildRef(seed.RepoDID, model.CollectionPublication, seed.RecordKey)
	body, err := model.Marshal(model.Publication{
		SubjectRef:           seed.SubjectRef,
		SubjectKind:          seed.SubjectKind,
		EntryURL:             "https://cerulia.example/publications/" + seed.RecordKey,
		PreferredSurfaceKind: "app-card",
		Surfaces:             activePublicationSurfaces("https://cerulia.example/publications/" + seed.RecordKey),
		Status:               "active",
		SupersedesRef:        seed.SupersedesRef,
		PublishedByDid:       seed.RepoDID,
		PublishedAt:          time.Date(2026, time.April, 4, 12, 0, 0, 0, time.UTC),
		RequestID:            seed.RequestID,
	})
	if err != nil {
		t.Fatalf("marshal publication: %v", err)
	}
	if err := dataStore.WithTx(ctx, func(tx store.Tx) error {
		return tx.PutAppend(ctx, store.AppendRecord{
			Ref:          ref,
			Collection:   model.CollectionPublication,
			RepoDID:      seed.RepoDID,
			RecordKey:    seed.RecordKey,
			GoverningRef: seed.SubjectRef,
			RequestID:    seed.RequestID,
			Body:         body,
			CreatedAt:    time.Date(2026, time.April, 4, 12, 0, 0, 0, time.UTC),
		})
	}); err != nil {
		t.Fatalf("seed publication: %v", err)
	}
	return ref
}

func seedCurrentHead(t *testing.T, ctx context.Context, dataStore store.Store, head ledger.HeadRecord) {
	t.Helper()
	if err := dataStore.WithTx(ctx, func(tx store.Tx) error {
		return tx.PutCurrentHead(ctx, head)
	}); err != nil {
		t.Fatalf("seed current head: %v", err)
	}
}

func assertScenarioServiceLog(t *testing.T, ctx context.Context, reader store.Reader, wantCount int) {
	t.Helper()
	entries, err := reader.ListServiceLogs(ctx)
	if err != nil {
		t.Fatalf("list service logs: %v", err)
	}
	if len(entries) != wantCount {
		t.Fatalf("expected %d service log entries, got %d", wantCount, len(entries))
	}
	for _, entry := range entries {
		if entry.ResultKind != ledger.ResultAccepted {
			t.Fatalf("expected accepted service log entries, got %+v", entry)
		}
	}
}

func activePublicationSurfaces(entryURL string) []model.SurfaceDescriptor {
	return []model.SurfaceDescriptor{{
		SurfaceKind: "app-card",
		PurposeKind: "stable-entry",
		SurfaceURI:  entryURL,
		Status:      "active",
	}}
}

func acceptedRef(t *testing.T, ack ledger.MutationAck, err error) string {
	t.Helper()
	if err != nil {
		t.Fatalf("mutation error: %v", err)
	}
	if ack.ResultKind != ledger.ResultAccepted || len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected accepted ack with one emitted ref, got %+v", ack)
	}
	return ack.EmittedRecordRefs[0]
}

func acceptedPublicationRef(t *testing.T, ack ledger.MutationAck, err error) string {
	t.Helper()
	if err != nil {
		t.Fatalf("publication mutation error: %v", err)
	}
	if ack.ResultKind != ledger.ResultAccepted || ack.PublicationRef == "" {
		t.Fatalf("expected accepted publication ack, got %+v", ack)
	}
	return ack.PublicationRef
}
