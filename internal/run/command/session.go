package command

import (
	"context"
	"time"

	"cerulia/internal/ledger"
	runauthority "cerulia/internal/run/authority"
	runmodel "cerulia/internal/run/model"
	runsession "cerulia/internal/run/session"
	"cerulia/internal/store"
)

func (service *Service) CreateSessionDraft(ctx context.Context, actorDid string, input CreateSessionDraftInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.ControllerDids...) {
		return ledger.MutationAck{}, ErrForbidden
	}

	sessionRef := store.BuildRef(actorDid, runmodel.CollectionSession, input.SessionID)
	authorityRef := store.BuildRef(actorDid, runmodel.CollectionSessionAuthority, input.SessionID)
	return service.executeMutation(ctx, sessionRef, "app.cerulia.rpc.createSessionDraft", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		if input.CampaignRef != "" {
			campaign, err := decodeCampaign(ctx, tx, input.CampaignRef)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			if campaign.RulesetManifestRef != input.ExpectedRulesetManifestRef {
				return ledger.MutationAck{}, ErrUnsupportedRuleset
			}
		}

		authorityBodySeed := rnauthorityCreateInput(sessionRef, input.SessionID, actorDid, input, now)
		gmAudienceRef, err := newAudienceRef(sessionRef, input.SessionID+"-gm-"+input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		authorityBodySeed.GMAudienceRef = gmAudienceRef
		authorityBody, err := runauthority.Create(authorityBodySeed)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		sessionBody, err := runsession.CreateDraft(runsession.CreateDraftInput{
			SessionID:                  input.SessionID,
			CampaignRef:                input.CampaignRef,
			Title:                      input.Title,
			Visibility:                 input.Visibility,
			RulesetNSID:                input.RulesetNSID,
			RulesetManifestRef:         input.RulesetManifestRef,
			RuleProfileRefs:            input.RuleProfileRefs,
			AuthorityRef:               authorityRef,
			ScheduledAt:                input.ScheduledAt,
			ExpectedRulesetManifestRef: input.ExpectedRulesetManifestRef,
			RequestID:                  input.RequestID,
			ActorDid:                   actorDid,
			Now:                        now,
		})
		if err != nil {
			if err == runsession.ErrUnsupportedRuleset {
				return ledger.MutationAck{}, ErrUnsupportedRuleset
			}
			return ledger.MutationAck{}, err
		}

		storedAuthority, err := marshalStable(runmodel.CollectionSessionAuthority, authorityRef, input.RequestID, 1, now, now, authorityToModel(authorityBody))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		storedSession, err := marshalStable(runmodel.CollectionSession, sessionRef, input.RequestID, 1, now, now, sessionToModel(sessionBody))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if _, _, err := service.createExplicitAudienceWithGrants(ctx, tx, sessionRef, input.SessionID+"-gm-"+input.RequestID, "GM controllers", input.ControllerDids, input.RequestID, input.RequestID, actorDid, now); err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedAuthority); err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedSession); err != nil {
			return ledger.MutationAck{}, err
		}

		ack := acceptedAck(input.RequestID, []string{sessionRef, authorityRef, gmAudienceRef})
		ack.CurrentState = "planning"
		ack.TransferPhase = "stable"
		ack.ControllerDids = append([]string(nil), input.ControllerDids...)
		return ack, nil
	})
}

func (service *Service) OpenSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.openSession", "open", true)
}

func (service *Service) StartSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.startSession", "active", false)
}

func (service *Service) PauseSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.pauseSession", "paused", false)
}

func (service *Service) ResumeSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.resumeSession", "active", false)
}

func (service *Service) CloseSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.closeSession", "ended", true)
}

func (service *Service) ArchiveSession(ctx context.Context, actorDid string, input SessionStateInput) (ledger.MutationAck, error) {
	return service.transitionSession(ctx, actorDid, input, "app.cerulia.rpc.archiveSession", "archived", true)
}

func (service *Service) ReopenSession(ctx context.Context, actorDid string, input ReopenSessionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.reopenSession", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		record, sessionModel, err := decodeRunStable[runmodel.Session](ctx, tx, input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		authorityModel, err := service.requireAuthority(ctx, tx, sessionModel.AuthorityRef, actorDid, true)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_ = authorityModel
		updated, err := modelToSession(sessionModel).Transition(input.ExpectedState, input.NextState, input.RequestID, actorDid, input.ReasonCode, now)
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		stored, err := marshalStable(runmodel.CollectionSession, input.SessionRef, input.RequestID, record.Revision+1, record.CreatedAt, now, sessionToModel(updated))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.SessionRef})
		ack.CurrentState = updated.State
		return ack, nil
	})
}

