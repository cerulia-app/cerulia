package membership

import (
	"testing"
	"time"
)

func TestInviteCreatesHead(t *testing.T) {
	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)
	member, err := Invite(nil, InviteInput{
		SessionRef:   "at://session/1",
		ActorDid:     "did:plc:player1",
		Role:         "player",
		InvitedByDid: "did:plc:gm1",
		RequestID:    "req-1",
		Now:          now,
	})
	if err != nil {
		t.Fatalf("invite member: %v", err)
	}
	if member.Status != "invited" {
		t.Fatalf("expected invited status, got %q", member.Status)
	}
}

func TestMembershipTransitionFlow(t *testing.T) {
	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)
	invited, err := Invite(nil, InviteInput{
		SessionRef:   "at://session/1",
		ActorDid:     "did:plc:player1",
		Role:         "player",
		InvitedByDid: "did:plc:gm1",
		RequestID:    "req-1",
		Now:          now,
	})
	if err != nil {
		t.Fatalf("invite member: %v", err)
	}
	joined, err := invited.Join(TransitionInput{
		ExpectedStatus: "invited",
		NextStatus:     "joined",
		RequestID:      "req-2",
		ChangedByDid:   "did:plc:player1",
		Now:            now.Add(time.Minute),
		CurrentRef:     "at://membership/1",
	})
	if err != nil {
		t.Fatalf("join member: %v", err)
	}
	removed, err := joined.Moderate(TransitionInput{
		ExpectedStatus: "joined",
		NextStatus:     "removed",
		RequestID:      "req-3",
		ChangedByDid:   "did:plc:gm1",
		ReasonCode:     "moderation",
		Now:            now.Add(2 * time.Minute),
		CurrentRef:     "at://membership/2",
	})
	if err != nil {
		t.Fatalf("remove member: %v", err)
	}
	restoredRole := "viewer"
	restored, err := removed.Moderate(TransitionInput{
		ExpectedStatus: "removed",
		NextStatus:     "joined",
		Role:           &restoredRole,
		RequestID:      "req-4",
		ChangedByDid:   "did:plc:gm1",
		ReasonCode:     "restore",
		Now:            now.Add(3 * time.Minute),
		CurrentRef:     "at://membership/3",
	})
	if err != nil {
		t.Fatalf("restore member: %v", err)
	}
	if restored.Role != "viewer" || restored.Status != "joined" {
		t.Fatalf("expected restored joined viewer, got status=%q role=%q", restored.Status, restored.Role)
	}
}

func TestMembershipRejectsUnexpectedStatus(t *testing.T) {
	member := Membership{Status: "joined"}
	_, err := member.Leave(TransitionInput{ExpectedStatus: "invited", NextStatus: "left", ChangedByDid: "did:plc:player1", RequestID: "req", Now: time.Now().UTC()})
	if err == nil {
		t.Fatal("expected error for unexpected status")
	}
}
