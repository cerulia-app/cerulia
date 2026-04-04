package command

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"cerulia/internal/core/model"
	"cerulia/internal/ledger"
	"cerulia/internal/store"
)

var (
	ErrForbidden          = errors.New("forbidden")
	ErrInvalidInput       = errors.New("invalid input")
	ErrUnsupportedRuleset = errors.New("unsupported ruleset")
)

type Service struct {
	store store.Store
	now   func() time.Time
}

type CreateCampaignInput struct {
	Title                  string   `json:"title"`
	Visibility             string   `json:"visibility"`
	HouseRef               string   `json:"houseRef,omitempty"`
	WorldRef               string   `json:"worldRef,omitempty"`
	RulesetNSID            string   `json:"rulesetNsid"`
	RulesetManifestRef     string   `json:"rulesetManifestRef"`
	SharedRuleProfileRefs  []string `json:"sharedRuleProfileRefs,omitempty"`
	DefaultReusePolicyKind string   `json:"defaultReusePolicyKind"`
	StewardDids            []string `json:"stewardDids"`
	RequestID              string   `json:"requestId"`
}

type AttachRuleProfileInput struct {
	CampaignRef                string `json:"campaignRef"`
	RuleProfileRef             string `json:"ruleProfileRef"`
	ExpectedCampaignRevision   int64  `json:"expectedCampaignRevision"`
	ExpectedRulesetManifestRef string `json:"expectedRulesetManifestRef"`
	RequestID                  string `json:"requestId"`
}

type RetireRuleProfileInput struct {
	RuleProfileRef             string `json:"ruleProfileRef"`
	ScopeKind                  string `json:"scopeKind"`
	ScopeRef                   string `json:"scopeRef"`
	ExpectedRulesetManifestRef string `json:"expectedRulesetManifestRef"`
	RequestID                  string `json:"requestId"`
	CampaignRef                string `json:"campaignRef,omitempty"`
	ExpectedCampaignRevision   int64  `json:"expectedCampaignRevision,omitempty"`
}

type ImportCharacterSheetInput struct {
	OwnerDid         string          `json:"ownerDid"`
	RulesetNSID      string          `json:"rulesetNsid"`
	DisplayName      string          `json:"displayName"`
	PortraitRef      string          `json:"portraitRef,omitempty"`
	PublicProfile    json.RawMessage `json:"publicProfile,omitempty"`
	Stats            json.RawMessage `json:"stats,omitempty"`
	ExternalSheetURI string          `json:"externalSheetUri,omitempty"`
	RequestID        string          `json:"requestId"`
}

type CreateCharacterBranchInput struct {
	OwnerDid           string `json:"ownerDid"`
	BaseSheetRef       string `json:"baseSheetRef"`
	BranchKind         string `json:"branchKind"`
	BranchLabel        string `json:"branchLabel"`
	OverridePayloadRef string `json:"overridePayloadRef,omitempty"`
	ImportedFrom       string `json:"importedFrom,omitempty"`
	SourceRevision     int64  `json:"sourceRevision,omitempty"`
	SyncMode           string `json:"syncMode,omitempty"`
	RequestID          string `json:"requestId"`
}

type UpdateCharacterBranchInput struct {
	CharacterBranchRef string `json:"characterBranchRef"`
	ExpectedRevision   int64  `json:"expectedRevision"`
	BranchLabel        string `json:"branchLabel,omitempty"`
	OverridePayloadRef string `json:"overridePayloadRef,omitempty"`
	ImportedFrom       string `json:"importedFrom,omitempty"`
	SourceRevision     int64  `json:"sourceRevision,omitempty"`
	SyncMode           string `json:"syncMode,omitempty"`
	RequestID          string `json:"requestId"`
}

type RetireCharacterBranchInput struct {
	CharacterBranchRef string `json:"characterBranchRef"`
	ExpectedRevision   int64  `json:"expectedRevision"`
	RequestID          string `json:"requestId"`
	ReasonCode         string `json:"reasonCode,omitempty"`
}

type RecordCharacterAdvancementInput struct {
	CharacterBranchRef string    `json:"characterBranchRef"`
	AdvancementKind    string    `json:"advancementKind"`
	DeltaPayloadRef    string    `json:"deltaPayloadRef"`
	ApprovedByDid      string    `json:"approvedByDid"`
	EffectiveAt        time.Time `json:"effectiveAt"`
	SupersedesRef      string    `json:"supersedesRef,omitempty"`
	Note               string    `json:"note,omitempty"`
	RequestID          string    `json:"requestId"`
}

type RecordCharacterEpisodeInput struct {
	CharacterBranchRef       string   `json:"characterBranchRef"`
	CampaignRef              string   `json:"campaignRef,omitempty"`
	ScenarioLabel            string   `json:"scenarioLabel,omitempty"`
	RulesetManifestRef       string   `json:"rulesetManifestRef"`
	EffectiveRuleProfileRefs []string `json:"effectiveRuleProfileRefs"`
	OutcomeSummary           string   `json:"outcomeSummary"`
	AdvancementRefs          []string `json:"advancementRefs"`
	SupersedesRef            string   `json:"supersedesRef,omitempty"`
	RecordedByDid            string   `json:"recordedByDid"`
	RequestID                string   `json:"requestId"`
}

