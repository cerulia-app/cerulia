package command

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"slices"
	"strconv"
	"strings"
	"time"

	coremodel "cerulia/internal/core/model"
	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

type CreateCharacterInstanceInput struct {
	SessionRef            string   `json:"sessionRef"`
	InstanceID            string   `json:"instanceId"`
	BaseSheetRef          string   `json:"baseSheetRef,omitempty"`
	CharacterBranchRef    string   `json:"characterBranchRef,omitempty"`
	InstanceLabel         string   `json:"instanceLabel"`
	SourceType            string   `json:"sourceType"`
	ControllerDids        []string `json:"controllerDids"`
	ControllerAudienceRef string   `json:"controllerAudienceRef,omitempty"`
	DefaultTokenRef       string   `json:"defaultTokenRef,omitempty"`
	RequestID             string   `json:"requestId"`
}

type UpdateCharacterStateInput struct {
	SessionRef              string           `json:"sessionRef"`
	CharacterInstanceRef    string           `json:"characterInstanceRef"`
	ExpectedRevision        int64            `json:"expectedRevision"`
	PublicResources         map[string]int64 `json:"publicResources,omitempty"`
	PublicStatuses          []string         `json:"publicStatuses,omitempty"`
	PrivateStateEnvelopeRef string           `json:"privateStateEnvelopeRef,omitempty"`
	SceneRef                string           `json:"sceneRef,omitempty"`
	Initiative              *int64           `json:"initiative,omitempty"`
	RequestID               string           `json:"requestId"`
}

type SendMessageInput struct {
	SessionRef        string `json:"sessionRef"`
	ChannelKind       string `json:"channelKind"`
	AudienceRef       string `json:"audienceRef,omitempty"`
	BodyText          string `json:"bodyText,omitempty"`
	SecretEnvelopeRef string `json:"secretEnvelopeRef,omitempty"`
	ReplyToRef        string `json:"replyToRef,omitempty"`
	RequestID         string `json:"requestId"`
	ClientNonce       string `json:"clientNonce,omitempty"`
}

type RollDiceInput struct {
	SessionRef        string `json:"sessionRef"`
	Command           string `json:"command"`
	NormalizedCommand string `json:"normalizedCommand,omitempty"`
	TargetRef         string `json:"targetRef,omitempty"`
	AudienceRef       string `json:"audienceRef,omitempty"`
	SecretEnvelopeRef string `json:"secretEnvelopeRef,omitempty"`
	RequestID         string `json:"requestId"`
}

type SubmitActionInput struct {
	SessionRef          string `json:"sessionRef"`
	NormalizedActionRef string `json:"normalizedActionRef,omitempty"`
	ActionKind          string `json:"actionKind"`
	AudienceRef         string `json:"audienceRef,omitempty"`
	RequestID           string `json:"requestId"`
}

type runtimeAccess struct {
	sessionModel   runmodel.Session
	authorityModel runmodel.SessionAuthority
	isController   bool
}

type runtimeMutationBlockedError struct {
	reason string
}

func (err runtimeMutationBlockedError) Error() string {
	return err.reason
}

func runtimeBlockedReason(err error) string {
	if err == nil {
		return ""
	}
	blocked, ok := err.(runtimeMutationBlockedError)
	if !ok {
		return ""
	}
	return blocked.reason
}

