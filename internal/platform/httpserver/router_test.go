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
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"`+requestID+`"}`, map[string]string{
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
