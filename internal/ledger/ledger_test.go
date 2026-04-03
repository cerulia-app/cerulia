package ledger

import (
	"encoding/json"
	"errors"
	"testing"
	"time"
)

func TestMemoryIdempotencyStoreReplaysExistingAck(t *testing.T) {
	resultKinds := []MutationResultKind{ResultAccepted, ResultRejected, ResultRebaseNeeded, ResultManualReview}
	for _, resultKind := range resultKinds {
		store := NewMemoryIdempotencyStore()
		key := IdempotencyKey{GoverningRef: "at://campaign", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}
		firstAck := MutationAck{RequestID: "req-1", ResultKind: resultKind}
		secondAck := MutationAck{RequestID: "req-1", ResultKind: ResultAccepted}

		recorded, replayed, err := store.CheckOrRecord(key, firstAck)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if replayed {
			t.Fatal("first insert must not replay")
		}
		if recorded.ResultKind != resultKind {
			t.Fatalf("unexpected result kind: %s", recorded.ResultKind)
		}

		recorded, replayed, err = store.CheckOrRecord(key, secondAck)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !replayed {
			t.Fatal("second insert must replay existing ack")
		}
		if recorded.ResultKind != resultKind {
			t.Fatalf("expected replayed ack to preserve first result kind, got %s", recorded.ResultKind)
		}

		secondAck.EmittedRecordRefs = []string{"at://mutated"}
		if len(recorded.EmittedRecordRefs) != 0 {
			t.Fatal("stored ack must not share slice backing array")
		}
	}
}

func TestIdempotencyKeyScopeAndValidation(t *testing.T) {
	store := NewMemoryIdempotencyStore()
	ack := MutationAck{RequestID: "req-1", ResultKind: ResultAccepted}

	if _, _, err := store.CheckOrRecord(IdempotencyKey{}, ack); err == nil {
		t.Fatal("expected empty idempotency key to fail")
	}

	first, replayed, err := store.CheckOrRecord(IdempotencyKey{GoverningRef: "at://campaign/1", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}, ack)
	if err != nil || replayed {
		t.Fatalf("unexpected first scope insert result: %v replayed=%v", err, replayed)
	}

	second, replayed, err := store.CheckOrRecord(IdempotencyKey{GoverningRef: "at://campaign/2", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}, ack)
	if err != nil || replayed {
		t.Fatalf("different governing ref must not replay: %v replayed=%v", err, replayed)
	}
	if first.RequestID != second.RequestID {
		t.Fatal("expected separate ack values with same request id across governing refs")
	}
}

func TestAdvanceCurrentHeadRejectsParallelRoot(t *testing.T) {
	_, err := AdvanceCurrentHead(nil, HeadCandidate{SubjectRef: "at://subject/1", SubjectKind: "character-episode", HeadRef: "at://publication/2", SupersedesRef: "at://publication/1", RequestID: "req-1"})
	if !errors.Is(err, ErrInvalidHeadTransition) {
		t.Fatalf("expected invalid head transition, got %v", err)
	}
}

