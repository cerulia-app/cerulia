package projection

import (
	coremodel "cerulia/internal/core/model"
	"time"
)

type Page[T any] struct {
	Items  []T    `json:"items"`
	Cursor string `json:"cursor,omitempty"`
}

type AccessPreflight struct {
	SessionRef            string `json:"sessionRef"`
	DecisionKind          string `json:"decisionKind"`
	ReasonCode            string `json:"reasonCode"`
	RecommendedRoute      string `json:"recommendedRoute"`
	AuthorityRequestID    string `json:"authorityRequestId,omitempty"`
	MembershipRequestID   string `json:"membershipRequestId,omitempty"`
	AppealCaseRef         string `json:"appealCaseRef,omitempty"`
	SessionPublicationRef string `json:"sessionPublicationRef,omitempty"`
}

type SessionSummary struct {
	SessionRef             string     `json:"sessionRef"`
	Title                  string     `json:"title"`
	Visibility             string     `json:"visibility"`
	State                  string     `json:"state"`
	CampaignRef            string     `json:"campaignRef,omitempty"`
	RulesetManifestRef     string     `json:"rulesetManifestRef"`
	RuleProfileRefs        []string   `json:"ruleProfileRefs"`
	ScheduledAt            *time.Time `json:"scheduledAt,omitempty"`
	EndedAt                *time.Time `json:"endedAt,omitempty"`
	ArchivedAt             *time.Time `json:"archivedAt,omitempty"`
	StateChangedAt         *time.Time `json:"stateChangedAt,omitempty"`
	StateChangedByDid      string     `json:"stateChangedByDid,omitempty"`
	StateReasonCode        string     `json:"stateReasonCode,omitempty"`
	VisibilityChangedAt    *time.Time `json:"visibilityChangedAt,omitempty"`
	VisibilityChangedByDid string     `json:"visibilityChangedByDid,omitempty"`
	VisibilityReasonCode   string     `json:"visibilityReasonCode,omitempty"`
}

type ParticipantAuthoritySummary struct {
	AuthorityRef        string     `json:"authorityRef"`
	TransferPhase       string     `json:"transferPhase"`
	AuthorityHealthKind string     `json:"authorityHealthKind"`
	LeaseState          string     `json:"leaseState"`
	LeaseExpiresAt      *time.Time `json:"leaseExpiresAt,omitempty"`
}

type GovernanceAuthoritySummary struct {
	AuthorityRef           string     `json:"authorityRef"`
	ControllerDids         []string   `json:"controllerDids"`
	RecoveryControllerDids []string   `json:"recoveryControllerDids"`
	LeaseHolderDid         string     `json:"leaseHolderDid,omitempty"`
	LeaseExpiresAt         *time.Time `json:"leaseExpiresAt,omitempty"`
	AuthorityHealthKind    string     `json:"authorityHealthKind"`
	TransferPhase          string     `json:"transferPhase"`
	TransferStartedAt      *time.Time `json:"transferStartedAt,omitempty"`
	PendingControllerDids  []string   `json:"pendingControllerDids,omitempty"`
	TransferCompletedAt    *time.Time `json:"transferCompletedAt,omitempty"`
}

type MembershipSummary struct {
	ActorDid           string    `json:"actorDid"`
	Role               string    `json:"role"`
	Status             string    `json:"status"`
	StatusChangedAt    time.Time `json:"statusChangedAt"`
	StatusChangedByDid string    `json:"statusChangedByDid"`
	StatusReasonCode   string    `json:"statusReasonCode,omitempty"`
}

type SessionPublicationSummary struct {
	SessionPublicationRef string                        `json:"sessionPublicationRef"`
	PublicationRef        string                        `json:"publicationRef"`
	EntryURL              string                        `json:"entryUrl"`
	ReplayURL             string                        `json:"replayUrl,omitempty"`
	PreferredSurfaceKind  string                        `json:"preferredSurfaceKind"`
	Surfaces              []coremodel.SurfaceDescriptor `json:"surfaces,omitempty"`
	RetiredAt             *time.Time                    `json:"retiredAt,omitempty"`
	RetireReasonCode      string                        `json:"retireReasonCode,omitempty"`
	UpdatedAt             *time.Time                    `json:"updatedAt,omitempty"`
	PublishedByDid        string                        `json:"publishedByDid,omitempty"`
	UpdatedByDid          string                        `json:"updatedByDid,omitempty"`
}

type AppealCaseSummary struct {
	AppealCaseRef              string     `json:"appealCaseRef"`
	TargetKind                 string     `json:"targetKind"`
	TargetRef                  string     `json:"targetRef"`
	RequestedOutcomeKind       string     `json:"requestedOutcomeKind"`
	Status                     string     `json:"status"`
	BlockedReasonCode          string     `json:"blockedReasonCode,omitempty"`
	NextResolverKind           string     `json:"nextResolverKind"`
	OpenedAt                   time.Time  `json:"openedAt"`
	ResolvedAt                 *time.Time `json:"resolvedAt,omitempty"`
	HandoffSummary             string     `json:"handoffSummary,omitempty"`
	ResultSummary              string     `json:"resultSummary,omitempty"`
	ReviewOutcomeSummary       string     `json:"reviewOutcomeSummary,omitempty"`
	ControllerReviewDueAt      *time.Time `json:"controllerReviewDueAt,omitempty"`
	RecoveryAuthorityRequestID string     `json:"recoveryAuthorityRequestId,omitempty"`
}

type SessionView struct {
	Session             SessionSummary              `json:"session"`
	AuthoritySummary    ParticipantAuthoritySummary `json:"authoritySummary"`
	Memberships         []MembershipSummary         `json:"memberships"`
	ActiveSceneRef      string                      `json:"activeSceneRef,omitempty"`
	HandoutCount        int                         `json:"handoutCount"`
	AppealCount         int                         `json:"appealCount"`
	PublicationCarriers []SessionPublicationSummary `json:"publicationCarriers,omitempty"`
}

type GovernanceView struct {
	Session             SessionSummary              `json:"session"`
	Authority           GovernanceAuthoritySummary  `json:"authority"`
	Memberships         []MembershipSummary         `json:"memberships"`
	ActiveSceneRef      string                      `json:"activeSceneRef,omitempty"`
	PublicationCarriers []SessionPublicationSummary `json:"publicationCarriers,omitempty"`
	PendingAppeals      []AppealCaseSummary         `json:"pendingAppeals,omitempty"`
}