type RecordCharacterConversionInput struct {
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
	ConvertedByDid                 string    `json:"convertedByDid"`
	ConvertedAt                    time.Time `json:"convertedAt"`
	SupersedesRef                  string    `json:"supersedesRef,omitempty"`
	Note                           string    `json:"note,omitempty"`
	RequestID                      string    `json:"requestId"`
}

type PublishSubjectInput struct {
	SubjectRef             string                    `json:"subjectRef"`
	SubjectKind            string                    `json:"subjectKind"`
	EntryURL               string                    `json:"entryUrl"`
	PreferredSurfaceKind   string                    `json:"preferredSurfaceKind"`
	Surfaces               []model.SurfaceDescriptor `json:"surfaces"`
	ReuseGrantRef          string                    `json:"reuseGrantRef,omitempty"`
	ExpectedCurrentHeadRef string                    `json:"expectedCurrentHeadRef,omitempty"`
	Note                   string                    `json:"note,omitempty"`
	RequestID              string                    `json:"requestId"`
}

type RetirePublicationInput struct {
	PublicationRef string `json:"publicationRef"`
	Note           string `json:"note,omitempty"`
	RequestID      string `json:"requestId"`
}

type GrantReuseInput struct {
	CharacterBranchRef string     `json:"characterBranchRef"`
	SourceCampaignRef  string     `json:"sourceCampaignRef"`
	TargetKind         string     `json:"targetKind"`
	TargetRef          string     `json:"targetRef,omitempty"`
	TargetDid          string     `json:"targetDid,omitempty"`
	ReuseMode          string     `json:"reuseMode"`
	ExpiresAt          *time.Time `json:"expiresAt,omitempty"`
	Note               string     `json:"note,omitempty"`
	RequestID          string     `json:"requestId"`
}

type RevokeReuseInput struct {
	ReuseGrantRef    string `json:"reuseGrantRef"`
	RevokeReasonCode string `json:"revokeReasonCode"`
	Note             string `json:"note,omitempty"`
	RequestID        string `json:"requestId"`
}

func NewService(dataStore store.Store) *Service {
	if dataStore == nil {
		dataStore = store.NewMemoryStore()
	}

	return &Service{
		store: dataStore,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (service *Service) executeMutation(ctx context.Context, governingRef string, operationNSID string, requestID string, actorDid string, payload any, mutate func(store.Tx, time.Time) (ledger.MutationAck, error)) (ledger.MutationAck, error) {
	if strings.TrimSpace(governingRef) == "" || strings.TrimSpace(operationNSID) == "" || strings.TrimSpace(requestID) == "" {
		return ledger.MutationAck{}, ErrInvalidInput
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return ledger.MutationAck{}, fmt.Errorf("marshal payload: %w", err)
	}
	redactedPayload := ledger.RedactPayload(rawPayload)

	key := ledger.IdempotencyKey{
		GoverningRef:  governingRef,
		OperationNSID: operationNSID,
		RequestID:     requestID,
	}

	var ack ledger.MutationAck
	err = service.store.WithTx(ctx, func(tx store.Tx) error {
		existing, err := tx.GetIdempotency(ctx, key)
		if err != nil {
			return err
		}
		if existing != nil {
			ack = *existing
			return nil
		}

		now := service.now().UTC()
		ack, err = mutate(tx, now)
		if err != nil {
			return err
		}
		if ack.RequestID == "" {
			ack.RequestID = requestID
		}

		if err := tx.PutIdempotency(ctx, key, ack); err != nil {
			return err
		}
		if err := tx.AppendServiceLog(ctx, ledger.ServiceLogEntry{
			RequestID:         requestID,
			OperationNSID:     operationNSID,
			GoverningRef:      governingRef,
			ActorDID:          actorDid,
			ResultKind:        ack.ResultKind,
			Message:           ack.Message,
			EmittedRecordRefs: append([]string(nil), ack.EmittedRecordRefs...),
			CreatedAt:         now,
			RawPayload:        append(json.RawMessage(nil), rawPayload...),
			RedactedPayload:   append(json.RawMessage(nil), redactedPayload...),
		}); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return ledger.MutationAck{RequestID: requestID, ResultKind: ledger.ResultRebaseNeeded, Message: err.Error()}, nil
		}
		return ledger.MutationAck{}, err
	}

	return ack, nil
}

func acceptedAck(requestID string, emittedRecordRefs []string) ledger.MutationAck {
	return ledger.MutationAck{
		RequestID:         requestID,
		ResultKind:        ledger.ResultAccepted,
		EmittedRecordRefs: append([]string(nil), emittedRecordRefs...),
	}
}

func rejectedAck(requestID string, message string) ledger.MutationAck {
	return ledger.MutationAck{
		RequestID:  requestID,
		ResultKind: ledger.ResultRejected,
		Message:    message,
	}
}

func rebaseAck(requestID string, currentRevision int64) ledger.MutationAck {
	ack := ledger.MutationAck{
		RequestID:  requestID,
		ResultKind: ledger.ResultRebaseNeeded,
	}
	ack.CurrentRevision = &currentRevision
	return ack
}

func requireActor(actorDid string) error {
	if strings.TrimSpace(actorDid) == "" {
		return ErrForbidden
	}
	return nil
}

func invalidInputf(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalidInput, fmt.Sprintf(format, args...))
}

func requireNonEmptyField(value string, field string) error {
	if strings.TrimSpace(value) == "" {
		return invalidInputf("%s is required", field)
	}
	return nil
}

func requireNonEmptyStringSlice(values []string, field string) error {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return nil
		}
	}
	return invalidInputf("%s is required", field)
}

