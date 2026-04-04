package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"cerulia/internal/core/projection"
	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	"cerulia/internal/store"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(ctx context.Context, stdout io.Writer, stderr io.Writer) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if cfg.AppEnv != "development" && cfg.AppEnv != "test" && cfg.Database.DirectURL == "" {
		return fmt.Errorf("DATABASE_URL_DIRECT is required for rebuild outside local development")
	}

	rebuildDatabaseConfig := cfg.Database
	if rebuildDatabaseConfig.DirectURL != "" {
		rebuildDatabaseConfig.URL = rebuildDatabaseConfig.DirectURL
	}

	db, err := database.Open(ctx, rebuildDatabaseConfig)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer db.Close()

	if !db.Enabled() {
		return fmt.Errorf("DATABASE_URL_DIRECT or DATABASE_URL is required for rebuild")
	}

	report, err := projection.ValidateRebuild(ctx, store.NewPostgresStore(db))
	if err != nil {
		return fmt.Errorf("validate rebuild: %w", err)
	}

	encoder := json.NewEncoder(stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		return fmt.Errorf("write rebuild report: %w", err)
	}
	return nil
}
