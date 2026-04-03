package command

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"time"

	"cerulia/internal/ledger"
	runmembership "cerulia/internal/run/membership"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

var errAppealCorrectionRejected = errors.New("appeal correction is stale")

type ReviewAppealInput struct {
	AppealCaseRef          string `json:"appealCaseRef"`
	ReviewPhaseKind        string `json:"reviewPhaseKind"`
	ReviewDecisionKind     string `json:"reviewDecisionKind"`
	ExpectedCaseRevision   int64  `json:"expectedCaseRevision"`
	ExpectedReviewRevision int64  `json:"expectedReviewRevision"`
	SupersedesRef          string `json:"supersedesRef,omitempty"`
	DetailEnvelopeRef      string `json:"detailEnvelopeRef,omitempty"`
	RequestID              string `json:"requestId"`
	Note                   string `json:"note,omitempty"`
}

type EscalateAppealInput struct {
	AppealCaseRef          string `json:"appealCaseRef"`
	ExpectedCaseRevision   int64  `json:"expectedCaseRevision"`
	ExpectedReviewRevision int64  `json:"expectedReviewRevision"`
	RequestID              string `json:"requestId"`
	HandoffSummary         string `json:"handoffSummary,omitempty"`
}

type ResolveAppealInput struct {
	AppealCaseRef          string `json:"appealCaseRef"`
	ExpectedCaseRevision   int64  `json:"expectedCaseRevision"`
	ExpectedReviewRevision int64  `json:"expectedReviewRevision"`
	DecisionKind           string `json:"decisionKind"`
	ResultSummary          string `json:"resultSummary"`
	RequestID              string `json:"requestId"`
}

type reviewEntryRecord struct {
	ref   string
	value runmodel.AppealReviewEntry
}

type reviewState struct {
	approveCount  int64
	denyCount     int64
	blockedReason string
	latestByActor map[string]reviewEntryRecord
}

