package authority

import (
	"testing"
	"time"
)

func TestCreateAuthorityRequiresRecoveryController(t *testing.T) {
	_, err := Create(CreateInput{
		SessionRef:     "at://session/1",
		AuthorityID:    "authority-1",
		GMAudienceRef:  "at://audience/1",
		ControllerDids: []string{"did:plc:gm1"},
		ActorDid:       "did:plc:gm1",
		Now:            time.Now().UTC(),
	})
	if err != ErrInvalidAuthority {
		t.Fatalf("expected ErrInvalidAuthority, got %v", err)
	}
}

func TestAuthorityTransferProgressesAcrossPhases(t *testing.T) {
	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)
	authority, err := Create(CreateInput{
		SessionRef:             "at://session/1",
		AuthorityID:            "authority-1",
		GMAudienceRef:          "at://audience/1",
		ControllerDids:         []string{"did:plc:gm1"},
		RecoveryControllerDids: []string{"did:plc:recovery1"},
		TransferPolicy:         "majority-controllers",
		RequestID:              "req-1",
		ActorDid:               "did:plc:gm1",
		Now:                    now,
	})
	if err != nil {
		t.Fatalf("create authority: %v", err)
	}

	preparing, err := authority.Transfer(TransferInput{
		ExpectedAuthorityRequestID: "req-1",
		ExpectedTransferPhase:      "stable",
		ExpectedControllerDids:     []string{"did:plc:gm1"},
		PendingControllerDids:      []string{"did:plc:gm2"},
		RequestID:                  "req-2",
		UpdatedByDid:               "did:plc:gm1",
		Now:                        now.Add(time.Minute),
	})
	if err != nil || preparing.TransferPhase != "preparing" {
		t.Fatalf("expected preparing phase, got %v %v", preparing.TransferPhase, err)
	}

	rotating, err := preparing.Transfer(TransferInput{
		ExpectedAuthorityRequestID: "req-2",
		ExpectedTransferPhase:      "preparing",
		ExpectedControllerDids:     []string{"did:plc:gm1"},
		PendingControllerDids:      []string{"did:plc:gm2"},
		RequestID:                  "req-3",
		UpdatedByDid:               "did:plc:gm1",
		Now:                        now.Add(2 * time.Minute),
	})
	if err != nil || rotating.TransferPhase != "rotating-grants" {
		t.Fatalf("expected rotating-grants phase, got %v %v", rotating.TransferPhase, err)
	}

	finalizing, err := rotating.Transfer(TransferInput{
		ExpectedAuthorityRequestID: "req-3",
		ExpectedTransferPhase:      "rotating-grants",
		ExpectedControllerDids:     []string{"did:plc:gm1"},
		PendingControllerDids:      []string{"did:plc:gm2"},
		RequestID:                  "req-4",
		UpdatedByDid:               "did:plc:gm1",
		NextGMAudienceRef:          "at://audience/2",
		Now:                        now.Add(3 * time.Minute),
	})
	if err != nil || finalizing.TransferPhase != "finalizing" || finalizing.GMAudienceRef != "at://audience/2" {
		t.Fatalf("expected finalizing phase with rotated audience, got %v %v", finalizing.TransferPhase, err)
	}

	stable, err := finalizing.Transfer(TransferInput{
		ExpectedAuthorityRequestID: "req-4",
		ExpectedTransferPhase:      "finalizing",
		ExpectedControllerDids:     []string{"did:plc:gm1"},
		PendingControllerDids:      []string{"did:plc:gm2"},
		RequestID:                  "req-5",
		UpdatedByDid:               "did:plc:gm1",
		Now:                        now.Add(4 * time.Minute),
	})
	if err != nil || stable.TransferPhase != "stable" {
		t.Fatalf("expected stable phase, got %v %v", stable.TransferPhase, err)
	}
	if len(stable.ControllerDids) != 1 || stable.ControllerDids[0] != "did:plc:gm2" {
		t.Fatalf("expected controller handoff to gm2, got %v", stable.ControllerDids)
	}
	if stable.TransferCompletedAt == nil {
		t.Fatal("expected transferCompletedAt to be set")
	}
}

func TestRecoveryControllerCanOnlyTransferWhenExpired(t *testing.T) {
	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)
	expires := now.Add(-time.Minute)
	authority := Authority{
		GMAudienceRef:          "at://audience/1",
		ControllerDids:         []string{"did:plc:gm1"},
		RecoveryControllerDids: []string{"did:plc:recovery1"},
		TransferPhase:          "stable",
		RequestID:              "req-1",
		LeaseExpiresAt:         &expires,
	}
	_, err := authority.Transfer(TransferInput{
		ExpectedAuthorityRequestID: "req-1",
		ExpectedTransferPhase:      "stable",
		ExpectedControllerDids:     []string{"did:plc:gm1"},
		PendingControllerDids:      []string{"did:plc:gm2"},
		RequestID:                  "req-2",
		UpdatedByDid:               "did:plc:recovery1",
		Now:                        now,
	})
	if err != nil {
		t.Fatalf("expected recovery transfer to be allowed on expired lease, got %v", err)
	}
}