package command

import (
	"context"
	"time"

	"cerulia/internal/ledger"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

type SubmitAppealInput struct {
	SessionRef           string `json:"sessionRef"`
	TargetKind           string `json:"targetKind"`
	TargetRef            string `json:"targetRef"`
	TargetRequestID      string `json:"targetRequestId"`
	AffectedActorDid     string `json:"affectedActorDid"`
	RequestedOutcomeKind string `json:"requestedOutcomeKind"`
	RequestID            string `json:"requestId"`
	Note                 string `json:"note,omitempty"`
}

type WithdrawAppealInput struct {
	AppealCaseRef          string `json:"appealCaseRef"`
	ExpectedCaseRevision   int64  `json:"expectedCaseRevision"`
	ExpectedReviewRevision int64  `json:"expectedReviewRevision"`
	RequestID              string `json:"requestId"`
}

func (service *Service) SubmitAppeal(ctx context.Context, actorDid string, input SubmitAppealInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.SessionRef, "app.cerulia.rpc.submitAppeal", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		sessionModel, err := service.requireSession(ctx, tx, input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, tx, sessionModel.AuthorityRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}

		if input.TargetKind != "membership" {
			return rejectedAck(input.RequestID, "unsupported appeal target"), nil
		}
		if input.RequestedOutcomeKind != "restore-membership" {
			return rejectedAck(input.RequestID, "unsupported appeal outcome"), nil
		}

		_, membershipModel, err := decodeRunStable[runmodel.Membership](ctx, tx, input.TargetRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if membershipModel.SessionRef != input.SessionRef || membershipModel.ActorDid != input.AffectedActorDid || membershipModel.RequestID != input.TargetRequestID {
			return rejectedAck(input.RequestID, "appeal target mismatch"), nil
		}
		if !sameActor(actorDid, input.AffectedActorDid) && !sameActor(actorDid, authorityModel.ControllerDids...) {
			return ledger.MutationAck{}, ErrForbidden
		}

		controllerEligible := make([]string, 0, len(authorityModel.ControllerDids))
		for _, controllerDid := range authorityModel.ControllerDids {
			if controllerDid == membershipModel.ActorDid || controllerDid == membershipModel.StatusChangedByDid {
				continue
			}
			controllerEligible = append(controllerEligible, controllerDid)
		}
		requiredCount := quorumRequired(len(authorityModel.ControllerDids), authorityModel.TransferPolicy)
		blockedReason := ""
		if int64(len(controllerEligible)) < requiredCount {
			blockedReason = "quorum-impossible"
		}

		repoDID, err := refRepoDID(input.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		appealCaseRef := store.BuildRef(repoDID, runmodel.CollectionAppealCase, "appeal-"+input.RequestID)
		reviewDueAt := now.Add(24 * time.Hour)
		record := runmodel.AppealCase{
			SessionRef:                   input.SessionRef,
			TargetRef:                    input.TargetRef,
			TargetKind:                   input.TargetKind,
			TargetRequestID:              input.TargetRequestID,
			AffectedActorDid:             input.AffectedActorDid,
			RequestedOutcomeKind:         input.RequestedOutcomeKind,
			OpenedByDid:                  actorDid,
			OpenedAt:                     now,
			Status:                       "controller-review",
			CaseRevision:                 1,
			ReviewRevision:               0,
			AuthoritySnapshotRequestID:   authorityModel.RequestID,
			ControllerTransferPolicyKind: authorityModel.TransferPolicy,
			ControllerEligibleDids:       controllerEligible,
			ControllerRequiredCount:      requiredCount,
			ControllerReviewDueAt:        reviewDueAt,
			BlockedReasonCode:            blockedReason,
			RequestID:                    input.RequestID,
			Note:                         input.Note,
		}
		stored, err := marshalStable(runmodel.CollectionAppealCase, appealCaseRef, input.RequestID, 1, now, now, record)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}

		caseRevision := int64(1)
		reviewRevision := int64(0)
		ack := acceptedAck(input.RequestID, []string{appealCaseRef})
		ack.CaseRevision = &caseRevision
		ack.ReviewRevision = &reviewRevision
		return ack, nil
	})
}

func (service *Service) WithdrawAppeal(ctx context.Context, actorDid string, input WithdrawAppealInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AppealCaseRef, "app.cerulia.rpc.withdrawAppeal", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		record, appealCase, err := decodeRunStable[runmodel.AppealCase](ctx, tx, input.AppealCaseRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, appealCase.OpenedByDid) {
			return ledger.MutationAck{}, ErrForbidden
		}
		if appealCase.CaseRevision != input.ExpectedCaseRevision || appealCase.ReviewRevision != input.ExpectedReviewRevision {
			return rejectedAck(input.RequestID, "appeal revision mismatch"), nil
		}
		if appealCase.Status != "controller-review" || appealCase.WithdrawnAt != nil || appealCase.ResolvedAt != nil || appealCase.EscalatedAt != nil {
			return rejectedAck(input.RequestID, "appeal cannot be withdrawn"), nil
		}

		updated := appealCase
		updated.Status = "withdrawn"
		updated.CaseRevision++
		updated.WithdrawnByDid = actorDid
		updated.WithdrawRequestID = input.RequestID
		withdrawnAt := now
		updated.WithdrawnAt = &withdrawnAt
		stored, err := marshalStable(runmodel.CollectionAppealCase, input.AppealCaseRef, input.RequestID, record.Revision+1, record.CreatedAt, now, updated)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, stored); err != nil {
			return ledger.MutationAck{}, err
		}

		caseRevision := updated.CaseRevision
		reviewRevision := updated.ReviewRevision
		ack := acceptedAck(input.RequestID, []string{input.AppealCaseRef})
		ack.CaseRevision = &caseRevision
		ack.ReviewRevision = &reviewRevision
		return ack, nil
	})
}

func quorumRequired(totalControllers int, policy string) int64 {
	if totalControllers <= 0 {
		return 0
	}
	switch policy {
	case "unanimous-controllers":
		return int64(totalControllers)
	default:
		return int64((totalControllers + 1) / 2)
	}
}
