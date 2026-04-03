package command

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	coremodel "cerulia/internal/core/model"
	runmodel "cerulia/internal/run/model"
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

type CreateSessionDraftInput struct {
	SessionID                  string     `json:"sessionId"`
	CampaignRef                string     `json:"campaignRef,omitempty"`
	Title                      string     `json:"title"`
	Visibility                 string     `json:"visibility"`
	RulesetNSID                string     `json:"rulesetNsid"`
	RulesetManifestRef         string     `json:"rulesetManifestRef"`
	RuleProfileRefs            []string   `json:"ruleProfileRefs"`
	ControllerDids             []string   `json:"controllerDids"`
	RecoveryControllerDids     []string   `json:"recoveryControllerDids"`
	TransferPolicy             string     `json:"transferPolicy"`
	ScheduledAt                *time.Time `json:"scheduledAt,omitempty"`
	ExpectedRulesetManifestRef string     `json:"expectedRulesetManifestRef"`
	RequestID                  string     `json:"requestId"`
}

type SessionStateInput struct {
	SessionRef    string `json:"sessionRef"`
	ExpectedState string `json:"expectedState"`
	RequestID     string `json:"requestId"`
	ReasonCode    string `json:"reasonCode,omitempty"`
}

type ReopenSessionInput struct {
	SessionRef    string `json:"sessionRef"`
	ExpectedState string `json:"expectedState"`
	NextState     string `json:"nextState"`
	RequestID     string `json:"requestId"`
	ReasonCode    string `json:"reasonCode,omitempty"`
}

type TransferAuthorityInput struct {
	SessionRef                string   `json:"sessionRef"`
	AuthorityRef              string   `json:"authorityRef"`
	ExpectedAuthorityRequestID string  `json:"expectedAuthorityRequestId"`
	ExpectedTransferPhase     string   `json:"expectedTransferPhase"`
	ExpectedControllerDids    []string `json:"expectedControllerDids"`
	PendingControllerDids     []string `json:"pendingControllerDids"`
	TransferPolicy            string   `json:"transferPolicy,omitempty"`
	LeaseHolderDid            string   `json:"leaseHolderDid,omitempty"`
	RequestID                 string   `json:"requestId"`
	ReasonCode                string   `json:"reasonCode,omitempty"`
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
	key := ledger.IdempotencyKey{GoverningRef: governingRef, OperationNSID: operationNSID, RequestID: requestID}

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
			RedactedPayload:   append(json.RawMessage(nil), rawPayload...),
		}); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return ledger.MutationAck{}, err
	}
	return ack, nil
}

func acceptedAck(requestID string, emittedRecordRefs []string) ledger.MutationAck {
	return ledger.MutationAck{RequestID: requestID, ResultKind: ledger.ResultAccepted, EmittedRecordRefs: append([]string(nil), emittedRecordRefs...)}
}

func rejectedAck(requestID string, message string) ledger.MutationAck {
	return ledger.MutationAck{RequestID: requestID, ResultKind: ledger.ResultRejected, Message: message}
}

func requireActor(actorDid string) error {
	if strings.TrimSpace(actorDid) == "" {
		return ErrForbidden
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

func decodeRunStable[T any](ctx context.Context, reader store.Reader, ref string) (store.StableRecord, T, error) {
	record, err := reader.GetStable(ctx, ref)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	value, err := runmodel.UnmarshalStable[T](record)
	if err != nil {
		var zero T
		return store.StableRecord{}, zero, err
	}
	return record, value, nil
}

func decodeCampaign(ctx context.Context, reader store.Reader, ref string) (coremodel.Campaign, error) {
	record, err := reader.GetStable(ctx, ref)
	if err != nil {
		return coremodel.Campaign{}, err
	}
	value, err := coremodel.UnmarshalStable[coremodel.Campaign](record)
	if err != nil {
		return coremodel.Campaign{}, err
	}
	return value, nil
}

func marshalStable(collection string, ref string, requestID string, revision int64, createdAt time.Time, updatedAt time.Time, value any) (store.StableRecord, error) {
	body, err := runmodel.Marshal(value)
	if err != nil {
		return store.StableRecord{}, err
	}
	parts, err := store.ParseRef(ref)
	if err != nil {
		return store.StableRecord{}, err
	}
	return store.StableRecord{Ref: ref, Collection: collection, RepoDID: parts.RepoDID, RecordKey: parts.RecordKey, RequestID: requestID, Revision: revision, Body: body, CreatedAt: createdAt, UpdatedAt: updatedAt}, nil
}