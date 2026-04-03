package command

import (
	"context"
	"testing"

	corecommand "cerulia/internal/core/command"
	coremodel "cerulia/internal/core/model"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

func TestPublishAndRetireSessionLink(t *testing.T) {
	dataStore := store.NewMemoryStore()
	coreService := corecommand.NewService(dataStore)
	runService := NewService(dataStore)

	campaignAck, err := coreService.CreateCampaign(context.Background(), "did:plc:gm1", corecommand.CreateCampaignInput{
		Title:                  "Campaign",
		Visibility:             "public",
		RulesetNSID:            "app.cerulia.rules.core",
		RulesetManifestRef:     "at://manifest/1",
		DefaultReusePolicyKind: "same-campaign-default",
		StewardDids:            []string{"did:plc:gm1"},
		RequestID:              "req-campaign-1",
	})
	if err != nil {
		t.Fatalf("create campaign: %v", err)
	}
	campaignRef := campaignAck.EmittedRecordRefs[0]
	publicationAck, err := coreService.PublishSubject(context.Background(), "did:plc:gm1", corecommand.PublishSubjectInput{
		SubjectRef:           campaignRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://example.test/campaigns/1",
		PreferredSurfaceKind: "app-card",
		Surfaces:             []coremodel.SurfaceDescriptor{{SurfaceKind: "app-card", PurposeKind: "stable-entry", SurfaceURI: "https://example.test/campaigns/1", Status: "active"}},
		RequestID:            "req-publish-1",
	})
	if err != nil {
		t.Fatalf("publish subject: %v", err)
	}

	sessionAck, err := runService.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-1",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-session-1",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]

	carrierAck, err := runService.PublishSessionLink(context.Background(), "did:plc:gm1", PublishSessionLinkInput{
		SessionRef:                 sessionRef,
		PublicationRef:             publicationAck.PublicationRef,
		ExpectedPublicationHeadRef: publicationAck.PublicationRef,
		EntryURL:                   "https://example.test/sessions/1",
		ReplayURL:                  "https://example.test/sessions/1/replay",
		PreferredSurfaceKind:       "app-card",
		Surfaces:                   []coremodel.SurfaceDescriptor{{SurfaceKind: "app-card", PurposeKind: "stable-entry", SurfaceURI: "https://example.test/sessions/1", Status: "active"}},
		RequestID:                  "req-session-link-1",
	})
	if err != nil {
		t.Fatalf("publish session link: %v", err)
	}
	if carrierAck.SessionPublicationRef == "" {
		t.Fatal("expected session publication ref")
	}
	currentHead, err := dataStore.GetCurrentHead(context.Background(), sessionRef, sessionPublicationHeadKind)
	if err != nil || currentHead == nil || currentHead.CurrentHeadRef != carrierAck.SessionPublicationRef {
		t.Fatalf("expected session publication current head, got head=%v err=%v", currentHead, err)
	}

	retireAck, err := runService.RetireSessionLink(context.Background(), "did:plc:gm1", RetireSessionLinkInput{
		SessionRef:                 sessionRef,
		SessionPublicationRef:      carrierAck.SessionPublicationRef,
		ExpectedPublicationHeadRef: publicationAck.PublicationRef,
		RequestID:                  "req-session-link-retire-1",
	})
	if err != nil {
		t.Fatalf("retire session link: %v", err)
	}
	retiredRecord, err := dataStore.GetAppend(context.Background(), retireAck.SessionPublicationRef)
	if err != nil {
		t.Fatalf("get retired session publication: %v", err)
	}
	retired, err := runmodel.UnmarshalAppend[runmodel.SessionPublication](retiredRecord)
	if err != nil {
		t.Fatalf("decode retired session publication: %v", err)
	}
	if retired.RetiredAt == nil || retired.SupersedesRef != carrierAck.SessionPublicationRef {
		t.Fatalf("expected retired carrier to supersede %q, got retiredAt=%v supersedes=%q", carrierAck.SessionPublicationRef, retired.RetiredAt, retired.SupersedesRef)
	}
}

func TestSubmitAndWithdrawAppeal(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	sessionAck, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-1",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1", "did:plc:gm2"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-session-1",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]
	_, err = service.InviteSession(context.Background(), "did:plc:gm1", InviteSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", Role: "player", RequestID: "req-invite-1"})
	if err != nil {
		t.Fatalf("invite session: %v", err)
	}
	_, err = service.JoinSession(context.Background(), "did:plc:player1", JoinSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "invited", RequestID: "req-join-1"})
	if err != nil {
		t.Fatalf("join session: %v", err)
	}
	removeAck, err := service.ModerateMembership(context.Background(), "did:plc:gm1", ModerateMembershipInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "joined", NextStatus: "removed", RequestID: "req-remove-1", ReasonCode: "moderation"})
	if err != nil {
		t.Fatalf("remove membership: %v", err)
	}

	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removeAck.EmittedRecordRefs[0],
		TargetRequestID:      "req-remove-1",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-appeal-1",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	if appealAck.CaseRevision == nil || *appealAck.CaseRevision != 1 {
		t.Fatalf("expected case revision 1, got %v", appealAck.CaseRevision)
	}
	appealRecord, err := service.store.GetStable(context.Background(), appealAck.EmittedRecordRefs[0])
	if err != nil {
		t.Fatalf("get appeal case: %v", err)
	}
	appealCase, err := runmodel.UnmarshalStable[runmodel.AppealCase](appealRecord)
	if err != nil {
		t.Fatalf("decode appeal case: %v", err)
	}
	if appealCase.BlockedReasonCode != "" {
		t.Fatalf("expected non-blocked appeal case, got %q", appealCase.BlockedReasonCode)
	}

	withdrawAck, err := service.WithdrawAppeal(context.Background(), "did:plc:player1", WithdrawAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-withdraw-1",
	})
	if err != nil {
		t.Fatalf("withdraw appeal: %v", err)
	}
	if withdrawAck.CaseRevision == nil || *withdrawAck.CaseRevision != 2 {
		t.Fatalf("expected case revision 2 after withdraw, got %v", withdrawAck.CaseRevision)
	}
}
