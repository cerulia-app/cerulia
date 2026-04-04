package model

import (
	"encoding/json"
	"time"
)

type World struct {
	WorldID                string    `json:"worldId"`
	Title                  string    `json:"title"`
	CanonSummary           string    `json:"canonSummary,omitempty"`
	DefaultRuleProfileRefs []string  `json:"defaultRuleProfileRefs,omitempty"`
	StewardDids            []string  `json:"stewardDids"`
	Revision               int64     `json:"revision"`
	RequestID              string    `json:"requestId"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type House struct {
	HouseID                string    `json:"houseId"`
	Title                  string    `json:"title"`
	WorldRef               string    `json:"worldRef,omitempty"`
	DefaultRuleProfileRefs []string  `json:"defaultRuleProfileRefs,omitempty"`
	DefaultReusePolicyKind string    `json:"defaultReusePolicyKind"`
	PolicySummary          string    `json:"policySummary,omitempty"`
	StewardDids            []string  `json:"stewardDids"`
	Revision               int64     `json:"revision"`
	RequestID              string    `json:"requestId"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type Campaign struct {
	CampaignID             string     `json:"campaignId"`
	Title                  string     `json:"title"`
	Visibility             string     `json:"visibility"`
	HouseRef               string     `json:"houseRef,omitempty"`
	WorldRef               string     `json:"worldRef,omitempty"`
	RulesetNSID            string     `json:"rulesetNsid"`
	RulesetManifestRef     string     `json:"rulesetManifestRef"`
	SharedRuleProfileRefs  []string   `json:"sharedRuleProfileRefs,omitempty"`
	DefaultReusePolicyKind string     `json:"defaultReusePolicyKind"`
	StewardDids            []string   `json:"stewardDids"`
	CreatedAt              time.Time  `json:"createdAt"`
	ArchivedAt             *time.Time `json:"archivedAt,omitempty"`
	Revision               int64      `json:"revision"`
	RequestID              string     `json:"requestId"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

type RulesetManifest struct {
	RulesetNSID      string     `json:"rulesetNsid"`
	ManifestVersion  int64      `json:"manifestVersion"`
	ActionSchemaRefs []string   `json:"actionSchemaRefs,omitempty"`
	OutputSchemaRefs []string   `json:"outputSchemaRefs,omitempty"`
	ResolverRef      string     `json:"resolverRef"`
	ResolverVersion  int64      `json:"resolverVersion"`
	CapabilityKinds  []string   `json:"capabilityKinds,omitempty"`
	PublishedAt      time.Time  `json:"publishedAt"`
	RetiredAt        *time.Time `json:"retiredAt,omitempty"`
}

type RuleProfile struct {
	BaseRulesetNSID string     `json:"baseRulesetNsid"`
	ProfileTitle    string     `json:"profileTitle"`
	ScopeKind       string     `json:"scopeKind"`
	ScopeRef        string     `json:"scopeRef"`
	Status          string     `json:"status"`
	EffectiveFrom   *time.Time `json:"effectiveFrom,omitempty"`
	EffectiveUntil  *time.Time `json:"effectiveUntil,omitempty"`
	SupersedesRef   string     `json:"supersedesRef,omitempty"`
	RulesPatchRef   string     `json:"rulesPatchRef"`
	ApprovedByDid   string     `json:"approvedByDid"`
	RequestID       string     `json:"requestId"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

type CharacterSheet struct {
	OwnerDid         string          `json:"ownerDid"`
	RulesetNSID      string          `json:"rulesetNsid"`
	DisplayName      string          `json:"displayName"`
	PortraitRef      string          `json:"portraitRef,omitempty"`
	PublicProfile    json.RawMessage `json:"publicProfile,omitempty"`
	Stats            json.RawMessage `json:"stats,omitempty"`
	ExternalSheetURI string          `json:"externalSheetUri,omitempty"`
	Version          int64           `json:"version"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

type CharacterBranch struct {
	OwnerDid           string     `json:"ownerDid"`
	BaseSheetRef       string     `json:"baseSheetRef"`
	BranchKind         string     `json:"branchKind"`
	BranchLabel        string     `json:"branchLabel"`
	OverridePayloadRef string     `json:"overridePayloadRef,omitempty"`
	ImportedFrom       string     `json:"importedFrom,omitempty"`
	SourceRevision     int64      `json:"sourceRevision,omitempty"`
	SyncMode           string     `json:"syncMode,omitempty"`
	RequestID          string     `json:"requestId"`
	Revision           int64      `json:"revision"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	UpdatedByDid       string     `json:"updatedByDid"`
	RetiredAt          *time.Time `json:"retiredAt,omitempty"`
}

type CharacterAdvancement struct {
	CharacterBranchRef string    `json:"characterBranchRef"`
	AdvancementKind    string    `json:"advancementKind"`
	DeltaPayloadRef    string    `json:"deltaPayloadRef"`
	ApprovedByDid      string    `json:"approvedByDid"`
	EffectiveAt        time.Time `json:"effectiveAt"`
	SupersedesRef      string    `json:"supersedesRef,omitempty"`
	RequestID          string    `json:"requestId"`
	CreatedAt          time.Time `json:"createdAt"`
	Note               string    `json:"note,omitempty"`
}

type CharacterEpisode struct {
	CharacterBranchRef       string    `json:"characterBranchRef"`
	CampaignRef              string    `json:"campaignRef,omitempty"`
	ScenarioLabel            string    `json:"scenarioLabel,omitempty"`
	RulesetManifestRef       string    `json:"rulesetManifestRef"`
	EffectiveRuleProfileRefs []string  `json:"effectiveRuleProfileRefs"`
	OutcomeSummary           string    `json:"outcomeSummary"`
	AdvancementRefs          []string  `json:"advancementRefs"`
	SupersedesRef            string    `json:"supersedesRef,omitempty"`
	RecordedByDid            string    `json:"recordedByDid"`
	CreatedAt                time.Time `json:"createdAt"`
	RequestID                string    `json:"requestId"`
}

type CharacterConversion struct {
	SourceSheetRef                 string    `json:"sourceSheetRef"`
	SourceSheetVersion             int64     `json:"sourceSheetVersion"`
	SourceBranchRef                string    `json:"sourceBranchRef,omitempty"`
	SourceEpisodeRefs              []string  `json:"sourceEpisodeRefs,omitempty"`
	SourceRulesetManifestRef       string    `json:"sourceRulesetManifestRef"`
	SourceEffectiveRuleProfileRefs []string  `json:"sourceEffectiveRuleProfileRefs"`
	TargetSheetRef                 string    `json:"targetSheetRef"`
	TargetSheetVersion             int64     `json:"targetSheetVersion"`
	TargetBranchRef                string    `json:"targetBranchRef"`
	TargetCampaignRef              string    `json:"targetCampaignRef,omitempty"`
	TargetRulesetManifestRef       string    `json:"targetRulesetManifestRef"`
	TargetEffectiveRuleProfileRefs []string  `json:"targetEffectiveRuleProfileRefs"`
	ConversionContractRef          string    `json:"conversionContractRef"`
	ConversionContractVersion      int64     `json:"conversionContractVersion"`
	ReuseGrantRef                  string    `json:"reuseGrantRef,omitempty"`
	SupersedesRef                  string    `json:"supersedesRef,omitempty"`
	ConvertedByDid                 string    `json:"convertedByDid"`
	ConvertedAt                    time.Time `json:"convertedAt"`
	RequestID                      string    `json:"requestId"`
	Note                           string    `json:"note,omitempty"`
}

type SurfaceDescriptor struct {
	SurfaceKind string     `json:"surfaceKind"`
	PurposeKind string     `json:"purposeKind"`
	SurfaceURI  string     `json:"surfaceUri"`
	Status      string     `json:"status"`
	RetiredAt   *time.Time `json:"retiredAt,omitempty"`
}

type Publication struct {
	SubjectRef           string              `json:"subjectRef"`
	SubjectKind          string              `json:"subjectKind"`
	ReuseGrantRef        string              `json:"reuseGrantRef,omitempty"`
	EntryURL             string              `json:"entryUrl"`
	PreferredSurfaceKind string              `json:"preferredSurfaceKind"`
	Surfaces             []SurfaceDescriptor `json:"surfaces"`
	Status               string              `json:"status"`
	SupersedesRef        string              `json:"supersedesRef,omitempty"`
	PublishedByDid       string              `json:"publishedByDid"`
	PublishedAt          time.Time           `json:"publishedAt"`
	RetiredAt            *time.Time          `json:"retiredAt,omitempty"`
	RequestID            string              `json:"requestId"`
	Note                 string              `json:"note,omitempty"`
}

type ReuseGrant struct {
	CharacterBranchRef string     `json:"characterBranchRef"`
	SourceCampaignRef  string     `json:"sourceCampaignRef"`
	TargetKind         string     `json:"targetKind"`
	TargetRef          string     `json:"targetRef,omitempty"`
	TargetDid          string     `json:"targetDid,omitempty"`
	ReuseMode          string     `json:"reuseMode"`
	RevokesRef         string     `json:"revokesRef,omitempty"`
	GrantedByDid       string     `json:"grantedByDid"`
	GrantedAt          time.Time  `json:"grantedAt"`
	ExpiresAt          *time.Time `json:"expiresAt,omitempty"`
	RevokedAt          *time.Time `json:"revokedAt,omitempty"`
	RevokedByDid       string     `json:"revokedByDid,omitempty"`
	RevokeReasonCode   string     `json:"revokeReasonCode,omitempty"`
	RequestID          string     `json:"requestId"`
	Note               string     `json:"note,omitempty"`
}
