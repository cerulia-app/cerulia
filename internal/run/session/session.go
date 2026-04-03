package session

import (
	"errors"
	"time"

	"cerulia/internal/ledger"
)

var (
	ErrUnsupportedRuleset = errors.New("unsupported ruleset")
	ErrInvalidTransition  = errors.New("invalid session transition")
)

type Session struct {
	SessionID             string
	CampaignRef           string
	Title                 string
	Visibility            string
	RulesetNSID           string
	RulesetManifestRef    string
	RuleProfileRefs       []string
	AuthorityRef          string
	State                 string
	CreatedAt             time.Time
	ScheduledAt           *time.Time
	EndedAt               *time.Time
	ArchivedAt            *time.Time
	RequestID             string
	StateChangedAt        time.Time
	StateChangedByDid     string
	StateReasonCode       string
	VisibilityChangedAt   time.Time
	VisibilityChangedByDid string
	VisibilityReasonCode  string
}

type CreateDraftInput struct {
	SessionID                  string
	CampaignRef                string
	Title                      string
	Visibility                 string
	RulesetNSID                string
	RulesetManifestRef         string
	RuleProfileRefs            []string
	AuthorityRef               string
	ScheduledAt                *time.Time
	ExpectedRulesetManifestRef string
	RequestID                  string
	ActorDid                   string
	Now                        time.Time
}

func CreateDraft(input CreateDraftInput) (Session, error) {
	if input.ExpectedRulesetManifestRef != input.RulesetManifestRef {
		return Session{}, ErrUnsupportedRuleset
	}

	now := input.Now.UTC()
	return Session{
		SessionID:               input.SessionID,
		CampaignRef:             input.CampaignRef,
		Title:                   input.Title,
		Visibility:              input.Visibility,
		RulesetNSID:             input.RulesetNSID,
		RulesetManifestRef:      input.RulesetManifestRef,
		RuleProfileRefs:         append([]string(nil), input.RuleProfileRefs...),
		AuthorityRef:            input.AuthorityRef,
		State:                   "planning",
		CreatedAt:               now,
		ScheduledAt:             copyTimePtr(input.ScheduledAt),
		RequestID:               input.RequestID,
		StateChangedAt:          now,
		StateChangedByDid:       input.ActorDid,
		VisibilityChangedAt:     now,
		VisibilityChangedByDid:  input.ActorDid,
	}, nil
}

func (session Session) Transition(expectedState string, nextState string, requestID string, actorDid string, reasonCode string, now time.Time) (Session, error) {
	if err := ledger.EnsureExpectedState(session.State, expectedState); err != nil {
		return Session{}, err
	}
	if !allowedTransition(session.State, nextState) {
		return Session{}, ErrInvalidTransition
	}

	updated := session
	updated.State = nextState
	updated.RequestID = requestID
	updated.StateChangedAt = now.UTC()
	updated.StateChangedByDid = actorDid
	updated.StateReasonCode = reasonCode
	if nextState == "ended" {
		updated.EndedAt = ptrTime(now.UTC())
	}
	if nextState == "archived" {
		updated.ArchivedAt = ptrTime(now.UTC())
	}
	return updated, nil
}

func allowedTransition(current string, next string) bool {
	switch current {
	case "planning":
		return next == "open"
	case "open":
		return next == "active" || next == "ended"
	case "active":
		return next == "paused" || next == "ended"
	case "paused":
		return next == "active" || next == "ended"
	case "ended":
		return next == "active" || next == "paused" || next == "archived"
	default:
		return false
	}
}

func copyTimePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copy := value.UTC()
	return &copy
}

func ptrTime(value time.Time) *time.Time {
	copy := value.UTC()
	return &copy
}