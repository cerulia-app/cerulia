package store

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

type RefParts struct {
	RepoDID    string
	Collection string
	RecordKey  string
}

func BuildRef(repoDID string, collection string, recordKey string) string {
	return fmt.Sprintf("at://%s/%s/%s", strings.TrimSpace(repoDID), strings.TrimSpace(collection), NormalizeRecordKey(recordKey))
}

func ParseRef(ref string) (RefParts, error) {
	trimmed := strings.TrimSpace(ref)
	trimmed = strings.TrimPrefix(trimmed, "at://")
	parts := strings.Split(trimmed, "/")
	if len(parts) != 3 {
		return RefParts{}, fmt.Errorf("invalid ref %q", ref)
	}

	parsed := RefParts{
		RepoDID:    strings.TrimSpace(parts[0]),
		Collection: strings.TrimSpace(parts[1]),
		RecordKey:  strings.TrimSpace(parts[2]),
	}
	if parsed.RepoDID == "" || parsed.Collection == "" || parsed.RecordKey == "" {
		return RefParts{}, fmt.Errorf("invalid ref %q", ref)
	}
	if err := ValidateRecordKey(parsed.RecordKey); err != nil {
		return RefParts{}, fmt.Errorf("invalid ref %q", ref)
	}

	return parsed, nil
}

func NormalizeRecordKey(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "main"
	}
	if err := ValidateRecordKey(trimmed); err == nil {
		return trimmed
	}
	sum := sha256.Sum256([]byte(trimmed))
	return "rk-" + hex.EncodeToString(sum[:12])
}

func ValidateRecordKey(raw string) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || len(trimmed) > 512 {
		return fmt.Errorf("invalid record key")
	}
	for _, r := range trimmed {
		if !validRecordKeyRune(r) {
			return fmt.Errorf("invalid record key")
		}
	}
	return nil
}

func validRecordKeyRune(r rune) bool {
	switch {
	case r >= 'a' && r <= 'z':
		return true
	case r >= 'A' && r <= 'Z':
		return true
	case r >= '0' && r <= '9':
		return true
	case r == '-', r == '_', r == '.', r == ':', r == '~':
		return true
	default:
		return false
	}
}

func RecordKey(ref string) string {
	parts, err := ParseRef(ref)
	if err != nil {
		return ref
	}

	return parts.RecordKey
}
