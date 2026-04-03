package httpserver

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"cerulia/internal/authz"
	"cerulia/internal/platform/database"
)

func TestListSessionPublicationsAllowsAnonymousInPublicMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:gm1", "req-campaign-anon-public")
	publicationRef := publishCampaignAndReturnRef(t, handler, "did:plc:gm1", campaignRef, "req-publication-anon-public")
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-anon-public")
	publishSessionLinkWithoutReplayURL(t, handler, "did:plc:gm1", sessionRef, publicationRef, publicationRef, "", "req-session-link-anon-public")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listSessionPublications?sessionRef="+sessionRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode session publication list: %v", err)
	}
	if len(response.Items) != 1 {
		t.Fatalf("expected one public session publication, got %d", len(response.Items))
	}
	if replayURL, ok := response.Items[0]["replayUrl"].(string); !ok || replayURL != "https://example.test/sessions/public/replay" {
		t.Fatalf("expected replayUrl fallback to be populated, got %v", response.Items[0]["replayUrl"])
	}
	if _, ok := response.Items[0]["publishedByDid"]; ok {
		t.Fatalf("expected public session publication summary to hide governance metadata, got %v", response.Items[0])
	}
}

func TestListSessionPublicationsGovernanceIncludesGovernanceFields(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:gm1", "req-campaign-governance-publication")
	publicationRef := publishCampaignAndReturnRef(t, handler, "did:plc:gm1", campaignRef, "req-publication-governance-publication")
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-governance-publication")
	publishSessionLinkWithoutReplayURL(t, handler, "did:plc:gm1", sessionRef, publicationRef, publicationRef, "", "req-session-link-governance-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listSessionPublications?sessionRef="+sessionRef+"&mode=governance", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:gm1")
	req.Header.Set(authz.HeaderPermissionSets, authz.GovernanceOperator)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected governance status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode governance session publication list: %v", err)
	}
	if len(response.Items) != 1 {
		t.Fatalf("expected one governance session publication, got %d", len(response.Items))
	}
	if _, ok := response.Items[0]["publishedByDid"]; !ok {
		t.Fatalf("expected governance session publication summary to include publishedByDid, got %v", response.Items[0])
	}
	if _, ok := response.Items[0]["updatedAt"]; !ok {
		t.Fatalf("expected governance session publication summary to include updatedAt, got %v", response.Items[0])
	}
	if _, ok := response.Items[0]["surfaces"]; !ok {
		t.Fatalf("expected governance session publication summary to include surfaces, got %v", response.Items[0])
	}
	if replayURL, ok := response.Items[0]["replayUrl"].(string); !ok || replayURL != "https://example.test/sessions/public/replay" {
		t.Fatalf("expected governance session publication summary to include replayUrl fallback, got %v", response.Items[0]["replayUrl"])
	}
}

