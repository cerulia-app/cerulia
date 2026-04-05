package httpserver

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"cerulia/internal/authz"
	"cerulia/internal/core/command"
	coremodel "cerulia/internal/core/model"
	"cerulia/internal/core/projection"
	"cerulia/internal/ledger"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	"cerulia/internal/store"
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
		t.Fatalf("expected database check disabled, got %q", response.Checks["database"])
	}
}

func TestCreateCampaignRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign"}`, nil)

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestCreateCampaignRejectsWrongBundle(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign"}`, authHeaders("did:plc:alice", authz.CoreReader))

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestCreateCampaignRejectsDirectHeadersWithoutExplicitOptIn(t *testing.T) {
	handler := NewHandler(testLogger(), config.Config{AppEnv: "test"}, database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign-no-opt-in"}`, authHeaders("did:plc:alice", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestCreateCampaignIgnoresUnknownInputFieldForLexiconCompatibility(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"ignoredField":"ignored","requestId":"req-create-campaign"}`, authHeaders("did:plc:alice", authz.CoreWriter))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
}

func TestCreateCampaignRejectsTrailingGarbage(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-create-campaign"}{"extra":true}`, authHeaders("did:plc:alice", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
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

func TestCampaignPublicViewReturnsNotFoundBeforePublication(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:alice", "req-campaign-private")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusNotFound, "NotFound")
}

func TestCampaignViewRejectsMissingCampaignRef(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestCampaignViewRejectsInvalidMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:alice", "req-campaign-invalid-mode")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=invalid", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestCampaignViewRejectsMalformedCampaignRef(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef=at://did:plc:alice/app.invalid/ref&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestGetCharacterHomeRejectsDifferentOwner(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-owner-home")
	if branchRef == "" {
		t.Fatal("expected branch ref")
	}

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome?ownerDid=did:plc:owner1", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestGetCharacterHomeReturnsOwnerView(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-owner-home-success")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome?ownerDid=did:plc:owner1", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		OwnerDid      string `json:"ownerDid"`
		PrimaryBranch struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"primaryBranch"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode character home: %v", err)
	}
	if response.OwnerDid != "did:plc:owner1" || response.PrimaryBranch.CharacterBranchRef != branchRef {
		t.Fatalf("unexpected character home response: %+v", response)
	}
}

func TestGetCharacterHomeUsesActorDidWhenOwnerMissing(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-owner-home-implicit")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		PrimaryBranch struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"primaryBranch"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode implicit character home: %v", err)
	}
	if response.PrimaryBranch.CharacterBranchRef != branchRef {
		t.Fatalf("expected implicit owner view for %q, got %+v", branchRef, response)
	}
}

func TestListCharacterBranchesReturnsOwnerContext(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-list-branches")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCharacterBranches", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			CharacterBranchRef string `json:"characterBranchRef"`
			DisplayName        string `json:"displayName"`
			RulesetNSID        string `json:"rulesetNsid"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode character branches: %v", err)
	}
	if len(response.Items) != 1 {
		t.Fatalf("expected one branch, got %+v", response.Items)
	}
	if response.Items[0].CharacterBranchRef != branchRef || response.Items[0].DisplayName != "Hero" || response.Items[0].RulesetNSID != "app.cerulia.rules.core" {
		t.Fatalf("unexpected branch item: %+v", response.Items[0])
	}
}

func TestListCharacterBranchesRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCharacterBranches", nil))

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestListCharacterBranchesPaginates(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	_ = createBranch(t, handler, "did:plc:owner1", "req-list-branches-page-1")
	_ = createBranch(t, handler, "did:plc:owner1", "req-list-branches-page-2")

	firstReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCharacterBranches?limit=1", nil)
	firstReq.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	firstReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	firstRec := httptest.NewRecorder()
	handler.ServeHTTP(firstRec, firstReq)

	if firstRec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", firstRec.Code, firstRec.Body.String())
	}
	var firstResponse struct {
		Items []struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"items"`
		Cursor string `json:"cursor"`
	}
	if err := json.Unmarshal(firstRec.Body.Bytes(), &firstResponse); err != nil {
		t.Fatalf("decode first page: %v", err)
	}
	if len(firstResponse.Items) != 1 || firstResponse.Cursor == "" {
		t.Fatalf("expected one item and a cursor on the first page, got %+v", firstResponse)
	}

	secondReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCharacterBranches?limit=1&cursor="+firstResponse.Cursor, nil)
	secondReq.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	secondReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	secondRec := httptest.NewRecorder()
	handler.ServeHTTP(secondRec, secondReq)

	if secondRec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", secondRec.Code, secondRec.Body.String())
	}
	var secondResponse struct {
		Items []struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"items"`
		Cursor string `json:"cursor"`
	}
	if err := json.Unmarshal(secondRec.Body.Bytes(), &secondResponse); err != nil {
		t.Fatalf("decode second page: %v", err)
	}
	if len(secondResponse.Items) != 1 || secondResponse.Cursor != "" || secondResponse.Items[0].CharacterBranchRef == firstResponse.Items[0].CharacterBranchRef {
		t.Fatalf("expected a distinct second page item with no further cursor, got %+v", secondResponse)
	}
}

func TestGetCharacterBranchViewReturnsOwnerDetail(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:owner1", "req-branch-view-campaign")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-view")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-branch-view-advancement")
	_ = recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef, "req-branch-view-episode")
	publicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-branch-view-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterBranchView?characterBranchRef="+branchRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Branch struct {
			CharacterBranchRef    string `json:"characterBranchRef"`
			CurrentPublicationRef string `json:"currentPublicationRef"`
		} `json:"branch"`
		RecentEpisodes []any `json:"recentEpisodes"`
		Publications   []struct {
			PublicationRef string `json:"publicationRef"`
		} `json:"publications"`
		Campaign *struct {
			CampaignRef string `json:"campaignRef"`
		} `json:"campaign"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode branch view: %v", err)
	}
	if response.Branch.CharacterBranchRef != branchRef || response.Branch.CurrentPublicationRef != publicationRef {
		t.Fatalf("unexpected branch payload: %+v", response.Branch)
	}
	if len(response.RecentEpisodes) != 1 || len(response.Publications) != 1 || response.Publications[0].PublicationRef != publicationRef {
		t.Fatalf("unexpected branch detail collections: %+v", response)
	}
	if response.Campaign == nil || response.Campaign.CampaignRef != campaignRef {
		t.Fatalf("expected linked campaign %q, got %+v", campaignRef, response.Campaign)
	}
}

