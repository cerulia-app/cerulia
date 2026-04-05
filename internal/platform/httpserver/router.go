package httpserver

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"cerulia/internal/authz"
	"cerulia/internal/core/command"
	"cerulia/internal/core/projection"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	"cerulia/internal/store"
)

type handler struct {
	logger      *slog.Logger
	config      config.Config
	db          *database.DB
	auth        *authz.Gateway
	commands    *command.Service
	projections *projection.Service
}

type statusResponse struct {
	Status          string            `json:"status"`
	Service         string            `json:"service,omitempty"`
	Environment     string            `json:"environment,omitempty"`
	DatabaseEnabled bool              `json:"databaseEnabled,omitempty"`
	BlobBackend     string            `json:"blobBackend,omitempty"`
	Checks          map[string]string `json:"checks,omitempty"`
}

func NewHandler(logger *slog.Logger, cfg config.Config, db *database.DB) http.Handler {
	var dataStore store.Store
	if db != nil && db.Enabled() {
		dataStore = store.NewPostgresStore(db)
	} else {
		dataStore = store.NewMemoryStore()
	}

	h := &handler{
		logger: logger,
		config: cfg,
		db:     db,
		auth: authz.NewGateway(authz.Config{
			TrustedProxyHMACSecret: cfg.Auth.TrustedProxyHMACSecret,
			TrustedProxyMaxSkew:    cfg.Auth.TrustedProxyMaxSkew,
			AllowInsecureDirect:    cfg.Auth.AllowInsecureDirect,
		}),
		commands:    command.NewService(dataStore),
		projections: projection.NewService(dataStore),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", h.handleIndex)
	mux.HandleFunc("GET /healthz", h.handleHealthz)
	mux.HandleFunc("GET /readyz", h.handleReadyz)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCharacterHome", h.handleGetCharacterHome)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listCharacterBranches", h.handleListCharacterBranches)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCharacterBranchView", h.handleGetCharacterBranchView)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getCampaignView", h.handleGetCampaignView)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listCampaigns", h.handleListCampaigns)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listCharacterEpisodes", h.handleListCharacterEpisodes)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listReuseGrants", h.handleListReuseGrants)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listPublications", h.handleListPublications)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.listPublicationLibrary", h.handleListPublicationLibrary)
	mux.HandleFunc("GET /xrpc/app.cerulia.rpc.getPublicationView", h.handleGetPublicationView)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.createCampaign", h.handleCreateCampaign)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.attachRuleProfile", h.handleAttachRuleProfile)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.retireRuleProfile", h.handleRetireRuleProfile)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.importCharacterSheet", h.handleImportCharacterSheet)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.createCharacterBranch", h.handleCreateCharacterBranch)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.updateCharacterBranch", h.handleUpdateCharacterBranch)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.retireCharacterBranch", h.handleRetireCharacterBranch)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.recordCharacterAdvancement", h.handleRecordCharacterAdvancement)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.recordCharacterEpisode", h.handleRecordCharacterEpisode)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.recordCharacterConversion", h.handleRecordCharacterConversion)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.publishSubject", h.handlePublishSubject)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.retirePublication", h.handleRetirePublication)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.grantReuse", h.handleGrantReuse)
	mux.HandleFunc("POST /xrpc/app.cerulia.rpc.revokeReuse", h.handleRevokeReuse)

	return mux
}

func (h *handler) handleIndex(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{
		Status:          "ok",
		Service:         "cerulia-api",
		Environment:     h.config.AppEnv,
		DatabaseEnabled: h.db != nil && h.db.Enabled(),
		BlobBackend:     h.config.Blob.Backend,
	})
}

func (h *handler) handleHealthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{Status: "ok"})
}

func (h *handler) handleReadyz(w http.ResponseWriter, r *http.Request) {
	response := statusResponse{
		Status: "ready",
		Checks: map[string]string{"database": "disabled"},
	}

	statusCode := http.StatusOK
	if h.db != nil && h.db.Enabled() {
		if err := h.db.Ping(r.Context(), h.config.Database.PingTimeout); err != nil {
			response.Status = "not_ready"
			response.Checks["database"] = "error"
			statusCode = http.StatusServiceUnavailable
			h.logger.Warn("readiness check failed", "error", err)
		} else {
			response.Checks["database"] = "ok"
			applied, err := h.db.HasAppliedMigration(r.Context(), database.CurrentSchemaMigration)
			if err != nil {
				response.Status = "not_ready"
				response.Checks["migration"] = "error"
				statusCode = http.StatusServiceUnavailable
				h.logger.Warn("migration readiness check failed", "error", err)
			} else if !applied {
				response.Status = "not_ready"
				response.Checks["migration"] = "missing"
				statusCode = http.StatusServiceUnavailable
			} else {
				response.Checks["migration"] = "ok"
			}
		}
	}

	writeJSON(w, statusCode, response)
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}
