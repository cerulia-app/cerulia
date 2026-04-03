package projection

import (
	"context"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	coremodel "cerulia/internal/core/model"
	runauthority "cerulia/internal/run/authority"
	runmodel "cerulia/internal/run/model"
	"cerulia/internal/store"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
)

type Service struct {
	reader store.Reader
	now    func() time.Time
}

type membershipHead struct {
	ref   string
	value runmodel.Membership
}

type appealCaseRecord struct {
	ref   string
	value runmodel.AppealCase
}

type appealReviewEntryRecord struct {
	ref   string
	value runmodel.AppealReviewEntry
}

type sessionPublicationHead struct {
	ref   string
	value runmodel.SessionPublication
}

func NewService(reader store.Reader) *Service {
	if reader == nil {
		reader = store.NewMemoryStore()
	}
	return &Service{
		reader: reader,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (service *Service) GetSessionAccessPreflight(ctx context.Context, actorDid string, sessionRef string) (AccessPreflight, error) {
	if sessionRef == "" {
		return AccessPreflight{}, ErrInvalidInput
	}
	_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
	if err != nil {
		return AccessPreflight{}, err
	}
	_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
	if err != nil {
		return AccessPreflight{}, err
	}
	current, ok, err := service.membershipForActor(ctx, sessionRef, actorDid)
	if err != nil {
		return AccessPreflight{}, err
	}
	route := "/sessions/" + url.PathEscape(sessionRef)
	decision := AccessPreflight{SessionRef: sessionRef}

	if ok && current.value.Status == "joined" {
		decision.DecisionKind = "participant-shell"
		decision.ReasonCode = "joined-member"
		decision.RecommendedRoute = route
		decision.MembershipRequestID = current.value.RequestID
		return decision, nil
	}
	if actorDid != "" && sameActor(actorDid, authorityModel.ControllerDids...) {
		decision.DecisionKind = "governance-console"
		decision.ReasonCode = "current-controller"
		decision.RecommendedRoute = route + "/governance"
		decision.AuthorityRequestID = authorityModel.RequestID
		return decision, nil
	}
	if actorDid != "" {
		appealSummary, hasAppeal, err := service.appealOnlyCandidate(ctx, sessionRef, actorDid)
		if err != nil {
			return AccessPreflight{}, err
		}
		if hasAppeal && (!ok || current.value.Status == "removed" || current.value.Status == "banned") {
			decision.DecisionKind = "appeal-only"
			decision.ReasonCode = "open-appeal"
			decision.RecommendedRoute = route + "/appeals"
			decision.AppealCaseRef = appealSummary.AppealCaseRef
			return decision, nil
		}
	}
	if ok && current.value.Status == "invited" && sessionModel.State != "ended" && sessionModel.State != "archived" {
		decision.DecisionKind = "join"
		decision.ReasonCode = "pending-invitation"
		decision.RecommendedRoute = route + "/join"
		decision.MembershipRequestID = current.value.RequestID
		return decision, nil
	}
	publicationCarrier, hasCarrier, err := service.activeSessionPublication(ctx, sessionRef, false)
	if err != nil {
		return AccessPreflight{}, err
	}
	if hasCarrier {
		decision.DecisionKind = "public-replay"
		decision.ReasonCode = "active-carrier"
		decision.RecommendedRoute = route + "/replay"
		decision.SessionPublicationRef = publicationCarrier.SessionPublicationRef
		return decision, nil
	}
	if sessionModel.Visibility == "public" {
		decision.DecisionKind = "public-replay"
		decision.ReasonCode = "public-session"
		decision.RecommendedRoute = route + "/replay"
		return decision, nil
	}
	if actorDid == "" {
		decision.DecisionKind = "sign-in"
		decision.ReasonCode = "anonymous-reader"
		decision.RecommendedRoute = "/signin"
		return decision, nil
	}
	decision.DecisionKind = "no-access"
	decision.ReasonCode = "not-authorized"
	decision.RecommendedRoute = "/home"
	return decision, nil
}

func (service *Service) GetSessionView(ctx context.Context, actorDid string, sessionRef string) (SessionView, error) {
	if actorDid == "" || sessionRef == "" {
		return SessionView{}, ErrInvalidInput
	}
	_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
	if err != nil {
		return SessionView{}, err
	}
	_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
	if err != nil {
		return SessionView{}, err
	}
	current, ok, err := service.membershipForActor(ctx, sessionRef, actorDid)
	if err != nil {
		return SessionView{}, err
	}
	if !ok || current.value.Status != "joined" {
		return SessionView{}, ErrForbidden
	}
	headList, err := service.currentMembershipHeads(ctx, sessionRef)
	if err != nil {
		return SessionView{}, err
	}
	memberships := make([]MembershipSummary, 0)
	for _, head := range headList {
		if head.value.Status == "removed" || head.value.Status == "banned" {
			continue
		}
		memberships = append(memberships, membershipSummary(head.value, false))
	}
	appealCases, err := service.ListAppealCases(ctx, actorDid, sessionRef, "participant", "", 100, "")
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		return SessionView{}, err
	}
	carriers := make([]SessionPublicationSummary, 0, 1)
	if carrier, ok, err := service.activeSessionPublication(ctx, sessionRef, false); err != nil {
		return SessionView{}, err
	} else if ok {
		carriers = append(carriers, carrier)
	}

	authorityState := toAuthority(authorityModel)
	return SessionView{
		Session:             sessionSummary(sessionRef, sessionModel, false),
		AuthoritySummary:    ParticipantAuthoritySummary{AuthorityRef: sessionModel.AuthorityRef, TransferPhase: authorityModel.TransferPhase, AuthorityHealthKind: authorityState.HealthKind(service.now().UTC()), LeaseState: authorityState.LeaseState(service.now().UTC()), LeaseExpiresAt: authorityModel.LeaseExpiresAt},
		Memberships:         memberships,
		HandoutCount:        0,
		AppealCount:         len(appealCases.Items),
		PublicationCarriers: carriers,
	}, nil
}

func (service *Service) GetGovernanceView(ctx context.Context, actorDid string, sessionRef string) (GovernanceView, error) {
	if actorDid == "" || sessionRef == "" {
		return GovernanceView{}, ErrInvalidInput
	}
	_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
	if err != nil {
		return GovernanceView{}, err
	}
	_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
	if err != nil {
		return GovernanceView{}, err
	}
	if !sameActor(actorDid, authorityModel.ControllerDids...) {
		return GovernanceView{}, ErrForbidden
	}
	headList, err := service.currentMembershipHeads(ctx, sessionRef)
	if err != nil {
		return GovernanceView{}, err
	}
	memberships := make([]MembershipSummary, 0, len(headList))
	for _, head := range headList {
		memberships = append(memberships, membershipSummary(head.value, true))
	}
	carriers := make([]SessionPublicationSummary, 0, 1)
	if carrier, ok, err := service.activeSessionPublication(ctx, sessionRef, true); err != nil {
		return GovernanceView{}, err
	} else if ok {
		carriers = append(carriers, carrier)
	}
	appealRecords, err := service.appealCasesForSession(ctx, sessionRef)
	if err != nil {
		return GovernanceView{}, err
	}
	pendingAppeals := make([]AppealCaseSummary, 0)
	for _, record := range appealRecords {
		summary, err := service.appealSummary(ctx, record.ref, record.value, true, service.now().UTC())
		if err != nil {
			return GovernanceView{}, err
		}
		if summary.NextResolverKind == "none" {
			continue
		}
		pendingAppeals = append(pendingAppeals, summary)
	}
	authorityState := toAuthority(authorityModel)
	return GovernanceView{
		Session: sessionSummary(sessionRef, sessionModel, true),
		Authority: GovernanceAuthoritySummary{
			AuthorityRef:           sessionModel.AuthorityRef,
			ControllerDids:         append([]string(nil), authorityModel.ControllerDids...),
			RecoveryControllerDids: append([]string(nil), authorityModel.RecoveryControllerDids...),
			LeaseHolderDid:         authorityModel.LeaseHolderDid,
			LeaseExpiresAt:         authorityModel.LeaseExpiresAt,
			AuthorityHealthKind:    authorityState.HealthKind(service.now().UTC()),
			TransferPhase:          authorityModel.TransferPhase,
			TransferStartedAt:      authorityModel.TransferStartedAt,
			PendingControllerDids:  append([]string(nil), authorityModel.PendingControllerDids...),
			TransferCompletedAt:    authorityModel.TransferCompletedAt,
		},
		Memberships:         memberships,
		PublicationCarriers: carriers,
		PendingAppeals:      pendingAppeals,
	}, nil
}

func (service *Service) ListSessionPublications(ctx context.Context, actorDid string, sessionRef string, mode string, includeRetired bool, limit int, cursor string) (Page[SessionPublicationSummary], error) {
	if strings.TrimSpace(sessionRef) == "" {
		return Page[SessionPublicationSummary]{}, ErrInvalidInput
	}
	resolvedMode := mode
	switch resolvedMode {
	case "":
		resolvedMode = "public"
	case "public", "governance":
	default:
		return Page[SessionPublicationSummary]{}, ErrInvalidInput
	}
	if resolvedMode == "public" && includeRetired {
		return Page[SessionPublicationSummary]{}, ErrInvalidInput
	}
	if resolvedMode == "governance" {
		_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
		if err != nil {
			return Page[SessionPublicationSummary]{}, err
		}
		_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
		if err != nil {
			return Page[SessionPublicationSummary]{}, err
		}
		if !sameActor(actorDid, authorityModel.ControllerDids...) {
			return Page[SessionPublicationSummary]{}, ErrForbidden
		}
	}

	items := make([]SessionPublicationSummary, 0, 1)
	head, ok, err := service.sessionPublicationHead(ctx, sessionRef)
	if err != nil {
		return Page[SessionPublicationSummary]{}, err
	}
	if ok {
		active, err := service.sessionPublicationHeadIsActive(ctx, head)
		if err != nil {
			return Page[SessionPublicationSummary]{}, err
		}
		switch {
		case active:
			items = append(items, sessionPublicationSummary(head.ref, head.value, resolvedMode == "governance"))
		case head.value.RetiredAt != nil && includeRetired:
			items = append(items, sessionPublicationSummary(head.ref, head.value, true))
		}
	}
	if len(items) == 0 {
		return Page[SessionPublicationSummary]{}, store.ErrNotFound
	}
	return paginate(items, limit, cursor)
}

func (service *Service) ListAppealCases(ctx context.Context, actorDid string, sessionRef string, view string, status string, limit int, cursor string) (Page[AppealCaseSummary], error) {
	if strings.TrimSpace(sessionRef) == "" {
		return Page[AppealCaseSummary]{}, ErrInvalidInput
	}
	resolvedView := view
	if resolvedView == "" {
		resolvedView = "participant"
	}
	var authorityModel runmodel.SessionAuthority
	if resolvedView == "resolver" {
		_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
		if err != nil {
			return Page[AppealCaseSummary]{}, err
		}
		_, authority, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
		if err != nil {
			return Page[AppealCaseSummary]{}, err
		}
		authorityModel = authority
		if !sameActor(actorDid, authorityModel.ControllerDids...) && !sameActor(actorDid, authorityModel.RecoveryControllerDids...) {
			return Page[AppealCaseSummary]{}, ErrForbidden
		}
	}
	records, err := service.appealCasesForSession(ctx, sessionRef)
	if err != nil {
		return Page[AppealCaseSummary]{}, err
	}
	items := make([]AppealCaseSummary, 0)
	for _, record := range records {
		if status != "" && record.value.Status != status {
			continue
		}
		switch resolvedView {
		case "participant":
			if actorDid == "" || (!sameActor(actorDid, record.value.OpenedByDid) && !sameActor(actorDid, record.value.AffectedActorDid)) {
				continue
			}
			summary, err := service.appealSummary(ctx, record.ref, record.value, false, service.now().UTC())
			if err != nil {
				return Page[AppealCaseSummary]{}, err
			}
			items = append(items, summary)
		case "resolver":
			summary, err := service.appealSummary(ctx, record.ref, record.value, true, service.now().UTC())
			if err != nil {
				return Page[AppealCaseSummary]{}, err
			}
			items = append(items, summary)
		default:
			return Page[AppealCaseSummary]{}, ErrInvalidInput
		}
	}
	if len(items) == 0 {
		return Page[AppealCaseSummary]{}, store.ErrNotFound
	}
	return paginate(items, limit, cursor)
}

func (service *Service) membershipForActor(ctx context.Context, sessionRef string, actorDid string) (membershipHead, bool, error) {
	if actorDid == "" {
		return membershipHead{}, false, nil
	}
	headList, err := service.currentMembershipHeads(ctx, sessionRef)
	if err != nil {
		return membershipHead{}, false, err
	}
	for _, head := range headList {
		if head.value.ActorDid == actorDid {
			return head, true, nil
		}
	}
	return membershipHead{}, false, nil
}

func (service *Service) currentMembershipHeads(ctx context.Context, sessionRef string) ([]membershipHead, error) {
	records, err := service.reader.ListStableByCollection(ctx, runmodel.CollectionMembership)
	if err != nil {
		return nil, err
	}
	superseded := map[string]struct{}{}
	candidates := map[string]runmodel.Membership{}
	for _, record := range records {
		value, err := runmodel.UnmarshalStable[runmodel.Membership](record)
		if err != nil {
			return nil, err
		}
		if value.SessionRef != sessionRef {
			continue
		}
		candidates[record.Ref] = value
		if value.SupersedesRef != "" {
			superseded[value.SupersedesRef] = struct{}{}
		}
	}
	items := make([]membershipHead, 0)
	for ref, value := range candidates {
		if _, ok := superseded[ref]; ok {
			continue
		}
		items = append(items, membershipHead{ref: ref, value: value})
	}
	sort.Slice(items, func(left int, right int) bool {
		return items[left].value.ActorDid < items[right].value.ActorDid
	})
	return items, nil
}

func (service *Service) sessionPublicationHead(ctx context.Context, sessionRef string) (sessionPublicationHead, bool, error) {
	head, err := service.reader.GetCurrentHead(ctx, sessionRef, "session-publication")
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return sessionPublicationHead{}, false, nil
		}
		return sessionPublicationHead{}, false, err
	}
	if head == nil {
		return sessionPublicationHead{}, false, nil
	}
	_, publication, err := decodeRunAppend[runmodel.SessionPublication](ctx, service.reader, head.CurrentHeadRef)
	if err != nil {
		return sessionPublicationHead{}, false, err
	}
	return sessionPublicationHead{ref: head.CurrentHeadRef, value: publication}, true, nil
}

