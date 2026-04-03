package model

import (
	coremodel "cerulia/internal/core/model"
	"encoding/json"
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

type RulingEvent struct {
	SessionRef          string    `json:"sessionRef"`
	AppealCaseRef       string    `json:"appealCaseRef,omitempty"`
	ActionKind          string    `json:"actionKind"`
	ActorDid            string    `json:"actorDid"`
	NormalizedActionRef string    `json:"normalizedActionRef,omitempty"`
	RulesetNSID         string    `json:"rulesetNsid"`
	RulesetManifestRef  string    `json:"rulesetManifestRef"`
	RuleProfileRefs     []string  `json:"ruleProfileRefs,omitempty"`
	DecisionKind        string    `json:"decisionKind"`
	AudienceRef         string    `json:"audienceRef,omitempty"`
	ResultSummary       string    `json:"resultSummary"`
	DetailEnvelopeRef   string    `json:"detailEnvelopeRef,omitempty"`
	EmittedRecordRefs   []string  `json:"emittedRecordRefs,omitempty"`
	SupersedesRef       string    `json:"supersedesRef,omitempty"`
	DecidedByDid        string    `json:"decidedByDid"`
	RequestID           string    `json:"requestId"`
	CreatedAt           time.Time `json:"createdAt"`
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
	SessionRef              string    `json:"sessionRef"`
	AudienceID              string    `json:"audienceId"`
	Title                   string    `json:"title,omitempty"`
	AudienceKind            string    `json:"audienceKind"`
	SelectorPolicyKind      string    `json:"selectorPolicyKind"`
	ActorDids               []string  `json:"actorDids,omitempty"`
	Roles                   []string  `json:"roles,omitempty"`
	MembershipStatuses      []string  `json:"membershipStatuses,omitempty"`
	SessionStates           []string  `json:"sessionStates,omitempty"`
	SnapshotSourceRequestID string    `json:"snapshotSourceRequestId,omitempty"`
	RequestID               string    `json:"requestId"`
	KeyVersion              int64     `json:"keyVersion"`
	Status                  string    `json:"status"`
	UpdatedByDid            string    `json:"updatedByDid"`
	StatusReasonCode        string    `json:"statusReasonCode,omitempty"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

type AudienceGrant struct {
	AudienceRef      string     `json:"audienceRef"`
	ActorDid         string     `json:"actorDid"`
	RequestID        string     `json:"requestId"`
	KeyVersion       int64      `json:"keyVersion"`
	WrappedKey       string     `json:"wrappedKey"`
	GrantStatus      string     `json:"grantStatus"`
	ValidFrom        time.Time  `json:"validFrom"`
	GrantedByDid     string     `json:"grantedByDid"`
	RevokedAt        *time.Time `json:"revokedAt,omitempty"`
	RevokedByDid     string     `json:"revokedByDid,omitempty"`
	RevokeReasonCode string     `json:"revokeReasonCode,omitempty"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type SecretEnvelope struct {
	SessionRef    string    `json:"sessionRef"`
	AudienceRef   string    `json:"audienceRef"`
	PayloadType   string    `json:"payloadType"`
	CipherSuite   string    `json:"cipherSuite"`
	KeyVersion    int64     `json:"keyVersion"`
	ContentRef    string    `json:"contentRef"`
	ContentDigest string    `json:"contentDigest"`
	RequestID     string    `json:"requestId"`
	CreatedByDid  string    `json:"createdByDid"`
	CreatedAt     time.Time `json:"createdAt"`
}

type CharacterInstance struct {
	SessionRef            string     `json:"sessionRef"`
	BaseSheetRef          string     `json:"baseSheetRef,omitempty"`
	CharacterBranchRef    string     `json:"characterBranchRef,omitempty"`
	InstanceLabel         string     `json:"instanceLabel"`
	SourceType            string     `json:"sourceType"`
	ControllerDids        []string   `json:"controllerDids"`
	ControllerAudienceRef string     `json:"controllerAudienceRef,omitempty"`
	DefaultTokenRef       string     `json:"defaultTokenRef,omitempty"`
	RequestID             string     `json:"requestId"`
	CreatedAt             time.Time  `json:"createdAt"`
	RetiredAt             *time.Time `json:"retiredAt,omitempty"`
	UpdatedByDid          string     `json:"updatedByDid"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

type CharacterState struct {
	SessionRef              string           `json:"sessionRef"`
	CharacterInstanceRef    string           `json:"characterInstanceRef"`
	PublicResources         map[string]int64 `json:"publicResources,omitempty"`
	PublicStatuses          []string         `json:"publicStatuses,omitempty"`
	PrivateStateEnvelopeRef string           `json:"privateStateEnvelopeRef,omitempty"`
	SceneRef                string           `json:"sceneRef,omitempty"`
	Initiative              *int64           `json:"initiative,omitempty"`
	RequestID               string           `json:"requestId"`
	Revision                int64            `json:"revision"`
	UpdatedByDid            string           `json:"updatedByDid"`
	UpdatedAt               time.Time        `json:"updatedAt"`
}

type Message struct {
	SessionRef        string    `json:"sessionRef"`
	AuthorDid         string    `json:"authorDid"`
	ChannelKind       string    `json:"channelKind"`
	AudienceRef       string    `json:"audienceRef,omitempty"`
	BodyText          string    `json:"bodyText,omitempty"`
	SecretEnvelopeRef string    `json:"secretEnvelopeRef,omitempty"`
	ReplyToRef        string    `json:"replyToRef,omitempty"`
	RequestID         string    `json:"requestId"`
	ClientNonce       string    `json:"clientNonce,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
}

type Roll struct {
	SessionRef        string          `json:"sessionRef"`
	ActorDid          string          `json:"actorDid"`
	Command           string          `json:"command"`
	NormalizedCommand string          `json:"normalizedCommand,omitempty"`
	ResultSummary     string          `json:"resultSummary"`
	DetailPayload     json.RawMessage `json:"detailPayload,omitempty"`
	TargetRef         string          `json:"targetRef,omitempty"`
	AudienceRef       string          `json:"audienceRef,omitempty"`
	SecretEnvelopeRef string          `json:"secretEnvelopeRef,omitempty"`
	RequestID         string          `json:"requestId"`
	RNGVersion        string          `json:"rngVersion,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
}

type RevealEvent struct {
	SessionRef      string    `json:"sessionRef"`
	SubjectRef      string    `json:"subjectRef"`
	FromAudienceRef string    `json:"fromAudienceRef,omitempty"`
	ToAudienceRef   string    `json:"toAudienceRef"`
	RevealMode      string    `json:"revealMode"`
	RequestID       string    `json:"requestId"`
	PerformedByDid  string    `json:"performedByDid"`
	RevealedAt      time.Time `json:"revealedAt"`
	Note            string    `json:"note,omitempty"`
}

type RedactionEvent struct {
	SessionRef     string    `json:"sessionRef"`
	SubjectRef     string    `json:"subjectRef"`
	RedactionMode  string    `json:"redactionMode"`
	ReplacementRef string    `json:"replacementRef,omitempty"`
	RequestID      string    `json:"requestId"`
	ReasonCode     string    `json:"reasonCode"`
	PerformedByDid string    `json:"performedByDid"`
	CreatedAt      time.Time `json:"createdAt"`
}
