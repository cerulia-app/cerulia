package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"cerulia/internal/core/projection"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
)

func TestRunRequiresDirectDatabaseOutsideLocalEnv(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	err := run(context.Background(), &stdout, &stderr)
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL_DIRECT is required") {
		t.Fatalf("expected direct database error, got %v", err)
	}
}

func TestRunRequiresDatabaseURLInLocalEnv(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	err := run(context.Background(), &stdout, &stderr)
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL_DIRECT or DATABASE_URL is required") {
		t.Fatalf("expected database required error, got %v", err)
	}
}

func TestRunEmitsJSONReportWhenDatabaseAvailable(t *testing.T) {
	url := os.Getenv("CERULIA_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("CERULIA_TEST_DATABASE_URL is not set")
	}
	db, err := database.Open(context.Background(), config.DatabaseConfig{URL: url, MaxConns: 1, PingTimeout: 200 * time.Millisecond})
	if err != nil {
		t.Skipf("CERULIA_TEST_DATABASE_URL is not reachable: %v", err)
	}
	if err := db.Exec(context.Background(), `
		TRUNCATE TABLE
			cerulia_service_log,
			cerulia_idempotency_keys,
			cerulia_current_heads,
			cerulia_append_records,
			cerulia_stable_records
		RESTART IDENTITY
	`); err != nil {
		t.Fatalf("reset rebuild tables: %v", err)
	}
	db.Close()
	t.Setenv("APP_ENV", "test")
	t.Setenv("DATABASE_URL", url)
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	err = run(context.Background(), &stdout, &stderr)
	if err != nil {
		t.Fatalf("run rebuild: %v", err)
	}
	var report projection.RebuildReport
	if err := json.Unmarshal(stdout.Bytes(), &report); err != nil {
		t.Fatalf("decode rebuild report: %v", err)
	}
	if report != (projection.RebuildReport{}) {
		t.Fatalf("expected empty rebuild report on empty database, got %+v", report)
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected empty stderr, got %q", stderr.String())
	}
}

func TestRunEmitsJSONReportWithDirectURLOutsideLocalEnv(t *testing.T) {
	url := os.Getenv("CERULIA_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("CERULIA_TEST_DATABASE_URL is not set")
	}
	db, err := database.Open(context.Background(), config.DatabaseConfig{URL: url, MaxConns: 1, PingTimeout: 200 * time.Millisecond})
	if err != nil {
		t.Skipf("CERULIA_TEST_DATABASE_URL is not reachable: %v", err)
	}
	if err := db.Exec(context.Background(), `
		TRUNCATE TABLE
			cerulia_service_log,
			cerulia_idempotency_keys,
			cerulia_current_heads,
			cerulia_append_records,
			cerulia_stable_records
		RESTART IDENTITY
	`); err != nil {
		t.Fatalf("reset rebuild tables: %v", err)
	}
	db.Close()

	t.Setenv("APP_ENV", "staging")
	t.Setenv("DATABASE_URL", "")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", url)
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	err = run(context.Background(), &stdout, &stderr)
	if err != nil {
		t.Fatalf("run rebuild with direct url: %v", err)
	}
	var report projection.RebuildReport
	if err := json.Unmarshal(stdout.Bytes(), &report); err != nil {
		t.Fatalf("decode rebuild report: %v", err)
	}
	if report != (projection.RebuildReport{}) {
		t.Fatalf("expected empty rebuild report on empty database, got %+v", report)
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected empty stderr, got %q", stderr.String())
	}
}