func TestSessionAccessPreflightIgnoresStaleCarrier(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:gm1", "req-campaign-stale")
	publicationRef := publishCampaignAndReturnRef(t, handler, "did:plc:gm1", campaignRef, "req-publication-stale-1")
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-stale")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-stale")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-stale")
	publishSessionLink(t, handler, "did:plc:gm1", sessionRef, publicationRef, publicationRef, "", "req-session-link-stale")
	_ = publishCampaignVersionWithExpectedHead(t, handler, "did:plc:gm1", campaignRef, publicationRef, "req-publication-stale-2")

	preflightReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionAccessPreflight?sessionRef="+sessionRef, nil)
	preflightRec := httptest.NewRecorder()
	handler.ServeHTTP(preflightRec, preflightReq)

	if preflightRec.Code != http.StatusOK {
		t.Fatalf("expected preflight 200, got %d with %s", preflightRec.Code, preflightRec.Body.String())
	}
	var preflight struct {
		DecisionKind string `json:"decisionKind"`
	}
	if err := json.Unmarshal(preflightRec.Body.Bytes(), &preflight); err != nil {
		t.Fatalf("decode preflight response: %v", err)
	}
	if preflight.DecisionKind != "sign-in" {
		t.Fatalf("expected stale carrier to be ignored, got decision %q", preflight.DecisionKind)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listSessionPublications?sessionRef="+sessionRef+"&mode=public", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	assertXRPCError(t, listRec, http.StatusNotFound, "NotFound")

	sessionViewReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionView?sessionRef="+sessionRef, nil)
	sessionViewReq.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	sessionViewReq.Header.Set(authz.HeaderPermissionSets, authz.SessionParticipant)
	sessionViewRec := httptest.NewRecorder()
	handler.ServeHTTP(sessionViewRec, sessionViewReq)
	if sessionViewRec.Code != http.StatusOK {
		t.Fatalf("expected session view 200, got %d with %s", sessionViewRec.Code, sessionViewRec.Body.String())
	}
	var sessionView struct {
		PublicationCarriers []map[string]any `json:"publicationCarriers"`
	}
	if err := json.Unmarshal(sessionViewRec.Body.Bytes(), &sessionView); err != nil {
		t.Fatalf("decode session view response: %v", err)
	}
	if len(sessionView.PublicationCarriers) != 0 {
		t.Fatalf("expected stale carrier to be hidden from session view, got %v", sessionView.PublicationCarriers)
	}

	governanceViewReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getGovernanceView?sessionRef="+sessionRef, nil)
	governanceViewReq.Header.Set(authz.HeaderActorDID, "did:plc:gm1")
	governanceViewReq.Header.Set(authz.HeaderPermissionSets, authz.GovernanceOperator)
	governanceViewRec := httptest.NewRecorder()
	handler.ServeHTTP(governanceViewRec, governanceViewReq)
	if governanceViewRec.Code != http.StatusOK {
		t.Fatalf("expected governance view 200, got %d with %s", governanceViewRec.Code, governanceViewRec.Body.String())
	}
	var governanceView struct {
		PublicationCarriers []map[string]any `json:"publicationCarriers"`
	}
	if err := json.Unmarshal(governanceViewRec.Body.Bytes(), &governanceView); err != nil {
		t.Fatalf("decode governance view response: %v", err)
	}
	if len(governanceView.PublicationCarriers) != 0 {
		t.Fatalf("expected stale carrier to be hidden from governance view, got %v", governanceView.PublicationCarriers)
	}
}

func TestListAppealCasesResolverViewRejectsOriginatorBundle(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-resolver-view")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-resolver-view")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-resolver-view")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-resolver-view")
	submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-resolver-view", "req-appeal-resolver-view")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=resolver", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	req.Header.Set(authz.HeaderPermissionSets, authz.AppealOriginator)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListAppealCasesResolverViewRejectsOutsiderResolver(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-resolver-outsider")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=resolver", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:outsider1")
	req.Header.Set(authz.HeaderPermissionSets, authz.AppealResolver)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListAppealCasesParticipantViewHidesResolverFields(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-participant-view")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-participant-view")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-participant-view")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-participant-view")
	submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-participant-view", "req-appeal-participant-view")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=participant", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	req.Header.Set(authz.HeaderPermissionSets, authz.AppealOriginator)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("participant appeal list failed: %d %s", rec.Code, rec.Body.String())
	}
	var page struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &page); err != nil {
		t.Fatalf("decode participant appeal list: %v", err)
	}
	if len(page.Items) != 1 {
		t.Fatalf("expected one participant appeal summary, got %d", len(page.Items))
	}
	if _, ok := page.Items[0]["reviewOutcomeSummary"]; ok {
		t.Fatalf("expected participant appeal summary to hide reviewOutcomeSummary, got %v", page.Items[0])
	}
	if _, ok := page.Items[0]["controllerReviewDueAt"]; ok {
		t.Fatalf("expected participant appeal summary to hide controllerReviewDueAt, got %v", page.Items[0])
	}
	if _, ok := page.Items[0]["recoveryAuthorityRequestId"]; ok {
		t.Fatalf("expected participant appeal summary to hide recoveryAuthorityRequestId, got %v", page.Items[0])
	}
}

func TestAppealMutationRoutesRejectUnauthorizedRequests(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	paths := []string{
		"/xrpc/app.cerulia.rpc.reviewAppeal",
		"/xrpc/app.cerulia.rpc.escalateAppeal",
		"/xrpc/app.cerulia.rpc.resolveAppeal",
	}
	for _, path := range paths {
		rec := performJSONRequest(handler, http.MethodPost, path, `{}`, nil)
		assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
	}
}