func (service *Service) CreateCharacterInstance(ctx context.Context, actorDid string, input CreateCharacterInstanceInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	instanceRef, err := newCharacterInstanceRef(input.SessionRef, input.InstanceID)
	if err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, instanceRef, "app.cerulia.rpc.createCharacterInstance", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		controllers := normalizeActors(input.ControllerDids)
		if strings.TrimSpace(input.InstanceID) == "" || strings.TrimSpace(input.InstanceLabel) == "" || strings.TrimSpace(input.SourceType) == "" || len(controllers) == 0 {
			return rejectedAck(input.RequestID, "instanceId, instanceLabel, sourceType, and controllerDids are required"), nil
		}
		if sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept runtime mutations"), nil
		}
		if err := validateCharacterInstanceRefs(ctx, tx, input.BaseSheetRef, input.CharacterBranchRef); err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		controllerAudienceRef := strings.TrimSpace(input.ControllerAudienceRef)
		emittedRefs := []string{instanceRef}
		if controllerAudienceRef == "" {
			controllerAudienceRef, _, err = service.createExplicitAudienceWithGrants(ctx, tx, input.SessionRef, input.InstanceID+"-controllers", input.InstanceLabel+" controllers", controllers, input.RequestID, input.RequestID, actorDid, now)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			emittedRefs = append(emittedRefs, controllerAudienceRef)
		} else if controllerAudienceRef != "" {
			_, audience, err := service.requireAudienceForSession(ctx, tx, input.SessionRef, controllerAudienceRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if audience.Status != audienceStatusActive || audience.SelectorPolicyKind != "explicit-members" || !slices.Equal(normalizeActors(audience.ActorDids), controllers) {
				return rejectedAck(input.RequestID, "controller audience does not match controllerDids"), nil
			}
		}
		record := runmodel.CharacterInstance{
			SessionRef:            input.SessionRef,
			BaseSheetRef:          input.BaseSheetRef,
			CharacterBranchRef:    input.CharacterBranchRef,
			InstanceLabel:         input.InstanceLabel,
			SourceType:            input.SourceType,
			ControllerDids:        controllers,
			ControllerAudienceRef: controllerAudienceRef,
			DefaultTokenRef:       input.DefaultTokenRef,
			RequestID:             input.RequestID,
			CreatedAt:             now,
			UpdatedByDid:          actorDid,
			UpdatedAt:             now,
		}
		stored, err := marshalStable(runmodel.CollectionCharacterInstance, instanceRef, input.RequestID, 1, now, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, emittedRefs)
		revision := int64(1)
		ack.CurrentRevision = &revision
		return ack, nil
	})
}

func (service *Service) UpdateCharacterState(ctx context.Context, actorDid string, input UpdateCharacterStateInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	stateRef, err := newCharacterStateRef(input.CharacterInstanceRef)
	if err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, stateRef, "app.cerulia.rpc.updateCharacterState", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		access, err := service.requireRuntimeMutationAccess(ctx, tx, input.SessionRef, actorDid, now, "open", "active", "paused")
		if err != nil {
			if runtimeBlockedReason(err) != "" {
				return rejectedAck(input.RequestID, runtimeBlockedReason(err)), nil
			}
			return ledger.MutationAck{}, err
		}
		instanceRecord, instanceModel, err := decodeRunStable[runmodel.CharacterInstance](ctx, tx, input.CharacterInstanceRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if instanceModel.SessionRef != input.SessionRef {
			return rejectedAck(input.RequestID, "character instance session mismatch"), nil
		}
		if !access.isController && !sameActor(actorDid, instanceModel.ControllerDids...) {
			return ledger.MutationAck{}, ErrForbidden
		}
		if input.PrivateStateEnvelopeRef != "" {
			if instanceModel.ControllerAudienceRef == "" {
				return rejectedAck(input.RequestID, "private state requires controller audience"), nil
			}
			_, envelope, err := decodeRunAppend[runmodel.SecretEnvelope](ctx, tx, input.PrivateStateEnvelopeRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if envelope.SessionRef != input.SessionRef {
				return rejectedAck(input.RequestID, "private state envelope session mismatch"), nil
			}
			if instanceModel.ControllerAudienceRef != "" && envelope.AudienceRef != instanceModel.ControllerAudienceRef {
				return rejectedAck(input.RequestID, "private state envelope audience mismatch"), nil
			}
		}
		createdAt := now
		revision := int64(1)
		stateModel := runmodel.CharacterState{}
		stateRecord, err := tx.GetStable(ctx, stateRef)
		if err != nil {
			if err != store.ErrNotFound {
				return ledger.MutationAck{}, err
			}
			if input.ExpectedRevision != 0 {
				ack := ledger.MutationAck{RequestID: input.RequestID, ResultKind: ledger.ResultRebaseNeeded, Message: "character state revision mismatch"}
				zero := int64(0)
				ack.CurrentRevision = &zero
				return ack, nil
			}
		} else {
			createdAt = stateRecord.CreatedAt
			stateModel, err = runmodel.UnmarshalStable[runmodel.CharacterState](stateRecord)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			revision, err = ledger.NextRevision(stateModel.Revision, input.ExpectedRevision)
			if err != nil {
				ack := ledger.MutationAck{RequestID: input.RequestID, ResultKind: ledger.ResultRebaseNeeded, Message: err.Error()}
				current := stateModel.Revision
				ack.CurrentRevision = &current
				return ack, nil
			}
		}
		stateModel = runmodel.CharacterState{
			SessionRef:              input.SessionRef,
			CharacterInstanceRef:    input.CharacterInstanceRef,
			PublicResources:         cloneResourceMap(input.PublicResources),
			PublicStatuses:          append([]string(nil), input.PublicStatuses...),
			PrivateStateEnvelopeRef: input.PrivateStateEnvelopeRef,
			SceneRef:                input.SceneRef,
			Initiative:              cloneInt64Ptr(input.Initiative),
			RequestID:               input.RequestID,
			Revision:                revision,
			UpdatedByDid:            actorDid,
			UpdatedAt:               now,
		}
		stored, err := marshalStable(runmodel.CollectionCharacterState, stateRef, input.RequestID, revision, createdAt, now, stateModel)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{stateRef})
		ack.CurrentRevision = &stateModel.Revision
		_ = instanceRecord
		return ack, nil
	})
}

