package ledger

import (
	"errors"
	"testing"
)

func TestMemoryIdempotencyStoreReturnsRecordedAck(t *testing.T) {
	store := NewMemoryIdempotencyStore()
	key := IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}
	first := MutationAck{RequestID: "req-1", ResultKind: ResultAccepted, EmittedRecordRefs: []string{"at://did:plc:alice/app.cerulia.core.campaign/main"}}

	recorded, duplicate, err := store.CheckOrRecord(key, first)
	if err != nil {
		t.Fatalf("record ack: %v", err)
	}
	if duplicate {
		t.Fatal("first write must not be marked as duplicate")
	}
	recorded.EmittedRecordRefs[0] = "mutated"

	second, duplicate, err := store.CheckOrRecord(key, MutationAck{RequestID: "req-1", ResultKind: ResultRejected})
	if err != nil {
		t.Fatalf("replay ack: %v", err)
	}
	if !duplicate {
		t.Fatal("second write must be marked as duplicate")
	}
	if second.ResultKind != ResultAccepted {
		t.Fatalf("expected replay to preserve first result kind, got %q", second.ResultKind)
	}
	if second.EmittedRecordRefs[0] != first.EmittedRecordRefs[0] {
		t.Fatalf("expected stored ack clone to remain unchanged, got %v", second.EmittedRecordRefs)
	}
}

func TestMemoryIdempotencyStoreValidatesKeyAndScopesByGoverningRef(t *testing.T) {
	store := NewMemoryIdempotencyStore()
	ack := MutationAck{RequestID: "req-1", ResultKind: ResultAccepted}

	if _, _, err := store.CheckOrRecord(IdempotencyKey{}, ack); err == nil {
		t.Fatal("expected empty idempotency key to fail validation")
	}
	if _, _, err := store.CheckOrRecord(IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", RequestID: "req-1"}, ack); err == nil {
		t.Fatal("expected missing operation NSID to fail validation")
	}
	if _, _, err := store.CheckOrRecord(IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", OperationNSID: "app.cerulia.rpc.createCampaign"}, ack); err == nil {
		t.Fatal("expected missing request ID to fail validation")
	}

	firstKey := IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}
	secondKey := IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-2", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-1"}
	thirdKey := IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", OperationNSID: "app.cerulia.rpc.publishSubject", RequestID: "req-1"}
	fourthKey := IdempotencyKey{GoverningRef: "at://did:plc:alice/app.cerulia.core.campaign/campaign-req-1", OperationNSID: "app.cerulia.rpc.createCampaign", RequestID: "req-2"}

	first, duplicate, err := store.CheckOrRecord(firstKey, ack)
	if err != nil {
		t.Fatalf("record first key: %v", err)
	}
	if duplicate {
		t.Fatal("first key must not be marked as duplicate")
	}

	second, duplicate, err := store.CheckOrRecord(secondKey, MutationAck{RequestID: "req-1", ResultKind: ResultRejected})
	if err != nil {
		t.Fatalf("record second key: %v", err)
	}
	if duplicate {
		t.Fatal("different governing ref must not replay existing ack")
	}
	third, duplicate, err := store.CheckOrRecord(thirdKey, MutationAck{RequestID: "req-1", ResultKind: ResultRejected})
	if err != nil {
		t.Fatalf("record third key: %v", err)
	}
	if duplicate {
		t.Fatal("different operation NSID must not replay existing ack")
	}
	if first.ResultKind != ResultAccepted || second.ResultKind != ResultRejected {
		t.Fatalf("expected separate ack values across governing refs, got %q and %q", first.ResultKind, second.ResultKind)
	}
	if third.ResultKind != ResultRejected {
		t.Fatalf("expected operation-scoped ack to keep its own result kind, got %q", third.ResultKind)
	}
	fourth, duplicate, err := store.CheckOrRecord(fourthKey, MutationAck{RequestID: "req-2", ResultKind: ResultAccepted})
	if err != nil {
		t.Fatalf("record fourth key: %v", err)
	}
	if duplicate {
		t.Fatal("different request ID must not replay existing ack")
	}
	if fourth.RequestID != "req-2" {
		t.Fatalf("expected request-scoped ack, got %+v", fourth)
	}
}

func TestNextRevisionRejectsStaleExpected(t *testing.T) {
	if _, err := NextRevision(2, 1); !errors.Is(err, ErrRebaseNeeded) {
		t.Fatalf("expected ErrRebaseNeeded, got %v", err)
	}
}

func TestNextRevisionAdvancesMatchingRevision(t *testing.T) {
	next, err := NextRevision(2, 2)
	if err != nil {
		t.Fatalf("advance revision: %v", err)
	}
	if next != 3 {
		t.Fatalf("expected revision 3, got %d", next)
	}
}
