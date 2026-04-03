package command

import (
	"context"
	"testing"

	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

func TestCreateSessionDraftEmitsSessionAuthorityAndAudience(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	ack, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-1",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-1",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 3 {
		t.Fatalf("expected 3 emitted refs, got %d", len(ack.EmittedRecordRefs))
	}
	if ack.CurrentState != "planning" {
		t.Fatalf("expected currentState planning, got %v", ack.CurrentState)
	}

	sessionRecord, err := service.store.GetStable(context.Background(), ack.EmittedRecordRefs[0])
	if err != nil {
		t.Fatalf("get session record: %v", err)
	}
	sessionBody, err := runmodel.UnmarshalStable[runmodel.Session](sessionRecord)
	if err != nil {
		t.Fatalf("decode session: %v", err)
	}
	if sessionBody.AuthorityRef != ack.EmittedRecordRefs[1] {
		t.Fatalf("expected authorityRef %q, got %q", ack.EmittedRecordRefs[1], sessionBody.AuthorityRef)
	}
}

func TestTransferAuthorityCompletesAfterFourSteps(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	ack, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-1",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-1",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	authorityRef := ack.EmittedRecordRefs[1]
	requestID := "req-1"
	phase := "stable"
	controllers := []string{"did:plc:gm1"}
	for index, expectedPhase := range []string{"preparing", "rotating-grants", "finalizing", "stable"} {
		stepAck, err := service.TransferAuthority(context.Background(), "did:plc:gm1", TransferAuthorityInput{
			SessionRef:                 ack.EmittedRecordRefs[0],
			AuthorityRef:               authorityRef,
			ExpectedAuthorityRequestID: requestID,
			ExpectedTransferPhase:      phase,
			ExpectedControllerDids:     controllers,
			PendingControllerDids:      []string{"did:plc:gm2"},
			RequestID:                  "req-transfer-" + string(rune('2'+index)),
		})
		if err != nil {
			t.Fatalf("transfer step %d: %v", index, err)
		}
		if stepAck.TransferPhase != expectedPhase {
			t.Fatalf("expected phase %q, got %v", expectedPhase, stepAck.TransferPhase)
		}
		requestID = stepAck.RequestID
		phase = stepAck.TransferPhase
		if phase == "stable" {
			controllers = []string{"did:plc:gm2"}
		}
	}
	if phase != "stable" {
		t.Fatalf("expected stable transfer phase, got %q", phase)
	}
}