func requirePresentSlice[T any](values []T, field string) error {
	if values == nil {
		return invalidInputf("%s is required", field)
	}
	return nil
}

func requireNonEmptySlice[T any](values []T, field string) error {
	if len(values) == 0 {
		return invalidInputf("%s is required", field)
	}
	return nil
}

func requirePositiveInt64Field(value int64, field string) error {
	if value <= 0 {
		return invalidInputf("%s must be positive", field)
	}
	return nil
}

func requireTimeField(value time.Time, field string) error {
	if value.IsZero() {
		return invalidInputf("%s is required", field)
	}
	return nil
}

func sameActor(actorDid string, allowed ...string) bool {
	trimmedActor := strings.TrimSpace(actorDid)
	if trimmedActor == "" {
		return false
	}
	for _, candidate := range allowed {
		if trimmedActor == strings.TrimSpace(candidate) {
			return true
		}
	}
	return false
}

func decodeStable[T any](ctx context.Context, reader store.Reader, ref string) (store.StableRecord, T, error) {
	if _, err := store.ParseRef(ref); err != nil {
		var zero T
		return store.StableRecord{}, zero, ErrInvalidInput
	}
	record, err := reader.GetStable(ctx, ref)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	value, err := model.UnmarshalStable[T](record)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	return record, value, nil
}

func decodeAppend[T any](ctx context.Context, reader store.Reader, ref string) (store.AppendRecord, T, error) {
	if _, err := store.ParseRef(ref); err != nil {
		var zero T
		return store.AppendRecord{}, zero, ErrInvalidInput
	}
	record, err := reader.GetAppend(ctx, ref)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	value, err := model.UnmarshalAppend[T](record)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	return record, value, nil
}

func marshalStable(collection string, ref string, requestID string, revision int64, createdAt time.Time, updatedAt time.Time, value any) (store.StableRecord, error) {
	body, err := model.Marshal(value)
	if err != nil {
		return store.StableRecord{}, err
	}
	parts, err := store.ParseRef(ref)
	if err != nil {
		return store.StableRecord{}, err
	}
	return store.StableRecord{
		Ref:        ref,
		Collection: collection,
		RepoDID:    parts.RepoDID,
		RecordKey:  parts.RecordKey,
		RequestID:  requestID,
		Revision:   revision,
		Body:       body,
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
	}, nil
}

func marshalAppend(collection string, ref string, governingRef string, requestID string, createdAt time.Time, value any) (store.AppendRecord, error) {
	body, err := model.Marshal(value)
	if err != nil {
		return store.AppendRecord{}, err
	}
	parts, err := store.ParseRef(ref)
	if err != nil {
		return store.AppendRecord{}, err
	}
	return store.AppendRecord{
		Ref:          ref,
		Collection:   collection,
		RepoDID:      parts.RepoDID,
		RecordKey:    parts.RecordKey,
		GoverningRef: governingRef,
		RequestID:    requestID,
		Body:         body,
		CreatedAt:    createdAt,
	}, nil
}

func stableRef(repoDID string, collection string, prefix string, requestID string) string {
	return store.BuildRef(repoDID, collection, prefix+"-"+requestID)
}

func appendRef(repoDID string, collection string, prefix string, requestID string) string {
	return store.BuildRef(repoDID, collection, prefix+"-"+requestID)
}

func refRepoDID(ref string) (string, error) {
	parts, err := store.ParseRef(ref)
	if err != nil {
		return "", err
	}
	return parts.RepoDID, nil
}

func bumpRevision(current int64, expected int64, requestID string) (int64, *ledger.MutationAck, error) {
	next, err := ledger.NextRevision(current, expected)
	if err != nil {
		if errors.Is(err, ledger.ErrRebaseNeeded) {
			ack := rebaseAck(requestID, current)
			return 0, &ack, nil
		}
		return 0, nil, err
	}
	return next, nil, nil
}
