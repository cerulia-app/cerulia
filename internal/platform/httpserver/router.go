package httpserver

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
)

type handler struct {
	logger *slog.Logger
	config config.Config
	db     *database.DB
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
	h := &handler{
		logger: logger,
		config: cfg,
		db:     db,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", h.handleIndex)
	mux.HandleFunc("GET /healthz", h.handleHealthz)
	mux.HandleFunc("GET /readyz", h.handleReadyz)

	return mux
}

func (h *handler) handleIndex(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{
		Status:          "ok",
		Service:         "cerulia-api",
		Environment:     h.config.AppEnv,
		DatabaseEnabled: h.db.Enabled(),
		BlobBackend:     h.config.Blob.Backend,
	})
}

func (h *handler) handleHealthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{Status: "ok"})
}

func (h *handler) handleReadyz(w http.ResponseWriter, r *http.Request) {
	response := statusResponse{
		Status: "ready",
		Checks: map[string]string{
			"database": "disabled",
		},
	}

	statusCode := http.StatusOK
	if h.db.Enabled() {
		if err := h.db.Ping(r.Context(), h.config.Database.PingTimeout); err != nil {
			response.Status = "not_ready"
			response.Checks["database"] = "error"
			statusCode = http.StatusServiceUnavailable
			h.logger.Warn("readiness check failed", "error", err)
		} else {
			response.Checks["database"] = "ok"
			applied, err := h.db.HasAppliedMigration(r.Context(), database.BaselineMigration)
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
