package membership

import (
	"errors"
	"time"

	"cerulia/internal/ledger"
)

var ErrInvalidMembershipTransition = errors.New("invalid membership transition")

type Membership struct {
	SessionRef         string
	ActorDid           string
	Role               string
	Status             string
	SupersedesRef      string
	InvitedByDid       string
	JoinedAt           *time.Time
	LeftAt             *time.Time
	BannedAt           *time.Time
	RequestID          string
	StatusChangedAt    time.Time
	StatusChangedByDid string
	StatusReasonCode   string
	Note               string
}

type InviteInput struct {
	SessionRef    string
	ActorDid      string
	Role          string
	InvitedByDid  string
	RequestID     string
	Note          string
	ExpectedStatus string
	Now           time.Time
	CurrentRef    string
}

type TransitionInput struct {
	ExpectedStatus string
	NextStatus     string
	Role           *string
	RequestID      string
	ChangedByDid   string
	ReasonCode     string
	Note           string
	Now            time.Time
	CurrentRef     string
}

func Invite(current *Membership, input InviteInput) (Membership, error) {
	if current != nil {
		if err := ledger.EnsureExpectedState(current.Status, input.ExpectedStatus); err != nil {
			return Membership{}, err
		}
		if current.Status != "left" && current.Status != "removed" {
			return Membership{}, ErrInvalidMembershipTransition
		}
	}

	return Membership{
		SessionRef:         input.SessionRef,
		ActorDid:           input.ActorDid,
		Role:               input.Role,
		Status:             "invited",
		SupersedesRef:      input.CurrentRef,
		InvitedByDid:       input.InvitedByDid,
		RequestID:          input.RequestID,
		StatusChangedAt:    input.Now.UTC(),
		StatusChangedByDid: input.InvitedByDid,
		Note:               input.Note,
	}, nil
}

func (membership Membership) Join(input TransitionInput) (Membership, error) {
	return membership.transition(input, map[string]struct{}{"joined": {}}, func(updated *Membership) {
		updated.JoinedAt = ptrTime(input.Now.UTC())
	})
}

func (membership Membership) Leave(input TransitionInput) (Membership, error) {
	return membership.transition(input, map[string]struct{}{"left": {}}, func(updated *Membership) {
		updated.LeftAt = ptrTime(input.Now.UTC())
	})
}

func (membership Membership) Moderate(input TransitionInput) (Membership, error) {
	allowed := map[string]struct{}{"removed": {}, "banned": {}, "joined": {}}
	return membership.transition(input, allowed, func(updated *Membership) {
		if input.NextStatus == "banned" {
			updated.BannedAt = ptrTime(input.Now.UTC())
		}
		if input.NextStatus == "joined" {
			updated.JoinedAt = ptrTime(input.Now.UTC())
		}
	})
}

func (membership Membership) CancelInvitation(input TransitionInput) (Membership, error) {
	return membership.transition(input, map[string]struct{}{"removed": {}}, nil)
}

func (membership Membership) transition(input TransitionInput, allowed map[string]struct{}, mutate func(*Membership)) (Membership, error) {
	if err := ledger.EnsureExpectedState(membership.Status, input.ExpectedStatus); err != nil {
		return Membership{}, err
	}
	if _, ok := allowed[input.NextStatus]; !ok {
		return Membership{}, ErrInvalidMembershipTransition
	}
	updated := membership
	updated.Status = input.NextStatus
	updated.SupersedesRef = input.CurrentRef
	if input.Role != nil {
		updated.Role = *input.Role
	}
	updated.RequestID = input.RequestID
	updated.StatusChangedAt = input.Now.UTC()
	updated.StatusChangedByDid = input.ChangedByDid
	updated.StatusReasonCode = input.ReasonCode
	updated.Note = input.Note
	if mutate != nil {
		mutate(&updated)
	}
	return updated, nil
}

func ptrTime(value time.Time) *time.Time {
	copy := value.UTC()
	return &copy
}