func (service *Service) activeSessionPublication(ctx context.Context, sessionRef string, governance bool) (SessionPublicationSummary, bool, error) {
	head, ok, err := service.sessionPublicationHead(ctx, sessionRef)
	if err != nil || !ok {
		return SessionPublicationSummary{}, ok, err
	}
	active, err := service.sessionPublicationHeadIsActive(ctx, head)
	if err != nil {
		return SessionPublicationSummary{}, false, err
	}
	if !active {
		return SessionPublicationSummary{}, false, nil
	}
	return sessionPublicationSummary(head.ref, head.value, governance), true, nil
}

func (service *Service) sessionPublicationHeadIsActive(ctx context.Context, head sessionPublicationHead) (bool, error) {
	if head.value.RetiredAt != nil {
		return false, nil
	}
	_, publication, err := decodeCorePublicationAppend(ctx, service.reader, head.value.PublicationRef)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	if publication.RetiredAt != nil {
		return false, nil
	}
	currentHead, err := service.reader.GetCurrentHead(ctx, publication.SubjectRef, publication.SubjectKind)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	if currentHead == nil || currentHead.CurrentHeadRef != head.value.PublicationRef {
		return false, nil
	}
	return true, nil
}

func (service *Service) appealCasesForSession(ctx context.Context, sessionRef string) ([]appealCaseRecord, error) {
	records, err := service.reader.ListStableByCollection(ctx, runmodel.CollectionAppealCase)
	if err != nil {
		return nil, err
	}
	items := make([]appealCaseRecord, 0)
	for _, record := range records {
		value, err := runmodel.UnmarshalStable[runmodel.AppealCase](record)
		if err != nil {
			return nil, err
		}
		if value.SessionRef != sessionRef {
			continue
		}
		items = append(items, appealCaseRecord{ref: record.Ref, value: value})
	}
	sort.Slice(items, func(left int, right int) bool {
		return items[left].value.OpenedAt.After(items[right].value.OpenedAt)
	})
	return items, nil
}

