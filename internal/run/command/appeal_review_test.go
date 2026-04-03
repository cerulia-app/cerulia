package command

import (
	"context"
	"testing"
	"time"

	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

func TestSubmitAppealRejectsInvalidInputs(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-invalid")

	tests := []struct {
		name  string
		input SubmitAppealInput
	}{
		{
			name: "wrong membership request id",
			input: SubmitAppealInput{
				SessionRef:           sessionRef,
				TargetKind:           "membership",
				TargetRef:            removedMembershipRef,
				TargetRequestID:      "req-other",
				AffectedActorDid:     "did:plc:player1",
				RequestedOutcomeKind: "restore-membership",
				RequestID:            "req-appeal-invalid-request",
			},
		},
		{
			name: "unsupported membership outcome",
			input: SubmitAppealInput{
				SessionRef:           sessionRef,
				TargetKind:           "membership",
				TargetRef:            removedMembershipRef,
				TargetRequestID:      "req-invalid-remove",
				AffectedActorDid:     "did:plc:player1",
				RequestedOutcomeKind: "reconsider-membership",
				RequestID:            "req-appeal-invalid-outcome",
			},
		},
		{
			name: "unsupported target kind",
			input: SubmitAppealInput{
				SessionRef:           sessionRef,
				TargetKind:           "publication",
				TargetRef:            removedMembershipRef,
				TargetRequestID:      "req-invalid-remove",
				AffectedActorDid:     "did:plc:player1",
				RequestedOutcomeKind: "restore-membership",
				RequestID:            "req-appeal-invalid-target",
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			ack, err := service.SubmitAppeal(context.Background(), "did:plc:player1", test.input)
			if err != nil {
				t.Fatalf("submit appeal returned error: %v", err)
			}
			if ack.ResultKind != ledger.ResultRejected {
				t.Fatalf("expected rejected result, got %q", ack.ResultKind)
			}
		})
	}
}

func TestWithdrawAppealAllowsBlockedCaseBeforeEscalation(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1"}, "req-blocked")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-blocked-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-blocked-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	ack, err := service.WithdrawAppeal(context.Background(), "did:plc:player1", WithdrawAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-blocked-withdraw",
	})
	if err != nil {
		t.Fatalf("withdraw appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultAccepted || ack.CaseRevision == nil || *ack.CaseRevision != 2 {
		t.Fatalf("expected blocked withdraw to succeed before escalation, got result=%q revision=%v", ack.ResultKind, ack.CaseRevision)
	}
}

func TestResolveMembershipAppealAfterControllerReview(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-membership-resolve")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-membership-resolve-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-membership-resolve-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	reviewAck, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-membership-resolve-review",
	})
	if err != nil {
		t.Fatalf("review appeal: %v", err)
	}
	if reviewAck.ReviewRevision == nil || *reviewAck.ReviewRevision != 1 {
		t.Fatalf("expected review revision 1, got %v", reviewAck.ReviewRevision)
	}
	resolveAck, err := service.ResolveAppeal(context.Background(), "did:plc:gm2", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		DecisionKind:           "accepted",
		ResultSummary:          "membership を restore した。",
		RequestID:              "req-membership-resolve-final",
	})
	if err != nil {
		t.Fatalf("resolve appeal: %v", err)
	}
	if resolveAck.CaseRevision == nil || *resolveAck.CaseRevision != 2 {
		t.Fatalf("expected case revision 2, got %v", resolveAck.CaseRevision)
	}
	if len(resolveAck.EmittedRecordRefs) != 2 {
		t.Fatalf("expected appeal case and membership correction refs, got %v", resolveAck.EmittedRecordRefs)
	}
	_, currentMembership, ok, err := service.currentMembership(context.Background(), service.store, sessionRef, "did:plc:player1")
	if err != nil {
		t.Fatalf("current membership: %v", err)
	}
	if !ok || currentMembership.Status != "joined" || currentMembership.StatusReasonCode != "appeal-correction" {
		t.Fatalf("expected joined appeal correction membership, got ok=%v status=%q reason=%q", ok, currentMembership.Status, currentMembership.StatusReasonCode)
	}
}