func (service *Service) SendMessage(ctx context.Context, actorDid string, input SendMessageInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.sendMessage", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireRuntimeMutationAccess(ctx, tx, input.SessionRef, actorDid, now, "open", "active", "paused"); err != nil {
			if runtimeBlockedReason(err) != "" {
				return rejectedAck(input.RequestID, runtimeBlockedReason(err)), nil
			}
			return ledger.MutationAck{}, err
		}
		if strings.TrimSpace(input.BodyText) == "" && strings.TrimSpace(input.SecretEnvelopeRef) == "" {
			return rejectedAck(input.RequestID, "message body or secret envelope is required"), nil
		}
		if err := service.validateRuntimeEnvelope(ctx, tx, input.SessionRef, input.AudienceRef, input.SecretEnvelopeRef); err != nil {
			return ledger.MutationAck{}, err
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		messageRef := appendRef(repoDID, runmodel.CollectionMessage, "message", input.RequestID)
		record := runmodel.Message{
			SessionRef:        input.SessionRef,
			AuthorDid:         actorDid,
			ChannelKind:       defaultString(input.ChannelKind, runtimeChannelPublic),
			AudienceRef:       input.AudienceRef,
			BodyText:          input.BodyText,
			SecretEnvelopeRef: input.SecretEnvelopeRef,
			ReplyToRef:        input.ReplyToRef,
			RequestID:         input.RequestID,
			ClientNonce:       input.ClientNonce,
			CreatedAt:         now,
		}
		stored, err := marshalAppend(runmodel.CollectionMessage, messageRef, input.SessionRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{messageRef}), nil
	})
}

func (service *Service) RollDice(ctx context.Context, actorDid string, input RollDiceInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.rollDice", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireRuntimeMutationAccess(ctx, tx, input.SessionRef, actorDid, now, "open", "active", "paused"); err != nil {
			if runtimeBlockedReason(err) != "" {
				return rejectedAck(input.RequestID, runtimeBlockedReason(err)), nil
			}
			return ledger.MutationAck{}, err
		}
		if err := service.validateRuntimeEnvelope(ctx, tx, input.SessionRef, input.AudienceRef, input.SecretEnvelopeRef); err != nil {
			return ledger.MutationAck{}, err
		}
		normalized, summary, detail, err := evaluateRoll(input.Command)
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		rollRef := appendRef(repoDID, runmodel.CollectionRoll, "roll", input.RequestID)
		record := runmodel.Roll{
			SessionRef:        input.SessionRef,
			ActorDid:          actorDid,
			Command:           input.Command,
			NormalizedCommand: normalized,
			ResultSummary:     summary,
			DetailPayload:     detail,
			TargetRef:         input.TargetRef,
			AudienceRef:       input.AudienceRef,
			SecretEnvelopeRef: input.SecretEnvelopeRef,
			RequestID:         input.RequestID,
			RNGVersion:        "cerulia-rng-v1",
			CreatedAt:         now,
		}
		stored, err := marshalAppend(runmodel.CollectionRoll, rollRef, input.SessionRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{rollRef}), nil
	})
}