func (service *Service) appealOnlyCandidate(ctx context.Context, sessionRef string, actorDid string) (AppealCaseSummary, bool, error) {
	items, err := service.ListAppealCases(ctx, actorDid, sessionRef, "participant", "", 100, "")
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return AppealCaseSummary{}, false, nil
		}
		return AppealCaseSummary{}, false, err
	}
	for _, item := range items.Items {
		if item.NextResolverKind != "none" {
			return item, true, nil
		}
	}
	return AppealCaseSummary{}, false, nil
}

func (service *Service) appealSummary(ctx context.Context, ref string, value runmodel.AppealCase, resolverView bool, now time.Time) (AppealCaseSummary, error) {
	blockedReason := value.BlockedReasonCode
	reviewOutcomeSummary := value.ReviewOutcomeSummary
	if value.Status == "controller-review" || value.Status == "recovery-review" {
		approveCount, denyCount, derivedBlockedReason, err := service.appealReviewState(ctx, ref, value, now)
		if err != nil {
			return AppealCaseSummary{}, err
		}
		if derivedBlockedReason != "" {
			blockedReason = derivedBlockedReason
		}
		if resolverView && reviewOutcomeSummary == "" && (approveCount > 0 || denyCount > 0 || blockedReason != "") {
			reviewOutcomeSummary = formatAppealReviewOutcomeSummary(approveCount, denyCount)
		}
	}
	summary := AppealCaseSummary{
		AppealCaseRef:        ref,
		TargetKind:           value.TargetKind,
		TargetRef:            value.TargetRef,
		RequestedOutcomeKind: value.RequestedOutcomeKind,
		Status:               value.Status,
		BlockedReasonCode:    blockedReason,
		NextResolverKind:     appealNextResolverKind(value.Status, blockedReason),
		OpenedAt:             value.OpenedAt,
		ResolvedAt:           value.ResolvedAt,
		HandoffSummary:       value.HandoffSummary,
		ResultSummary:        value.ResultSummary,
	}
	if resolverView {
		summary.ReviewOutcomeSummary = reviewOutcomeSummary
		summary.ControllerReviewDueAt = ptrTimeIfSet(value.ControllerReviewDueAt)
		summary.RecoveryAuthorityRequestID = value.RecoveryAuthorityRequestID
	}
	return summary, nil
}