func TestResolveAppealDeniedDoesNotEmitCorrection(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-membership-denied")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-membership-denied-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-membership-denied-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "deny",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-membership-denied-review",
	})
	if err != nil {
		t.Fatalf("review appeal: %v", err)
	}
	resolveAck, err := service.ResolveAppeal(context.Background(), "did:plc:gm2", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		DecisionKind:           "denied",
		ResultSummary:          "membership restore は認めなかった。",
		RequestID:              "req-membership-denied-final",
	})
	if err != nil {
		t.Fatalf("resolve appeal denied: %v", err)
	}
	if len(resolveAck.EmittedRecordRefs) != 1 || resolveAck.EmittedRecordRefs[0] != appealAck.EmittedRecordRefs[0] {
		t.Fatalf("expected denied resolve to emit only the appeal case ref, got %v", resolveAck.EmittedRecordRefs)
	}
	_, currentMembership, ok, err := service.currentMembership(context.Background(), service.store, sessionRef, "did:plc:player1")
	if err != nil {
		t.Fatalf("current membership: %v", err)
	}
	if !ok || currentMembership.Status != "removed" {
		t.Fatalf("expected denied resolve to leave membership removed, got ok=%v status=%q", ok, currentMembership.Status)
	}
	record, appealCase, err := decodeRunStable[runmodel.AppealCase](context.Background(), service.store, appealAck.EmittedRecordRefs[0])
	if err != nil {
		t.Fatalf("decode denied appeal case: %v", err)
	}
	_ = record
	if appealCase.Status != "denied" || appealCase.ResultSummary != "membership restore は認めなかった。" {
		t.Fatalf("expected denied appeal case to be finalized, got status=%q summary=%q", appealCase.Status, appealCase.ResultSummary)
	}
}

func TestReviewAppealRejectsStaleSupersedesRef(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-review-reject")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-review-reject-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-review-reject-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	firstReviewAck, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-review-reject-first",
	})
	if err != nil {
		t.Fatalf("first review appeal: %v", err)
	}
	if firstReviewAck.ReviewRevision == nil || *firstReviewAck.ReviewRevision != 1 {
		t.Fatalf("expected review revision 1, got %v", firstReviewAck.ReviewRevision)
	}
	staleAck, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "deny",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		RequestID:              "req-review-reject-second",
	})
	if err != nil {
		t.Fatalf("stale review appeal: %v", err)
	}
	if staleAck.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected rejected stale review, got %q", staleAck.ResultKind)
	}
}

func TestResolveAppealRejectsConflictedController(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-resolve-conflict")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-resolve-conflict-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-resolve-conflict-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-resolve-conflict-review",
	})
	if err != nil {
		t.Fatalf("review appeal: %v", err)
	}
	_, err = service.ResolveAppeal(context.Background(), "did:plc:gm1", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		DecisionKind:           "accepted",
		ResultSummary:          "membership を restore した。",
		RequestID:              "req-resolve-conflict-final",
	})
	if err != ErrForbidden {
		t.Fatalf("expected conflicted controller to be forbidden, got %v", err)
	}
}

func TestSubmitRulingAppealRejectsWrongOutcome(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	sessionAck, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-ruling-reject",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1", "did:plc:gm2"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-ruling-reject-session",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]
	rulingEventRef := appendRef("did:plc:gm1", runmodel.CollectionRulingEvent, "ruling-event", "req-ruling-reject-event")
	rulingEvent := runmodel.RulingEvent{
		SessionRef:         sessionRef,
		ActionKind:         "resolve-action",
		ActorDid:           "did:plc:player1",
		RulesetNSID:        "app.cerulia.rules.core",
		RulesetManifestRef: "at://manifest/1",
		DecisionKind:       "deny",
		ResultSummary:      "元の裁定",
		DecidedByDid:       "did:plc:gm1",
		RequestID:          "req-ruling-reject-event",
		CreatedAt:          time.Now().UTC(),
	}
	storedRuling, err := marshalAppend(runmodel.CollectionRulingEvent, rulingEventRef, sessionRef, rulingEvent.RequestID, rulingEvent.CreatedAt, rulingEvent)
	if err != nil {
		t.Fatalf("marshal ruling event: %v", err)
	}
	if err := service.store.WithTx(context.Background(), func(tx store.Tx) error {
		return tx.PutAppend(context.Background(), storedRuling)
	}); err != nil {
		t.Fatalf("put ruling event: %v", err)
	}
	ack, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "ruling-event",
		TargetRef:            rulingEventRef,
		TargetRequestID:      rulingEvent.RequestID,
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-ruling-reject-appeal",
	})
	if err != nil {
		t.Fatalf("submit ruling appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected rejected ruling appeal outcome, got %q", ack.ResultKind)
	}
}

