package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cerulia/internal/platform/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

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