func (service *Service) ReviewAppeal(ctx context.Context, actorDid string, input ReviewAppealInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AppealCaseRef, "app.cerulia.rpc.reviewAppeal", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		caseRecord, appealCase, err := decodeRunStable[runmodel.AppealCase](ctx, tx, input.AppealCaseRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if appealCase.CaseRevision != input.ExpectedCaseRevision || appealCase.ReviewRevision != input.ExpectedReviewRevision {
			return rejectedAck(input.RequestID, "appeal revision mismatch"), nil
		}
		state, err := service.reviewState(ctx, tx, input.AppealCaseRef, appealCase, now)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if appealCase.Status == "accepted" || appealCase.Status == "denied" || appealCase.Status == "withdrawn" {
			return rejectedAck(input.RequestID, "appeal is already resolved"), nil
		}
		switch input.ReviewPhaseKind {
		case "controller-review":
			if appealCase.Status != "controller-review" || state.blockedReason != "" {
				return rejectedAck(input.RequestID, "controller review is not available"), nil
			}
			if !sameActor(actorDid, appealCase.ControllerEligibleDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			if !appealCase.ControllerReviewDueAt.IsZero() && !now.Before(appealCase.ControllerReviewDueAt) {
				return rejectedAck(input.RequestID, "controller review deadline expired"), nil
			}
			if input.ReviewDecisionKind != "approve" && input.ReviewDecisionKind != "deny" && input.ReviewDecisionKind != "abstain" && input.ReviewDecisionKind != "withdraw" {
				return rejectedAck(input.RequestID, "invalid controller review decision"), nil
			}
			if state.approveCount >= appealCase.ControllerRequiredCount || state.denyCount >= appealCase.ControllerRequiredCount {
				return rejectedAck(input.RequestID, "appeal already reached review quorum"), nil
			}
		case "recovery-review":
			if appealCase.Status != "recovery-review" {
				return rejectedAck(input.RequestID, "recovery review is not available"), nil
			}
			if !sameActor(actorDid, appealCase.RecoveryEligibleDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			if input.ReviewDecisionKind != "approve" && input.ReviewDecisionKind != "deny" {
				return rejectedAck(input.RequestID, "invalid recovery review decision"), nil
			}
		default:
			return rejectedAck(input.RequestID, "invalid review phase"), nil
		}
		latest, hasLatest := state.latestByActor[reviewActorKey(input.ReviewPhaseKind, actorDid)]
		if input.ReviewDecisionKind == "withdraw" {
			if !hasLatest || input.SupersedesRef == "" || latest.ref != input.SupersedesRef {
				return rejectedAck(input.RequestID, "withdraw review must supersede the latest effective entry"), nil
			}
		} else if hasLatest {
			if input.SupersedesRef == "" || latest.ref != input.SupersedesRef {
				return rejectedAck(input.RequestID, "review must supersede the latest effective entry"), nil
			}
		} else if input.SupersedesRef != "" {
			return rejectedAck(input.RequestID, "review supersedes ref is stale"), nil
		}

		reviewRef, err := newAppealReviewEntryRef(input.AppealCaseRef, appealCase.SessionRef, input.RequestID)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		nextReviewRevision := appealCase.ReviewRevision + 1
		reviewEntry := runmodel.AppealReviewEntry{
			AppealCaseRef:      input.AppealCaseRef,
			SessionRef:         appealCase.SessionRef,
			ReviewPhaseKind:    input.ReviewPhaseKind,
			ReviewerDid:        actorDid,
			ReviewDecisionKind: input.ReviewDecisionKind,
			CaseRevision:       appealCase.CaseRevision,
			ReviewRevision:     nextReviewRevision,
			SupersedesRef:      input.SupersedesRef,
			DetailEnvelopeRef:  input.DetailEnvelopeRef,
			RequestID:          input.RequestID,
			Note:               input.Note,
			CreatedAt:          now,
		}
		storedReview, err := marshalAppend(runmodel.CollectionAppealReviewEntry, reviewRef, input.AppealCaseRef, input.RequestID, now, reviewEntry)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutAppend(ctx, storedReview); err != nil {
			return ledger.MutationAck{}, err
		}

		updatedCase := appealCase
		updatedCase.ReviewRevision = nextReviewRevision
		storedCase, err := marshalStable(runmodel.CollectionAppealCase, input.AppealCaseRef, input.RequestID, caseRecord.Revision+1, caseRecord.CreatedAt, now, updatedCase)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedCase); err != nil {
			return ledger.MutationAck{}, err
		}

		caseRevision := updatedCase.CaseRevision
		reviewRevision := updatedCase.ReviewRevision
		ack := acceptedAck(input.RequestID, []string{reviewRef})
		ack.CaseRevision = &caseRevision
		ack.ReviewRevision = &reviewRevision
		return ack, nil
	})
}

