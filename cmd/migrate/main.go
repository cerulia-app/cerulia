package main

import (
	"context"
	"fmt"
	"os"

	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		os.Exit(1)
	}

	migrationDatabaseConfig := cfg.Database
	if migrationDatabaseConfig.DirectURL != "" {
		migrationDatabaseConfig.URL = migrationDatabaseConfig.DirectURL
	}

	db, err := database.Open(ctx, migrationDatabaseConfig)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if !db.Enabled() {
		fmt.Fprintln(os.Stderr, "DATABASE_URL_DIRECT or DATABASE_URL is required for migrations")
		os.Exit(1)
	}

	if err := database.Migrate(ctx, db, cfg.MigrationsDir); err != nil {
		fmt.Fprintf(os.Stderr, "run migrations: %v\n", err)
		os.Exit(1)
	}
}
