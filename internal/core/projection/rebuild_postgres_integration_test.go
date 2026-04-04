package projection

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"
	"time"

	corecommand "cerulia/internal/core/command"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	storepkg "cerulia/internal/store"
)

func TestPostgresFinalGateRehearsal(t *testing.T) {
	url := os.Getenv("CERULIA_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("CERULIA_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	db, err := database.Open(ctx, config.DatabaseConfig{URL: url, MaxConns: 4, MinConns: 0, PingTimeout: 3 * time.Second})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()

	migrationsDir := projectionMigrationsDir(t)
	if err := database.Migrate(ctx, db, migrationsDir); err != nil {
		t.Fatalf("first migrate: %v", err)
	}
	if err := database.Migrate(ctx, db, migrationsDir); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	applied, err := db.HasAppliedMigration(ctx, database.CurrentSchemaMigration)
	if err != nil {
		t.Fatalf("check applied migration: %v", err)
	}
	if !applied {
		t.Fatalf("expected %s to be applied", database.CurrentSchemaMigration)
	}
	if err := resetFinalGateTables(ctx, db); err != nil {
		t.Fatalf("reset rehearsal tables: %v", err)
	}

	dataStore := storepkg.NewPostgresStore(db)
	service := corecommand.NewService(dataStore)
	scenario := executeFinalGateScenario(t, ctx, service)
	assertScenarioServiceLog(t, ctx, dataStore, 13)
	report, err := ValidateRebuild(ctx, dataStore)
	if err != nil {
		t.Fatalf("validate postgres rebuild: %v", err)
	}
	if report != (RebuildReport{
		PublicationChains:      2,
		CurrentHeads:           2,
		CharacterHomes:         1,
		CharacterEpisodePages:  1,
		ReuseGrantPages:        1,
		CampaignOwnerViews:     1,
		CampaignPublicViews:    1,
		PublicationOwnerLists:  2,
		PublicationPublicLists: 2,
	}) {
		t.Fatalf("unexpected postgres rebuild report: %+v", report)
	}

	before := snapshotProjectionState(t, ctx, dataStore, scenario)
	replayed := replayStoreFromCanonical(t, ctx, dataStore)
	after := snapshotProjectionState(t, ctx, replayed, scenario)
	if !reflect.DeepEqual(before, after) {
		t.Fatalf("postgres rebuild drifted:\n before=%+v\n after=%+v", before, after)
	}
	if _, err := ValidateRebuild(ctx, replayed); err != nil {
		t.Fatalf("validate replayed postgres rebuild: %v", err)
	}
}

func projectionMigrationsDir(t *testing.T) string {
	t.Helper()
	_, filePath, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve caller path")
	}
	root := filepath.Join(filepath.Dir(filePath), "..", "..", "..")
	return filepath.Clean(filepath.Join(root, "migrations"))
}

func resetFinalGateTables(ctx context.Context, db *database.DB) error {
	return db.Exec(ctx, `
		TRUNCATE TABLE
			cerulia_service_log,
			cerulia_idempotency_keys,
			cerulia_current_heads,
			cerulia_append_records,
			cerulia_stable_records
		RESTART IDENTITY
	`)
}
