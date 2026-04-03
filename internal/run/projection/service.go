package projection

import (
	"context"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"time"

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
	publicationCarrier, hasCarrier, err := service.currentSessionPublication(ctx, sessionRef)
	if err != nil {
		return AccessPreflight{}, err
	}
	if hasCarrier && publicationCarrier.RetiredAt == nil {
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
	if carrier, ok, err := service.currentSessionPublication(ctx, sessionRef); err != nil {
		return SessionView{}, err
	} else if ok && carrier.RetiredAt == nil {
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
	if carrier, ok, err := service.currentSessionPublication(ctx, sessionRef); err != nil {
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
		summary := appealSummary(record.ref, record.value, true)
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
	resolvedMode := mode
	if resolvedMode == "" {
		resolvedMode = "public"
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
	if current, ok, err := service.currentSessionPublication(ctx, sessionRef); err != nil {
		return Page[SessionPublicationSummary]{}, err
	} else if ok {
		if current.RetiredAt == nil || includeRetired || resolvedMode == "governance" {
			if resolvedMode == "public" && current.RetiredAt != nil {
				return Page[SessionPublicationSummary]{}, store.ErrNotFound
			}
			items = append(items, current)
		}
	}
	if len(items) == 0 {
		return Page[SessionPublicationSummary]{}, store.ErrNotFound
	}
	return paginate(items, limit, cursor)
}

func (service *Service) ListAppealCases(ctx context.Context, actorDid string, sessionRef string, view string, status string, limit int, cursor string) (Page[AppealCaseSummary], error) {
	resolvedView := view
	if resolvedView == "" {
		resolvedView = "participant"
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
			items = append(items, appealSummary(record.ref, record.value, false))
		case "resolver":
			_, sessionModel, err := decodeRunStable[runmodel.Session](ctx, service.reader, sessionRef)
			if err != nil {
				return Page[AppealCaseSummary]{}, err
			}
			_, authorityModel, err := decodeRunStable[runmodel.SessionAuthority](ctx, service.reader, sessionModel.AuthorityRef)
			if err != nil {
				return Page[AppealCaseSummary]{}, err
			}
			if !sameActor(actorDid, authorityModel.ControllerDids...) {
				return Page[AppealCaseSummary]{}, ErrForbidden
			}
			items = append(items, appealSummary(record.ref, record.value, true))
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

func (service *Service) currentSessionPublication(ctx context.Context, sessionRef string) (SessionPublicationSummary, bool, error) {
	head, err := service.reader.GetCurrentHead(ctx, sessionRef, "session-publication")
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return SessionPublicationSummary{}, false, nil
		}
		return SessionPublicationSummary{}, false, err
	}
	if head == nil {
		return SessionPublicationSummary{}, false, nil
	}
	_, publication, err := decodeRunAppend[runmodel.SessionPublication](ctx, service.reader, head.CurrentHeadRef)
	if err != nil {
		return SessionPublicationSummary{}, false, err
	}
	return sessionPublicationSummary(head.CurrentHeadRef, publication, true), true, nil
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
		summary.RetireReasonCode = value.RetireReasonCode
		summary.UpdatedAt = ptrTimeIfSet(value.UpdatedAt)
		summary.PublishedByDid = value.PublishedByDid
		summary.UpdatedByDid = value.UpdatedByDid
	}
	return summary
}

func appealSummary(ref string, value runmodel.AppealCase, resolverView bool) AppealCaseSummary {
	summary := AppealCaseSummary{
		AppealCaseRef:        ref,
		TargetKind:           value.TargetKind,
		TargetRef:            value.TargetRef,
		RequestedOutcomeKind: value.RequestedOutcomeKind,
		Status:               value.Status,
		BlockedReasonCode:    value.BlockedReasonCode,
		NextResolverKind:     appealNextResolverKind(value),
		OpenedAt:             value.OpenedAt,
		ResolvedAt:           value.ResolvedAt,
		HandoffSummary:       value.HandoffSummary,
		ResultSummary:        value.ResultSummary,
	}
	if resolverView {
		summary.ReviewOutcomeSummary = value.ReviewOutcomeSummary
		summary.ControllerReviewDueAt = ptrTimeIfSet(value.ControllerReviewDueAt)
		summary.RecoveryAuthorityRequestID = value.RecoveryAuthorityRequestID
	}
	return summary
}

func appealNextResolverKind(value runmodel.AppealCase) string {
	switch value.Status {
	case "accepted", "denied", "withdrawn":
		return "none"
	case "recovery-review":
		return "recovery-review"
	case "controller-review":
		if value.BlockedReasonCode != "" {
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
