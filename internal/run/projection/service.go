package projection

import (
	"context"
	"errors"
	"net/url"
	"sort"
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
	if ok && current.value.Status == "invited" && sessionModel.State != "ended" && sessionModel.State != "archived" {
		decision.DecisionKind = "join"
		decision.ReasonCode = "pending-invitation"
		decision.RecommendedRoute = route + "/join"
		decision.MembershipRequestID = current.value.RequestID
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

	authorityState := toAuthority(authorityModel)
	return SessionView{
		Session:          sessionSummary(sessionRef, sessionModel, false),
		AuthoritySummary: ParticipantAuthoritySummary{AuthorityRef: sessionModel.AuthorityRef, TransferPhase: authorityModel.TransferPhase, AuthorityHealthKind: authorityState.HealthKind(service.now().UTC()), LeaseState: authorityState.LeaseState(service.now().UTC()), LeaseExpiresAt: authorityModel.LeaseExpiresAt},
		Memberships:      memberships,
		HandoutCount:     0,
		AppealCount:      0,
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
		Memberships: memberships,
	}, nil
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

func sameActor(actorDid string, allowed ...string) bool {
	for _, candidate := range allowed {
		if actorDid == candidate {
			return true
		}
	}
	return false
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
