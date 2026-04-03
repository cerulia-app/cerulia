package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cerulia/internal/platform/config"
	"cerulia/internal/platform/database"
	"cerulia/internal/platform/httpserver"
	"cerulia/internal/platform/logging"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("load config", "error", err)
		os.Exit(1)
	}
	if cfg.AppEnv != "development" && cfg.AppEnv != "test" && cfg.Auth.TrustedProxyHMACSecret == "" {
		slog.Error("missing trusted proxy auth secret", "appEnv", cfg.AppEnv)
		os.Exit(1)
	}

	logger := logging.New(cfg.LogLevel)

	db, err := database.Open(ctx, cfg.Database)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	if cfg.AppEnv != "development" && cfg.AppEnv != "test" && !db.Enabled() {
		logger.Error("database is required outside local development", "appEnv", cfg.AppEnv)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           httpserver.NewHandler(logger, cfg, db),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info(
			"starting api",
			"addr", cfg.HTTPAddr,
			"environment", cfg.AppEnv,
			"databaseEnabled", db.Enabled(),
			"blobBackend", cfg.Blob.Backend,
		)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server stopped unexpectedly", "error", err)
			os.Exit(1)
		}

		logger.Info("api stopped")
		return
	case <-ctx.Done():
		logger.Info("shutdown requested")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown server", "error", err)
		os.Exit(1)
	}

	if err := <-errCh; err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server stopped with error", "error", err)
		os.Exit(1)
	}

	logger.Info("api stopped")
}