func TestGetCharacterBranchViewRejectsDifferentOwner(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-view-forbidden")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterBranchView?characterBranchRef="+branchRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListCampaignsPublicReturnsOnlyCampaignsWithPublicShell(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	publicCampaignRef := createCampaign(t, handler, "did:plc:steward1", "req-public-campaign-list")
	_ = publishCampaign(t, handler, "did:plc:steward1", publicCampaignRef, "req-public-campaign-list-publication")
	_ = createCampaign(t, handler, "did:plc:steward1", "req-private-campaign-list")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCampaigns?mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			CampaignRef            string `json:"campaignRef"`
			CurrentPublicationRef  string `json:"currentPublicationRef"`
			PublishedArtifactCount int    `json:"publishedArtifactCount"`
			RulesetManifestRef     string `json:"rulesetManifestRef"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode campaign list: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].CampaignRef != publicCampaignRef || response.Items[0].CurrentPublicationRef == "" {
		t.Fatalf("unexpected public campaigns response: %+v", response.Items)
	}
	if response.Items[0].PublishedArtifactCount != 1 || response.Items[0].RulesetManifestRef != "" {
		t.Fatalf("expected public campaign redaction and count, got %+v", response.Items[0])
	}
}

func TestListCampaignsOwnerModeRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCampaigns?mode=owner-steward", nil))

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestListCampaignsOwnerModeReturnsStewardFields(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-owner-campaign-list")
	_ = publishCampaign(t, handler, "did:plc:steward1", campaignRef, "req-owner-campaign-list-publication")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-owner-campaign-list-branch")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-owner-campaign-list-advancement")
	episodeRef := recordEpisode(t, handler, "did:plc:steward1", branchRef, campaignRef, advancementRef, "req-owner-campaign-list-episode")
	_ = publishSubject(t, handler, "did:plc:steward1", episodeRef, "character-episode", "req-owner-campaign-list-episode-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCampaigns?mode=owner-steward", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:steward1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			CampaignRef            string `json:"campaignRef"`
			PublishedArtifactCount int    `json:"publishedArtifactCount"`
			RulesetManifestRef     string `json:"rulesetManifestRef"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode owner campaign list: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].CampaignRef != campaignRef {
		t.Fatalf("unexpected owner campaign list: %+v", response.Items)
	}
	if response.Items[0].PublishedArtifactCount != 2 || response.Items[0].RulesetManifestRef == "" {
		t.Fatalf("expected steward fields and artifact count, got %+v", response.Items[0])
	}
}

func TestGetPublicationViewReturnsPublicContext(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:owner1", "req-publication-view-campaign")
	_ = publishCampaign(t, handler, "did:plc:owner1", campaignRef, "req-publication-view-campaign-publication")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-publication-view")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-publication-view-advancement")
	_ = recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef, "req-publication-view-episode")
	publicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-publication-view-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getPublicationView?publicationRef="+publicationRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Publication struct {
			PublicationRef string `json:"publicationRef"`
			SubjectTitle   string `json:"subjectTitle"`
		} `json:"publication"`
		SubjectBranch *struct {
			CharacterBranchRef string `json:"characterBranchRef"`
			ExternalSheetURI   string `json:"externalSheetUri"`
			ImportedFrom       string `json:"importedFrom"`
		} `json:"subjectBranch"`
		Campaign *struct {
			CampaignRef        string `json:"campaignRef"`
			RulesetManifestRef string `json:"rulesetManifestRef"`
		} `json:"campaign"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode publication view: %v", err)
	}
	if response.Publication.PublicationRef != publicationRef || response.Publication.SubjectTitle != "Hero" {
		t.Fatalf("unexpected publication payload: %+v", response.Publication)
	}
	if response.SubjectBranch == nil || response.SubjectBranch.CharacterBranchRef != branchRef {
		t.Fatalf("expected branch context %q, got %+v", branchRef, response.SubjectBranch)
	}
	if response.SubjectBranch.ExternalSheetURI != "" || response.SubjectBranch.ImportedFrom != "" {
		t.Fatalf("expected public branch context to be redacted, got %+v", response.SubjectBranch)
	}
	if response.Campaign == nil || response.Campaign.CampaignRef != campaignRef {
		t.Fatalf("expected campaign context %q, got %+v", campaignRef, response.Campaign)
	}
	if response.Campaign.RulesetManifestRef != "" {
		t.Fatalf("expected public campaign context to hide private fields, got %+v", response.Campaign)
	}
}

func TestGetPublicationViewOwnerModeRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-publication-view-auth")
	publicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-publication-view-auth-publication")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getPublicationView?publicationRef="+publicationRef+"&mode=owner-steward", nil))

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestGetPublicationViewReturnsPublicEpisodeContext(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-public-episode-view-campaign")
	_ = publishCampaign(t, handler, "did:plc:steward1", campaignRef, "req-public-episode-view-campaign-publication")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-public-episode-view-branch")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-public-episode-view-advancement")
	episodeRef := recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef, "req-public-episode-view-episode")
	publicationRef := publishSubject(t, handler, "did:plc:owner1", episodeRef, "character-episode", "req-public-episode-view-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getPublicationView?publicationRef="+publicationRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Publication struct {
			PublicationRef string `json:"publicationRef"`
		} `json:"publication"`
		SubjectBranch *struct {
			CharacterBranchRef   string `json:"characterBranchRef"`
			ExternalSheetURI     string `json:"externalSheetUri"`
			ImportedFrom         string `json:"importedFrom"`
			LatestEpisodeSummary string `json:"latestEpisodeSummary"`
		} `json:"subjectBranch"`
		Campaign *struct {
			CampaignRef        string `json:"campaignRef"`
			RulesetManifestRef string `json:"rulesetManifestRef"`
		} `json:"campaign"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode public episode publication view: %v", err)
	}
	if response.Publication.PublicationRef != publicationRef {
		t.Fatalf("unexpected publication payload: %+v", response.Publication)
	}
	if response.SubjectBranch == nil || response.SubjectBranch.CharacterBranchRef != branchRef || response.SubjectBranch.ExternalSheetURI != "" || response.SubjectBranch.ImportedFrom != "" || response.SubjectBranch.LatestEpisodeSummary != "" {
		t.Fatalf("expected redacted subject branch context, got %+v", response.SubjectBranch)
	}
	if response.Campaign == nil || response.Campaign.CampaignRef != campaignRef || response.Campaign.RulesetManifestRef != "" {
		t.Fatalf("expected redacted public campaign context, got %+v", response.Campaign)
	}
}

