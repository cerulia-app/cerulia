package command

import (
	"context"
	"testing"

	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

func TestImportCharacterSheetReusesIdempotentAck(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	service := NewService(dataStore)
	input := ImportCharacterSheetInput{
		OwnerDid:    "did:plc:owner1",
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Hero",
		RequestID:   "req-idempotent-sheet",
	}

	first, err := service.ImportCharacterSheet(ctx, "did:plc:owner1", input)
	if err != nil {
		t.Fatalf("first import: %v", err)
	}
	second, err := service.ImportCharacterSheet(ctx, "did:plc:owner1", input)
	if err != nil {
		t.Fatalf("second import: %v", err)
	}
	if len(first.EmittedRecordRefs) != 1 || len(second.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one emitted ref in both acks, got first=%+v second=%+v", first, second)
	}
	if first.EmittedRecordRefs[0] != second.EmittedRecordRefs[0] {
		t.Fatalf("expected idempotent ack to reuse emitted ref, got first=%q second=%q", first.EmittedRecordRefs[0], second.EmittedRecordRefs[0])
	}
	if second.ResultKind != first.ResultKind || second.RequestID != first.RequestID || second.Message != first.Message {
		t.Fatalf("expected replayed ack to match first ack, got first=%+v second=%+v", first, second)
	}
	logs, err := dataStore.ListServiceLogs(ctx)
	if err != nil {
		t.Fatalf("list service logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected exactly one service log entry for idempotent replay, got %d", len(logs))
	}
	records, err := dataStore.ListStableByCollection(ctx, "app.cerulia.core.characterSheet")
	if err != nil {
		t.Fatalf("list stable records: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("expected exactly one stored character sheet, got %d", len(records))
	}
}

func TestUpdateCharacterBranchReturnsRebaseNeededForStaleRevision(t *testing.T) {
	ctx := context.Background()
	dataStore := store.NewMemoryStore()
	service := NewService(dataStore)

	sheetAck, err := service.ImportCharacterSheet(ctx, "did:plc:owner1", ImportCharacterSheetInput{
		OwnerDid:    "did:plc:owner1",
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Hero",
		RequestID:   "req-branch-sheet",
	})
	if err != nil {
		t.Fatalf("import sheet: %v", err)
	}
	branchAck, err := service.CreateCharacterBranch(ctx, "did:plc:owner1", CreateCharacterBranchInput{
		OwnerDid:     "did:plc:owner1",
		BaseSheetRef: sheetAck.EmittedRecordRefs[0],
		BranchKind:   "campaign-fork",
		BranchLabel:  "Main",
		RequestID:    "req-branch-create",
	})
	if err != nil {
		t.Fatalf("create branch: %v", err)
	}
	branchRef := branchAck.EmittedRecordRefs[0]

	accepted, err := service.UpdateCharacterBranch(ctx, "did:plc:owner1", UpdateCharacterBranchInput{
		CharacterBranchRef: branchRef,
		ExpectedRevision:   1,
		BranchLabel:        "Updated",
		RequestID:          "req-branch-update-1",
	})
	if err != nil {
		t.Fatalf("first update: %v", err)
	}
	if accepted.ResultKind != ledger.ResultAccepted || accepted.CurrentRevision == nil || *accepted.CurrentRevision != 2 {
		t.Fatalf("expected accepted update to advance revision to 2, got %+v", accepted)
	}

	rebase, err := service.UpdateCharacterBranch(ctx, "did:plc:owner1", UpdateCharacterBranchInput{
		CharacterBranchRef: branchRef,
		ExpectedRevision:   1,
		BranchLabel:        "Stale",
		RequestID:          "req-branch-update-stale",
	})
	if err != nil {
		t.Fatalf("stale update: %v", err)
	}
	if rebase.ResultKind != ledger.ResultRebaseNeeded || rebase.CurrentRevision == nil || *rebase.CurrentRevision != 2 {
		t.Fatalf("expected stale update to return rebase-needed at revision 2, got %+v", rebase)
	}
}

func TestImportCharacterSheetReturnsRebaseNeededOnStoreConflict(t *testing.T) {
	service := NewService(conflictStore{})
	ack, err := service.ImportCharacterSheet(context.Background(), "did:plc:owner1", ImportCharacterSheetInput{
		OwnerDid:    "did:plc:owner1",
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Hero",
		RequestID:   "req-conflict-sheet",
	})
	if err != nil {
		t.Fatalf("import sheet conflict path: %v", err)
	}
	if ack.ResultKind != ledger.ResultRebaseNeeded {
		t.Fatalf("expected store conflict to return rebase-needed, got %+v", ack)
	}
}

type conflictStore struct{}

func (conflictStore) GetStable(context.Context, string) (store.StableRecord, error) {
	return store.StableRecord{}, store.ErrNotFound
}

func (conflictStore) ListStableByCollection(context.Context, string) ([]store.StableRecord, error) {
	return nil, nil
}

func (conflictStore) GetAppend(context.Context, string) (store.AppendRecord, error) {
	return store.AppendRecord{}, store.ErrNotFound
}

func (conflictStore) ListAppendByCollection(context.Context, string) ([]store.AppendRecord, error) {
	return nil, nil
}

func (conflictStore) GetCurrentHead(context.Context, string, string) (*ledger.HeadRecord, error) {
	return nil, nil
}

func (conflictStore) ListCurrentHeads(context.Context) ([]ledger.HeadRecord, error) {
	return nil, nil
}

func (conflictStore) ListServiceLogs(context.Context) ([]ledger.ServiceLogEntry, error) {
	return nil, nil
}

func (conflictStore) WithTx(context.Context, func(store.Tx) error) error {
	return store.ErrConflict
}