func TestWithdrawAppealHTTP(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-withdraw-http")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-withdraw-http")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-withdraw-http")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-withdraw-http")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-withdraw-http", "req-appeal-withdraw-http")

	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.withdrawAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":1,"expectedReviewRevision":0,"requestId":"req-withdraw-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:player1",
		authz.HeaderPermissionSets: authz.AppealOriginator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("withdraw appeal failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		CaseRevision *int64 `json:"caseRevision"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode withdraw appeal ack: %v", err)
	}
	if ack.CaseRevision == nil || *ack.CaseRevision != 2 {
		t.Fatalf("expected case revision 2, got %v", ack.CaseRevision)
	}
}

func TestResolveAppealHTTPMembershipAccepted(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-resolve-http")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-resolve-http")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-resolve-http")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-resolve-http")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-resolve-http", "req-appeal-resolve-http")

	reviewRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.reviewAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","reviewPhaseKind":"controller-review","reviewDecisionKind":"approve","expectedCaseRevision":1,"expectedReviewRevision":0,"requestId":"req-review-resolve-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:gm2",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if reviewRec.Code != http.StatusOK {
		t.Fatalf("review appeal failed: %d %s", reviewRec.Code, reviewRec.Body.String())
	}

	resolveRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.resolveAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":1,"expectedReviewRevision":1,"decisionKind":"accepted","resultSummary":"membership を restore した。","requestId":"req-resolve-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:gm2",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if resolveRec.Code != http.StatusOK {
		t.Fatalf("resolve appeal failed: %d %s", resolveRec.Code, resolveRec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
		CaseRevision      *int64   `json:"caseRevision"`
	}
	if err := json.Unmarshal(resolveRec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode resolve appeal ack: %v", err)
	}
	if ack.CaseRevision == nil || *ack.CaseRevision != 2 || len(ack.EmittedRecordRefs) != 2 {
		t.Fatalf("expected case revision 2 and appeal+membership refs, got revision=%v refs=%v", ack.CaseRevision, ack.EmittedRecordRefs)
	}
}

