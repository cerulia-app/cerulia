package httpserver

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cerulia/internal/authz"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
)

func TestHealthz(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response["status"] != "ok" {
		t.Fatalf("expected status ok, got %v", response["status"])
	}
}

func TestReadyzWithoutDatabase(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var response struct {
		Status string            `json:"status"`
		Checks map[string]string `json:"checks"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response.Status != "ready" {
		t.Fatalf("expected ready status, got %q", response.Status)
	}

	if response.Checks["database"] != "disabled" {
		t.Fatalf("expected database check to be disabled, got %q", response.Checks["database"])
	}
}

func TestCreateCampaignRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign"}`, nil)

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestCreateCampaignRejectsWrongBundle(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign"}`, map[string]string{
		authz.HeaderActorDID:       "did:plc:alice",
		authz.HeaderPermissionSets: authz.CoreReader,
	})

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestCampaignPublicViewAllowsAnonymousAfterPublication(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:alice", "req-campaign-public")
	publishCampaign(t, handler, "did:plc:alice", campaignRef, "req-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}

	var response struct {
		Mode               string `json:"mode"`
		PublishedArtifacts []any  `json:"publishedArtifacts"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode campaign view: %v", err)
	}
	if response.Mode != "public" {
		t.Fatalf("expected public mode, got %q", response.Mode)
	}
	if len(response.PublishedArtifacts) != 1 {
		t.Fatalf("expected one published artifact, got %d", len(response.PublishedArtifacts))
	}
}

func TestListPublicationsRejectsIncludeRetiredInPublicMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?mode=public&includeRetired=true", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestSessionAccessPreflightAllowsAnonymous(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-preflight")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionAccessPreflight?sessionRef="+sessionRef, nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		DecisionKind string `json:"decisionKind"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode preflight response: %v", err)
	}
	if response.DecisionKind != "sign-in" {
		t.Fatalf("expected sign-in decision, got %q", response.DecisionKind)
	}
}

func TestSessionViewRequiresJoinedMembership(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-view")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionView?sessionRef="+sessionRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	req.Header.Set(authz.HeaderPermissionSets, authz.SessionParticipant)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestSessionViewReturnsJoinedMembership(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-joined")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-joined")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-joined")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionView?sessionRef="+sessionRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	req.Header.Set(authz.HeaderPermissionSets, authz.SessionParticipant)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Session struct {
			State string `json:"state"`
		} `json:"session"`
		Memberships []map[string]any `json:"memberships"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode session view: %v", err)
	}
	if response.Session.State != "planning" || len(response.Memberships) != 1 {
		t.Fatalf("expected planning state and one membership, got state=%q memberships=%d", response.Session.State, len(response.Memberships))
	}
}

func TestGovernanceViewRejectsWrongBundle(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-governance-view")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getGovernanceView?sessionRef="+sessionRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:gm1")
	req.Header.Set(authz.HeaderPermissionSets, authz.SessionParticipant)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListSessionPublicationsPublicModeAllowsAuthenticatedWithoutBundle(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:gm1", "req-campaign-session-publication")
	publicationRef := publishCampaignAndReturnRef(t, handler, "did:plc:gm1", campaignRef, "req-publication-session-publication")
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-publication")
	publishSessionLink(t, handler, "did:plc:gm1", sessionRef, publicationRef, publicationRef, "", "req-session-link")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listSessionPublications?sessionRef="+sessionRef+"&mode=public", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:reader1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode session publications: %v", err)
	}
	if len(response.Items) != 1 {
		t.Fatalf("expected one session publication, got %d", len(response.Items))
	}
}

func TestSessionAccessPreflightReturnsAppealOnlyForRemovedActor(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-appeal-preflight")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-appeal-preflight")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-appeal-preflight")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-appeal-preflight")
	submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-appeal-preflight", "req-appeal-preflight")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getSessionAccessPreflight?sessionRef="+sessionRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		DecisionKind string `json:"decisionKind"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode preflight response: %v", err)
	}
	if response.DecisionKind != "appeal-only" {
		t.Fatalf("expected appeal-only decision, got %q", response.DecisionKind)
	}
}

func TestListAppealCasesParticipantView(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	sessionRef := createSessionDraft(t, handler, "did:plc:gm1", "req-session-appeal-list")
	inviteSession(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "player", "", "req-invite-appeal-list")
	joinSession(t, handler, "did:plc:player1", sessionRef, "did:plc:player1", "invited", "req-join-appeal-list")
	removedRef := removeMembership(t, handler, "did:plc:gm1", sessionRef, "did:plc:player1", "joined", "req-remove-appeal-list")
	submitAppeal(t, handler, "did:plc:player1", authz.AppealOriginator, sessionRef, removedRef, "req-remove-appeal-list", "req-appeal-list")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listAppealCases?sessionRef="+sessionRef+"&view=participant", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:player1")
	req.Header.Set(authz.HeaderPermissionSets, authz.AppealOriginator)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			Status           string `json:"status"`
			NextResolverKind string `json:"nextResolverKind"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode appeal cases: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].NextResolverKind != "blocked" || response.Items[0].Status != "controller-review" {
		t.Fatalf("expected one blocked controller-review appeal, got %+v", response.Items)
	}
}

func testConfig() config.Config {
	return config.Config{
		AppEnv:          "test",
		HTTPAddr:        ":0",
		PublicBaseURL:   "http://localhost:8080",
		LogLevel:        slog.LevelInfo,
		ShutdownTimeout: 10 * time.Second,
		Database: config.DatabaseConfig{
			PingTimeout: time.Second,
		},
		Blob: config.BlobConfig{
			Backend: "disabled",
		},
	}
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}

func performJSONRequest(handler http.Handler, method string, path string, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func createCampaign(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["`+actorDid+`"],"requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.CoreWriter,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("create campaign failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode create campaign ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one emitted record ref, got %d", len(ack.EmittedRecordRefs))
	}
	return ack.EmittedRecordRefs[0]
}

func createSessionDraft(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createSessionDraft", `{"sessionId":"session-`+requestID+`","title":"Session","visibility":"unlisted","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","controllerDids":["`+actorDid+`"],"recoveryControllerDids":["did:plc:recovery1"],"transferPolicy":"majority-controllers","expectedRulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("create session failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode create session ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) == 0 {
		t.Fatal("expected emitted session ref")
	}
	return ack.EmittedRecordRefs[0]
}

