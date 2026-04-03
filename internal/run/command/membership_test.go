package command

import (
	"context"
	"testing"

	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

func TestMembershipInviteJoinLeaveFlow(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	created, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
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
	sessionRef := created.EmittedRecordRefs[0]

	inviteAck, err := service.InviteSession(context.Background(), "did:plc:gm1", InviteSessionInput{
		SessionRef:     sessionRef,
		ActorDid:       "did:plc:player1",
		Role:           "player",
		ExpectedStatus: "",
		RequestID:      "req-invite-1",
	})
	if err != nil {
		t.Fatalf("invite session: %v", err)
	}
	if len(inviteAck.EmittedRecordRefs) != 1 {
		t.Fatalf("expected membership ref emission, got %v", inviteAck.EmittedRecordRefs)
	}

	joinAck, err := service.JoinSession(context.Background(), "did:plc:player1", JoinSessionInput{
		SessionRef:     sessionRef,
		ActorDid:       "did:plc:player1",
		ExpectedStatus: "invited",
		RequestID:      "req-join-1",
	})
	if err != nil {
		t.Fatalf("join session: %v", err)
	}
	leaveAck, err := service.LeaveSession(context.Background(), "did:plc:player1", LeaveSessionInput{
		SessionRef:     sessionRef,
		ActorDid:       "did:plc:player1",
		ExpectedStatus: "joined",
		RequestID:      "req-leave-1",
	})
	if err != nil {
		t.Fatalf("leave session: %v", err)
	}
	if len(joinAck.EmittedRecordRefs) != 1 || len(leaveAck.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one emitted ref per membership change, got join=%v leave=%v", joinAck.EmittedRecordRefs, leaveAck.EmittedRecordRefs)
	}

	currentRef, current, ok, err := service.currentMembership(context.Background(), service.store, sessionRef, "did:plc:player1")
	if err != nil {
		t.Fatalf("current membership: %v", err)
	}
	if !ok || currentRef == "" || current.Status != "left" {
		t.Fatalf("expected left current membership, got ref=%q ok=%v status=%q", currentRef, ok, current.Status)
	}
}

func TestModerateMembershipRestore(t *testing.T) {
	service := NewService(store.NewMemoryStore())
	created, err := service.CreateSessionDraft(context.Background(), "did:plc:gm1", CreateSessionDraftInput{
		SessionID:                  "session-2",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		ControllerDids:             []string{"did:plc:gm1"},
		RecoveryControllerDids:     []string{"did:plc:recovery1"},
		TransferPolicy:             "majority-controllers",
		RequestID:                  "req-session-2",
	})
	if err != nil {
		t.Fatalf("create session draft: %v", err)
	}
	sessionRef := created.EmittedRecordRefs[0]

	_, err = service.InviteSession(context.Background(), "did:plc:gm1", InviteSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", Role: "player", ExpectedStatus: "", RequestID: "req-invite-2"})
	if err != nil {
		t.Fatalf("invite session: %v", err)
	}
	_, err = service.JoinSession(context.Background(), "did:plc:player1", JoinSessionInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "invited", RequestID: "req-join-2"})
	if err != nil {
		t.Fatalf("join session: %v", err)
	}
	_, err = service.ModerateMembership(context.Background(), "did:plc:gm1", ModerateMembershipInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "joined", NextStatus: "removed", RequestID: "req-remove-2", ReasonCode: "moderation"})
	if err != nil {
		t.Fatalf("remove membership: %v", err)
	}
	_, err = service.ModerateMembership(context.Background(), "did:plc:gm1", ModerateMembershipInput{SessionRef: sessionRef, ActorDid: "did:plc:player1", ExpectedStatus: "removed", NextStatus: "joined", Role: "viewer", RequestID: "req-restore-2", ReasonCode: "restore"})
	if err != nil {
		t.Fatalf("restore membership: %v", err)
	}
	_, current, ok, err := service.currentMembership(context.Background(), service.store, sessionRef, "did:plc:player1")
	if err != nil {
		t.Fatalf("current membership: %v", err)
	}
	if !ok || current.Status != "joined" || current.Role != "viewer" {
		t.Fatalf("expected restored joined viewer membership, got ok=%v status=%q role=%q", ok, current.Status, current.Role)
	}
	items, err := service.store.ListStableByCollection(context.Background(), runmodel.CollectionMembership)
	if err != nil || len(items) != 4 {
		t.Fatalf("expected 4 membership rows, got len=%d err=%v", len(items), err)
	}
}