func (service *Service) EscalateAppeal(ctx context.Context, actorDid string, input EscalateAppealInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AppealCaseRef, "app.cerulia.rpc.escalateAppeal", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		caseRecord, appealCase, err := decodeRunStable[runmodel.AppealCase](ctx, tx, input.AppealCaseRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if appealCase.CaseRevision != input.ExpectedCaseRevision || appealCase.ReviewRevision != input.ExpectedReviewRevision {
			return rejectedAck(input.RequestID, "appeal revision mismatch"), nil
		}
		_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, tx, appealCase.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, tx, sessionModel.AuthorityRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		authorityActorDid, err := refRepoDID(appealCase.SessionRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if !sameActor(actorDid, authorityActorDid) && !sameActor(actorDid, authorityModel.ControllerDids...) && !sameActor(actorDid, authorityModel.RecoveryControllerDids...) {
			return ledger.MutationAck{}, ErrForbidden
		}
		if appealCase.Status == "recovery-review" && appealCase.EscalatedAt != nil && appealCase.ResolvedAt == nil && appealCase.WithdrawnAt == nil {
			caseRevision := appealCase.CaseRevision
			reviewRevision := appealCase.ReviewRevision
			ack := acceptedAck(input.RequestID, []string{input.AppealCaseRef})
			ack.CaseRevision = &caseRevision
			ack.ReviewRevision = &reviewRevision
			ack.TransferPhase = authorityModel.TransferPhase
			return ack, nil
		}
		if appealCase.Status != "controller-review" || appealCase.ResolvedAt != nil || appealCase.WithdrawnAt != nil {
			return rejectedAck(input.RequestID, "appeal cannot be escalated"), nil
		}
		state, err := service.reviewState(ctx, tx, input.AppealCaseRef, appealCase, now)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if state.blockedReason == "" {
			return rejectedAck(input.RequestID, "appeal is not blocked"), nil
		}
		if len(authorityModel.RecoveryControllerDids) == 0 {
			return rejectedAck(input.RequestID, "recovery controller is required"), nil
		}

		updatedCase := appealCase
		updatedCase.Status = "recovery-review"
		updatedCase.CaseRevision++
		updatedCase.BlockedReasonCode = state.blockedReason
		escalatedAt := now
		updatedCase.EscalatedAt = &escalatedAt
		updatedCase.EscalatedByDid = actorDid
		updatedCase.EscalateRequestID = input.RequestID
		updatedCase.RecoveryEligibleDids = append([]string(nil), authorityModel.RecoveryControllerDids...)
		updatedCase.RecoveryAuthorityRequestID = authorityModel.RequestID
		updatedCase.ReviewOutcomeSummary = formatReviewOutcomeSummary(state.approveCount, state.denyCount)
		if input.HandoffSummary != "" {
			updatedCase.HandoffSummary = input.HandoffSummary
		}
		storedCase, err := marshalStable(runmodel.CollectionAppealCase, input.AppealCaseRef, input.RequestID, caseRecord.Revision+1, caseRecord.CreatedAt, now, updatedCase)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedCase); err != nil {
			return ledger.MutationAck{}, err
		}

		caseRevision := updatedCase.CaseRevision
		reviewRevision := updatedCase.ReviewRevision
		ack := acceptedAck(input.RequestID, []string{input.AppealCaseRef})
		ack.CaseRevision = &caseRevision
		ack.ReviewRevision = &reviewRevision
		ack.TransferPhase = authorityModel.TransferPhase
		return ack, nil
	})
}

