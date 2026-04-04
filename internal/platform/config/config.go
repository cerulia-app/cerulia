package config

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv          string
	HTTPAddr        string
	PublicBaseURL   string
	LogLevel        slog.Level
	ShutdownTimeout time.Duration
	MigrationsDir   string
	Auth            AuthConfig
	Database        DatabaseConfig
	Blob            BlobConfig
}

type AuthConfig struct {
	TrustedProxyHMACSecret string
	TrustedProxyMaxSkew    time.Duration
}

type DatabaseConfig struct {
	URL         string
	DirectURL   string
	MaxConns    int32
	MinConns    int32
	PingTimeout time.Duration
}

type BlobConfig struct {
	Backend           string
	LocalDir          string
	R2AccountID       string
	R2AssetBucket     string
	R2AccessKeyID     string
	R2SecretAccessKey string
}

func Load() (Config, error) {
	appEnv := normalizeAppEnv(envOrDefault("APP_ENV", defaultAppEnv()))
	cfg := Config{
		AppEnv:          appEnv,
		HTTPAddr:        envOrDefault("HTTP_ADDR", ":8080"),
		PublicBaseURL:   envOrDefault("PUBLIC_BASE_URL", "http://localhost:8080"),
		ShutdownTimeout: 10 * time.Second,
		MigrationsDir:   envOrDefault("MIGRATIONS_DIR", "migrations"),
		Auth: AuthConfig{
			TrustedProxyHMACSecret: strings.TrimSpace(os.Getenv("AUTH_TRUSTED_PROXY_HMAC_SECRET")),
			TrustedProxyMaxSkew:    5 * time.Minute,
		},
		Database: DatabaseConfig{
			URL:         runtimeDatabaseURL(appEnv),
			DirectURL:   migrationDatabaseURL(appEnv),
			MaxConns:    10,
			MinConns:    0,
			PingTimeout: 3 * time.Second,
		},
		Blob: BlobConfig{
			Backend:           envOrDefault("BLOB_BACKEND", "disabled"),
			LocalDir:          envOrDefault("BLOB_LOCAL_DIR", ".local/blob"),
			R2AccountID:       strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID")),
			R2AssetBucket:     strings.TrimSpace(os.Getenv("R2_ASSET_BUCKET")),
			R2AccessKeyID:     strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID")),
			R2SecretAccessKey: strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY")),
		},
	}

	var errs []error
	if err := validateAppEnv(cfg.AppEnv); err != nil {
		errs = append(errs, fmt.Errorf("APP_ENV: %w", err))
	}

	level, err := parseLogLevel(envOrDefault("LOG_LEVEL", "info"))
	if err != nil {
		errs = append(errs, fmt.Errorf("LOG_LEVEL: %w", err))
	} else {
		cfg.LogLevel = level
	}

	cfg.ShutdownTimeout, errs = parseDurationEnv("SHUTDOWN_TIMEOUT", cfg.ShutdownTimeout, errs)
	cfg.Auth.TrustedProxyMaxSkew, errs = parseDurationEnv("AUTH_TRUSTED_PROXY_MAX_SKEW", cfg.Auth.TrustedProxyMaxSkew, errs)
	cfg.Database.PingTimeout, errs = parseDurationEnv("DATABASE_PING_TIMEOUT", cfg.Database.PingTimeout, errs)
	cfg.Database.MaxConns, errs = parseInt32Env("DATABASE_MAX_CONNS", cfg.Database.MaxConns, errs)
	cfg.Database.MinConns, errs = parseInt32Env("DATABASE_MIN_CONNS", cfg.Database.MinConns, errs)

	if len(errs) > 0 {
		return Config{}, errors.Join(errs...)
	}

	return cfg, nil
}

func defaultAppEnv() string {
	if strings.TrimSpace(os.Getenv("K_SERVICE")) != "" || strings.TrimSpace(os.Getenv("K_REVISION")) != "" || strings.TrimSpace(os.Getenv("CLOUD_RUN_JOB")) != "" {
		return "production"
	}
	return "development"
}

func validateAppEnv(value string) error {
	switch normalizeAppEnv(value) {
	case "development", "test", "staging", "production":
		return nil
	default:
		return fmt.Errorf("unsupported app env %q", value)
	}
}

func normalizeAppEnv(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func envOrDefault(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func firstNonEmptyEnv(keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}

	return ""
}

func runtimeDatabaseURL(appEnv string) string {
	appEnv = normalizeAppEnv(appEnv)
	if appEnv == "development" || appEnv == "test" {
		return firstNonEmptyEnv("DATABASE_URL_POOLED", "DATABASE_URL")
	}
	return strings.TrimSpace(os.Getenv("DATABASE_URL_POOLED"))
}

func migrationDatabaseURL(appEnv string) string {
	appEnv = normalizeAppEnv(appEnv)
	if appEnv == "development" || appEnv == "test" {
		return firstNonEmptyEnv("DATABASE_URL_DIRECT", "DATABASE_URL")
	}
	return strings.TrimSpace(os.Getenv("DATABASE_URL_DIRECT"))
}

func parseLogLevel(value string) (slog.Level, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return 0, fmt.Errorf("unsupported level %q", value)
	}
}

func parseDurationEnv(key string, fallback time.Duration, errs []error) (time.Duration, []error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, errs
	}

	value, err := time.ParseDuration(raw)
	if err != nil {
		errs = append(errs, fmt.Errorf("%s: %w", key, err))
		return fallback, errs
	}

	return value, errs
}

func parseInt32Env(key string, fallback int32, errs []error) (int32, []error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, errs
	}

	value, err := strconv.ParseInt(raw, 10, 32)
	if err != nil {
		errs = append(errs, fmt.Errorf("%s: %w", key, err))
		return fallback, errs
	}

	return int32(value), errs
}
