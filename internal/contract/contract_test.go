package contract

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestValidateCatalog(t *testing.T) {
	if err := ValidateCatalog(Catalog()); err != nil {
		fatalIfError(t, err)
	}
}

func TestBuildBundle(t *testing.T) {
	bundle, err := BuildBundle(Options{
		Version: "0.0.0-test",
		Channel: "next",
		BuiltAt: time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		fatalIfError(t, err)
	}

	directory := t.TempDir()
	if err := bundle.WriteTo(directory); err != nil {
		fatalIfError(t, err)
	}

	requiredPaths := []string{
		"manifest.json",
		"checksums.txt",
		"CHANGELOG-contract.md",
		filepath.FromSlash("lexicon/app.cerulia.defs.json"),
		filepath.FromSlash("lexicon/app.cerulia.core.campaign.json"),
		filepath.FromSlash("lexicon/app.cerulia.run.session.json"),
		filepath.FromSlash("lexicon/app.cerulia.rpc.createCampaign.json"),
		filepath.FromSlash("lexicon/app.cerulia.rpc.createSessionDraft.json"),
		filepath.FromSlash("examples/rpc/createCampaign.request.json"),
		filepath.FromSlash("examples/rpc/createSessionDraft.request.json"),
	}

	for _, relativePath := range requiredPaths {
		if _, err := os.Stat(filepath.Join(directory, relativePath)); err != nil {
			fatalIfError(t, err)
		}
	}

	checksums, err := os.ReadFile(filepath.Join(directory, "checksums.txt"))
	if err != nil {
		fatalIfError(t, err)
	}
	if len(checksums) == 0 {
		t.Fatal("checksums.txt must not be empty")
	}
}

func TestValidateCatalogRejectsUnresolvedLXM(t *testing.T) {
	invalidCatalog := map[string]map[string]any{
		"lexicon/app.cerulia.rpc.getCharacterHome.json": document("app.cerulia.rpc.getCharacterHome", map[string]any{
			"main": queryMain(nil, map[string]any{}, objectDef(nil, map[string]any{}), nil),
		}),
		"lexicon/app.cerulia.authBroken.json": permissionSetDoc("app.cerulia.authBroken", "app.cerulia.rpc.missingEndpoint"),
	}

	err := ValidateCatalog(invalidCatalog)
	if err == nil {
		t.Fatal("expected unresolved lxm validation failure")
	}
	if !strings.Contains(err.Error(), "unresolved lxm") {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func fatalIfError(t *testing.T, err error) {
	t.Helper()
	t.Fatalf("unexpected error: %v", err)
}
