package httpserver

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