func TestGetPublicationViewAllowsEpisodeRecorderAndRejectsThirdParty(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-episode-publication-campaign")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-episode-publication-branch")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-episode-publication-advancement")
	episodeRef := recordEpisode(t, handler, "did:plc:steward1", branchRef, campaignRef, advancementRef, "req-episode-publication-episode")
	publicationRef := publishSubject(t, handler, "did:plc:steward1", episodeRef, "character-episode", "req-episode-publication-publication")

	stewardReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getPublicationView?publicationRef="+publicationRef+"&mode=owner-steward", nil)
	stewardReq.Header.Set(authz.HeaderActorDID, "did:plc:steward1")
	stewardReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	stewardRec := httptest.NewRecorder()
	handler.ServeHTTP(stewardRec, stewardReq)

	if stewardRec.Code != http.StatusOK {
		t.Fatalf("expected recorder status 200, got %d with %s", stewardRec.Code, stewardRec.Body.String())
	}

	thirdPartyReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getPublicationView?publicationRef="+publicationRef+"&mode=owner-steward", nil)
	thirdPartyReq.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	thirdPartyReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	thirdPartyRec := httptest.NewRecorder()
	handler.ServeHTTP(thirdPartyRec, thirdPartyReq)

	assertXRPCError(t, thirdPartyRec, http.StatusForbidden, "Forbidden")
}

func TestListPublicationLibraryIncludesSupersededAndRetiredRows(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-publication-library")
	firstPublicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-publication-library-first")
	secondPublicationRef := publishSubjectWithExpectedHead(t, handler, "did:plc:owner1", branchRef, "character-branch", firstPublicationRef, "req-publication-library-second")
	retiredPublicationRef := retirePublication(t, handler, "did:plc:owner1", secondPublicationRef, "req-publication-library-retired")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublicationLibrary?mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			PublicationRef        string `json:"publicationRef"`
			CurrentPublicationRef string `json:"currentPublicationRef"`
			Status                string `json:"status"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode publication library: %v", err)
	}
	if len(response.Items) != 3 {
		t.Fatalf("expected three publication rows, got %+v", response.Items)
	}
	rows := map[string]struct {
		CurrentPublicationRef string
		Status                string
	}{}
	for _, item := range response.Items {
		rows[item.PublicationRef] = struct {
			CurrentPublicationRef string
			Status                string
		}{CurrentPublicationRef: item.CurrentPublicationRef, Status: item.Status}
	}
	if rows[retiredPublicationRef].CurrentPublicationRef != "" || rows[retiredPublicationRef].Status != "retired" {
		t.Fatalf("unexpected retired head row: %+v", rows[retiredPublicationRef])
	}
	if rows[secondPublicationRef].CurrentPublicationRef != "" || rows[secondPublicationRef].Status != "active" {
		t.Fatalf("unexpected superseded current row: %+v", rows[secondPublicationRef])
	}
	if rows[firstPublicationRef].CurrentPublicationRef != "" || rows[firstPublicationRef].Status != "active" {
		t.Fatalf("unexpected archived original row: %+v", rows[firstPublicationRef])
	}
}

func TestListPublicationLibraryOwnerModeRequiresAuth(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublicationLibrary?mode=owner-steward", nil))

	assertXRPCError(t, rec, http.StatusUnauthorized, "Unauthorized")
}

func TestListPublicationLibraryOwnerModeShowsCurrentHeadContext(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-owner-publication-library")
	firstPublicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-owner-publication-library-first")
	secondPublicationRef := publishSubjectWithExpectedHead(t, handler, "did:plc:owner1", branchRef, "character-branch", firstPublicationRef, "req-owner-publication-library-second")
	retiredPublicationRef := retirePublication(t, handler, "did:plc:owner1", secondPublicationRef, "req-owner-publication-library-retired")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublicationLibrary?mode=owner-steward&subjectRef="+branchRef+"&subjectKind=character-branch", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			PublicationRef        string `json:"publicationRef"`
			CurrentPublicationRef string `json:"currentPublicationRef"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode owner publication library: %v", err)
	}
	if len(response.Items) != 3 {
		t.Fatalf("expected three owner publication rows, got %+v", response.Items)
	}
	for _, item := range response.Items {
		if item.CurrentPublicationRef != retiredPublicationRef {
			t.Fatalf("expected owner current head context %q, got %+v", retiredPublicationRef, response.Items)
		}
	}
}

func TestGetCharacterHomeLinkedCampaignsHidePrivateCampaignFields(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-linked-campaign")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-linked-branch")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-linked-advancement")
	_ = recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef, "req-linked-episode")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome?ownerDid=did:plc:owner1", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		LinkedCampaigns []map[string]any `json:"linkedCampaigns"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode character home linked campaigns: %v", err)
	}
	if len(response.LinkedCampaigns) != 1 {
		t.Fatalf("expected one linked campaign, got %+v", response.LinkedCampaigns)
	}
	if _, ok := response.LinkedCampaigns[0]["rulesetManifestRef"]; ok {
		t.Fatalf("expected linked campaign to hide private rulesetManifestRef, got %+v", response.LinkedCampaigns[0])
	}
	if _, ok := response.LinkedCampaigns[0]["rulesetNsid"]; ok {
		t.Fatalf("expected linked campaign to hide private rulesetNsid, got %+v", response.LinkedCampaigns[0])
	}
}

