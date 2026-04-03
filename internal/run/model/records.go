package model

import (
	coremodel "cerulia/internal/core/model"
	"time"
)

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

type SessionPublication struct {
	SessionRef           string                        `json:"sessionRef"`
	PublicationRef       string                        `json:"publicationRef"`
	EntryURL             string                        `json:"entryUrl"`
	ReplayURL            string                        `json:"replayUrl,omitempty"`
	PreferredSurfaceKind string                        `json:"preferredSurfaceKind"`
	Surfaces             []coremodel.SurfaceDescriptor `json:"surfaces"`
	SupersedesRef        string                        `json:"supersedesRef,omitempty"`
	RequestID            string                        `json:"requestId"`
	PublishedByDid       string                        `json:"publishedByDid"`
	PublishedAt          time.Time                     `json:"publishedAt"`
	UpdatedByDid         string                        `json:"updatedByDid"`
	UpdatedAt            time.Time                     `json:"updatedAt"`
	RetiredAt            *time.Time                    `json:"retiredAt,omitempty"`
	RetireReasonCode     string                        `json:"retireReasonCode,omitempty"`
}

type AppealCase struct {
	SessionRef                    string     `json:"sessionRef"`
	TargetRef                     string     `json:"targetRef"`
	TargetKind                    string     `json:"targetKind"`
	TargetRequestID               string     `json:"targetRequestId"`
	AffectedActorDid              string     `json:"affectedActorDid"`
	RequestedOutcomeKind          string     `json:"requestedOutcomeKind"`
	OpenedByDid                   string     `json:"openedByDid"`
	OpenedAt                      time.Time  `json:"openedAt"`
	Status                        string     `json:"status"`
	CaseRevision                  int64      `json:"caseRevision"`
	ReviewRevision                int64      `json:"reviewRevision"`
	AuthoritySnapshotRequestID    string     `json:"authoritySnapshotRequestId"`
	ControllerTransferPolicyKind  string     `json:"controllerTransferPolicyKind"`
	ControllerEligibleDids        []string   `json:"controllerEligibleDids"`
	ControllerRequiredCount       int64      `json:"controllerRequiredCount"`
	ControllerReviewDueAt         time.Time  `json:"controllerReviewDueAt"`
	BlockedReasonCode             string     `json:"blockedReasonCode,omitempty"`
	EscalatedAt                   *time.Time `json:"escalatedAt,omitempty"`
	EscalatedByDid                string     `json:"escalatedByDid,omitempty"`
	EscalateRequestID             string     `json:"escalateRequestId,omitempty"`
	RecoveryEligibleDids          []string   `json:"recoveryEligibleDids,omitempty"`
	RecoveryAuthorityRequestID    string     `json:"recoveryAuthorityRequestId,omitempty"`
	ResolvedAt                    *time.Time `json:"resolvedAt,omitempty"`
	ResolvedByDid                 string     `json:"resolvedByDid,omitempty"`
	HandoffSummary                string     `json:"handoffSummary,omitempty"`
	ResultSummary                 string     `json:"resultSummary,omitempty"`
	ReviewOutcomeSummary          string     `json:"reviewOutcomeSummary,omitempty"`
	DetailEnvelopeRef             string     `json:"detailEnvelopeRef,omitempty"`
	WithdrawnByDid                string     `json:"withdrawnByDid,omitempty"`
	WithdrawnAt                   *time.Time `json:"withdrawnAt,omitempty"`
	WithdrawRequestID             string     `json:"withdrawRequestId,omitempty"`
	ControllerResolutionRequestID string     `json:"controllerResolutionRequestId,omitempty"`
	RecoveryResolutionRequestID   string     `json:"recoveryResolutionRequestId,omitempty"`
	RequestID                     string     `json:"requestId"`
	Note                          string     `json:"note,omitempty"`
}

type AppealReviewEntry struct {
	AppealCaseRef      string    `json:"appealCaseRef"`
	SessionRef         string    `json:"sessionRef"`
	ReviewPhaseKind    string    `json:"reviewPhaseKind"`
	ReviewerDid        string    `json:"reviewerDid"`
	ReviewDecisionKind string    `json:"reviewDecisionKind"`
	CaseRevision       int64     `json:"caseRevision"`
	ReviewRevision     int64     `json:"reviewRevision"`
	SupersedesRef      string    `json:"supersedesRef,omitempty"`
	DetailEnvelopeRef  string    `json:"detailEnvelopeRef,omitempty"`
	RequestID          string    `json:"requestId"`
	Note               string    `json:"note,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
}

type Audience struct {
	AudienceKind            string    `json:"audienceKind"`
	SelectorPolicyKind      string    `json:"selectorPolicyKind"`
	ActorDids               []string  `json:"actorDids"`
	SnapshotSourceRequestID string    `json:"snapshotSourceRequestId"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}
