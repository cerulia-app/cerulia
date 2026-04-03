package character

import (
	"errors"
	"sort"
	"time"
)

var ErrBranchMismatch = errors.New("branch mismatch")

type Advancement struct {
	Ref                string
	CharacterBranchRef string
	EffectiveAt        time.Time
	SupersedesRef      string
}

type EpisodeAdvancementRef struct {
	Ref                string
	CharacterBranchRef string
}

func ActiveAdvancementSequence(branchRef string, entries []Advancement) ([]Advancement, error) {
	sorted := append([]Advancement(nil), entries...)
	sort.Slice(sorted, func(left int, right int) bool {
		if sorted[left].EffectiveAt.Equal(sorted[right].EffectiveAt) {
			return recordKey(sorted[left].Ref) < recordKey(sorted[right].Ref)
		}
		return sorted[left].EffectiveAt.Before(sorted[right].EffectiveAt)
	})

	byRef := map[string]Advancement{}
	for _, entry := range sorted {
		if entry.CharacterBranchRef != branchRef {
			return nil, ErrBranchMismatch
		}
		byRef[entry.Ref] = entry
	}

	superseded := map[string]struct{}{}
	for _, entry := range sorted {
		if entry.SupersedesRef == "" {
			continue
		}
		target, ok := byRef[entry.SupersedesRef]
		if !ok || target.CharacterBranchRef != branchRef {
			return nil, ErrBranchMismatch
		}
		superseded[entry.SupersedesRef] = struct{}{}
	}

	active := []Advancement{}
	for _, entry := range sorted {
		if _, ok := superseded[entry.Ref]; ok {
			continue
		}
		active = append(active, entry)
	}

	return active, nil
}

func ValidateEpisodeAdvancementRefs(branchRef string, advancements []EpisodeAdvancementRef) error {
	for _, advancement := range advancements {
		if advancement.CharacterBranchRef != branchRef {
			return ErrBranchMismatch
		}
	}

	return nil
}

func recordKey(ref string) string {
	lastSlash := -1
	for index, runeValue := range ref {
		if runeValue == '/' {
			lastSlash = index
		}
	}
	if lastSlash == -1 {
		return ref
	}

	return ref[lastSlash+1:]
}