func TestGetCharacterHomeShowsCampaignStewardConversionAuthorityKind(t *testing.T) {
	handler := newSeededCoreHandler(t)
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-conversion-campaign")
	sourceSheetRef := importSheet(t, handler, "did:plc:owner1", "req-conversion-source-sheet")
	targetSheetRef := importSheet(t, handler, "did:plc:owner1", "req-conversion-target-sheet")
	targetBranchRef := createBranchFromSheet(t, handler, "did:plc:owner1", targetSheetRef, "req-conversion-target-branch")
	recordConversion(t, handler, "did:plc:steward1", map[string]any{
		"sourceSheetRef":                 sourceSheetRef,
		"sourceSheetVersion":             1,
		"sourceRulesetManifestRef":       "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		"sourceEffectiveRuleProfileRefs": []string{},
		"targetSheetRef":                 targetSheetRef,
		"targetSheetVersion":             1,
		"targetBranchRef":                targetBranchRef,
		"targetCampaignRef":              campaignRef,
		"targetRulesetManifestRef":       "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		"targetEffectiveRuleProfileRefs": []string{},
		"conversionContractRef":          "https://cerulia.example/contracts/1",
		"conversionContractVersion":      1,
		"convertedByDid":                 "did:plc:steward1",
		"convertedAt":                    "2026-04-03T00:00:00Z",
		"requestId":                      "req-conversion-campaign-steward",
	})

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome?ownerDid=did:plc:owner1", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		RecentConversions []struct {
			AuthorityKind string `json:"authorityKind"`
		} `json:"recentConversions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode character home conversions: %v", err)
	}
	if len(response.RecentConversions) != 1 || response.RecentConversions[0].AuthorityKind != "campaign-steward" {
		t.Fatalf("expected campaign-steward authority kind, got %+v", response.RecentConversions)
	}
}

func TestGetCharacterHomeUsesFallbackPrimaryForRecentAdvancementRefs(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	activeSheetRef := importSheet(t, handler, "did:plc:owner1", "req-primary-active-sheet")
	activeBranchRef := createBranchFromSheet(t, handler, "did:plc:owner1", activeSheetRef, "req-primary-active-branch")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", activeBranchRef, "req-primary-active-advancement")
	retiredSheetRef := importSheet(t, handler, "did:plc:owner1", "req-primary-retired-sheet")
	retiredBranchRef := createBranchFromSheet(t, handler, "did:plc:owner1", retiredSheetRef, "req-primary-retired-branch")
	retireBranch(t, handler, "did:plc:owner1", retiredBranchRef, "req-primary-retired-branch-retire")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCharacterHome?ownerDid=did:plc:owner1", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		PrimaryBranch struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"primaryBranch"`
		RecentAdvancementRefs []string `json:"recentAdvancementRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode character home primary fallback: %v", err)
	}
	if response.PrimaryBranch.CharacterBranchRef != activeBranchRef {
		t.Fatalf("expected active branch to become fallback primary, got %+v", response.PrimaryBranch)
	}
	if len(response.RecentAdvancementRefs) != 1 || response.RecentAdvancementRefs[0] != advancementRef {
		t.Fatalf("expected advancement refs to follow fallback primary, got %+v", response.RecentAdvancementRefs)
	}
}

func TestCampaignViewIncludesOwnerAuthoredEpisodeContinuity(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-campaign-continuity")
	publishCampaign(t, handler, "did:plc:steward1", campaignRef, "req-publish-campaign-continuity")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-continuity")
	advancementRef1 := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-advancement-continuity-1")
	episodeRef1 := recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef1, "req-episode-continuity-1")
	publishSubject(t, handler, "did:plc:owner1", episodeRef1, "character-episode", "req-publish-episode-continuity-1")
	advancementRef2 := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-advancement-continuity-2")
	episodeRef2 := recordEpisodeWithSupersedes(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef2, episodeRef1, "req-episode-continuity-2")
	publishSubject(t, handler, "did:plc:owner1", episodeRef2, "character-episode", "req-publish-episode-continuity-2")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		PublishedArtifacts []struct {
			SubjectRef string `json:"subjectRef"`
		} `json:"publishedArtifacts"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode public campaign view: %v", err)
	}
	if len(response.PublishedArtifacts) != 2 {
		t.Fatalf("expected campaign and latest episode publication, got %+v", response.PublishedArtifacts)
	}
	foundCampaign := false
	foundEpisode := false
	for _, item := range response.PublishedArtifacts {
		if item.SubjectRef == campaignRef {
			foundCampaign = true
		}
		if item.SubjectRef == episodeRef2 {
			foundEpisode = true
		}
	}
	if !foundCampaign || !foundEpisode {
		t.Fatalf("expected campaign and latest episode subjects, got %+v", response.PublishedArtifacts)
	}

	ownerStewardReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=owner-steward", nil)
	ownerStewardReq.Header.Set(authz.HeaderActorDID, "did:plc:steward1")
	ownerStewardReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	ownerStewardRec := httptest.NewRecorder()
	handler.ServeHTTP(ownerStewardRec, ownerStewardReq)

	if ownerStewardRec.Code != http.StatusOK {
		t.Fatalf("expected steward status 200, got %d with %s", ownerStewardRec.Code, ownerStewardRec.Body.String())
	}
	var ownerStewardResponse struct {
		RecentContinuity []struct {
			CharacterEpisodeRef string `json:"characterEpisodeRef"`
		} `json:"recentContinuity"`
		RuleProvenance struct {
			SharedRuleProfileRefs []string `json:"sharedRuleProfileRefs"`
		} `json:"ruleProvenance"`
		ActiveBranches []struct {
			CharacterBranchRef string `json:"characterBranchRef"`
		} `json:"activeBranches"`
		ArchivedCounts struct {
			Episodes int `json:"episodes"`
		} `json:"archivedCounts"`
	}
	if err := json.Unmarshal(ownerStewardRec.Body.Bytes(), &ownerStewardResponse); err != nil {
		t.Fatalf("decode steward campaign view: %v", err)
	}
	if len(ownerStewardResponse.RecentContinuity) != 1 || ownerStewardResponse.RecentContinuity[0].CharacterEpisodeRef != episodeRef2 {
		t.Fatalf("unexpected continuity response: %+v", ownerStewardResponse.RecentContinuity)
	}
	if len(ownerStewardResponse.ActiveBranches) != 1 || ownerStewardResponse.ActiveBranches[0].CharacterBranchRef != branchRef {
		t.Fatalf("unexpected active branches: %+v", ownerStewardResponse.ActiveBranches)
	}
	if ownerStewardResponse.ArchivedCounts.Episodes != 1 {
		t.Fatalf("expected one archived episode, got %+v", ownerStewardResponse.ArchivedCounts)
	}
	if ownerStewardResponse.RuleProvenance.SharedRuleProfileRefs == nil {
		t.Fatalf("expected empty sharedRuleProfileRefs slice, got nil")
	}
}

func TestCampaignViewRejectsNonStewardOwnerMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-campaign-forbidden")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=owner-steward", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestCampaignPublicViewRequiresCampaignPublication(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:steward1", "req-campaign-no-publication")
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-no-publication")
	advancementRef := recordAdvancement(t, handler, "did:plc:owner1", branchRef, "req-advancement-no-publication")
	episodeRef := recordEpisode(t, handler, "did:plc:owner1", branchRef, campaignRef, advancementRef, "req-episode-no-publication")
	publishSubject(t, handler, "did:plc:owner1", episodeRef, "character-episode", "req-publish-episode-no-publication")

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusNotFound, "NotFound")
}

