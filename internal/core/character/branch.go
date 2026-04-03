package character

import (
	"errors"
	"time"

	"cerulia/internal/ledger"
)

var ErrRetiredBranch = errors.New("branch is retired")

type Branch struct {
	OwnerDid           string
	BaseSheetRef       string
	BranchKind         string
	BranchLabel        string
	OverridePayloadRef string
	ImportedFrom       string
	SourceRevision     int64
	SyncMode           string
	Revision           int64
	UpdatedAt          time.Time
	UpdatedByDid       string
	RetiredAt          *time.Time
}

type UpdateBranchInput struct {
	ExpectedRevision   int64
	BranchLabel        *string
	OverridePayloadRef *string
	ImportedFrom       *string
	SourceRevision     *int64
	SyncMode           *string
	UpdatedAt          time.Time
	UpdatedByDid       string
}

func (branch Branch) Update(input UpdateBranchInput) (Branch, error) {
	if !branch.hasIdentity() {
		return Branch{}, ErrBranchMismatch
	}
	if branch.RetiredAt != nil {
		return Branch{}, ErrRetiredBranch
	}

	nextRevision, err := ledger.NextRevision(branch.Revision, input.ExpectedRevision)
	if err != nil {
		return Branch{}, err
	}

	updated := branch
	if input.BranchLabel != nil {
		updated.BranchLabel = *input.BranchLabel
	}
	if input.OverridePayloadRef != nil {
		updated.OverridePayloadRef = *input.OverridePayloadRef
	}
	if input.ImportedFrom != nil {
		updated.ImportedFrom = *input.ImportedFrom
	}
	if input.SourceRevision != nil {
		updated.SourceRevision = *input.SourceRevision
	}
	if input.SyncMode != nil {
		updated.SyncMode = *input.SyncMode
	}
	updated.Revision = nextRevision
	updated.UpdatedAt = input.UpdatedAt
	updated.UpdatedByDid = input.UpdatedByDid

	return updated, nil
}

func (branch Branch) Retire(expectedRevision int64, retiredAt time.Time, updatedByDid string) (Branch, error) {
	if !branch.hasIdentity() {
		return Branch{}, ErrBranchMismatch
	}
	if branch.RetiredAt != nil {
		return Branch{}, ErrRetiredBranch
	}

	nextRevision, err := ledger.NextRevision(branch.Revision, expectedRevision)
	if err != nil {
		return Branch{}, err
	}

	updated := branch
	updated.Revision = nextRevision
	updated.UpdatedAt = retiredAt
	updated.UpdatedByDid = updatedByDid
	updated.RetiredAt = &retiredAt

	return updated, nil
}

func (branch Branch) hasIdentity() bool {
	return branch.OwnerDid != "" && branch.BaseSheetRef != "" && branch.BranchKind != ""
}
