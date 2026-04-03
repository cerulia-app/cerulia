package store_test

import (
	"context"
	"os"
	"testing"

	corecommand "cerulia/internal/core/command"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	storepkg "cerulia/internal/store"
)

func TestPostgresStoreSupportsCoreMutationFlow(t *testing.T) {
	url := os.Getenv("CERULIA_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("CERULIA_TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	db, err := database.Open(ctx, config.DatabaseConfig{URL: url, PingTimeout: 0})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	defer db.Close()
	store := storepkg.NewPostgresStore(db)
	service := corecommand.NewService(store)
	ack, err := service.ImportCharacterSheet(ctx, "did:plc:postgres-owner", corecommand.ImportCharacterSheetInput{
		OwnerDid:    "did:plc:postgres-owner",
		RulesetNSID: "app.cerulia.rules.core",
		DisplayName: "Postgres Hero",
		RequestID:   "req-postgres-sheet",
	})
	if err != nil {
		t.Fatalf("import character sheet: %v", err)
	}
	if len(ack.EmittedRecordRefs) != 1 {
		t.Fatalf("expected one emitted ref, got %v", ack.EmittedRecordRefs)
	}
	if _, err := store.GetStable(ctx, ack.EmittedRecordRefs[0]); err != nil {
		t.Fatalf("get stored sheet: %v", err)
	}
}
