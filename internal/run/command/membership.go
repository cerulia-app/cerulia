package command

import (
	"context"
	"time"

	"cerulia/internal/ledger"
	runmembership "cerulia/internal/run/membership"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

type InviteSessionInput struct {
	SessionRef     string `json:"sessionRef"`
	ActorDid       string `json:"actorDid"`
	Role           string `json:"role"`
	ExpectedStatus string `json:"expectedStatus"`
	RequestID      string `json:"requestId"`
	Note           string `json:"note,omitempty"`
}

type CancelInvitationInput struct {
	SessionRef     string `json:"sessionRef"`
	ActorDid       string `json:"actorDid"`
	ExpectedStatus string `json:"expectedStatus"`
	ReasonCode     string `json:"reasonCode"`
	RequestID      string `json:"requestId"`
	Note           string `json:"note,omitempty"`
}

type JoinSessionInput struct {
	SessionRef     string `json:"sessionRef"`
	ActorDid       string `json:"actorDid"`
	ExpectedStatus string `json:"expectedStatus"`
	RequestID      string `json:"requestId"`
}

type LeaveSessionInput struct {
	SessionRef     string `json:"sessionRef"`
	ActorDid       string `json:"actorDid"`
	ExpectedStatus string `json:"expectedStatus"`
	RequestID      string `json:"requestId"`
	ReasonCode     string `json:"reasonCode,omitempty"`
}

type ModerateMembershipInput struct {
	SessionRef     string `json:"sessionRef"`
	ActorDid       string `json:"actorDid"`
	ExpectedStatus string `json:"expectedStatus"`
	NextStatus     string `json:"nextStatus"`
	Role           string `json:"role,omitempty"`
	RequestID      string `json:"requestId"`
	ReasonCode     string `json:"reasonCode"`
	Note           string `json:"note,omitempty"`
}

func (service *Service) InviteSession(ctx context.Context, actorDid string, input InviteSessionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.inviteSession", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sessionModel.State == "ended" || sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept membership changes"), nil
		}
		currentRef, currentModel, ok, err := service.currentMembership(ctx, tx, input.SessionRef, input.ActorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		var current *runmembership.Membership
		if ok {
			currentValue := modelToMembership(currentModel)
			current = &currentValue
		}
		next, err := runmembership.Invite(current, runmembership.InviteInput{
			SessionRef:     input.SessionRef,
			ActorDid:       input.ActorDid,
			Role:           input.Role,
			InvitedByDid:   actorDid,
			RequestID:      input.RequestID,
			Note:           input.Note,
			ExpectedStatus: input.ExpectedStatus,
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		membershipRef, err := newMembershipRef(input.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		stored, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(next))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{membershipRef}), nil
	})
}

func (service *Service) CancelInvitation(ctx context.Context, actorDid string, input CancelInvitationInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.cancelInvitation", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sessionModel.State == "ended" || sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept membership changes"), nil
		}
		currentRef, currentModel, ok, err := service.currentMembership(ctx, tx, input.SessionRef, input.ActorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !ok {
			return rejectedAck(input.RequestID, "membership not found"), nil
		}
		next, err := modelToMembership(currentModel).CancelInvitation(runmembership.TransitionInput{
			ExpectedStatus: input.ExpectedStatus,
			NextStatus:     "removed",
			RequestID:      input.RequestID,
			ChangedByDid:   actorDid,
			ReasonCode:     input.ReasonCode,
			Note:           input.Note,
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		membershipRef, err := newMembershipRef(input.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		stored, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(next))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{membershipRef}), nil
	})
}

func (service *Service) JoinSession(ctx context.Context, actorDid string, input JoinSessionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.ActorDid) {
		return ledger.MutationAck{}, ErrForbidden
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.joinSession", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSession(ctx, tx, input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sessionModel.State == "ended" || sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept membership changes"), nil
		}
		currentRef, currentModel, ok, err := service.currentMembership(ctx, tx, input.SessionRef, input.ActorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !ok {
			return rejectedAck(input.RequestID, "membership not found"), nil
		}
		next, err := modelToMembership(currentModel).Join(runmembership.TransitionInput{
			ExpectedStatus: input.ExpectedStatus,
			NextStatus:     "joined",
			RequestID:      input.RequestID,
			ChangedByDid:   actorDid,
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		membershipRef, err := newMembershipRef(input.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		stored, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(next))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{membershipRef}), nil
	})
}

func (service *Service) LeaveSession(ctx context.Context, actorDid string, input LeaveSessionInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	if !sameActor(actorDid, input.ActorDid) {
		return ledger.MutationAck{}, ErrForbidden
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.leaveSession", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSession(ctx, tx, input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sessionModel.State == "ended" || sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept membership changes"), nil
		}
		currentRef, currentModel, ok, err := service.currentMembership(ctx, tx, input.SessionRef, input.ActorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !ok {
			return rejectedAck(input.RequestID, "membership not found"), nil
		}
		next, err := modelToMembership(currentModel).Leave(runmembership.TransitionInput{
			ExpectedStatus: input.ExpectedStatus,
			NextStatus:     "left",
			RequestID:      input.RequestID,
			ChangedByDid:   actorDid,
			ReasonCode:     input.ReasonCode,
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		membershipRef, err := newMembershipRef(input.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		stored, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(next))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{membershipRef}), nil
	})
}