func TestListPublicationsRejectsIncludeRetiredInPublicMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?mode=public&includeRetired=true", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestListPublicationsRejectsInvalidMode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?mode=invalid", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestListReuseGrantsRejectsInvalidState(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-invalid-state")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listReuseGrants?characterBranchRef="+branchRef+"&state=invalid", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestListCharacterEpisodesRejectsNonOwner(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-non-owner-episodes")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listCharacterEpisodes?characterBranchRef="+branchRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListReuseGrantsRejectsNonOwner(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-branch-non-owner-reuse")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listReuseGrants?characterBranchRef="+branchRef, nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListPublicationsRejectsInvalidSubjectKind(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectKind=invalid", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestListPublicationsRejectsMalformedSubjectRef(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef=at://did:plc:alice/app.invalid/ref", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestListPublicationsRejectsUnauthorizedSubjectRef(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-publications-forbidden")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef="+branchRef+"&mode=owner-steward", nil)
	req.Header.Set(authz.HeaderActorDID, "did:plc:owner2")
	req.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusForbidden, "Forbidden")
}

func TestListPublicationsReturnsEmptyPageWhenSubjectHasNoPublications(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	campaignRef := createCampaign(t, handler, "did:plc:alice", "req-campaign-empty-publications")
	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode empty publications page: %v", err)
	}
	if len(response.Items) != 0 {
		t.Fatalf("expected empty items, got %+v", response.Items)
	}
}

func TestListPublicationsOwnerModeRequiresIncludeRetiredOptIn(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	branchRef := createBranch(t, handler, "did:plc:owner1", "req-publications-retired-branch")
	publicationRef := publishSubject(t, handler, "did:plc:owner1", branchRef, "character-branch", "req-publications-retired")
	retiredRef := retirePublication(t, handler, "did:plc:owner1", publicationRef, "req-publications-retired-final")

	defaultReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef="+branchRef+"&mode=owner-steward", nil)
	defaultReq.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	defaultReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	defaultRec := httptest.NewRecorder()
	handler.ServeHTTP(defaultRec, defaultReq)
	if defaultRec.Code != http.StatusOK {
		t.Fatalf("expected default list status 200, got %d with %s", defaultRec.Code, defaultRec.Body.String())
	}
	var defaultResponse struct {
		Items []any `json:"items"`
	}
	if err := json.Unmarshal(defaultRec.Body.Bytes(), &defaultResponse); err != nil {
		t.Fatalf("decode default publications response: %v", err)
	}
	if len(defaultResponse.Items) != 0 {
		t.Fatalf("expected retired current head to be hidden without includeRetired, got %+v", defaultResponse.Items)
	}

	includeReq := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef="+branchRef+"&mode=owner-steward&includeRetired=true", nil)
	includeReq.Header.Set(authz.HeaderActorDID, "did:plc:owner1")
	includeReq.Header.Set(authz.HeaderPermissionSets, authz.CoreReader)
	includeRec := httptest.NewRecorder()
	handler.ServeHTTP(includeRec, includeReq)
	if includeRec.Code != http.StatusOK {
		t.Fatalf("expected includeRetired status 200, got %d with %s", includeRec.Code, includeRec.Body.String())
	}
	var includeResponse struct {
		Items []struct {
			PublicationRef string `json:"publicationRef"`
			Status         string `json:"status"`
		} `json:"items"`
	}
	if err := json.Unmarshal(includeRec.Body.Bytes(), &includeResponse); err != nil {
		t.Fatalf("decode includeRetired publications response: %v", err)
	}
	if len(includeResponse.Items) != 1 || includeResponse.Items[0].PublicationRef != retiredRef || includeResponse.Items[0].Status != "retired" {
		t.Fatalf("expected retired current head only when includeRetired is set, got %+v", includeResponse.Items)
	}
}

func TestListPublicationsPublicModeSkipsMalformedCurrentHead(t *testing.T) {
	dataStore := store.NewMemoryStore()
	handler := newQueryHandler(t, dataStore)
	subjectRef := store.BuildRef("did:plc:steward1", coremodel.CollectionCampaign, "campaign-malformed-publication")
	seedPublicationCurrentHead(t, dataStore, "did:plc:steward1", subjectRef, "campaign", "publication-malformed", coremodel.Publication{
		SubjectRef:           subjectRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://cerulia.example/publications/malformed",
		PreferredSurfaceKind: "app-card",
		Status:               "active",
		PublishedByDid:       "did:plc:steward1",
		PublishedAt:          time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
		RequestID:            "seed-malformed-publication",
		Surfaces: []coremodel.SurfaceDescriptor{{
			SurfaceKind: "app-card",
			PurposeKind: "discovery",
			SurfaceURI:  "https://cerulia.example/publications/malformed",
			Status:      "active",
		}},
	})

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublications?subjectRef="+subjectRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []any `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode malformed public publications response: %v", err)
	}
	if len(response.Items) != 0 {
		t.Fatalf("expected malformed current head to be hidden from public mode, got %+v", response.Items)
	}
}

