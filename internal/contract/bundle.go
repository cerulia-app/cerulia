package contract

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type Options struct {
	Version string
	Channel string
	GitSHA  string
	GitTag  string
	BuiltAt time.Time
}

type Manifest struct {
	ArtifactVersion      string `json:"artifactVersion"`
	SourceGitSHA         string `json:"sourceGitSha,omitempty"`
	SourceTag            string `json:"sourceTag,omitempty"`
	BuiltAt              string `json:"builtAt"`
	SchemaHash           string `json:"schemaHash"`
	ExampleHash          string `json:"exampleHash"`
	CompatibilityChannel string `json:"compatibilityChannel"`
}

type Bundle struct {
	Manifest  Manifest
	Lexicon   map[string][]byte
	Examples  map[string][]byte
	Checksums []byte
	Changelog []byte
}

func BuildBundle(options Options) (Bundle, error) {
	if options.Version == "" {
		options.Version = "0.0.0-dev"
	}
	if options.Channel == "" {
		options.Channel = "next"
	}
	if options.BuiltAt.IsZero() {
		options.BuiltAt = time.Now().UTC()
	}

	documents := Catalog()
	if err := ValidateCatalog(documents); err != nil {
		return Bundle{}, err
	}

	lexicon, err := marshalDocumentSet(documents)
	if err != nil {
		return Bundle{}, err
	}

	examples, err := marshalExampleSet(ExampleDocuments())
	if err != nil {
		return Bundle{}, err
	}

	manifest := Manifest{
		ArtifactVersion:      options.Version,
		SourceGitSHA:         options.GitSHA,
		SourceTag:            options.GitTag,
		BuiltAt:              options.BuiltAt.Format(time.RFC3339),
		SchemaHash:           digest(lexicon),
		ExampleHash:          digest(examples),
		CompatibilityChannel: options.Channel,
	}

	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return Bundle{}, fmt.Errorf("marshal manifest: %w", err)
	}

	checksums := renderChecksums(manifestBytes, lexicon, examples)
	changelog := renderChangelog(options, manifest)

	return Bundle{
		Manifest:  manifest,
		Lexicon:   lexicon,
		Examples:  examples,
		Checksums: checksums,
		Changelog: changelog,
	}, nil
}

func (bundle Bundle) WriteTo(directory string) error {
	manifestBytes, err := json.MarshalIndent(bundle.Manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}

	parentDirectory := filepath.Dir(directory)
	temporaryDirectory, err := os.MkdirTemp(parentDirectory, ".contracts-*")
	if err != nil {
		return fmt.Errorf("create temporary artifact directory: %w", err)
	}
	defer os.RemoveAll(temporaryDirectory)

	if err := writeArtifactFile(filepath.Join(temporaryDirectory, "manifest.json"), append(manifestBytes, '\n')); err != nil {
		return err
	}
	if err := writeArtifactFile(filepath.Join(temporaryDirectory, "checksums.txt"), bundle.Checksums); err != nil {
		return err
	}
	if err := writeArtifactFile(filepath.Join(temporaryDirectory, "CHANGELOG-contract.md"), bundle.Changelog); err != nil {
		return err
	}

	for path, content := range bundle.Lexicon {
		if err := writeArtifactFile(filepath.Join(temporaryDirectory, path), content); err != nil {
			return err
		}
	}
	for path, content := range bundle.Examples {
		if err := writeArtifactFile(filepath.Join(temporaryDirectory, path), content); err != nil {
			return err
		}
	}

	if err := os.RemoveAll(directory); err != nil {
		return fmt.Errorf("clean artifact directory: %w", err)
	}
	if err := os.MkdirAll(parentDirectory, 0o755); err != nil {
		return fmt.Errorf("create artifact parent directory: %w", err)
	}
	if err := os.Rename(temporaryDirectory, directory); err != nil {
		return fmt.Errorf("replace artifact directory: %w", err)
	}

	return nil
}

func marshalDocumentSet(documents map[string]map[string]any) (map[string][]byte, error) {
	marshaled := map[string][]byte{}
	for path, document := range documents {
		content, err := json.MarshalIndent(document, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("marshal %s: %w", path, err)
		}
		marshaled[path] = append(content, '\n')
	}

	return marshaled, nil
}

func marshalExampleSet(examples map[string]any) (map[string][]byte, error) {
	marshaled := map[string][]byte{}
	for path, example := range examples {
		content, err := json.MarshalIndent(example, "", "  ")
		if err != nil {
			return nil, fmt.Errorf("marshal %s: %w", path, err)
		}
		marshaled[path] = append(content, '\n')
	}

	return marshaled, nil
}

func digest(files map[string][]byte) string {
	hash := sha256.New()
	paths := sortedKeys(files)
	for _, path := range paths {
		_, _ = hash.Write([]byte(path))
		_, _ = hash.Write([]byte{0})
		_, _ = hash.Write(files[path])
	}

	return hex.EncodeToString(hash.Sum(nil))
}

func renderChecksums(manifest []byte, lexicon map[string][]byte, examples map[string][]byte) []byte {
	entries := map[string][]byte{
		"manifest.json": append(manifest, '\n'),
	}
	for path, content := range lexicon {
		entries[path] = content
	}
	for path, content := range examples {
		entries[path] = content
	}

	paths := sortedKeys(entries)
	var builder strings.Builder
	for _, path := range paths {
		sum := sha256.Sum256(entries[path])
		builder.WriteString(hex.EncodeToString(sum[:]))
		builder.WriteString("  ")
		builder.WriteString(path)
		builder.WriteByte('\n')
	}

	return []byte(builder.String())
}

func renderChangelog(options Options, manifest Manifest) []byte {
	content := fmt.Sprintf("# Contract Changelog\n\n- version: %s\n- channel: %s\n- builtAt: %s\n- note: initial phase 0 contract artifact bundle for continuity core and shared auth/defs.\n", manifest.ArtifactVersion, manifest.CompatibilityChannel, manifest.BuiltAt)
	if options.GitSHA != "" {
		content += fmt.Sprintf("- sourceGitSha: %s\n", options.GitSHA)
	}
	if options.GitTag != "" {
		content += fmt.Sprintf("- sourceTag: %s\n", options.GitTag)
	}

	return []byte(content)
}

func writeArtifactFile(path string, content []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create %s: %w", path, err)
	}
	if err := os.WriteFile(path, content, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", path, err)
	}

	return nil
}

func sortedKeys[V any](source map[string]V) []string {
	keys := make([]string, 0, len(source))
	for key := range source {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	return keys
}
