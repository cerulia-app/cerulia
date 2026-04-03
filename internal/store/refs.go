package store

import (
	"fmt"
	"strings"
	"unicode"
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

	return parsed, nil
}

func NormalizeRecordKey(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "main"
	}

	var builder strings.Builder
	lastDash := false
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(unicode.ToLower(r))
			lastDash = false
		case r == '-' || r == '_':
			if lastDash {
				continue
			}
			builder.WriteByte('-')
			lastDash = true
		default:
			if lastDash {
				continue
			}
			builder.WriteByte('-')
			lastDash = true
		}
	}

	normalized := strings.Trim(builder.String(), "-")
	if normalized == "" {
		return "main"
	}

	return normalized
}

func RecordKey(ref string) string {
	parts, err := ParseRef(ref)
	if err != nil {
		return ref
	}

	return parts.RecordKey
}
