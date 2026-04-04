package contract

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	corecommand "cerulia/internal/core/command"
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
		BuiltAt: time.Date(2026, 4, 4, 0, 0, 0, 0, time.UTC),
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
	}
	for path := range Catalog() {
		requiredPaths = append(requiredPaths, filepath.FromSlash(path))
	}
	for path := range ExampleDocuments() {
		requiredPaths = append(requiredPaths, filepath.FromSlash(path))
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
	manifestBytes, err := os.ReadFile(filepath.Join(directory, "manifest.json"))
	if err != nil {
		fatalIfError(t, err)
	}
	var manifest Manifest
	if err := json.Unmarshal(manifestBytes, &manifest); err != nil {
		fatalIfError(t, err)
	}
	if manifest.ArtifactVersion != "0.0.0-test" || manifest.CompatibilityChannel != "next" {
		t.Fatalf("unexpected manifest: %+v", manifest)
	}
	manifestChecksum := sha256.Sum256(manifestBytes)
	checksumLine := hex.EncodeToString(manifestChecksum[:]) + "  manifest.json"
	if !strings.Contains(string(checksums), checksumLine) {
		t.Fatalf("expected checksums.txt to contain %q, got %s", checksumLine, string(checksums))
	}
}

func TestBuildBundleCreatesMissingParentDirectory(t *testing.T) {
	bundle, err := BuildBundle(Options{
		Version: "0.0.0-test",
		Channel: "next",
		BuiltAt: time.Date(2026, 4, 4, 0, 0, 0, 0, time.UTC),
	})
	if err != nil {
		fatalIfError(t, err)
	}

	directory := filepath.Join(t.TempDir(), "missing", "contracts")
	if err := bundle.WriteTo(directory); err != nil {
		fatalIfError(t, err)
	}
	if _, err := os.Stat(filepath.Join(directory, "manifest.json")); err != nil {
		fatalIfError(t, err)
	}
}

func TestExampleRequestsDecodeIntoCommandInputs(t *testing.T) {
	tests := []struct {
		path   string
		target any
	}{
		{path: "examples/rpc/createCampaign.request.json", target: &corecommand.CreateCampaignInput{}},
		{path: "examples/rpc/recordCharacterEpisode.request.json", target: &corecommand.RecordCharacterEpisodeInput{}},
		{path: "examples/rpc/grantReuse.request.json", target: &corecommand.GrantReuseInput{}},
		{path: "examples/rpc/revokeReuse.request.json", target: &corecommand.RevokeReuseInput{}},
	}
	examples := ExampleDocuments()
	for _, test := range tests {
		raw, ok := examples[test.path]
		if !ok {
			t.Fatalf("missing example %s", test.path)
		}
		rawBytes, err := json.Marshal(raw)
		if err != nil {
			fatalIfError(t, err)
		}
		decoder := json.NewDecoder(bytes.NewReader(rawBytes))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(test.target); err != nil {
			fatalIfError(t, err)
		}
		if err := decoder.Decode(new(any)); err == nil {
			t.Fatalf("expected %s to contain a single JSON document", test.path)
		} else if err != io.EOF {
			fatalIfError(t, err)
		}
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

func TestCatalogExcludesArchivePaths(t *testing.T) {
	for path := range Catalog() {
		if strings.Contains(filepath.ToSlash(path), "archive/") {
			t.Fatalf("catalog must not include archive path %q", path)
		}
	}
	for path := range ExampleDocuments() {
		if strings.Contains(filepath.ToSlash(path), "archive/") {
			t.Fatalf("examples must not include archive path %q", path)
		}
	}
}

func fatalIfError(t *testing.T, err error) {
	t.Helper()
	t.Fatalf("unexpected error: %v", err)
}
