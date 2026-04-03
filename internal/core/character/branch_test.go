package character

import (
	"errors"
	"testing"
	"time"

	"cerulia/internal/ledger"
)

func TestBranchUpdateUsesStableObjectMutation(t *testing.T) {
	branch := Branch{
		OwnerDid:     "did:plc:owner1",
		BaseSheetRef: "at://sheet/1",
		BranchKind:   "campaign-fork",
		BranchLabel:  "旧ラベル",
		Revision:     1,
		UpdatedByDid: "did:plc:owner1",
	}
	newLabel := "新ラベル"
	now := time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC)

	updated, err := branch.Update(UpdateBranchInput{
		ExpectedRevision: 1,
		BranchLabel:      &newLabel,
		UpdatedAt:        now,
		UpdatedByDid:     "did:plc:owner1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.BranchLabel != "新ラベル" || updated.Revision != 2 {
		t.Fatalf("unexpected branch update result: %+v", updated)
	}

	retired, err := updated.Retire(2, now.Add(time.Minute), "did:plc:owner1")
	if err != nil {
		t.Fatalf("unexpected retire error: %v", err)
	}
	if retired.Revision != 3 || retired.RetiredAt == nil || retired.BranchLabel != "新ラベル" {
		t.Fatalf("unexpected retired branch state: %+v", retired)
	}

	_, err = retired.Update(UpdateBranchInput{ExpectedRevision: 3, UpdatedAt: now, UpdatedByDid: "did:plc:owner1"})
	if !errors.Is(err, ErrRetiredBranch) {
		t.Fatalf("expected retired branch update to fail, got %v", err)
	}

	_, err = branch.Update(UpdateBranchInput{ExpectedRevision: 0, UpdatedAt: now, UpdatedByDid: "did:plc:owner1"})
	if !errors.Is(err, ledger.ErrRebaseNeeded) {
		t.Fatalf("expected stale revision to fail, got %v", err)
	}

	_, err = (Branch{}).Update(UpdateBranchInput{ExpectedRevision: 0, UpdatedAt: now, UpdatedByDid: "did:plc:owner1"})
	if !errors.Is(err, ErrBranchMismatch) {
		t.Fatalf("expected zero-value branch to fail, got %v", err)
	}
}