func inviteSession(t *testing.T, handler http.Handler, actorDid string, sessionRef string, inviteeDid string, role string, expectedStatus string, requestID string) {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.inviteSession", `{"sessionRef":"`+sessionRef+`","actorDid":"`+inviteeDid+`","role":"`+role+`","expectedStatus":"`+expectedStatus+`","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("invite session failed: %d %s", rec.Code, rec.Body.String())
	}
}

func joinSession(t *testing.T, handler http.Handler, actorDid string, sessionRef string, joinerDid string, expectedStatus string, requestID string) {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.joinSession", `{"sessionRef":"`+sessionRef+`","actorDid":"`+joinerDid+`","expectedStatus":"`+expectedStatus+`","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.SessionParticipant,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("join session failed: %d %s", rec.Code, rec.Body.String())
	}
}

func publishCampaign(t *testing.T, handler http.Handler, actorDid string, campaignRef string, requestID string) {
	t.Helper()
	body := `{"subjectRef":"` + campaignRef + `","subjectKind":"campaign","entryUrl":"https://example.test/campaigns/public","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://example.test/campaigns/public","status":"active"}],"requestId":"` + requestID + `"}`
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSubject", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.CorePublicationWriter,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("publish campaign failed: %d %s", rec.Code, rec.Body.String())
	}
}

func publishCampaignAndReturnRef(t *testing.T, handler http.Handler, actorDid string, campaignRef string, requestID string) string {
	t.Helper()
	body := `{"subjectRef":"` + campaignRef + `","subjectKind":"campaign","entryUrl":"https://example.test/campaigns/public","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://example.test/campaigns/public","status":"active"}],"requestId":"` + requestID + `"}`
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSubject", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.CorePublicationWriter,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("publish campaign failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		PublicationRef string `json:"publicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish campaign ack: %v", err)
	}
	return ack.PublicationRef
}

func publishSessionLink(t *testing.T, handler http.Handler, actorDid string, sessionRef string, publicationRef string, expectedPublicationHeadRef string, expectedSessionHeadRef string, requestID string) string {
	t.Helper()
	body := `{"sessionRef":"` + sessionRef + `","publicationRef":"` + publicationRef + `","expectedPublicationHeadRef":"` + expectedPublicationHeadRef + `","expectedSessionPublicationHeadRef":"` + expectedSessionHeadRef + `","entryUrl":"https://example.test/sessions/public","replayUrl":"https://example.test/sessions/public/replay","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://example.test/sessions/public","status":"active"}],"requestId":"` + requestID + `"}`
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSessionLink", body, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.PublicationOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("publish session link failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		SessionPublicationRef string `json:"sessionPublicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish session link ack: %v", err)
	}
	return ack.SessionPublicationRef
}

func removeMembership(t *testing.T, handler http.Handler, actorDid string, sessionRef string, targetDid string, expectedStatus string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.moderateMembership", `{"sessionRef":"`+sessionRef+`","actorDid":"`+targetDid+`","expectedStatus":"`+expectedStatus+`","nextStatus":"removed","requestId":"`+requestID+`","reasonCode":"moderation"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: authz.GovernanceOperator,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("remove membership failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode remove membership ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one removed membership ref, got %d", len(ack.EmittedRecordRefs))
	}
	return ack.EmittedRecordRefs[0]
}

func submitAppeal(t *testing.T, handler http.Handler, actorDid string, permissionSet string, sessionRef string, targetRef string, targetRequestID string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.submitAppeal", `{"sessionRef":"`+sessionRef+`","targetKind":"membership","targetRef":"`+targetRef+`","targetRequestId":"`+targetRequestID+`","affectedActorDid":"`+actorDid+`","requestedOutcomeKind":"restore-membership","requestId":"`+requestID+`"}`, map[string]string{
		authz.HeaderActorDID:       actorDid,
		authz.HeaderPermissionSets: permissionSet,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("submit appeal failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode submit appeal ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one appeal case ref, got %d", len(ack.EmittedRecordRefs))
	}
	return ack.EmittedRecordRefs[0]
}

func assertXRPCError(t *testing.T, rec *httptest.ResponseRecorder, statusCode int, shortName string) {
	t.Helper()
	if rec.Code != statusCode {
		t.Fatalf("expected status %d, got %d with %s", statusCode, rec.Code, rec.Body.String())
	}
	var response struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode xrpc error: %v", err)
	}
	if response.Error != shortName {
		t.Fatalf("expected error %q, got %q", shortName, response.Error)
	}
}
