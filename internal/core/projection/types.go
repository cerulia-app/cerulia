package projection

import "time"

type Page[T any] struct {
	Items  []T    `json:"items"`
	Cursor string `json:"cursor,omitempty"`
}

type BranchSummary struct {
	CharacterBranchRef string `json:"characterBranchRef"`
	BaseSheetRef       string `json:"baseSheetRef"`
	BranchLabel        string `json:"branchLabel"`
	BranchKind         string `json:"branchKind"`
	OwnerDid           string `json:"ownerDid"`
	Revision           int64  `json:"revision"`
}

type EpisodeSummary struct {
	CharacterEpisodeRef string    `json:"characterEpisodeRef"`
	CharacterBranchRef  string    `json:"characterBranchRef"`
	CampaignRef         string    `json:"campaignRef,omitempty"`
	ScenarioLabel       string    `json:"scenarioLabel,omitempty"`
	OutcomeSummary      string    `json:"outcomeSummary"`
	CreatedAt           time.Time `json:"createdAt"`
}

type ConversionSummary struct {
	CharacterConversionRef   string    `json:"characterConversionRef"`
	SourceSheetRef           string    `json:"sourceSheetRef"`
	SourceSheetVersion       int64     `json:"sourceSheetVersion"`
	SourceBranchRef          string    `json:"sourceBranchRef,omitempty"`
	TargetSheetRef           string    `json:"targetSheetRef"`
	TargetSheetVersion       int64     `json:"targetSheetVersion"`
	TargetBranchRef          string    `json:"targetBranchRef"`
	SourceRulesetManifestRef string    `json:"sourceRulesetManifestRef"`
	TargetRulesetManifestRef string    `json:"targetRulesetManifestRef"`
	ConvertedByDid           string    `json:"convertedByDid"`
	AuthorityKind            string    `json:"authorityKind"`
	ConvertedAt              time.Time `json:"convertedAt"`
	ReuseGrantRef            string    `json:"reuseGrantRef,omitempty"`
}

type ReuseGrantSummary struct {
	CharacterBranchRef string     `json:"-"`
	ReuseGrantRef      string     `json:"reuseGrantRef"`
	SourceCampaignRef  string     `json:"sourceCampaignRef"`
	TargetKind         string     `json:"targetKind"`
	TargetRef          string     `json:"targetRef,omitempty"`
	TargetDid          string     `json:"targetDid,omitempty"`
	ReuseMode          string     `json:"reuseMode"`
	GrantedAt          time.Time  `json:"grantedAt"`
	ExpiresAt          *time.Time `json:"expiresAt,omitempty"`
	RevokedAt          *time.Time `json:"revokedAt,omitempty"`
}

type SurfaceDescriptor struct {
	SurfaceKind string     `json:"surfaceKind"`
	PurposeKind string     `json:"purposeKind"`
	SurfaceURI  string     `json:"surfaceUri"`
	Status      string     `json:"status"`
	RetiredAt   *time.Time `json:"retiredAt,omitempty"`
}

type PublicationSummary struct {
	PublicationRef           string              `json:"publicationRef"`
	SubjectRef               string              `json:"subjectRef"`
	SubjectKind              string              `json:"subjectKind"`
	EntryURL                 string              `json:"entryUrl"`
	PreferredSurfaceKind     string              `json:"preferredSurfaceKind"`
	Surfaces                 []SurfaceDescriptor `json:"surfaces"`
	Status                   string              `json:"status"`
	PublishedAt              time.Time           `json:"publishedAt"`
	RetiredAt                *time.Time          `json:"retiredAt,omitempty"`
	SourceRulesetManifestRef string              `json:"sourceRulesetManifestRef,omitempty"`
	TargetRulesetManifestRef string              `json:"targetRulesetManifestRef,omitempty"`
	GrantBacked              bool                `json:"grantBacked,omitempty"`
}

type CampaignSummary struct {
	CampaignRef        string     `json:"campaignRef"`
	Title              string     `json:"title"`
	Visibility         string     `json:"visibility"`
	HouseRef           string     `json:"houseRef,omitempty"`
	WorldRef           string     `json:"worldRef,omitempty"`
	RulesetNSID        string     `json:"rulesetNsid,omitempty"`
	RulesetManifestRef string     `json:"rulesetManifestRef,omitempty"`
	ArchivedAt         *time.Time `json:"archivedAt,omitempty"`
}

type CharacterHomeView struct {
	OwnerDid              string               `json:"ownerDid"`
	PrimaryBranch         BranchSummary        `json:"primaryBranch"`
	Branches              []BranchSummary      `json:"branches"`
	RecentEpisodes        []EpisodeSummary     `json:"recentEpisodes"`
	RecentConversions     []ConversionSummary  `json:"recentConversions,omitempty"`
	ReuseGrants           []ReuseGrantSummary  `json:"reuseGrants"`
	Publications          []PublicationSummary `json:"publications"`
	LinkedCampaigns       []CampaignSummary    `json:"linkedCampaigns,omitempty"`
	RecentAdvancementRefs []string             `json:"recentAdvancementRefs,omitempty"`
}

type CampaignView struct {
	Mode               string               `json:"mode"`
	Campaign           CampaignSummary      `json:"campaign"`
	RuleProvenance     *RuleProvenance      `json:"ruleProvenance,omitempty"`
	DefaultReusePolicy string               `json:"defaultReusePolicy,omitempty"`
	PublishedArtifacts []PublicationSummary `json:"publishedArtifacts"`
	RecentContinuity   []EpisodeSummary     `json:"recentContinuity,omitempty"`
	ActiveBranches     []BranchSummary      `json:"activeBranches,omitempty"`
	StewardDids        []string             `json:"stewardDids,omitempty"`
	ArchivedCounts     *ArchivedCounts      `json:"archivedCounts,omitempty"`
}

type RuleProvenance struct {
	SharedRuleProfileRefs []string `json:"sharedRuleProfileRefs"`
	RulesetManifestRef    string   `json:"rulesetManifestRef"`
}

type ArchivedCounts struct {
	Episodes     int `json:"episodes"`
	Publications int `json:"publications"`
}
