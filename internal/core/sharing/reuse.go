package sharing

import (
	"errors"
	"time"
)

var ErrInvalidReuseGrant = errors.New("invalid reuse grant")

type ReuseGrant struct {
	CharacterBranchRef string
	SourceCampaignRef  string
	GrantedByDid       string
	GrantedAt          time.Time
	RequestID          string
	RevokesRef         string
	TargetKind         string
	TargetRef          string
	TargetDid          string
	ReuseMode          string
}

func ValidateReuseGrant(grant ReuseGrant) error {
	if grant.CharacterBranchRef == "" || grant.SourceCampaignRef == "" || grant.GrantedByDid == "" || grant.RequestID == "" || grant.GrantedAt.IsZero() {
		return ErrInvalidReuseGrant
	}
	if grant.ReuseMode != "fork-only" && grant.ReuseMode != "fork-and-advance" && grant.ReuseMode != "summary-share" && grant.ReuseMode != "full-share" {
		return ErrInvalidReuseGrant
	}

	switch grant.TargetKind {
	case "campaign", "house", "world":
		if grant.TargetRef == "" || grant.TargetDid != "" {
			return ErrInvalidReuseGrant
		}
	case "actor":
		if grant.TargetDid == "" || grant.TargetRef != "" {
			return ErrInvalidReuseGrant
		}
	case "public":
		if grant.TargetRef != "" || grant.TargetDid != "" || grant.ReuseMode != "summary-share" {
			return ErrInvalidReuseGrant
		}
	default:
		return ErrInvalidReuseGrant
	}

	return nil
}
