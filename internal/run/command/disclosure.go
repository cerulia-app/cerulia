package command

import (
	"context"
	"strings"
	"time"

	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

type CreateSecretEnvelopeInput struct {
	SessionRef    string `json:"sessionRef"`
	AudienceRef   string `json:"audienceRef"`
	PayloadType   string `json:"payloadType"`
	CipherSuite   string `json:"cipherSuite"`
	ContentRef    string `json:"contentRef"`
	ContentDigest string `json:"contentDigest"`
	RequestID     string `json:"requestId"`
}

type RevealSubjectInput struct {
	SessionRef      string `json:"sessionRef"`
	SubjectRef      string `json:"subjectRef"`
	FromAudienceRef string `json:"fromAudienceRef,omitempty"`
	ToAudienceRef   string `json:"toAudienceRef"`
	RevealMode      string `json:"revealMode"`
	RequestID       string `json:"requestId"`
	Note            string `json:"note,omitempty"`
}

type RedactRecordInput struct {
	SessionRef     string `json:"sessionRef"`
	SubjectRef     string `json:"subjectRef"`
	RedactionMode  string `json:"redactionMode"`
	ReplacementRef string `json:"replacementRef,omitempty"`
	ReasonCode     string `json:"reasonCode"`
	RequestID      string `json:"requestId"`
}

type RotateAudienceKeyInput struct {
	SessionRef         string `json:"sessionRef"`
	AudienceRef        string `json:"audienceRef"`
	ExpectedKeyVersion int64  `json:"expectedKeyVersion"`
	RequestID          string `json:"requestId"`
	Note               string `json:"note,omitempty"`
}

func (service *Service) CreateSecretEnvelope(ctx context.Context, actorDid string, input CreateSecretEnvelopeInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.createSecretEnvelope", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid); err != nil {
			return ledger.MutationAck{}, err
		}
		if _, err := service.requireRuntimeMutationAccess(ctx, tx, input.SessionRef, actorDid, now, "open", "active", "paused"); err != nil {
			if runtimeBlockedReason(err) != "" {
				return rejectedAck(input.RequestID, runtimeBlockedReason(err)), nil
			}
			return ledger.MutationAck{}, err
		}
		_, audience, err := service.requireAudienceForSession(ctx, tx, input.SessionRef, input.AudienceRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if audience.Status != audienceStatusActive {
			return rejectedAck(input.RequestID, "audience is not active"), nil
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		envelopeRef := appendRef(repoDID, runmodel.CollectionSecretEnvelope, "secret-envelope", input.RequestID)
		record := runmodel.SecretEnvelope{
			SessionRef:    input.SessionRef,
			AudienceRef:   input.AudienceRef,
			PayloadType:   strings.TrimSpace(input.PayloadType),
			CipherSuite:   strings.TrimSpace(input.CipherSuite),
			KeyVersion:    audience.KeyVersion,
			ContentRef:    strings.TrimSpace(input.ContentRef),
			ContentDigest: strings.TrimSpace(input.ContentDigest),
			RequestID:     input.RequestID,
			CreatedByDid:  actorDid,
			CreatedAt:     now,
		}
		stored, err := marshalAppend(runmodel.CollectionSecretEnvelope, envelopeRef, input.SessionRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{envelopeRef}), nil
	})
}

func (service *Service) RevealSubject(ctx context.Context, actorDid string, input RevealSubjectInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SubjectRef, "app.cerulia.rpc.revealSubject", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid); err != nil {
			return ledger.MutationAck{}, err
		}
		subjectSessionRef, subjectAudienceRef, err := service.subjectSessionAndAudience(ctx, tx, input.SubjectRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if subjectSessionRef != input.SessionRef {
			return rejectedAck(input.RequestID, "subject session mismatch"), nil
		}
		if subjectAudienceRef != "" {
			if input.FromAudienceRef == "" || input.FromAudienceRef != subjectAudienceRef {
				return rejectedAck(input.RequestID, "subject audience mismatch"), nil
			}
		}
		if input.FromAudienceRef != "" && subjectAudienceRef != "" && input.FromAudienceRef != subjectAudienceRef {
			return rejectedAck(input.RequestID, "subject audience mismatch"), nil
		}
		if _, _, err := service.requireAudienceForSession(ctx, tx, input.SessionRef, input.ToAudienceRef); err != nil {
			return ledger.MutationAck{}, err
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		revealRef := appendRef(repoDID, runmodel.CollectionRevealEvent, caseScopedRecordKey(input.SubjectRef, "reveal-event"), input.RequestID)
		record := runmodel.RevealEvent{
			SessionRef:      input.SessionRef,
			SubjectRef:      input.SubjectRef,
			FromAudienceRef: input.FromAudienceRef,
			ToAudienceRef:   input.ToAudienceRef,
			RevealMode:      input.RevealMode,
			RequestID:       input.RequestID,
			PerformedByDid:  actorDid,
			RevealedAt:      now,
			Note:            input.Note,
		}
		stored, err := marshalAppend(runmodel.CollectionRevealEvent, revealRef, input.SubjectRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{revealRef}), nil
	})
}

