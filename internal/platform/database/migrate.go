package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

const migrationLockKey int64 = 5_872_411_903_101

func Migrate(ctx context.Context, db *DB, directory string) error {
	if db == nil || !db.Enabled() {
		return nil
	}
	if strings.TrimSpace(directory) == "" {
		return fmt.Errorf("migration directory is required")
	}

	entries, err := os.ReadDir(directory)
	if err != nil {
		return fmt.Errorf("read migrations directory: %w", err)
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		files = append(files, filepath.Join(directory, entry.Name()))
	}
	sort.Strings(files)

	transaction, err := db.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin migration transaction: %w", err)
	}
	defer transaction.Rollback(ctx)

	if _, err := transaction.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`); err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}
	if _, err := transaction.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, migrationLockKey); err != nil {
		return fmt.Errorf("acquire migration advisory lock: %w", err)
	}

	applied := map[string]struct{}{}
	rows, err := transaction.Query(ctx, `SELECT filename FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("query applied migrations: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var filename string
		if err := rows.Scan(&filename); err != nil {
			return fmt.Errorf("scan migration row: %w", err)
		}
		applied[filename] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate migration rows: %w", err)
	}

	for _, path := range files {
		filename := filepath.Base(path)
		if _, ok := applied[filename]; ok {
			continue
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", filename, err)
		}

		if _, err := transaction.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("apply migration %s: %w", filename, err)
		}
		if _, err := transaction.Exec(ctx, `INSERT INTO schema_migrations (filename) VALUES ($1)`, filename); err != nil {
			return fmt.Errorf("record migration %s: %w", filename, err)
		}
	}

	if err := transaction.Commit(ctx); err != nil {
		return fmt.Errorf("commit migrations: %w", err)
	}

	return nil
}