func TestListPublicationLibraryPublicModeSkipsMalformedRows(t *testing.T) {
	dataStore := store.NewMemoryStore()
	handler := newQueryHandler(t, dataStore)
	validSubjectRef := store.BuildRef("did:plc:steward1", coremodel.CollectionCampaign, "campaign-valid-library")
	seedCampaignRecord(t, dataStore, "did:plc:steward1", "campaign-valid-library", coremodel.Campaign{
		CampaignID:             "campaign-valid-library",
		Title:                  "Valid Campaign",
		Visibility:             "public",
		RulesetNSID:            "app.cerulia.rules.core",
		RulesetManifestRef:     "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		DefaultReusePolicyKind: "same-campaign-default",
		StewardDids:            []string{"did:plc:steward1"},
		Revision:               1,
		RequestID:              "seed-valid-library-campaign",
		CreatedAt:              time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
		UpdatedAt:              time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
	})
	validPublicationRef := seedPublicationCurrentHead(t, dataStore, "did:plc:steward1", validSubjectRef, "campaign", "publication-valid-library", coremodel.Publication{
		SubjectRef:           validSubjectRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://cerulia.example/publications/valid-library",
		PreferredSurfaceKind: "app-card",
		Status:               "active",
		PublishedByDid:       "did:plc:steward1",
		PublishedAt:          time.Date(2026, time.April, 4, 1, 0, 0, 0, time.UTC),
		RequestID:            "seed-valid-library-publication",
		Surfaces: []coremodel.SurfaceDescriptor{{
			SurfaceKind: "app-card",
			PurposeKind: "stable-entry",
			SurfaceURI:  "https://cerulia.example/publications/valid-library",
			Status:      "active",
		}},
	})
	subjectRef := store.BuildRef("did:plc:steward1", coremodel.CollectionCampaign, "campaign-malformed-library")
	seedPublicationCurrentHead(t, dataStore, "did:plc:steward1", subjectRef, "campaign", "publication-malformed-library", coremodel.Publication{
		SubjectRef:           subjectRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://cerulia.example/publications/malformed-library",
		PreferredSurfaceKind: "app-card",
		Status:               "active",
		PublishedByDid:       "did:plc:steward1",
		PublishedAt:          time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
		RequestID:            "seed-malformed-library-publication",
		Surfaces: []coremodel.SurfaceDescriptor{{
			SurfaceKind: "app-card",
			PurposeKind: "discovery",
			SurfaceURI:  "https://cerulia.example/publications/malformed-library",
			Status:      "active",
		}},
	})

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.listPublicationLibrary?mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d with %s", rec.Code, rec.Body.String())
	}
	var response struct {
		Items []struct {
			PublicationRef string `json:"publicationRef"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode malformed public publication library response: %v", err)
	}
	if len(response.Items) != 1 || response.Items[0].PublicationRef != validPublicationRef {
		t.Fatalf("expected valid publication to remain while malformed rows are hidden, got %+v", response.Items)
	}
}

func TestCampaignPublicViewFailsClosedForMalformedCampaignPublication(t *testing.T) {
	dataStore := store.NewMemoryStore()
	seedCampaignRecord(t, dataStore, "did:plc:steward1", "campaign-public-malformed", coremodel.Campaign{
		CampaignID:             "campaign-public-malformed",
		Title:                  "Malformed Campaign",
		Visibility:             "public",
		RulesetNSID:            "app.cerulia.rules.core",
		RulesetManifestRef:     "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		DefaultReusePolicyKind: "same-campaign-default",
		StewardDids:            []string{"did:plc:steward1"},
		Revision:               1,
		RequestID:              "seed-campaign-public-malformed",
		CreatedAt:              time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
		UpdatedAt:              time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
	})
	campaignRef := store.BuildRef("did:plc:steward1", coremodel.CollectionCampaign, "campaign-public-malformed")
	seedPublicationCurrentHead(t, dataStore, "did:plc:steward1", campaignRef, "campaign", "campaign-public-malformed-publication", coremodel.Publication{
		SubjectRef:           campaignRef,
		SubjectKind:          "campaign",
		EntryURL:             "https://cerulia.example/publications/malformed-campaign",
		PreferredSurfaceKind: "app-card",
		Status:               "active",
		PublishedByDid:       "did:plc:steward1",
		PublishedAt:          time.Date(2026, time.April, 4, 0, 0, 0, 0, time.UTC),
		RequestID:            "seed-campaign-public-malformed-publication",
		Surfaces: []coremodel.SurfaceDescriptor{{
			SurfaceKind: "app-card",
			PurposeKind: "discovery",
			SurfaceURI:  "https://cerulia.example/publications/malformed-campaign",
			Status:      "active",
		}},
	})
	handler := newQueryHandler(t, dataStore)

	req := httptest.NewRequest(http.MethodGet, "/xrpc/app.cerulia.rpc.getCampaignView?campaignRef="+campaignRef+"&mode=public", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assertXRPCError(t, rec, http.StatusNotFound, "NotFound")
}

func TestImportCharacterSheetRejectsMissingDisplayName(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.importCharacterSheet", `{"ownerDid":"did:plc:owner1","rulesetNsid":"app.cerulia.rules.core","requestId":"req-missing-display-name"}`, authHeaders("did:plc:owner1", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestCreateCharacterBranchRejectsMissingBranchKind(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCharacterBranch", `{"ownerDid":"did:plc:owner1","baseSheetRef":"at://did:plc:owner1/app.cerulia.core.characterSheet/sheet-1","branchLabel":"Main","requestId":"req-missing-branch-kind"}`, authHeaders("did:plc:owner1", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestRecordCharacterEpisodeRejectsMissingOutcomeSummary(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterEpisode", `{"characterBranchRef":"at://did:plc:owner1/app.cerulia.core.characterBranch/branch-1","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","effectiveRuleProfileRefs":[],"advancementRefs":[],"recordedByDid":"did:plc:owner1","requestId":"req-missing-outcome-summary"}`, authHeaders("did:plc:owner1", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestRecordCharacterConversionRejectsMissingContractRef(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterConversion", `{"sourceSheetRef":"at://did:plc:owner1/app.cerulia.core.characterSheet/source-1","sourceSheetVersion":1,"sourceRulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","sourceEffectiveRuleProfileRefs":[],"targetSheetRef":"at://did:plc:owner1/app.cerulia.core.characterSheet/target-1","targetSheetVersion":1,"targetBranchRef":"at://did:plc:owner1/app.cerulia.core.characterBranch/branch-1","targetRulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","targetEffectiveRuleProfileRefs":[],"conversionContractVersion":1,"convertedByDid":"did:plc:owner1","convertedAt":"2026-04-03T00:00:00Z","requestId":"req-missing-contract-ref"}`, authHeaders("did:plc:owner1", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestRecordCharacterConversionRejectsReuseGrantWithoutSourceBranch(t *testing.T) {
	handler := newSeededCoreHandler(t)
	sourceCampaignRef := createCampaign(t, handler, "did:plc:owner1", "req-conversion-grant-campaign")
	sourceSheetRef := importSheet(t, handler, "did:plc:owner1", "req-conversion-grant-source-sheet")
	sourceBranchRef := createBranchFromSheet(t, handler, "did:plc:owner1", sourceSheetRef, "req-conversion-grant-source-branch")
	grantRef := grantReuse(t, handler, "did:plc:owner1", sourceBranchRef, sourceCampaignRef, "req-conversion-grant")
	targetSheetRef := importSheet(t, handler, "did:plc:owner1", "req-conversion-grant-target-sheet")
	targetBranchRef := createBranchFromSheet(t, handler, "did:plc:owner1", targetSheetRef, "req-conversion-grant-target-branch")

	body, err := json.Marshal(map[string]any{
		"sourceSheetRef":                 sourceSheetRef,
		"sourceSheetVersion":             1,
		"sourceRulesetManifestRef":       "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		"sourceEffectiveRuleProfileRefs": []string{},
		"targetSheetRef":                 targetSheetRef,
		"targetSheetVersion":             1,
		"targetBranchRef":                targetBranchRef,
		"targetRulesetManifestRef":       "at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1",
		"targetEffectiveRuleProfileRefs": []string{},
		"conversionContractRef":          "https://cerulia.example/contracts/1",
		"conversionContractVersion":      1,
		"reuseGrantRef":                  grantRef,
		"convertedByDid":                 "did:plc:owner1",
		"convertedAt":                    "2026-04-03T00:00:00Z",
		"requestId":                      "req-conversion-grant-missing-source-branch",
	})
	if err != nil {
		t.Fatalf("marshal conversion payload: %v", err)
	}
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterConversion", string(body), authHeaders("did:plc:owner1", authz.CoreWriter))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func TestRevokeReuseRejectsMissingReasonCode(t *testing.T) {
	handler := NewHandler(testLogger(), testConfig(), database.Disabled())
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.revokeReuse", `{"reuseGrantRef":"at://did:plc:owner1/app.cerulia.core.reuseGrant/reuse-1","requestId":"req-missing-revoke-reason"}`, authHeaders("did:plc:owner1", authz.ReuseOperator))

	assertXRPCError(t, rec, http.StatusBadRequest, "InvalidRequest")
}

func authHeaders(actorDid string, bundles ...string) map[string]string {
	headers := map[string]string{authz.HeaderActorDID: actorDid}
	if len(bundles) > 0 {
		headers[authz.HeaderPermissionSets] = strings.Join(bundles, ",")
	}
	return headers
}

func performJSONRequest(handler http.Handler, method string, path string, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func assertXRPCError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantError string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("expected status %d, got %d with %s", wantStatus, rec.Code, rec.Body.String())
	}
	var response struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if response.Error != wantError {
		t.Fatalf("expected error %q, got %q", wantError, response.Error)
	}
}

func createCampaign(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCampaign", `{"title":"Campaign","visibility":"unlisted","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["`+actorDid+`"],"requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CoreWriter))
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
		t.Fatalf("expected one emitted ref, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0]
}

func createBranch(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	baseSheetRef := importSheet(t, handler, actorDid, requestID+"-sheet")
	return createBranchFromSheet(t, handler, actorDid, baseSheetRef, requestID)
}

func importSheet(t *testing.T, handler http.Handler, actorDid string, requestID string) string {
	t.Helper()
	sheetRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.importCharacterSheet", `{"ownerDid":"`+actorDid+`","rulesetNsid":"app.cerulia.rules.core","displayName":"Hero","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CoreWriter))
	if sheetRec.Code != http.StatusOK {
		t.Fatalf("import sheet failed: %d %s", sheetRec.Code, sheetRec.Body.String())
	}
	var sheetAck struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(sheetRec.Body.Bytes(), &sheetAck); err != nil {
		t.Fatalf("decode import sheet ack: %v", err)
	}
	if len(sheetAck.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one sheet ref, got %v", sheetAck.EmittedRecordRefs)
	}
	return sheetAck.EmittedRecordRefs[0]
}