func (service *Service) RedactRecord(ctx context.Context, actorDid string, input RedactRecordInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SubjectRef, "app.cerulia.rpc.redactRecord", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid); err != nil {
			return ledger.MutationAck{}, err
		}
		subjectSessionRef, _, err := service.subjectSessionAndAudience(ctx, tx, input.SubjectRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if subjectSessionRef != input.SessionRef {
			return rejectedAck(input.RequestID, "subject session mismatch"), nil
		}
		if input.ReplacementRef != "" {
			replacementSessionRef, _, err := service.subjectSessionAndAudience(ctx, tx, input.ReplacementRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if replacementSessionRef != input.SessionRef {
				return rejectedAck(input.RequestID, "replacement session mismatch"), nil
			}
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		redactionRef := appendRef(repoDID, runmodel.CollectionRedactionEvent, caseScopedRecordKey(input.SubjectRef, "redaction-event"), input.RequestID)
		record := runmodel.RedactionEvent{
			SessionRef:     input.SessionRef,
			SubjectRef:     input.SubjectRef,
			RedactionMode:  input.RedactionMode,
			ReplacementRef: input.ReplacementRef,
			RequestID:      input.RequestID,
			ReasonCode:     input.ReasonCode,
			PerformedByDid: actorDid,
			CreatedAt:      now,
		}
		stored, err := marshalAppend(runmodel.CollectionRedactionEvent, redactionRef, input.SubjectRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{redactionRef}), nil
	})
}

func (service *Service) RotateAudienceKey(ctx context.Context, actorDid string, input RotateAudienceKeyInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AudienceRef, "app.cerulia.rpc.rotateAudienceKey", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid); err != nil {
			return ledger.MutationAck{}, err
		}
		record, audience, err := service.requireAudienceForSession(ctx, tx, input.SessionRef, input.AudienceRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if audience.Status != audienceStatusActive {
			return rejectedAck(input.RequestID, "audience is not active"), nil
		}
		if audience.KeyVersion != input.ExpectedKeyVersion {
			ack := rejectedAck(input.RequestID, "audience key version mismatch")
			currentVersion := audience.KeyVersion
			ack.KeyVersion = &currentVersion
			return ack, nil
		}
		recipients, err := service.resolveAudienceRecipients(ctx, tx, audience, now)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		updatedAudience := audience
		updatedAudience.RequestID = input.RequestID
		updatedAudience.KeyVersion++
		updatedAudience.Status = audienceStatusActive
		updatedAudience.UpdatedByDid = actorDid
		updatedAudience.StatusReasonCode = "rotate-key"
		updatedAudience.UpdatedAt = now
		storedAudience, err := marshalStable(runmodel.CollectionAudience, input.AudienceRef, input.RequestID, record.Revision+1, record.CreatedAt, now, updatedAudience)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedAudience); err != nil {
			return ledger.MutationAck{}, err
		}
		updatedGrantRefs, err := service.syncAudienceGrantSet(ctx, tx, updatedAudience, recipients, input.RequestID, actorDid, now)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.AudienceRef})
		ack.KeyVersion = &updatedAudience.KeyVersion
		ack.UpdatedGrantRefs = append([]string(nil), updatedGrantRefs...)
		return ack, nil
	})
}

func (service *Service) subjectSessionAndAudience(ctx context.Context, reader store.Reader, subjectRef string) (string, string, error) {
	parts, err := store.ParseRef(subjectRef)
	if err != nil {
		return "", "", err
	}
	switch parts.Collection {
	case runmodel.CollectionMessage:
		_, value, err := decodeRunAppend[runmodel.Message](ctx, reader, subjectRef)
		return value.SessionRef, value.AudienceRef, err
	case runmodel.CollectionRoll:
		_, value, err := decodeRunAppend[runmodel.Roll](ctx, reader, subjectRef)
		return value.SessionRef, value.AudienceRef, err
	case runmodel.CollectionCharacterState:
		_, value, err := decodeRunStable[runmodel.CharacterState](ctx, reader, subjectRef)
		return value.SessionRef, "", err
	case runmodel.CollectionSecretEnvelope:
		_, value, err := decodeRunAppend[runmodel.SecretEnvelope](ctx, reader, subjectRef)
		return value.SessionRef, value.AudienceRef, err
	case runmodel.CollectionRulingEvent:
		_, value, err := decodeRunAppend[runmodel.RulingEvent](ctx, reader, subjectRef)
		return value.SessionRef, value.AudienceRef, err
	default:
		return "", "", ErrInvalidInput
	}
}
