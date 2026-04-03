package database

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"cerulia/internal/platform/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const BaselineMigration = "0001_phase0_ledger.sql"
const CurrentSchemaMigration = "0002_core_records.sql"

var ErrDisabled = errors.New("database disabled")

type DB struct {
	pool *pgxpool.Pool
}

func Open(ctx context.Context, cfg config.DatabaseConfig) (*DB, error) {
	if strings.TrimSpace(cfg.URL) == "" {
		return Disabled(), nil
	}

	poolConfig, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	poolConfig.MaxConns = cfg.MaxConns
	poolConfig.MinConns = cfg.MinConns

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}

	db := &DB{pool: pool}
	if err := db.Ping(ctx, cfg.PingTimeout); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return db, nil
}

func Disabled() *DB {
	return &DB{}
}

func (db *DB) Enabled() bool {
	return db != nil && db.pool != nil
}

func (db *DB) Ping(ctx context.Context, timeout time.Duration) error {
	if !db.Enabled() {
		return nil
	}

	pingCtx := ctx
	cancel := func() {}
	if timeout > 0 {
		pingCtx, cancel = context.WithTimeout(ctx, timeout)
	}
	defer cancel()

	return db.pool.Ping(pingCtx)
}

func (db *DB) Close() {
	if db == nil || db.pool == nil {
		return
	}

	db.pool.Close()
}

func (db *DB) Exec(ctx context.Context, sql string, args ...any) error {
	if !db.Enabled() {
		return ErrDisabled
	}

	_, err := db.pool.Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("exec query: %w", err)
	}

	return nil
}

func (db *DB) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	if !db.Enabled() {
		return nil, ErrDisabled
	}

	rows, err := db.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query rows: %w", err)
	}

	return rows, nil
}

func (db *DB) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	if !db.Enabled() {
		return rowError{err: ErrDisabled}
	}

	return db.pool.QueryRow(ctx, sql, args...)
}

func (db *DB) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
	if !db.Enabled() {
		return ErrDisabled
	}

	tx, err := db.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}

func (db *DB) HasAppliedMigration(ctx context.Context, filename string) (bool, error) {
	if !db.Enabled() {
		return false, nil
	}

	var exists bool
	err := db.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'schema_migrations'
		)
	`).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check schema_migrations table: %w", err)
	}
	if !exists {
		return false, nil
	}

	err = db.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = $1)`, filename).Scan(&exists)
	if err != nil {
		if pgx.ErrNoRows == err {
			return false, nil
		}
		return false, fmt.Errorf("check applied migration: %w", err)
	}

	return exists, nil
}

type rowError struct {
	err error
}

func (row rowError) Scan(dest ...any) error {
	return row.err
}
