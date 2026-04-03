package session

import (
	"testing"
	"time"
)

func TestCreateDraftRejectsManifestMismatch(t *testing.T) {
	_, err := CreateDraft(CreateDraftInput{
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/2",
	})
	if err != ErrUnsupportedRuleset {
		t.Fatalf("expected ErrUnsupportedRuleset, got %v", err)
	}
}

func TestSessionStateTransitions(t *testing.T) {
	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)
	session, err := CreateDraft(CreateDraftInput{
		SessionID:                  "session-1",
		Title:                      "Session",
		Visibility:                 "unlisted",
		RulesetNSID:                "app.cerulia.rules.core",
		RulesetManifestRef:         "at://manifest/1",
		ExpectedRulesetManifestRef: "at://manifest/1",
		AuthorityRef:               "at://authority/1",
		RequestID:                  "req-1",
		ActorDid:                   "did:plc:gm1",
		Now:                        now,
	})
	if err != nil {
		t.Fatalf("create draft: %v", err)
	}

	openSession, err := session.Transition("planning", "open", "req-2", "did:plc:gm1", "open", now.Add(time.Minute))
	if err != nil {
		t.Fatalf("open session: %v", err)
	}
	activeSession, err := openSession.Transition("open", "active", "req-3", "did:plc:gm1", "start", now.Add(2*time.Minute))
	if err != nil {
		t.Fatalf("start session: %v", err)
	}
	endedSession, err := activeSession.Transition("active", "ended", "req-4", "did:plc:gm1", "close", now.Add(3*time.Minute))
	if err != nil {
		t.Fatalf("close session: %v", err)
	}
	if endedSession.EndedAt == nil {
		t.Fatal("ended session must set endedAt")
	}
	archivedSession, err := endedSession.Transition("ended", "archived", "req-5", "did:plc:gm1", "archive", now.Add(4*time.Minute))
	if err != nil {
		t.Fatalf("archive session: %v", err)
	}
	if archivedSession.ArchivedAt == nil {
		t.Fatal("archived session must set archivedAt")
	}
}

func TestSessionRejectsInvalidTransition(t *testing.T) {
	session := Session{State: "planning"}
	_, err := session.Transition("planning", "active", "req", "did:plc:gm1", "", time.Now().UTC())
	if err != ErrInvalidTransition {
		t.Fatalf("expected ErrInvalidTransition, got %v", err)
	}
}