func createBranchFromSheet(t *testing.T, handler http.Handler, actorDid string, baseSheetRef string, requestID string) string {
	t.Helper()
	branchRec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.createCharacterBranch", `{"ownerDid":"`+actorDid+`","baseSheetRef":"`+baseSheetRef+`","branchKind":"campaign-fork","branchLabel":"Main","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CoreWriter))
	if branchRec.Code != http.StatusOK {
		t.Fatalf("create branch failed: %d %s", branchRec.Code, branchRec.Body.String())
	}
	var branchAck struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(branchRec.Body.Bytes(), &branchAck); err != nil {
		t.Fatalf("decode create branch ack: %v", err)
	}
	if len(branchAck.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one branch ref, got %v", branchAck.EmittedRecordRefs)
	}
	return branchAck.EmittedRecordRefs[0]
}

func publishCampaign(t *testing.T, handler http.Handler, actorDid string, campaignRef string, requestID string) string {
	t.Helper()
	return publishSubject(t, handler, actorDid, campaignRef, "campaign", requestID)
}

func publishSubject(t *testing.T, handler http.Handler, actorDid string, subjectRef string, subjectKind string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSubject", `{"subjectRef":"`+subjectRef+`","subjectKind":"`+subjectKind+`","entryUrl":"https://cerulia.example/publications/`+requestID+`","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://cerulia.example/publications/`+requestID+`","status":"active"}],"requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CorePublicationWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("publish subject failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		PublicationRef string `json:"publicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish ack: %v", err)
	}
	if ack.PublicationRef == "" {
		t.Fatal("expected publicationRef in ack")
	}
	return ack.PublicationRef
}

func publishSubjectWithExpectedHead(t *testing.T, handler http.Handler, actorDid string, subjectRef string, subjectKind string, expectedCurrentHeadRef string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.publishSubject", `{"subjectRef":"`+subjectRef+`","subjectKind":"`+subjectKind+`","entryUrl":"https://cerulia.example/publications/`+requestID+`","preferredSurfaceKind":"app-card","surfaces":[{"surfaceKind":"app-card","purposeKind":"stable-entry","surfaceUri":"https://cerulia.example/publications/`+requestID+`","status":"active"}],"expectedCurrentHeadRef":"`+expectedCurrentHeadRef+`","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CorePublicationWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("publish subject with expected head failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		PublicationRef string `json:"publicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode publish ack: %v", err)
	}
	if ack.PublicationRef == "" {
		t.Fatal("expected publicationRef in ack")
	}
	return ack.PublicationRef
}

func recordAdvancement(t *testing.T, handler http.Handler, actorDid string, branchRef string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterAdvancement", `{"characterBranchRef":"`+branchRef+`","advancementKind":"milestone","deltaPayloadRef":"https://cerulia.example/payloads/`+requestID+`.json","approvedByDid":"`+actorDid+`","effectiveAt":"2026-04-03T00:00:00Z","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CoreWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("record advancement failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode advancement ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one advancement ref, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0]
}

func recordEpisode(t *testing.T, handler http.Handler, actorDid string, branchRef string, campaignRef string, advancementRef string, requestID string) string {
	t.Helper()
	return recordEpisodeWithSupersedes(t, handler, actorDid, branchRef, campaignRef, advancementRef, "", requestID)
}

func recordEpisodeWithSupersedes(t *testing.T, handler http.Handler, actorDid string, branchRef string, campaignRef string, advancementRef string, supersedesRef string, requestID string) string {
	t.Helper()
	body := `{"characterBranchRef":"` + branchRef + `","campaignRef":"` + campaignRef + `","scenarioLabel":"Session","rulesetManifestRef":"at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1","effectiveRuleProfileRefs":[],"outcomeSummary":"Summary","advancementRefs":["` + advancementRef + `"],"recordedByDid":"` + actorDid + `"`
	if supersedesRef != "" {
		body += `,"supersedesRef":"` + supersedesRef + `"`
	}
	body += `,"requestId":"` + requestID + `"}`
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterEpisode", body, authHeaders(actorDid, authz.CoreWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("record episode failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode episode ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one episode ref, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0]
}

func recordConversion(t *testing.T, handler http.Handler, actorDid string, payload map[string]any) string {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal conversion payload: %v", err)
	}
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.recordCharacterConversion", string(body), authHeaders(actorDid, authz.CoreWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("record conversion failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode conversion ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one conversion ref, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0]
}

func retireBranch(t *testing.T, handler http.Handler, actorDid string, branchRef string, requestID string) {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.retireCharacterBranch", `{"characterBranchRef":"`+branchRef+`","expectedRevision":1,"requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CoreWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("retire branch failed: %d %s", rec.Code, rec.Body.String())
	}
}

func grantReuse(t *testing.T, handler http.Handler, actorDid string, branchRef string, sourceCampaignRef string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.grantReuse", `{"characterBranchRef":"`+branchRef+`","sourceCampaignRef":"`+sourceCampaignRef+`","targetKind":"actor","targetDid":"`+actorDid+`","reuseMode":"fork-only","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.ReuseOperator))
	if rec.Code != http.StatusOK {
		t.Fatalf("grant reuse failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		EmittedRecordRefs []string `json:"emittedRecordRefs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode grant reuse ack: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one reuse grant ref, got %v", ack.EmittedRecordRefs)
	}
	return ack.EmittedRecordRefs[0]
}