func (service *Service) ModerateMembership(ctx context.Context, actorDid string, input ModerateMembershipInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.moderateMembership", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSessionGovernance(ctx, tx, input.SessionRef, actorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if sessionModel.State == "ended" || sessionModel.State == "archived" {
			return rejectedAck(input.RequestID, "session does not accept membership changes"), nil
		}
		currentRef, currentModel, ok, err := service.currentMembership(ctx, tx, input.SessionRef, input.ActorDid)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !ok {
			return rejectedAck(input.RequestID, "membership not found"), nil
		}
		var nextRole *string
		if input.Role != "" {
			nextRole = &input.Role
		}
		next, err := modelToMembership(currentModel).Moderate(runmembership.TransitionInput{
			ExpectedStatus: input.ExpectedStatus,
			NextStatus:     input.NextStatus,
			Role:           nextRole,
			RequestID:      input.RequestID,
			ChangedByDid:   actorDid,
			ReasonCode:     input.ReasonCode,
			Note:           input.Note,
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return rejectedAck(input.RequestID, err.Error()), nil
		}
		membershipRef, err := newMembershipRef(input.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		stored, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(next))
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}
		return acceptedAck(input.RequestID, []string{membershipRef}), nil
	})
}

func (service *Service) requireSession(ctx context.Context, reader store.Reader, sessionRef string) (runmodel.Session, error) {
	_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, reader, sessionRef)
	if err != nil {
		return runmodel.Session{}, err
	}
	return sessionModel, nil
}

func (service *Service) requireSessionGovernance(ctx context.Context, reader store.Reader, sessionRef string, actorDid string) (runmodel.Session, error) {
	sessionModel, err := service.requireSession(ctx, reader, sessionRef)
	if err != nil {
		return runmodel.Session{}, err
	}
	if _, err := service.requireAuthority(ctx, reader, sessionModel.AuthorityRef, actorDid, true); err != nil {
		return runmodel.Session{}, err
	}
	return sessionModel, nil
}

func (service *Service) currentMembership(ctx context.Context, reader store.Reader, sessionRef string, actorDid string) (string, runmodel.Membership, bool, error) {
	records, err := reader.ListStableByCollection(ctx, runmodel.CollectionMembership)
	if err != nil {
		return "", runmodel.Membership{}, false, err
	}
	superseded := map[string]struct{}{}
	candidates := map[string]runmodel.Membership{}
	for _, record := range records {
		value, err := runmodel.UnmarshalStable[runmodel.Membership](record)
		if err != nil {
			return "", runmodel.Membership{}, false, err
		}
		if value.SessionRef != sessionRef || value.ActorDid != actorDid {
			continue
		}
		candidates[record.Ref] = value
		if value.SupersedesRef != "" {
			superseded[value.SupersedesRef] = struct{}{}
		}
	}
	for ref, value := range candidates {
		if _, ok := superseded[ref]; ok {
			continue
		}
		return ref, value, true, nil
	}
	return "", runmodel.Membership{}, false, nil
}

func newMembershipRef(sessionRef string, requestID string) (string, error) {
	parts, err := store.ParseRef(sessionRef)
	if err != nil {
		return "", err
	}
	return store.BuildRef(parts.RepoDID, runmodel.CollectionMembership, "membership-"+requestID), nil
}

func membershipToModel(value runmembership.Membership) runmodel.Membership {
	return runmodel.Membership{
		SessionRef:         value.SessionRef,
		ActorDid:           value.ActorDid,
		Role:               value.Role,
		Status:             value.Status,
		SupersedesRef:      value.SupersedesRef,
		InvitedByDid:       value.InvitedByDid,
		JoinedAt:           value.JoinedAt,
		LeftAt:             value.LeftAt,
		BannedAt:           value.BannedAt,
		RequestID:          value.RequestID,
		StatusChangedAt:    value.StatusChangedAt,
		StatusChangedByDid: value.StatusChangedByDid,
		StatusReasonCode:   value.StatusReasonCode,
		Note:               value.Note,
	}
}

func modelToMembership(value runmodel.Membership) runmembership.Membership {
	return runmembership.Membership{
		SessionRef:         value.SessionRef,
		ActorDid:           value.ActorDid,
		Role:               value.Role,
		Status:             value.Status,
		SupersedesRef:      value.SupersedesRef,
		InvitedByDid:       value.InvitedByDid,
		JoinedAt:           value.JoinedAt,
		LeftAt:             value.LeftAt,
		BannedAt:           value.BannedAt,
		RequestID:          value.RequestID,
		StatusChangedAt:    value.StatusChangedAt,
		StatusChangedByDid: value.StatusChangedByDid,
		StatusReasonCode:   value.StatusReasonCode,
		Note:               value.Note,
	}
}