func TestSubmitRulingAppealRejectsSupersededTarget(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	sessionAck, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-ruling-stale",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1", "did:plc:gm2"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-ruling-stale-session",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]
	originalRef := appendRef("did:plc:gm1", runmodel.CollectionRulingEvent, "ruling-event", "req-ruling-stale-original")
	original := runmodel.RulingEvent{
		SessionRef:         sessionRef,
		ActionKind:         "resolve-action",
		ActorDid:           "did:plc:player1",
		RulesetNSID:        "app.cerulia.rules.core",
		RulesetManifestRef: "at://manifest/1",
		DecisionKind:       "deny",
		ResultSummary:      "元の裁定",
		DecidedByDid:       "did:plc:gm1",
		RequestID:          "req-ruling-stale-original",
		CreatedAt:          time.Now().UTC(),
	}
	originalRecord, err := marshalAppend(runmodel.CollectionRulingEvent, originalRef, sessionRef, original.RequestID, original.CreatedAt, original)
	if err != nil {
		t.Fatalf("marshal original ruling event: %v", err)
	}
	supersedingRef := appendRef("did:plc:gm1", runmodel.CollectionRulingEvent, "ruling-event", "req-ruling-stale-superseding")
	superseding := original
	superseding.SupersedesRef = originalRef
	superseding.DecisionKind = "appeal-correction"
	superseding.RequestID = "req-ruling-stale-superseding"
	superseding.CreatedAt = time.Now().UTC().Add(time.Minute)
	supersedingRecord, err := marshalAppend(runmodel.CollectionRulingEvent, supersedingRef, sessionRef, superseding.RequestID, superseding.CreatedAt, superseding)
	if err != nil {
		t.Fatalf("marshal superseding ruling event: %v", err)
	}
	if err := service.store.WithTx(context.Background(), func(tx store.Tx) error {
		if err := tx.PutAppend(context.Background(), originalRecord); err != nil {
			return err
		}
		return tx.PutAppend(context.Background(), supersedingRecord)
	}); err != nil {
		t.Fatalf("put stale ruling chain: %v", err)
	}
	ack, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "ruling-event",
		TargetRef:            originalRef,
		TargetRequestID:      original.RequestID,
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "supersede-ruling",
		RequestID:            "req-ruling-stale-appeal",
	})
	if err != nil {
		t.Fatalf("submit stale ruling appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected stale ruling appeal to be rejected, got %q", ack.ResultKind)
	}
}

func TestWithdrawAppealRejectsExpiredControllerDeadline(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-withdraw-expired")
	service.now = func() time.Time {
		return time.Date(2026, time.April, 3, 12, 0, 0, 0, time.UTC)
	}
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-withdraw-expired-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-withdraw-expired-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	service.now = func() time.Time {
		return time.Date(2026, time.April, 4, 13, 0, 0, 0, time.UTC)
	}
	ack, err := service.WithdrawAppeal(context.Background(), "did:plc:player1", WithdrawAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-withdraw-expired-final",
	})
	if err != nil {
		t.Fatalf("withdraw appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected expired withdraw to be rejected, got %q", ack.ResultKind)
	}
}

func TestReviewAppealRejectsExpiredControllerDeadline(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-review-expired")
	service.now = func() time.Time {
		return time.Date(2026, time.April, 3, 12, 0, 0, 0, time.UTC)
	}
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-review-expired-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-review-expired-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	service.now = func() time.Time {
		return time.Date(2026, time.April, 4, 13, 0, 0, 0, time.UTC)
	}
	ack, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-review-expired-final",
	})
	if err != nil {
		t.Fatalf("review appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected expired controller review to be rejected, got %q", ack.ResultKind)
	}
}

func TestReviewAppealSupersedesLatestEntry(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2", "did:plc:gm3"}, "req-review-supersede")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-review-supersede-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-review-supersede-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	firstReviewAck, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-review-supersede-first",
	})
	if err != nil {
		t.Fatalf("first review appeal: %v", err)
	}
	secondReviewAck, err := service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "deny",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		SupersedesRef:          firstReviewAck.EmittedRecordRefs[0],
		RequestID:              "req-review-supersede-second",
	})
	if err != nil {
		t.Fatalf("second review appeal: %v", err)
	}
	if secondReviewAck.ReviewRevision == nil || *secondReviewAck.ReviewRevision != 2 {
		t.Fatalf("expected review revision 2, got %v", secondReviewAck.ReviewRevision)
	}
	_, appealCase, err := decodeRunStable[runmodel.AppealCase](context.Background(), service.store, appealAck.EmittedRecordRefs[0])
	if err != nil {
		t.Fatalf("decode appeal case: %v", err)
	}
	state, err := service.reviewState(context.Background(), service.store, appealAck.EmittedRecordRefs[0], appealCase, time.Now().UTC())
	if err != nil {
		t.Fatalf("review state: %v", err)
	}
	if state.approveCount != 0 || state.denyCount != 1 {
		t.Fatalf("expected superseded review tally approve=0 deny=1, got approve=%d deny=%d", state.approveCount, state.denyCount)
	}
}

