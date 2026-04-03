package authority

import (
	"errors"
	"slices"
	"time"

	"cerulia/internal/ledger"
)

var (
	ErrInvalidAuthority = errors.New("invalid authority")
	ErrUnauthorized     = errors.New("unauthorized authority update")
	ErrInvalidTransfer  = errors.New("invalid authority transfer")
)

type Authority struct {
	SessionRef             string
	AuthorityID            string
	GMAudienceRef          string
	ControllerDids         []string
	RecoveryControllerDids []string
	LeaseHolderDid         string
	LeaseExpiresAt         *time.Time
	TransferPolicy         string
	PendingControllerDids  []string
	TransferPhase          string
	TransferStartedAt      *time.Time
	TransferCompletedAt    *time.Time
	RequestID              string
	UpdatedByDid           string
	ChangeReasonCode       string
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type CreateInput struct {
	SessionRef             string
	AuthorityID            string
	GMAudienceRef          string
	ControllerDids         []string
	RecoveryControllerDids []string
	TransferPolicy         string
	RequestID              string
	ActorDid               string
	Now                    time.Time
}

type TransferInput struct {
	ExpectedAuthorityRequestID string
	ExpectedTransferPhase      string
	ExpectedControllerDids     []string
	PendingControllerDids      []string
	TransferPolicy             *string
	LeaseHolderDid             *string
	RequestID                  string
	UpdatedByDid               string
	ReasonCode                 string
	Now                        time.Time
	NextGMAudienceRef          string
}

func Create(input CreateInput) (Authority, error) {
	if len(input.ControllerDids) == 0 || len(input.RecoveryControllerDids) == 0 || input.GMAudienceRef == "" {
		return Authority{}, ErrInvalidAuthority
	}
	if !contains(input.ControllerDids, input.ActorDid) {
		return Authority{}, ErrUnauthorized
	}
	now := input.Now.UTC()
	return Authority{
		SessionRef:             input.SessionRef,
		AuthorityID:            input.AuthorityID,
		GMAudienceRef:          input.GMAudienceRef,
		ControllerDids:         append([]string(nil), input.ControllerDids...),
		RecoveryControllerDids: append([]string(nil), input.RecoveryControllerDids...),
		LeaseHolderDid:         input.ActorDid,
		TransferPolicy:         input.TransferPolicy,
		TransferPhase:          "stable",
		RequestID:              input.RequestID,
		UpdatedByDid:           input.ActorDid,
		CreatedAt:              now,
		UpdatedAt:              now,
	}, nil
}

func (authority Authority) Transfer(input TransferInput) (Authority, error) {
	if !authority.canTransfer(input.UpdatedByDid, input.Now.UTC()) {
		return Authority{}, ErrUnauthorized
	}
	if err := ledger.EnsureAuthoritySnapshot(ledger.AuthoritySnapshot{
		RequestID:      authority.RequestID,
		TransferPhase:  authority.TransferPhase,
		ControllerDids: authority.ControllerDids,
	}, input.ExpectedAuthorityRequestID, input.ExpectedTransferPhase, input.ExpectedControllerDids); err != nil {
		return Authority{}, err
	}
	if len(input.PendingControllerDids) == 0 {
		return Authority{}, ErrInvalidTransfer
	}

	updated := authority
	updated.RequestID = input.RequestID
	updated.UpdatedByDid = input.UpdatedByDid
	updated.ChangeReasonCode = input.ReasonCode
	updated.UpdatedAt = input.Now.UTC()
	if input.TransferPolicy != nil {
		updated.TransferPolicy = *input.TransferPolicy
	}
	if input.LeaseHolderDid != nil {
		updated.LeaseHolderDid = *input.LeaseHolderDid
	}

	switch authority.TransferPhase {
	case "stable":
		updated.PendingControllerDids = append([]string(nil), input.PendingControllerDids...)
		updated.TransferPhase = "preparing"
		updated.TransferStartedAt = ptrTime(input.Now.UTC())
		updated.TransferCompletedAt = nil
	case "preparing":
		if !sameSet(authority.PendingControllerDids, input.PendingControllerDids) {
			return Authority{}, ErrInvalidTransfer
		}
		updated.TransferPhase = "rotating-grants"
	case "rotating-grants":
		if !sameSet(authority.PendingControllerDids, input.PendingControllerDids) || input.NextGMAudienceRef == "" {
			return Authority{}, ErrInvalidTransfer
		}
		updated.GMAudienceRef = input.NextGMAudienceRef
		updated.TransferPhase = "finalizing"
	case "finalizing":
		if !sameSet(authority.PendingControllerDids, input.PendingControllerDids) {
			return Authority{}, ErrInvalidTransfer
		}
		updated.ControllerDids = append([]string(nil), authority.PendingControllerDids...)
		updated.PendingControllerDids = nil
		updated.TransferPhase = "stable"
		updated.TransferCompletedAt = ptrTime(input.Now.UTC())
		if updated.LeaseHolderDid == "" && len(updated.ControllerDids) > 0 {
			updated.LeaseHolderDid = updated.ControllerDids[0]
		}
	default:
		return Authority{}, ErrInvalidTransfer
	}

	return updated, nil
}

func (authority Authority) HealthKind(now time.Time) string {
	if len(authority.ControllerDids) == 0 {
		return "controller-missing"
	}
	if authority.TransferPhase != "stable" {
		return "transfer-in-progress"
	}
	if authority.LeaseExpiresAt != nil && !authority.LeaseExpiresAt.After(now.UTC()) {
		return "lease-expired"
	}
	return "healthy"
}

func (authority Authority) LeaseState(now time.Time) string {
	if authority.TransferPhase != "stable" {
		return "transferring"
	}
	if authority.LeaseExpiresAt != nil && !authority.LeaseExpiresAt.After(now.UTC()) {
		return "expired"
	}
	return "active"
}

func (authority Authority) canTransfer(actorDid string, now time.Time) bool {
	if contains(authority.ControllerDids, actorDid) {
		return true
	}
	if contains(authority.RecoveryControllerDids, actorDid) {
		return authority.HealthKind(now) == "lease-expired" || authority.HealthKind(now) == "controller-missing"
	}
	return false
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func sameSet(left []string, right []string) bool {
	leftValues := append([]string(nil), left...)
	rightValues := append([]string(nil), right...)
	slices.Sort(leftValues)
	slices.Sort(rightValues)
	return slices.Equal(leftValues, rightValues)
}

func ptrTime(value time.Time) *time.Time {
	copy := value.UTC()
	return &copy
}