func TestAdvanceCurrentHeadCreatesRoot(t *testing.T) {
	current, err := AdvanceCurrentHead(nil, HeadCandidate{SubjectRef: "at://subject/1", SubjectKind: "character-episode", HeadRef: "at://publication/1", RequestID: "req-1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if current.SubjectRef != "at://subject/1" || current.SubjectKind != "character-episode" {
		t.Fatalf("unexpected root subject: %+v", current)
	}
	if current.ChainRootRef != "at://publication/1" {
		t.Fatalf("unexpected root chain root: %s", current.ChainRootRef)
	}
}

func TestAdvanceCurrentHeadRequiresCurrentSupersedes(t *testing.T) {
	current := &HeadRecord{SubjectRef: "at://subject/1", SubjectKind: "character-episode", CurrentHeadRef: "at://publication/1", ChainRootRef: "at://publication/1", RequestID: "req-1"}
	_, err := AdvanceCurrentHead(current, HeadCandidate{SubjectRef: "at://subject/1", SubjectKind: "character-episode", HeadRef: "at://publication/2", SupersedesRef: "at://publication/0", RequestID: "req-2"})
	if !errors.Is(err, ErrInvalidHeadTransition) {
		t.Fatalf("expected invalid head transition, got %v", err)
	}

	next, err := AdvanceCurrentHead(current, HeadCandidate{SubjectRef: "at://subject/1", SubjectKind: "character-episode", HeadRef: "at://publication/2", SupersedesRef: "at://publication/1", RequestID: "req-2"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if next.CurrentHeadRef != "at://publication/2" {
		t.Fatalf("unexpected current head: %s", next.CurrentHeadRef)
	}
	if next.ChainRootRef != "at://publication/1" {
		t.Fatalf("chain root must remain stable, got %s", next.ChainRootRef)
	}
}

func TestNextRevisionRejectsStaleExpected(t *testing.T) {
	_, err := NextRevision(3, 2)
	if !errors.Is(err, ErrRebaseNeeded) {
		t.Fatalf("expected ErrRebaseNeeded, got %v", err)
	}

	next, err := NextRevision(3, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if next != 4 {
		t.Fatalf("unexpected next revision: %d", next)
	}
}

func TestNextDualRevisionRejectsStaleExpected(t *testing.T) {
	_, _, err := NextDualRevision(4, 2, 3, 2, true)
	if !errors.Is(err, ErrRebaseNeeded) {
		t.Fatalf("expected ErrRebaseNeeded, got %v", err)
	}

	caseRevision, reviewRevision, err := NextDualRevision(4, 2, 4, 2, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if caseRevision != 4 || reviewRevision != 3 {
		t.Fatalf("unexpected dual revision values: %d %d", caseRevision, reviewRevision)
	}

	caseRevision, reviewRevision, err = NextDualRevision(4, 2, 4, 2, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if caseRevision != 5 || reviewRevision != 2 {
		t.Fatalf("unexpected dual revision case bump: %d %d", caseRevision, reviewRevision)
	}
}

func TestEnsureExpectedStateAndAuthoritySnapshot(t *testing.T) {
	if !errors.Is(EnsureExpectedState("active", "paused"), ErrRejected) {
		t.Fatal("expected state mismatch to reject")
	}
	if !errors.Is(EnsureExpectedVisibility("public", "private"), ErrRejected) {
		t.Fatal("expected visibility mismatch to reject")
	}
	if err := EnsureAuthoritySnapshot(AuthoritySnapshot{RequestID: "req-1", TransferPhase: "stable", ControllerDids: []string{"did:plc:b", "did:plc:a"}}, "req-1", "stable", []string{"did:plc:a", "did:plc:b"}); err != nil {
		t.Fatalf("unexpected authority snapshot error: %v", err)
	}
	if !errors.Is(EnsureAuthoritySnapshot(AuthoritySnapshot{RequestID: "req-1", TransferPhase: "stable", ControllerDids: []string{"did:plc:a"}}, "req-2", "stable", []string{"did:plc:a"}), ErrRejected) {
		t.Fatal("expected stale authority snapshot to reject")
	}
	if !errors.Is(EnsureAuthoritySnapshot(AuthoritySnapshot{RequestID: "req-1", TransferPhase: "preparing", ControllerDids: []string{"did:plc:a"}}, "req-1", "stable", []string{"did:plc:a"}), ErrRejected) {
		t.Fatal("expected transfer phase mismatch to reject")
	}
}

func TestAuditViewDropsRawPayload(t *testing.T) {
	entry := ServiceLogEntry{
		RequestID:       "req-1",
		OperationNSID:   "app.cerulia.rpc.createCampaign",
		GoverningRef:    "at://campaign/1",
		ResultKind:      ResultAccepted,
		CreatedAt:       time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC),
		RawPayload:      json.RawMessage(`{"secret":"raw"}`),
		RedactedPayload: json.RawMessage(`{"summary":"safe"}`),
	}

	audit := entry.AuditView()
	if string(audit.Payload) != `{"summary":"safe"}` {
		t.Fatalf("unexpected audit payload: %s", audit.Payload)
	}
}
