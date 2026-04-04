package config

import "testing"

func TestLoadUsesLegacyDatabaseURLOnlyInLocalEnv(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")
	t.Setenv("DATABASE_URL", "postgres://legacy")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Database.URL != "postgres://legacy" || cfg.Database.DirectURL != "postgres://legacy" {
		t.Fatalf("expected local fallback to legacy URL, got %+v", cfg.Database)
	}
}

func TestLoadIgnoresLegacyDatabaseURLOutsideLocalEnv(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")
	t.Setenv("DATABASE_URL", "postgres://legacy")
	t.Setenv("DATABASE_URL_POOLED", "postgres://pooled")
	t.Setenv("DATABASE_URL_DIRECT", "postgres://direct")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Database.URL != "postgres://pooled" || cfg.Database.DirectURL != "postgres://direct" {
		t.Fatalf("expected explicit pooled/direct URLs, got %+v", cfg.Database)
	}
}

func TestLoadUsesLegacyDatabaseURLInTestEnv(t *testing.T) {
	t.Setenv("APP_ENV", "test")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")
	t.Setenv("DATABASE_URL", "postgres://legacy-test")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Database.URL != "postgres://legacy-test" || cfg.Database.DirectURL != "postgres://legacy-test" {
		t.Fatalf("expected test env to use legacy fallback, got %+v", cfg.Database)
	}
}

func TestLoadIgnoresLegacyDatabaseURLInStaging(t *testing.T) {
	t.Setenv("APP_ENV", "staging")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")
	t.Setenv("DATABASE_URL", "postgres://legacy")
	t.Setenv("DATABASE_URL_POOLED", "postgres://pooled-staging")
	t.Setenv("DATABASE_URL_DIRECT", "postgres://direct-staging")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Database.URL != "postgres://pooled-staging" || cfg.Database.DirectURL != "postgres://direct-staging" {
		t.Fatalf("expected staging to ignore legacy DATABASE_URL, got %+v", cfg.Database)
	}
}

func TestLoadNormalizesAppEnvCase(t *testing.T) {
	t.Setenv("APP_ENV", "Test")
	t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "")
	t.Setenv("DATABASE_URL", "postgres://legacy-mixed")
	t.Setenv("DATABASE_URL_POOLED", "")
	t.Setenv("DATABASE_URL_DIRECT", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.AppEnv != "test" {
		t.Fatalf("expected APP_ENV to normalize to test, got %q", cfg.AppEnv)
	}
	if cfg.Database.URL != "postgres://legacy-mixed" || cfg.Database.DirectURL != "postgres://legacy-mixed" {
		t.Fatalf("expected normalized test env to use local DB fallback, got %+v", cfg.Database)
	}
}

func TestLoadParsesAllowInsecureDirectOptIn(t *testing.T) {
	for _, appEnv := range []string{"development", "test"} {
		t.Run(appEnv, func(t *testing.T) {
			t.Setenv("APP_ENV", appEnv)
			t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "true")

			cfg, err := Load()
			if err != nil {
				t.Fatalf("load config: %v", err)
			}
			if !cfg.Auth.AllowInsecureDirect {
				t.Fatalf("expected %s to opt in local direct auth", appEnv)
			}
		})
	}
}

func TestLoadRejectsAllowInsecureDirectOutsideLocalEnv(t *testing.T) {
	tests := []string{"staging", "production"}
	for _, appEnv := range tests {
		t.Run(appEnv, func(t *testing.T) {
			t.Setenv("APP_ENV", appEnv)
			t.Setenv("AUTH_ALLOW_INSECURE_DIRECT", "true")

			if _, err := Load(); err == nil {
				t.Fatalf("expected %s to reject insecure direct auth opt-in", appEnv)
			}
		})
	}
}