func (service *Service) appealReviewState(ctx context.Context, appealCaseRef string, appealCase runmodel.AppealCase, now time.Time) (int64, int64, string, error) {
	records, err := service.appealReviewEntriesForCase(ctx, appealCaseRef, appealCase.SessionRef)
	if err != nil {
		return 0, 0, "", err
	}
	latestByActor := latestEffectiveAppealReviewEntries(records)
	approveCount, denyCount := countAppealReviewDecisions(latestByActor, appealCase.Status)
	return approveCount, denyCount, deriveAppealBlockedReason(appealCase, approveCount, denyCount, now), nil
}

func (service *Service) appealReviewEntriesForCase(ctx context.Context, appealCaseRef string, sessionRef string) ([]appealReviewEntryRecord, error) {
	records, err := service.reader.ListAppendByCollection(ctx, runmodel.CollectionAppealReviewEntry)
	if err != nil {
		return nil, err
	}
	items := make([]appealReviewEntryRecord, 0)
	for _, record := range records {
		value, err := runmodel.UnmarshalAppend[runmodel.AppealReviewEntry](record)
		if err != nil {
			return nil, err
		}
		if value.SessionRef != sessionRef || value.AppealCaseRef != appealCaseRef || record.GoverningRef != appealCaseRef {
			continue
		}
		items = append(items, appealReviewEntryRecord{ref: record.Ref, value: value})
	}
	sort.Slice(items, func(left int, right int) bool {
		return items[left].value.ReviewRevision < items[right].value.ReviewRevision
	})
	return items, nil
}