func TestEscalateAppealRejectsNonBlockedCaseHTTP(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-escalate-http")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-escalate-http")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-escalate-http")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-escalate-http")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-escalate-http", "req-appeal-escalate-http")

	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.escalateAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":1,"expectedReviewRevision":0,"requestId":"req-escalate-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:gm2",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("escalate appeal failed unexpectedly: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		ResultKind string `json:"resultKind"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode escalate appeal ack: %v", err)
	}
	if ack.ResultKind != "rejected" {
		t.Fatalf("expected non-blocked escalate to be rejected, got %q", ack.ResultKind)
	}
}

func TestRecoveryReviewAppealFlowAndResolverView(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1"}, "req-session-recovery-http")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-recovery-http")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-recovery-http")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-recovery-http")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-recovery-http", "req-appeal-recovery-http")

	resolverReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=resolver", nil)
	resolverReq.Header.Set(authz.HeaderActorDID, "did:plc:recovery1")
	resolverReq.Header.Set(authz.HeaderPermissionSets, authz.AppealResolver)
	resolverRec := httptest.NewRecorder()
	handler.ServeHTTP(resolverRec, resolverReq)
	if resolverRec.Code != http.StatusOK {
		t.Fatalf("resolver appeal list failed: %d %s", resolverRec.Code, resolverRec.Body.String())
	}
	var resolverPage struct {
		Items []struct {
			BlockedReasonCode     string `json:"blockedReasonCode"`
			ControllerReviewDueAt string `json:"controllerReviewDueAt"`
		} `json:"items"`
	}
	if err := json.Unmarshal(resolverRec.Body.Bytes(), &resolverPage); err != nil {
		t.Fatalf("decode resolver appeal list: %v", err)
	}
	if len(resolverPage.Items) != 1 || resolverPage.Items[0].BlockedReasonCode != "quorum-impossible" || resolverPage.Items[0].ControllerReviewDueAt == "" {
		t.Fatalf("expected resolver-only blocked summary, got %+v", resolverPage.Items)
	}

	escalateRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.escalateAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":1,"expectedReviewRevision":0,"handoffSummary":"controller quorum が組めなかったため recovery review へ移行した。","requestId":"req-escalate-recovery-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if escalateRec.Code != http.StatusOK {
		t.Fatalf("escalate appeal failed: %d %s", escalateRec.Code, escalateRec.Body.String())
	}
	var escalateAck struct {
		CaseRevision *int64 `json:"caseRevision"`
	}
	if err := json.Unmarshal(escalateRec.Body.Bytes(), &escalateAck); err != nil {
		t.Fatalf("decode escalate ack: %v", err)
	}
	if escalateAck.CaseRevision == nil || *escalateAck.CaseRevision != 2 {
		t.Fatalf("expected case revision 2 after escalation, got %v", escalateAck.CaseRevision)
	}

	reviewRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.reviewAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","reviewPhaseKind":"recovery-review","reviewDecisionKind":"approve","expectedCaseRevision":2,"expectedReviewRevision":0,"requestId":"req-review-recovery-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if reviewRec.Code != http.StatusOK {
		t.Fatalf("recovery review appeal failed: %d %s", reviewRec.Code, reviewRec.Body.String())
	}

	resolveRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.resolveAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":2,"expectedReviewRevision":1,"decisionKind":"accepted","resultSummary":"membership を restore した。","requestId":"req-resolve-recovery-http"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if resolveRec.Code != http.StatusOK {
		t.Fatalf("recovery resolve appeal failed: %d %s", resolveRec.Code, resolveRec.Body.String())
	}
	var resolveAck struct {
		CaseRevision      *int64   `json:"caseRevision"`
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(resolveRec.Body.Bytes(), &resolveAck); err != nil {
		t.Fatalf("decode recovery resolve ack: %v", err)
	}
	if resolveAck.CaseRevision == nil || *resolveAck.CaseRevision != 3 || len(resolveAck.EmittedRecordRefs) != 2 {
		t.Fatalf("expected recovery resolve to emit appeal+membership refs, got revision=%v refs=%v", resolveAck.CaseRevision, resolveAck.EmittedRecordRefs)
	}
}

func TestResolverViewShowsLiveAggregateBeforeEscalation(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1", "did:plc:gm2"}, "req-session-live-aggregate")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-live-aggregate")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-live-aggregate")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-live-aggregate")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-live-aggregate", "req-appeal-live-aggregate")

	reviewRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.reviewAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","reviewPhaseKind":"controller-review","reviewDecisionKind":"approve","expectedCaseRevision":1,"expectedReviewRevision":0,"requestId":"req-review-live-aggregate"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:gm2",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if reviewRec.Code != http.StatusOK {
		t.Fatalf("review appeal failed: %d %s", reviewRec.Code, reviewRec.Body.String())
	}

	resolverReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=resolver", nil)
	resolverReq.Header.Set(authz.HeaderActorDID, "did:plc:gm2")
	resolverReq.Header.Set(authz.HeaderPermissionSets, authz.AppealResolver)
	resolverRec := httptest.NewRecorder()
	handler.ServeHTTP(resolverRec, resolverReq)
	if resolverRec.Code != http.StatusOK {
		t.Fatalf("resolver appeal list failed: %d %s", resolverRec.Code, resolverRec.Body.String())
	}
	var resolverPage struct {
		Items []struct {
			ReviewOutcomeSummary string `json:"reviewOutcomeSummary"`
		} `json:"items"`
	}
	if err := json.Unmarshal(resolverRec.Body.Bytes(), &resolverPage); err != nil {
		t.Fatalf("decode resolver appeal list: %v", err)
	}
	if len(resolverPage.Items) != 1 || resolverPage.Items[0].ReviewOutcomeSummary != "approve=1 deny=0" {
		t.Fatalf("expected live aggregate review summary, got %+v", resolverPage.Items)
	}
}

func TestRecoveryReviewAppealDeniedDoesNotEmitCorrection(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraftWithControllers(t, handler, "did:plc:gm1", []string{"did:plc:gm1"}, "req-session-recovery-denied")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-recovery-denied")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-recovery-denied")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-recovery-denied")
	appealCaseRef := submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-recovery-denied", "req-appeal-recovery-denied")

	_ = performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.escalateAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":1,"expectedReviewRevision":0,"requestId":"req-escalate-recovery-denied"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	_ = performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.reviewAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","reviewPhaseKind":"recovery-review","reviewDecisionKind":"deny","expectedCaseRevision":2,"expectedReviewRevision":0,"requestId":"req-review-recovery-denied"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	resolveRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.resolveAppeal", fmt.Sprintf(`{"appealCaseRef":"%s","expectedCaseRevision":2,"expectedReviewRevision":1,"decisionKind":"denied","resultSummary":"membership restore は認めなかった。","requestId":"req-resolve-recovery-denied"}`, appealCaseRef), map[string]string{
		authz.HeaderActorDID:       "did:plc:recovery1",
		authz.HeaderPermissionSets: authz.AppealResolver,
	})
	if resolveRec.Code != http.StatusOK {
		t.Fatalf("recovery resolve appeal denied failed: %d %s", resolveRec.Code, resolveRec.Body.String())
	}
	var resolveAck struct {
		CaseRevision      *int64   `json:"caseRevision"`
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(resolveRec.Body.Bytes(), &resolveAck); err != nil {
		t.Fatalf("decode recovery resolve denied ack: %v", err)
	}
	if resolveAck.CaseRevision == nil || *resolveAck.CaseRevision != 3 || len(resolveAck.EmittedRecordRefs) != 1 {
		t.Fatalf("expected denied recovery resolve to emit only the appeal case ref, got revision=%v refs=%v", resolveAck.CaseRevision, resolveAck.EmittedRecordRefs)
	}
}

func createSessionDraftWithControllers(t *testing.T, handler http.Handler, actorDid string, controllerDids []string, requestID string) string {
	t.Helper()
	quotedControllers := make([]string, 0, len(controllerDids))
	for _, controllerDid := range controllerDids {
		quotedControllers = append(quotedControllers, fmt.Sprintf("\"%s\"", controllerDid))
	}
	body := fmt.Sprintf(`{"sessionId":"session-%s","title":"Session","visibility":"unlisted","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","controllerDids":[%s],"recoveryControllerDids":["did:plc:recovery1"],"transferPolicy":"majority-controllers","expectedRulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","requestId":"%s"}`,
		requestID,
		strings.Join(quotedControllers, ","),
		requestID,
	)
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createSessionDraft", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("create session with controllers failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode create session ack: %v", err)
	}
	return ack.EmittedRecordRefs[0]
}

func publishCampaignVersionWithExpectedHead(t *testing.T, handler http.Handler, actorDid string, campaignRef string, expectedCurrentHeadRef string, requestID string) string {
	t.Helper()
	body := fmt.Sprintf(`{"subjectRef":"%s","subjectKind":"campaign","entryUrl":"https://example.test/campaigns/%s","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://example.test/campaigns/%s","status":"active"}],"expectedCurrentHeadRef":"%s","requestId":"%s"}`,
		campaignRef,
		requestID,
		requestID,
		expectedCurrentHeadRef,
		requestID,
	)
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSubject", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.CorePublicationWriter,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("publish campaign version failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		PublicationRef string `json:"publicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish campaign version ack: %v", err)
	}
	return ack.PublicationRef
}

func publishSessionLinkWithoutReplayURL(t *testing.T, handler http.Handler, actorDid string, sessionRef string, publicationRef string, expectedPublicationHeadRef string, expectedSessionHeadRef string, requestID string) string {
	t.Helper()
	body := `{"sessionRef":"` + sessionRef + `","publicationRef":"` + publicationRef + `","expectedPublicationHeadRef":"` + expectedPublicationHeadRef + `","expectedSessionPublicationHeadRef":"` + expectedSessionHeadRef + `","entryUrl":"https://example.test/sessions/public","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://example.test/sessions/public","status":"active"}],"requestId":"` + requestID + `"}`
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSessionLink", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.PublicationOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("publish session link without replayUrl failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		SessionPublicationRef string `json:"sessionPublicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish session link without replayUrl ack: %v", err)
	}
	return ack.SessionPublicationRef
}