func (service *Service) TransferAuthority(ctx context.Context, actorDid string, input TransferAuthorityInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AuthorityRef, "app.cerulia.rpc.transferAuthority", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		record, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, tx, input.AuthorityRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		authorityState := modelToAuthority(authorityModel)
		transferPolicy := stringPtrIfSet(input.TransferPolicy)
		leaseHolder := stringPtrIfSet(input.LeaseHolderDid)
		nextAudienceRef := ""
		if authorityState.TransferPhase == "rotating-grants" {
			nextAudienceRef, err = newAudienceRef(authorityModel.SessionRef, record.RecordKey+"-gm-"+input.RequestID)
			if err != nil {
				return ledger.MutationAck{}, err
			}
		}
		updated, err := authorityState.Transfer(runauthority.TransferInput{
			ExpectedAuthorityRequestID: input.ExpectedAuthorityRequestID,
			ExpectedTransferPhase:      input.ExpectedTransferPhase,
			ExpectedControllerDids:     input.ExpectedControllerDids,
			PendingControllerDids:      input.PendingControllerDids,
			TransferPolicy:             transferPolicy,
			LeaseHolderDid:             leaseHolder,
			RequestID:                  input.RequestID,
			UpdatedByDid:               actorDid,
			ReasonCode:                 input.ReasonCode,
			Now:                        now,
			NextGMAudienceRef:          nextAudienceRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		updatedGrantRefs := make([]string, 0)
		if authorityState.TransferPhase == "rotating-grants" {
			_, updatedGrantRefs, err = service.createExplicitAudienceWithGrants(ctx, tx, authorityModel.SessionRef, record.RecordKey+"-gm-"+input.RequestID, "Pending GM controllers", input.PendingControllerDids, input.RequestID, input.RequestID, actorDid, now)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			retiredGrantRefs, err := service.retireAudienceAndGrants(ctx, tx, authorityModel.GMAudienceRef, input.RequestID, actorDid, "authority-transfer", now)
			if err != nil {
				return ledger.MutationAck{}, err
			}
			updatedGrantRefs = append(updatedGrantRefs, retiredGrantRefs...)
		}
		storedAuthority, err := marshalStable(runmodel.CollectionSessionAuthority, input.AuthorityRef, input.RequestID, record.Revision+1, record.CreatedAt, now, authorityToModel(updated))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedAuthority); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.AuthorityRef})
		ack.ControllerDids = append([]string(nil), updated.ControllerDids...)
		ack.PendingControllerDids = append([]string(nil), updated.PendingControllerDids...)
		ack.LeaseHolderDid = updated.LeaseHolderDid
		ack.TransferPhase = updated.TransferPhase
		ack.UpdatedGrantRefs = append([]string(nil), updatedGrantRefs...)
		if updated.TransferCompletedAt != nil {
			ack.TransferCompletedAt = updated.TransferCompletedAt.UTC().Format(time.RFC3339)
		}
		return ack, nil
	})
}

func (service *Service) transitionSession(ctx context.Context, actorDid string, input SessionStateInput, operationNSID string, nextState string, controllerOnly bool) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, operationNSID, input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		record, sessionModel, err := decodeRunStable[runmodel.Session](ctx, tx, input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_, err = service.requireAuthority(ctx, tx, sessionModel.AuthorityRef, actorDid, controllerOnly)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		updated, err := modelToSession(sessionModel).Transition(input.ExpectedState, nextState, input.RequestID, actorDid, input.ReasonCode, now)
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		stored, err := marshalStable(runmodel.CollectionSession, input.SessionRef, input.RequestID, record.Revision+1, record.CreatedAt, now, sessionToModel(updated))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		ack := acceptedAck(input.RequestID, []string{input.SessionRef})
		ack.CurrentState = updated.State
		return ack, nil
	})
}

func (service *Service) requireAuthority(ctx context.Context, reader store.Reader, authorityRef string, actorDid string, controllerOnly bool) (runmodel.SessionAuthority, error) {
	_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, reader, authorityRef)
	if err != nil {
		return runmodel.SessionAuthority{}, err
	}
	state := modelToAuthority(authorityModel)
	if controllerOnly {
		if !sameActor(actorDid, state.ControllerDids...) {
			return runmodel.SessionAuthority{}, ErrForbidden
		}
		return authorityModel, nil
	}
	if !sameActor(actorDid, state.ControllerDids...) && state.LeaseHolderDid != actorDid {
		return runmodel.SessionAuthority{}, ErrForbidden
	}
	return authorityModel, nil
}

func rnauthorityCreateInput(sessionRef string, authorityID string, actorDid string, input CreateSessionDraftInput, now time.Time) runauthority.CreateInput {
	return runauthority.CreateInput{
		SessionRef:             sessionRef,
		AuthorityID:            authorityID,
		ControllerDids:         input.ControllerDids,
		RecoveryControllerDids: input.RecoveryControllerDids,
		TransferPolicy:         input.TransferPolicy,
		RequestID:              input.RequestID,
		ActorDid:               actorDid,
		Now:                    now,
	}
}