func latestEffectiveAppealReviewEntries(records []appealReviewEntryRecord) map[string]appealReviewEntryRecord {
	superseded := map[string]struct{}{}
	for _, record := range records {
		if record.value.SupersedesRef != "" {
			superseded[record.value.SupersedesRef] = struct{}{}
		}
	}
	latestByActor := map[string]appealReviewEntryRecord{}
	for _, record := range records {
		if _, ok := superseded[record.ref]; ok {
			continue
		}
		latestByActor[appealReviewActorKey(record.value.ReviewPhaseKind, record.value.ReviewerDid)] = record
	}
	return latestByActor
}

func countAppealReviewDecisions(latestByActor map[string]appealReviewEntryRecord, phase string) (int64, int64) {
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

func appealReviewActorKey(phase string, actorDid string) string {
	return phase + "\x00" + actorDid
}

func deriveAppealBlockedReason(appealCase runmodel.AppealCase, approveCount int64, denyCount int64, now time.Time) string {
	if appealCase.BlockedReasonCode != "" {
		return appealCase.BlockedReasonCode
	}
	if int64(len(appealCase.ControllerEligibleDids)) < appealCase.ControllerRequiredCount {
		return "quorum-impossible"
	}
	if appealCase.Status == "controller-review" && !appealCase.ControllerReviewDueAt.IsZero() && !now.Before(appealCase.ControllerReviewDueAt) && approveCount < appealCase.ControllerRequiredCount && denyCount < appealCase.ControllerRequiredCount {
		return "deadline-expired"
	}
	return ""
}

func formatAppealReviewOutcomeSummary(approveCount int64, denyCount int64) string {
	return "approve=" + strconv.FormatInt(approveCount, 10) + " deny=" + strconv.FormatInt(denyCount, 10)
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

func decodeRunAppend[T any](ctx context.Context, reader store.Reader, ref string) (store.AppendRecord, T, error) {
	record, err := reader.GetAppend(ctx, ref)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	value, err := runmodel.UnmarshalAppend[T](record)
	if err != nil {
		var zero T
		return store.AppendRecord{}, zero, err
	}
	return record, value, nil
}

func decodeCorePublicationAppend(ctx context.Context, reader store.Reader, ref string) (store.AppendRecord, coremodel.Publication, error) {
	record, err := reader.GetAppend(ctx, ref)
	if err != nil {
		return store.AppendRecord{}, coremodel.Publication{}, err
	}
	value, err := coremodel.UnmarshalAppend[coremodel.Publication](record)
	if err != nil {
		return store.AppendRecord{}, coremodel.Publication{}, err
	}
	return record, value, nil
}

func sameActor(actorDid string, allowed ...string) bool {
	for _, candidate := range allowed {
		if actorDid == candidate {
			return true
		}
	}
	return false
}

func sessionPublicationSummary(ref string, value runmodel.SessionPublication, governance bool) SessionPublicationSummary {
	summary := SessionPublicationSummary{
		SessionPublicationRef: ref,
		PublicationRef:        value.PublicationRef,
		EntryURL:              value.EntryURL,
		ReplayURL:             value.ReplayURL,
		PreferredSurfaceKind:  value.PreferredSurfaceKind,
		RetiredAt:             value.RetiredAt,
	}
	if governance {
		summary.Surfaces = append([]coremodel.SurfaceDescriptor(nil), value.Surfaces...)
		summary.RetireReasonCode = value.RetireReasonCode
		summary.UpdatedAt = ptrTimeIfSet(value.UpdatedAt)
		summary.PublishedByDid = value.PublishedByDid
		summary.UpdatedByDid = value.UpdatedByDid
	}
	return summary
}

func appealNextResolverKind(status string, blockedReason string) string {
	switch status {
	case "accepted", "denied", "withdrawn":
		return "none"
	case "recovery-review":
		return "recovery-review"
	case "controller-review":
		if blockedReason != "" {
			return "blocked"
		}
		return "controller-review"
	default:
		return "none"
	}
}

func paginate[T any](items []T, limit int, cursor string) (Page[T], error) {
	resolvedLimit := limit
	if resolvedLimit <= 0 {
		resolvedLimit = 50
	}
	if resolvedLimit > 100 {
		resolvedLimit = 100
	}
	offset := 0
	if cursor != "" {
		value, err := strconv.Atoi(cursor)
		if err != nil || value < 0 {
			return Page[T]{}, ErrInvalidInput
		}
		offset = value
	}
	if offset >= len(items) {
		return Page[T]{Items: []T{}}, nil
	}
	end := offset + resolvedLimit
	if end > len(items) {
		end = len(items)
	}
	page := Page[T]{Items: append([]T(nil), items[offset:end]...)}
	if end < len(items) {
		page.Cursor = strconv.Itoa(end)
	}
	return page, nil
}

func toAuthority(value runmodel.SessionAuthority) runauthority.Authority {
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

func sessionSummary(sessionRef string, value runmodel.Session, includeGovernanceDetail bool) SessionSummary {
	summary := SessionSummary{
		SessionRef:           sessionRef,
		Title:                value.Title,
		Visibility:           value.Visibility,
		State:                value.State,
		CampaignRef:          value.CampaignRef,
		RulesetManifestRef:   value.RulesetManifestRef,
		RuleProfileRefs:      append([]string(nil), value.RuleProfileRefs...),
		ScheduledAt:          value.ScheduledAt,
		EndedAt:              value.EndedAt,
		ArchivedAt:           value.ArchivedAt,
		StateChangedAt:       ptrTimeIfSet(value.StateChangedAt),
		StateReasonCode:      value.StateReasonCode,
		VisibilityChangedAt:  ptrTimeIfSet(value.VisibilityChangedAt),
		VisibilityReasonCode: value.VisibilityReasonCode,
	}
	if includeGovernanceDetail {
		summary.StateChangedByDid = value.StateChangedByDid
		summary.VisibilityChangedByDid = value.VisibilityChangedByDid
	}
	return summary
}

func membershipSummary(value runmodel.Membership, includeReason bool) MembershipSummary {
	summary := MembershipSummary{
		ActorDid:           value.ActorDid,
		Role:               value.Role,
		Status:             value.Status,
		StatusChangedAt:    value.StatusChangedAt,
		StatusChangedByDid: value.StatusChangedByDid,
	}
	if includeReason {
		summary.StatusReasonCode = value.StatusReasonCode
	}
	return summary
}

func ptrTimeIfSet(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	copy := value.UTC()
	return &copy
}
