package character

import (
	"errors"
	"testing"
	"time"
)

func TestActiveAdvancementSequenceAppliesCorrectionsDeterministically(t *testing.T) {
	branchRef := "at://branch/1"
	entries := []Advancement{
		{Ref: "b", CharacterBranchRef: branchRef, EffectiveAt: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC), SupersedesRef: "a"},
		{Ref: "a", CharacterBranchRef: branchRef, EffectiveAt: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC)},
		{Ref: "c", CharacterBranchRef: branchRef, EffectiveAt: time.Date(2026, 4, 3, 1, 0, 0, 0, time.UTC)},
	}

	active, err := ActiveAdvancementSequence(branchRef, entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(active) != 2 || active[0].Ref != "b" || active[1].Ref != "c" {
		t.Fatalf("unexpected active advancement sequence: %+v", active)
	}
}

func TestValidateEpisodeAdvancementRefsRejectsOtherBranch(t *testing.T) {
	err := ValidateEpisodeAdvancementRefs("at://branch/1", []EpisodeAdvancementRef{{Ref: "a", CharacterBranchRef: "at://branch/2"}})
	if !errors.Is(err, ErrBranchMismatch) {
		t.Fatalf("expected branch mismatch, got %v", err)
	}
}

func TestActiveAdvancementSequenceRejectsBrokenSupersedes(t *testing.T) {
	branchRef := "at://branch/1"
	entries := []Advancement{{Ref: "at://did/advancements/a", CharacterBranchRef: branchRef, EffectiveAt: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC), SupersedesRef: "at://did/advancements/missing"}}

	_, err := ActiveAdvancementSequence(branchRef, entries)
	if !errors.Is(err, ErrBranchMismatch) {
		t.Fatalf("expected broken supersedes to fail, got %v", err)
	}

	entries = []Advancement{
		{Ref: "at://did/advancements/a", CharacterBranchRef: branchRef, EffectiveAt: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC)},
		{Ref: "at://did/advancements/b", CharacterBranchRef: "at://branch/2", EffectiveAt: time.Date(2026, 4, 3, 1, 0, 0, 0, time.UTC), SupersedesRef: "at://did/advancements/a"},
	}
	_, err = ActiveAdvancementSequence(branchRef, entries)
	if !errors.Is(err, ErrBranchMismatch) {
		t.Fatalf("expected cross-branch supersedes to fail, got %v", err)
	}
}