func TestEscalateAppealIsIdempotentFallback(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1"}, "req-escalate-idempotent")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-escalate-idempotent-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-escalate-idempotent-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	firstAck, err := service.EscalateAppeal(context.Background(), "did:plc:recovery1", EscalateAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-escalate-idempotent-first",
	})
	if err != nil {
		t.Fatalf("first escalate appeal: %v", err)
	}
	if firstAck.CaseRevision == nil || *firstAck.CaseRevision != 2 {
		t.Fatalf("expected case revision 2 after first escalation, got %v", firstAck.CaseRevision)
	}
	secondAck, err := service.EscalateAppeal(context.Background(), "did:plc:recovery1", EscalateAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   2,
		ExpectedReviewRevision: 0,
		RequestID:              "req-escalate-idempotent-second",
	})
	if err != nil {
		t.Fatalf("second escalate appeal: %v", err)
	}
	if secondAck.ResultKind != ledger.ResultAccepted || secondAck.CaseRevision == nil || *secondAck.CaseRevision != 2 {
		t.Fatalf("expected idempotent escalation success, got result=%q revision=%v", secondAck.ResultKind, secondAck.CaseRevision)
	}
}

func TestResolveAppealRequiresQuorumThreshold(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2", "did:plc:gm3"}, "req-quorum-threshold")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-quorum-threshold-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-quorum-threshold-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-quorum-threshold-review-1",
	})
	if err != nil {
		t.Fatalf("first review appeal: %v", err)
	}
	rejectedAck, err := service.ResolveAppeal(context.Background(), "did:plc:gm3", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		DecisionKind:           "accepted",
		ResultSummary:          "membership を restore した。",
		RequestID:              "req-quorum-threshold-resolve-rejected",
	})
	if err != nil {
		t.Fatalf("resolve appeal before quorum: %v", err)
	}
	if rejectedAck.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected resolve before quorum to be rejected, got %q", rejectedAck.ResultKind)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm3", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		RequestID:              "req-quorum-threshold-review-2",
	})
	if err != nil {
		t.Fatalf("second review appeal: %v", err)
	}
	acceptedAck, err := service.ResolveAppeal(context.Background(), "did:plc:gm2", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 2,
		DecisionKind:           "accepted",
		ResultSummary:          "membership を restore した。",
		RequestID:              "req-quorum-threshold-resolve-accepted",
	})
	if err != nil {
		t.Fatalf("resolve appeal after quorum: %v", err)
	}
	if acceptedAck.ResultKind != ledger.ResultAccepted {
		t.Fatalf("expected resolve after quorum to be accepted, got %q", acceptedAck.ResultKind)
	}
}

func TestWithdrawAppealRejectsAfterReviewQuorum(t *testing.T) {
	service, sessionRef, removedMembershipRef := setupAppealMembershipFixture(t, []string{"did:plc:gm1", "did:plc:gm2"}, "req-withdraw-after-review")
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "membership",
		TargetRef:            removedMembershipRef,
		TargetRequestID:      "req-withdraw-after-review-remove",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "restore-membership",
		RequestID:            "req-withdraw-after-review-appeal",
	})
	if err != nil {
		t.Fatalf("submit appeal: %v", err)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-withdraw-after-review-review",
	})
	if err != nil {
		t.Fatalf("review appeal: %v", err)
	}
	ack, err := service.WithdrawAppeal(context.Background(), "did:plc:player1", WithdrawAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		RequestID:              "req-withdraw-after-review-final",
	})
	if err != nil {
		t.Fatalf("withdraw appeal: %v", err)
	}
	if ack.ResultKind != ledger.ResultRejected {
		t.Fatalf("expected withdraw after review quorum to be rejected, got %q", ack.ResultKind)
	}
}