func (service *Service) SubmitAction(ctx context.Context, actorDid string, input SubmitActionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.submitAction", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if _, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid); err != nil {
			return ledger.MutationAck{}, err
		}
		if _, err := service.requireRuntimeMutationAccess(ctx, tx, input.SessionRef, actorDid, now, "open", "active", "paused"); err != nil {
			if runtimeBlockedReason(err) != "" {
				return rejectedAck(input.RequestID, runtimeBlockedReason(err)), nil
			}
			return ledger.MutationAck{}, err
		}
		if input.AudienceRef != "" {
			if _, _, err := service.requireAudienceForSession(ctx, tx, input.SessionRef, input.AudienceRef); err != nil {
				return ledger.MutationAck{}, err
			}
		}
		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		rulingRef := appendRef(repoDID, runmodel.CollectionRulingEvent, "ruling-event", input.RequestID)
		record := runmodel.RulingEvent{
			SessionRef:          input.SessionRef,
			ActionKind:          input.ActionKind,
			ActorDid:            actorDid,
			NormalizedActionRef: input.NormalizedActionRef,
			DecisionKind:        "accepted",
			AudienceRef:         input.AudienceRef,
			ResultSummary:       defaultString(strings.TrimSpace(input.ActionKind), "action") + " accepted",
			DecidedByDid:        actorDid,
			RequestID:           input.RequestID,
			CreatedAt:           now,
		}
		stored, err := marshalAppend(runmodel.CollectionRulingEvent, rulingRef, input.SessionRef, input.RequestID, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{rulingRef})
		ack.Message = record.ResultSummary
		return ack, nil
	})
}

func (service *Service) requireRuntimeMutationAccess(ctx context.Context, reader store.Reader, sessionRef string, actorDid string, now time.Time, allowedStates ...string) (runtimeAccess, error) {
	_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, reader, sessionRef)
	if err != nil {
		return runtimeAccess{}, err
	}
	_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, reader, sessionModel.AuthorityRef)
	if err != nil {
		return runtimeAccess{}, err
	}
	if sessionModel.State == "ended" || sessionModel.State == "archived" {
		return runtimeAccess{}, runtimeMutationBlockedError{reason: "session does not accept runtime mutations"}
	}
	if len(allowedStates) > 0 && !containsString(allowedStates, sessionModel.State) {
		return runtimeAccess{}, runtimeMutationBlockedError{reason: "session does not accept runtime mutations"}
	}
	authorityState := modelToAuthority(authorityModel)
	if health := authorityState.HealthKind(now); health != "healthy" {
		return runtimeAccess{}, runtimeMutationBlockedError{reason: "authority is " + health}
	}
	if sameActor(actorDid, authorityModel.ControllerDids...) {
		return runtimeAccess{sessionModel: sessionModel, authorityModel: authorityModel, isController: true}, nil
	}
	currentMembershipRef, currentMembership, ok, err := service.currentMembership(ctx, reader, sessionRef, actorDid)
	if err != nil {
		return runtimeAccess{}, err
	}
	_ = currentMembershipRef
	if !ok || currentMembership.Status != "joined" {
		return runtimeAccess{}, ErrForbidden
	}
	return runtimeAccess{sessionModel: sessionModel, authorityModel: authorityModel, isController: false}, nil
}

func (service *Service) validateRuntimeEnvelope(ctx context.Context, reader store.Reader, sessionRef string, audienceRef string, secretEnvelopeRef string) error {
	if audienceRef != "" {
		if _, _, err := service.requireAudienceForSession(ctx, reader, sessionRef, audienceRef); err != nil {
			return err
		}
	}
	if secretEnvelopeRef == "" {
		return nil
	}
	_, envelope, err := decodeRunAppend[runmodel.SecretEnvelope](ctx, reader, secretEnvelopeRef)
	if err != nil {
		return err
	}
	if envelope.SessionRef != sessionRef {
		return ErrForbidden
	}
	if audienceRef != "" && envelope.AudienceRef != audienceRef {
		return ErrForbidden
	}
	return nil
}