func sessionToModel(value runsession.Session) runmodel.Session {
	return runmodel.Session{
		SessionID:              value.SessionID,
		CampaignRef:            value.CampaignRef,
		Title:                  value.Title,
		Visibility:             value.Visibility,
		RulesetNSID:            value.RulesetNSID,
		RulesetManifestRef:     value.RulesetManifestRef,
		RuleProfileRefs:        append([]string(nil), value.RuleProfileRefs...),
		AuthorityRef:           value.AuthorityRef,
		State:                  value.State,
		CreatedAt:              value.CreatedAt,
		ScheduledAt:            value.ScheduledAt,
		EndedAt:                value.EndedAt,
		ArchivedAt:             value.ArchivedAt,
		RequestID:              value.RequestID,
		StateChangedAt:         value.StateChangedAt,
		StateChangedByDid:      value.StateChangedByDid,
		StateReasonCode:        value.StateReasonCode,
		VisibilityChangedAt:    value.VisibilityChangedAt,
		VisibilityChangedByDid: value.VisibilityChangedByDid,
		VisibilityReasonCode:   value.VisibilityReasonCode,
	}
}

func modelToSession(value runmodel.Session) runsession.Session {
	return runsession.Session{
		SessionID:              value.SessionID,
		CampaignRef:            value.CampaignRef,
		Title:                  value.Title,
		Visibility:             value.Visibility,
		RulesetNSID:            value.RulesetNSID,
		RulesetManifestRef:     value.RulesetManifestRef,
		RuleProfileRefs:        append([]string(nil), value.RuleProfileRefs...),
		AuthorityRef:           value.AuthorityRef,
		State:                  value.State,
		CreatedAt:              value.CreatedAt,
		ScheduledAt:            value.ScheduledAt,
		EndedAt:                value.EndedAt,
		ArchivedAt:             value.ArchivedAt,
		RequestID:              value.RequestID,
		StateChangedAt:         value.StateChangedAt,
		StateChangedByDid:      value.StateChangedByDid,
		StateReasonCode:        value.StateReasonCode,
		VisibilityChangedAt:    value.VisibilityChangedAt,
		VisibilityChangedByDid: value.VisibilityChangedByDid,
		VisibilityReasonCode:   value.VisibilityReasonCode,
	}
}

func authorityToModel(value runauthority.Authority) runmodel.SessionAuthority {
	return runmodel.SessionAuthority{
		SessionRef:             value.SessionRef,
		AuthorityID:            value.AuthorityID,
		GMAudienceRef:          value.GMAudienceRef,
		ControllerDids:         append([]string(nil), value.ControllerDids...),
		RecoveryControllerDids: append([]string(nil), value.RecoveryControllerDids...),
		LeaseHolderDid:         value.LeaseHolderDid,
		LeaseExpiresAt:         value.LeaseExpiresAt,
		TransferPolicy:         value.TransferPolicy,
		PendingControllerDids:  append([]string(nil), value.PendingControllerDids...),
		TransferPhase:          value.TransferPhase,
		TransferStartedAt:      value.TransferStartedAt,
		TransferCompletedAt:    value.TransferCompletedAt,
		RequestID:              value.RequestID,
		UpdatedByDid:           value.UpdatedByDid,
		ChangeReasonCode:       value.ChangeReasonCode,
		CreatedAt:              value.CreatedAt,
		UpdatedAt:              value.UpdatedAt,
	}
}

func modelToAuthority(value runmodel.SessionAuthority) runauthority.Authority {
	return runauthority.Authority{
		SessionRef:             value.SessionRef,
		AuthorityID:            value.AuthorityID,
		GMAudienceRef:          value.GMAudienceRef,
		ControllerDids:         append([]string(nil), value.ControllerDids...),
		RecoveryControllerDids: append([]string(nil), value.RecoveryControllerDids...),
		LeaseHolderDid:         value.LeaseHolderDid,
		LeaseExpiresAt:         value.LeaseExpiresAt,
		TransferPolicy:         value.TransferPolicy,
		PendingControllerDids:  append([]string(nil), value.PendingControllerDids...),
		TransferPhase:          value.TransferPhase,
		TransferStartedAt:      value.TransferStartedAt,
		TransferCompletedAt:    value.TransferCompletedAt,
		RequestID:              value.RequestID,
		UpdatedByDid:           value.UpdatedByDid,
		ChangeReasonCode:       value.ChangeReasonCode,
		CreatedAt:              value.CreatedAt,
		UpdatedAt:              value.UpdatedAt,
	}
}

func stringPtrIfSet(value string) *string {
	if value == "" {
		return nil
	}
	copy := value
	return &copy
}