func TestSubmitAndResolveRulingAppeal(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	service.now = func() time.Time {
		return time.Date(2026, time.April, 3, 18, 0, 0, 0, time.UTC)
	}
	sessionAck, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-ruling",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1", "did:plc:gm2"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-ruling-session",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]
	rulingEventRef := appendRef("did:plc:gm1", runmodel.CollectionRulingEvent, "ruling-event", "req-ruling-event")
	rulingEvent := runmodel.RulingEvent{
		SessionRef:         sessionRef,
		ActionKind:         "resolve-action",
		ActorDid:           "did:plc:player1",
		RulesetNSID:        "app.cerulia.rules.core",
		RulesetManifestRef: "at://manifest/1",
		DecisionKind:       "deny",
		ResultSummary:      "元の裁定",
		DecidedByDid:       "did:plc:gm1",
		RequestID:          "req-ruling-event",
		CreatedAt:          service.now(),
	}
	storedRuling, err := marshalAppend(runmodel.CollectionRulingEvent, rulingEventRef, sessionRef, rulingEvent.RequestID, service.now(), rulingEvent)
	if err != nil {
		t.Fatalf("marshal ruling event: %v", err)
	}
	if err := service.store.WithTx(context.Background(), func(tx store.Tx) error {
		return tx.PutAppend(context.Background(), storedRuling)
	}); err != nil {
		t.Fatalf("put ruling event: %v", err)
	}
	appealAck, err := service.SubmitAppeal(context.Background(), "did:plc:player1", SubmitAppealInput{
		SessionRef:           sessionRef,
		TargetKind:           "ruling-event",
		TargetRef:            rulingEventRef,
		TargetRequestID:      "req-ruling-event",
		AffectedActorDid:     "did:plc:player1",
		RequestedOutcomeKind: "supersede-ruling",
		RequestID:            "req-ruling-appeal",
	})
	if err != nil {
		t.Fatalf("submit ruling appeal: %v", err)
	}
	_, err = service.ReviewAppeal(context.Background(), "did:plc:gm2", ReviewAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ReviewPhaseKind:        "controller-review",
		ReviewDecisionKind:     "approve",
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 0,
		RequestID:              "req-ruling-review",
	})
	if err != nil {
		t.Fatalf("review ruling appeal: %v", err)
	}
	resolveAck, err := service.ResolveAppeal(context.Background(), "did:plc:gm2", ResolveAppealInput{
		AppealCaseRef:          appealAck.EmittedRecordRefs[0],
		ExpectedCaseRevision:   1,
		ExpectedReviewRevision: 1,
		DecisionKind:           "accepted",
		ResultSummary:          "裁定を差し替えた。",
		RequestID:              "req-ruling-resolve",
	})
	if err != nil {
		t.Fatalf("resolve ruling appeal: %v", err)
	}
	if len(resolveAck.EmittedRecordRefs) != 2 {
		t.Fatalf("expected appeal case and superseding ruling refs, got %v", resolveAck.EmittedRecordRefs)
	}
	supersedingRef := resolveAck.EmittedRecordRefs[1]
	record, err := service.store.GetAppend(context.Background(), supersedingRef)
	if err != nil {
		t.Fatalf("get superseding ruling: %v", err)
	}
	supersedingRuling, err := runmodel.UnmarshalAppend[runmodel.RulingEvent](record)
	if err != nil {
		t.Fatalf("decode superseding ruling: %v", err)
	}
	if supersedingRuling.SupersedesRef != rulingEventRef || supersedingRuling.AppealCaseRef != appealAck.EmittedRecordRefs[0] {
		t.Fatalf("expected superseding ruling to point to original appeal target, got supersedes=%q appealCase=%q", supersedingRuling.SupersedesRef, supersedingRuling.AppealCaseRef)
	}
	if supersedingRuling.ResultSummary != "裁定を差し替えた。" {
		t.Fatalf("expected superseding ruling to mirror the appeal result summary, got %q", supersedingRuling.ResultSummary)
	}
}

func setupAppealMembershipFixture(t *testing.T, controllerDids []string, requestPrefix string) (*Service, string, string) {
	t.Helper()
	service := NewService(store.NewMemoryStore())
	sessionAck, err := service.CreateSessionDraft(context.Background(), controllerDids[0], CreateSessionDraftInput{
		SessionID:                  requestPrefix + "-session",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             controllerDids,
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  requestPrefix + "-session",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := sessionAck.EmittedRecordRefs[0]
	if _, err := service.InviteSession(context.Background(), controllerDids[0], InviteSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", Role: "player", RequestID: requestPrefix + "-invite"}); err != nil {
		t.Fatalf("invite session: %v", err)
	}
	if _, err := service.JoinSession(context.Background(), "did:plc:player1", JoinSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "invited", RequestID: requestPrefix + "-join"}); err != nil {
		t.Fatalf("join session: %v", err)
	}
	removeAck, err := service.ModerateMembership(context.Background(), controllerDids[0], ModerateMembershipInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "joined", NextStatus: "removed", RequestID: requestPrefix + "-remove", ReasonCode: "moderation"})
	if err != nil {
		t.Fatalf("remove membership: %v", err)
	}
	return service, sessionRef, removeAck.EmittedRecordRefs[0]
}