func newCharacterInstanceRef(sessionRef string, instanceID string) (string, error) {
	parts, err := store.ParseRef(sessionRef)
	if err != nil {
		return "", err
	}
	return store.BuildRef(parts.RepoDID, runmodel.CollectionCharacterInstance, strings.TrimSpace(instanceID)), nil
}

func newCharacterStateRef(characterInstanceRef string) (string, error) {
	parts, err := store.ParseRef(characterInstanceRef)
	if err != nil {
		return "", err
	}
	return store.BuildRef(parts.RepoDID, runmodel.CollectionCharacterState, parts.RecordKey), nil
}

func validateCharacterInstanceRefs(ctx context.Context, reader store.Reader, baseSheetRef string, characterBranchRef string) error {
	if characterBranchRef == "" && baseSheetRef == "" {
		return ErrInvalidInput
	}
	if baseSheetRef != "" {
		record, err := reader.GetStable(ctx, baseSheetRef)
		if err != nil {
			return err
		}
		if _, err := coremodel.UnmarshalStable[coremodel.CharacterSheet](record); err != nil {
			return err
		}
	}
	if characterBranchRef != "" {
		record, err := reader.GetStable(ctx, characterBranchRef)
		if err != nil {
			return err
		}
		branch, err := coremodel.UnmarshalStable[coremodel.CharacterBranch](record)
		if err != nil {
			return err
		}
		if baseSheetRef != "" && branch.BaseSheetRef != baseSheetRef {
			return ErrInvalidInput
		}
	}
	return nil
}

func evaluateRoll(command string) (string, string, json.RawMessage, error) {
	trimmed := strings.ToLower(strings.TrimSpace(command))
	if trimmed == "" {
		return "", "", nil, ErrInvalidInput
	}
	count, sides, modifier, ok := parseDiceExpression(trimmed)
	if !ok {
		summary := "rolled " + trimmed
		detail, _ := json.Marshal(map[string]any{"command": trimmed, "mode": "opaque"})
		return trimmed, summary, detail, nil
	}
	rolls := make([]int64, 0, count)
	total := int64(0)
	for index := 0; index < count; index++ {
		value, err := randomDieValue(sides)
		if err != nil {
			return "", "", nil, err
		}
		rolls = append(rolls, value)
		total += value
	}
	total += modifier
	detail, _ := json.Marshal(map[string]any{
		"count":    count,
		"sides":    sides,
		"modifier": modifier,
		"rolls":    rolls,
		"total":    total,
	})
	summary := fmt.Sprintf("%s = %d", trimmed, total)
	return trimmed, summary, detail, nil
}

func parseDiceExpression(value string) (int, int64, int64, bool) {
	parts := strings.SplitN(value, "d", 2)
	if len(parts) != 2 {
		return 0, 0, 0, false
	}
	count := 1
	if parts[0] != "" {
		parsedCount, err := strconv.Atoi(parts[0])
		if err != nil || parsedCount <= 0 || parsedCount > 100 {
			return 0, 0, 0, false
		}
		count = parsedCount
	}
	modifier := int64(0)
	sidesPart := parts[1]
	if strings.ContainsAny(sidesPart, "+-") {
		index := strings.IndexAny(sidesPart[1:], "+-")
		if index >= 0 {
			index++
			parsedModifier, err := strconv.ParseInt(sidesPart[index:], 10, 64)
			if err != nil {
				return 0, 0, 0, false
			}
			modifier = parsedModifier
			sidesPart = sidesPart[:index]
		}
	}
	sides, err := strconv.ParseInt(sidesPart, 10, 64)
	if err != nil || sides <= 1 || sides > 1000 {
		return 0, 0, 0, false
	}
	return count, sides, modifier, true
}

func randomDieValue(sides int64) (int64, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(sides))
	if err != nil {
		return 0, err
	}
	return value.Int64() + 1, nil
}

func cloneResourceMap(input map[string]int64) map[string]int64 {
	if len(input) == 0 {
		return nil
	}
	cloned := make(map[string]int64, len(input))
	for key, value := range input {
		cloned[key] = value
	}
	return cloned
}

func cloneInt64Ptr(value *int64) *int64 {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

func defaultString(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}
