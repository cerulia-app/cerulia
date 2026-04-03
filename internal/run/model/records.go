package model

import "time"

type Session struct {
	SessionID              string     `json:"sessionId"`
	CampaignRef            string     `json:"campaignRef,omitempty"`
	Title                  string     `json:"title"`
	Visibility             string     `json:"visibility"`
	RulesetNSID            string     `json:"rulesetNsid"`
	RulesetManifestRef     string     `json:"rulesetManifestRef"`
	RuleProfileRefs        []string   `json:"ruleProfileRefs"`
	AuthorityRef           string     `json:"authorityRef"`
	State                  string     `json:"state"`
	CreatedAt              time.Time  `json:"createdAt"`
	ScheduledAt            *time.Time `json:"scheduledAt,omitempty"`
	EndedAt                *time.Time `json:"endedAt,omitempty"`
	ArchivedAt             *time.Time `json:"archivedAt,omitempty"`
	RequestID              string     `json:"requestId"`
	StateChangedAt         time.Time  `json:"stateChangedAt"`
	StateChangedByDid      string     `json:"stateChangedByDid"`
	StateReasonCode        string     `json:"stateReasonCode,omitempty"`
	VisibilityChangedAt    time.Time  `json:"visibilityChangedAt"`
	VisibilityChangedByDid string     `json:"visibilityChangedByDid"`
	VisibilityReasonCode   string     `json:"visibilityReasonCode,omitempty"`
}

type SessionAuthority struct {
	SessionRef             string     `json:"sessionRef"`
	AuthorityID            string     `json:"authorityId"`
	GMAudienceRef          string     `json:"gmAudienceRef"`
	ControllerDids         []string   `json:"controllerDids"`
	RecoveryControllerDids []string   `json:"recoveryControllerDids"`
	LeaseHolderDid         string     `json:"leaseHolderDid,omitempty"`
	LeaseExpiresAt         *time.Time `json:"leaseExpiresAt,omitempty"`
	TransferPolicy         string     `json:"transferPolicy"`
	PendingControllerDids  []string   `json:"pendingControllerDids,omitempty"`
	TransferPhase          string     `json:"transferPhase"`
	TransferStartedAt      *time.Time `json:"transferStartedAt,omitempty"`
	TransferCompletedAt    *time.Time `json:"transferCompletedAt,omitempty"`
	RequestID              string     `json:"requestId"`
	UpdatedByDid           string     `json:"updatedByDid"`
	ChangeReasonCode       string     `json:"changeReasonCode,omitempty"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

type Membership struct {
	SessionRef         string     `json:"sessionRef"`
	ActorDid           string     `json:"actorDid"`
	Role               string     `json:"role"`
	Status             string     `json:"status"`
	SupersedesRef      string     `json:"supersedesRef,omitempty"`
	InvitedByDid       string     `json:"invitedByDid,omitempty"`
	JoinedAt           *time.Time `json:"joinedAt,omitempty"`
	LeftAt             *time.Time `json:"leftAt,omitempty"`
	BannedAt           *time.Time `json:"bannedAt,omitempty"`
	RequestID          string     `json:"requestId"`
	StatusChangedAt    time.Time  `json:"statusChangedAt"`
	StatusChangedByDid string     `json:"statusChangedByDid"`
	StatusReasonCode   string     `json:"statusReasonCode,omitempty"`
	Note               string     `json:"note,omitempty"`
}

type Audience struct {
	AudienceKind            string    `json:"audienceKind"`
	SelectorPolicyKind      string    `json:"selectorPolicyKind"`
	ActorDids               []string  `json:"actorDids"`
	SnapshotSourceRequestID string    `json:"snapshotSourceRequestId"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}