func (service *Service) ResolveAppeal(ctx context.Context, actorDid string, input ResolveAppealInput) (ledger.MutationAck, error) {
	if err := requireActor(actorDid); err != nil {
		return ledger.MutationAck{}, err
	}
	return service.executeMutation(ctx, input.AppealCaseRef, "app.cerulia.rpc.resolveAppeal", input.RequestID, actorDid, input, func(tx store.Tx, now time.Time) (ledger.MutationAck, error) {
		caseRecord, appealCase, err := decodeRunStable[runmodel.AppealCase](ctx, tx, input.AppealCaseRef)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if input.DecisionKind != "accepted" && input.DecisionKind != "denied" {
			return rejectedAck(input.RequestID, "invalid appeal resolution"), nil
		}
		if appealCase.CaseRevision != input.ExpectedCaseRevision || appealCase.ReviewRevision != input.ExpectedReviewRevision {
			return rejectedAck(input.RequestID, "appeal revision mismatch"), nil
		}
		if appealCase.ResolvedAt != nil || appealCase.WithdrawnAt != nil {
			return rejectedAck(input.RequestID, "appeal is already resolved"), nil
		}
		state, err := service.reviewState(ctx, tx, input.AppealCaseRef, appealCase, now)
		if err != nil {
			return ledger.MutationAck{}, err
		}

		updatedCase := appealCase
		updatedCase.CaseRevision++
		updatedCase.Status = input.DecisionKind
		updatedCase.ResultSummary = input.ResultSummary
		updatedCase.ReviewOutcomeSummary = formatReviewOutcomeSummary(state.approveCount, state.denyCount)
		resolvedAt := now
		updatedCase.ResolvedAt = &resolvedAt
		updatedCase.ResolvedByDid = actorDid

		emittedRecordRefs := []string{input.AppealCaseRef}
		switch appealCase.Status {
		case "controller-review":
			if !sameActor(actorDid, appealCase.ControllerEligibleDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			if state.blockedReason != "" {
				return rejectedAck(input.RequestID, "appeal requires escalation"), nil
			}
			if state.approveCount >= appealCase.ControllerRequiredCount && state.denyCount >= appealCase.ControllerRequiredCount {
				return rejectedAck(input.RequestID, "appeal review quorum is split"), nil
			}
			if input.DecisionKind == "accepted" && state.approveCount < appealCase.ControllerRequiredCount {
				return rejectedAck(input.RequestID, "appeal does not have approval quorum"), nil
			}
			if input.DecisionKind == "denied" && state.denyCount < appealCase.ControllerRequiredCount {
				return rejectedAck(input.RequestID, "appeal does not have denial quorum"), nil
			}
			updatedCase.ControllerResolutionRequestID = input.RequestID
		case "recovery-review":
			if !sameActor(actorDid, appealCase.RecoveryEligibleDids...) {
				return ledger.MutationAck{}, ErrForbidden
			}
			latestRecovery, ok := latestRecoveryReview(state.latestByActor)
			if !ok {
				return rejectedAck(input.RequestID, "recovery review entry is required"), nil
			}
			if input.DecisionKind == "accepted" && latestRecovery.value.ReviewDecisionKind != "approve" {
				return rejectedAck(input.RequestID, "recovery review does not approve the appeal"), nil
			}
			if input.DecisionKind == "denied" && latestRecovery.value.ReviewDecisionKind != "deny" {
				return rejectedAck(input.RequestID, "recovery review does not deny the appeal"), nil
			}
			updatedCase.RecoveryResolutionRequestID = input.RequestID
		default:
			return rejectedAck(input.RequestID, "appeal cannot be resolved"), nil
		}

		if input.DecisionKind == "accepted" {
			correctionRef, err := service.emitAppealCorrection(ctx, tx, actorDid, appealCase, updatedCase.ResultSummary, input, now)
			if err != nil {
				if errors.Is(err, errAppealCorrectionRejected) {
					return rejectedAck(input.RequestID, err.Error()), nil
				}
				return ledger.MutationAck{}, err
			}
			emittedRecordRefs = append(emittedRecordRefs, correctionRef)
		}

		storedCase, err := marshalStable(runmodel.CollectionAppealCase, input.AppealCaseRef, input.RequestID, caseRecord.Revision+1, caseRecord.CreatedAt, now, updatedCase)
		if err != nil {
			return ledger.MutationAck{}, err
		}
		if err := tx.PutStable(ctx, storedCase); err != nil {
			return ledger.MutationAck{}, err
		}

		caseRevision := updatedCase.CaseRevision
		reviewRevision := updatedCase.ReviewRevision
		ack := acceptedAck(input.RequestID, emittedRecordRefs)
		ack.CaseRevision = &caseRevision
		ack.ReviewRevision = &reviewRevision
		ack.Message = input.ResultSummary
		return ack, nil
	})
}

func (service *Service) emitAppealCorrection(ctx context.Context, tx store.Tx, actorDid string, appealCase runmodel.AppealCase, resultSummary string, input ResolveAppealInput, now time.Time) (string, error) {
	switch appealCase.TargetKind {
	case "membership":
		_, targetMembership, err := decodeRunStable[runmodel.Membership](ctx, tx, appealCase.TargetRef)
		if err != nil {
			return "", err
		}
		if targetMembership.SessionRef != appealCase.SessionRef || targetMembership.ActorDid != appealCase.AffectedActorDid {
			return "", errAppealCorrectionRejected
		}
		currentRef, currentMembership, ok, err := service.currentMembership(ctx, tx, appealCase.SessionRef, appealCase.AffectedActorDid)
		if err != nil {
			return "", err
		}
		if !ok || currentRef != appealCase.TargetRef || (currentMembership.Status != "removed" && currentMembership.Status != "banned") {
			return "", errAppealCorrectionRejected
		}
		nextMembership, err := modelToMembership(currentMembership).Moderate(runmembership.TransitionInput{
			ExpectedStatus: currentMembership.Status,
			NextStatus:     "joined",
			RequestID:      input.RequestID,
			ChangedByDid:   actorDid,
			ReasonCode:     "appeal-correction",
			Now:            now,
			CurrentRef:     currentRef,
		})
		if err != nil {
			return "", err
		}
		membershipRef, err := newMembershipRef(appealCase.SessionRef, input.RequestID)
		if err != nil {
			return "", err
		}
		storedMembership, err := marshalStable(runmodel.CollectionMembership, membershipRef, input.RequestID, 1, now, now, membershipToModel(nextMembership))
		if err != nil {
			return "", err
		}
		if err := tx.PutStable(ctx, storedMembership); err != nil {
			return "", err
		}
		return membershipRef, nil
	case "ruling-event":
		_, rulingEvent, err := decodeRunAppend[runmodel.RulingEvent](ctx, tx, appealCase.TargetRef)
		if err != nil {
			return "", err
		}
		if err := validateRulingEventLineage(ctx, tx, rulingEvent); err != nil {
			return "", errAppealCorrectionRejected
		}
		if err := validateRulingEventTargetCurrent(ctx, tx, appealCase.TargetRef); err != nil {
			return "", errAppealCorrectionRejected
		}
		repoDID, err := refRepoDID(appealCase.SessionRef)
		if err != nil {
			return "", err
		}
		rulingEventRef := appendRef(repoDID, runmodel.CollectionRulingEvent, caseScopedRecordKey(input.AppealCaseRef, "ruling-event"), input.RequestID)
		corrected := runmodel.RulingEvent{
			SessionRef:          rulingEvent.SessionRef,
			AppealCaseRef:       input.AppealCaseRef,
			ActionKind:          rulingEvent.ActionKind,
			ActorDid:            rulingEvent.ActorDid,
			NormalizedActionRef: rulingEvent.NormalizedActionRef,
			RulesetNSID:         rulingEvent.RulesetNSID,
			RulesetManifestRef:  rulingEvent.RulesetManifestRef,
			RuleProfileRefs:     append([]string(nil), rulingEvent.RuleProfileRefs...),
			DecisionKind:        "appeal-correction",
			AudienceRef:         rulingEvent.AudienceRef,
			ResultSummary:       resultSummary,
			DetailEnvelopeRef:   rulingEvent.DetailEnvelopeRef,
			EmittedRecordRefs:   append([]string(nil), rulingEvent.EmittedRecordRefs...),
			SupersedesRef:       appealCase.TargetRef,
			DecidedByDid:        actorDid,
			RequestID:           input.RequestID,
			CreatedAt:           now,
		}
		storedRuling, err := marshalAppend(runmodel.CollectionRulingEvent, rulingEventRef, appealCase.SessionRef, input.RequestID, now, corrected)
		if err != nil {
			return "", err
		}
		if err := tx.PutAppend(ctx, storedRuling); err != nil {
			return "", err
		}
		return rulingEventRef, nil
	default:
		return "", fmt.Errorf("unsupported appeal target kind %q", appealCase.TargetKind)
	}
}

func validateRulingEventLineage(ctx context.Context, reader store.Reader, rulingEvent runmodel.RulingEvent) error {
	if rulingEvent.SupersedesRef == "" {
		return nil
	}
	_, previous, err := decodeRunAppend[runmodel.RulingEvent](ctx, reader, rulingEvent.SupersedesRef)
	if err != nil {
		return err
	}
	if previous.SessionRef != rulingEvent.SessionRef || previous.ActionKind != rulingEvent.ActionKind {
		return fmt.Errorf("ruling event lineage mismatch")
	}
	if previous.NormalizedActionRef != rulingEvent.NormalizedActionRef {
		return fmt.Errorf("ruling event lineage mismatch")
	}
	return nil
}

func validateRulingEventTargetCurrent(ctx context.Context, reader store.Reader, targetRef string) error {
	records, err := reader.ListAppendByCollection(ctx, runmodel.CollectionRulingEvent)
	if err != nil {
		return err
	}
	for _, record := range records {
		value, err := runmodel.UnmarshalAppend[runmodel.RulingEvent](record)
		if err != nil {
			return err
		}
		if value.SupersedesRef == targetRef {
			return fmt.Errorf("ruling event appeal target is stale")
		}
	}
	return nil
}

func (service *Service) reviewState(ctx context.Context, reader store.Reader, appealCaseRef string, appealCase runmodel.AppealCase, now time.Time) (reviewState, error) {
	records, err := service.reviewEntriesForCase(ctx, reader, appealCaseRef, appealCase.SessionRef)
	if err != nil {
		return reviewState{}, err
	}
	latestByActor := latestEffectiveReviewEntries(records)
	approveCount, denyCount := countReviewDecisions(latestByActor, appealCase.Status)
	blockedReason := appealCase.BlockedReasonCode
	if blockedReason == "" {
		blockedReason = deriveBlockedReason(appealCase, approveCount, denyCount, now)
	}
	return reviewState{
		approveCount:  approveCount,
		denyCount:     denyCount,
		blockedReason: blockedReason,
		latestByActor: latestByActor,
	}, nil
}

func (service *Service) reviewEntriesForCase(ctx context.Context, reader store.Reader, appealCaseRef string, sessionRef string) ([]reviewEntryRecord, error) {
	records, err := reader.ListAppendByCollection(ctx, runmodel.CollectionAppealReviewEntry)
	if err != nil {
		return nil, err
	}
	items := make([]reviewEntryRecord, 0)
	for _, record := range records {
		value, err := runmodel.UnmarshalAppend[runmodel.AppealReviewEntry](record)
		if err != nil {
			return nil, err
		}
		if value.SessionRef != sessionRef || value.AppealCaseRef != appealCaseRef || record.GoverningRef != appealCaseRef {
			continue
		}
		items = append(items, reviewEntryRecord{ref: record.Ref, value: value})
	}
	sort.Slice(items, func(left int, right int) bool {
		return items[left].value.ReviewRevision < items[right].value.ReviewRevision
	})
	return items, nil
}

func latestEffectiveReviewEntries(records []reviewEntryRecord) map[string]reviewEntryRecord {
	superseded := map[string]struct{}{}
	for _, record := range records {
		if record.value.SupersedesRef != "" {
			superseded[record.value.SupersedesRef] = struct{}{}
		}
	}
	latestByActor := map[string]reviewEntryRecord{}
	for _, record := range records {
		if _, ok := superseded[record.ref]; ok {
			continue
		}
		key := reviewActorKey(record.value.ReviewPhaseKind, record.value.ReviewerDid)
		latestByActor[key] = record
	}
	return latestByActor
}

func reviewActorKey(phase string, actorDid string) string {
	return phase + "\x00" + actorDid
}

func countReviewDecisions(latestByActor map[string]reviewEntryRecord, phase string) (int64, int64) {
	var approveCount int64
	var denyCount int64
	for _, record := range latestByActor {
		if record.value.ReviewPhaseKind != phase {
			continue
		}
		switch record.value.ReviewDecisionKind {
		case "approve":
			approveCount++
		case "deny":
			denyCount++
		}
	}
	return approveCount, denyCount
}

func latestRecoveryReview(latestByActor map[string]reviewEntryRecord) (reviewEntryRecord, bool) {
	var selected reviewEntryRecord
	selectedSet := false
	for _, record := range latestByActor {
		if record.value.ReviewPhaseKind != "recovery-review" {
			continue
		}
		if !selectedSet || record.value.ReviewRevision > selected.value.ReviewRevision {
			selected = record
			selectedSet = true
		}
	}
	return selected, selectedSet
}

func deriveBlockedReason(appealCase runmodel.AppealCase, approveCount int64, denyCount int64, now time.Time) string {
	if int64(len(appealCase.ControllerEligibleDids)) < appealCase.ControllerRequiredCount {
		return "quorum-impossible"
	}
	if !appealCase.ControllerReviewDueAt.IsZero() && !now.Before(appealCase.ControllerReviewDueAt) && approveCount < appealCase.ControllerRequiredCount && denyCount < appealCase.ControllerRequiredCount {
		return "deadline-expired"
	}
	return ""
}

func formatReviewOutcomeSummary(approveCount int64, denyCount int64) string {
	return fmt.Sprintf("approve=%d deny=%d", approveCount, denyCount)
}

func newAppealReviewEntryRef(appealCaseRef string, sessionRef string, requestID string) (string, error) {
	parts, err := store.ParseRef(sessionRef)
	if err != nil {
		return "", err
	}
	return store.BuildRef(parts.RepoDID, runmodel.CollectionAppealReviewEntry, caseScopedRecordKey(appealCaseRef, "appeal-review")+"-"+requestID), nil
}

func caseScopedRecordKey(ref string, prefix string) string {
	parts, err := store.ParseRef(ref)
	if err != nil {
		return prefix
	}
	return prefix + "-" + parts.RecordKey
}