func retirePublication(t *testing.T, handler http.Handler, actorDid string, publicationRef string, requestID string) string {
	t.Helper()
	rec := performJSONRequest(handler, http.MethodPost, "/xrpc/app.cerulia.rpc.retirePublication", `{"publicationRef":"`+publicationRef+`","requestId":"`+requestID+`"}`, authHeaders(actorDid, authz.CorePublicationWriter))
	if rec.Code != http.StatusOK {
		t.Fatalf("retire publication failed: %d %s", rec.Code, rec.Body.String())
	}
	var ack struct {
		PublicationRef string `json:"publicationRef"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &ack); err != nil {
		t.Fatalf("decode retire publication ack: %v", err)
	}
	if ack.PublicationRef == "" {
		t.Fatal("expected retired publicationRef in ack")
	}
	return ack.PublicationRef
}

func testConfig() config.Config {
	return config.Config{AppEnv: "test", Auth: config.AuthConfig{AllowInsecureDirect: true}}
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&discardWriter{}, nil))
}

func newSeededCoreHandler(t *testing.T) http.Handler {
	t.Helper()
	dataStore := store.NewMemoryStore()
	seedRulesetManifest(t, dataStore, "did:plc:rules", "ruleset-1", "app.cerulia.rules.core")
	return newHandlerWithStore(dataStore)
}

func newQueryHandler(t *testing.T, dataStore store.Store) http.Handler {
	t.Helper()
	return newHandlerWithStore(dataStore)
}

func newHandlerWithStore(dataStore store.Store) http.Handler {
	cfg := testConfig()
	h := &handler{
		logger: testLogger(),
		config: cfg,
		db:     database.Disabled(),
		auth: authz.NewGateway(authz.Config{
			TrustedProxyHMACSecret: cfg.Auth.TrustedProxyHMACSecret,
			TrustedProxyMaxSkew:    cfg.Auth.TrustedProxyMaxSkew,
			AllowInsecureDirect:    cfg.Auth.AllowInsecureDirect,
		}),
		commands:    command.NewService(dataStore),
		projections: projection.NewService(dataStore),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCampaignView", h.handleGetCampaignView)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listCampaigns", h.handleListCampaigns)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listPublications", h.handleListPublications)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listPublicationLibrary", h.handleListPublicationLibrary)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getPublicationView", h.handleGetPublicationView)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCharacterHome", h.handleGetCharacterHome)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listCharacterBranches", h.handleListCharacterBranches)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCharacterBranchView", h.handleGetCharacterBranchView)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.createCampaign", h.handleCreateCampaign)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.importCharacterSheet", h.handleImportCharacterSheet)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.createCharacterBranch", h.handleCreateCharacterBranch)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.retireCharacterBranch", h.handleRetireCharacterBranch)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.recordCharacterAdvancement", h.handleRecordCharacterAdvancement)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.recordCharacterConversion", h.handleRecordCharacterConversion)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.grantReuse", h.handleGrantReuse)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.publishSubject", h.handlePublishSubject)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.retirePublication", h.handleRetirePublication)
	return mux
}

func seedCampaignRecord(t *testing.T, dataStore store.Store, repoDID string, recordKey string, campaign coremodel.Campaign) string {
	t.Helper()
	ref := store.BuildRef(repoDID, coremodel.CollectionCampaign, recordKey)
	body, err := coremodel.Marshal(campaign)
	if err != nil {
		t.Fatalf("marshal campaign: %v", err)
	}
	ctx := context.Background()
	if err := dataStore.WithTx(ctx, func(tx store.Tx) error {
		return tx.PutStable(ctx, store.StableRecord{
			Ref:        ref,
			Collection: coremodel.CollectionCampaign,
			RepoDID:    repoDID,
			RecordKey:  recordKey,
			RequestID:  campaign.RequestID,
			Revision:   campaign.Revision,
			Body:       body,
			CreatedAt:  campaign.CreatedAt,
			UpdatedAt:  campaign.UpdatedAt,
		})
	}); err != nil {
		t.Fatalf("seed campaign: %v", err)
	}
	return ref
}

func seedPublicationCurrentHead(t *testing.T, dataStore store.Store, repoDID string, subjectRef string, subjectKind string, recordKey string, publication coremodel.Publication) string {
	t.Helper()
	ref := store.BuildRef(repoDID, coremodel.CollectionPublication, recordKey)
	body, err := coremodel.Marshal(publication)
	if err != nil {
		t.Fatalf("marshal publication: %v", err)
	}
	ctx := context.Background()
	if err := dataStore.WithTx(ctx, func(tx store.Tx) error {
		if err := tx.PutAppend(ctx, store.AppendRecord{
			Ref:          ref,
			Collection:   coremodel.CollectionPublication,
			RepoDID:      repoDID,
			RecordKey:    recordKey,
			GoverningRef: subjectRef,
			RequestID:    publication.RequestID,
			Body:         body,
			CreatedAt:    publication.PublishedAt,
		}); err != nil {
			return err
		}
		return tx.PutCurrentHead(ctx, ledger.HeadRecord{
			SubjectRef:     subjectRef,
			SubjectKind:    subjectKind,
			CurrentHeadRef: ref,
			ChainRootRef:   ref,
			RequestID:      publication.RequestID,
		})
	}); err != nil {
		t.Fatalf("seed publication head: %v", err)
	}
	return ref
}

func seedRulesetManifest(t *testing.T, dataStore store.Store, repoDID string, recordKey string, rulesetNSID string) {
	t.Helper()
	ref := store.BuildRef(repoDID, coremodel.CollectionRulesetManifest, recordKey)
	body, err := coremodel.Marshal(coremodel.RulesetManifest{
		RulesetNSID:     rulesetNSID,
		ManifestVersion: 1,
		ResolverRef:     "https://cerulia.example/resolvers/1",
		ResolverVersion: 1,
		PublishedAt:     time.Date(2026, time.April, 3, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("marshal ruleset manifest: %v", err)
	}
	ctx := context.Background()
	if err := dataStore.WithTx(ctx, func(tx store.Tx) error {
		return tx.PutStable(ctx, store.StableRecord{
			Ref:        ref,
			Collection: coremodel.CollectionRulesetManifest,
			RepoDID:    repoDID,
			RecordKey:  recordKey,
			RequestID:  "seed-ruleset-manifest-" + recordKey,
			Revision:   1,
			Body:       body,
			CreatedAt:  time.Date(2026, time.April, 3, 0, 0, 0, 0, time.UTC),
			UpdatedAt:  time.Date(2026, time.April, 3, 0, 0, 0, 0, time.UTC),
		})
	}); err != nil {
		t.Fatalf("seed ruleset manifest: %v", err)
	}
}

type discardWriter struct{}

func (writer *discardWriter) Write(p []byte) (int, error) {
	return len(p), nil
}
