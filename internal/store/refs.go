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
	if !strings.HasPrefix(parsed.RepoDID, "did:") {
		return RefParts{}, fmt.Errorf("invalid ref %q", ref)
	}
	if err := ValidateDIDAuthority(parsed.RepoDID); err != nil {
		return RefParts{}, fmt.Errorf("invalid ref %q", ref)
	}
	if err := ValidateCollectionNSID(parsed.Collection); err != nil {
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

func ValidateDIDAuthority(raw string) error {
	trimmed := strings.TrimSpace(raw)
	parts := strings.Split(trimmed, ":")
	if len(parts) < 3 || parts[0] != "did" || parts[1] == "" || parts[2] == "" {
		return fmt.Errorf("invalid did")
	}
	if parts[1] == "plc" && len(parts) != 3 {
		return fmt.Errorf("invalid did")
	}
	for _, r := range parts[1] {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') {
			return fmt.Errorf("invalid did")
		}
	}
	for _, part := range parts[2:] {
		if strings.TrimSpace(part) == "" || !validDIDSegment(part) {
			return fmt.Errorf("invalid did")
		}
	}
	return nil
}

func validDIDSegment(raw string) bool {
	for index := 0; index < len(raw); index++ {
		value := raw[index]
		switch {
		case value >= 'a' && value <= 'z':
		case value >= 'A' && value <= 'Z':
		case value >= '0' && value <= '9':
		case value == '.', value == '-', value == '_':
		case value == '%':
			if index+2 >= len(raw) || !isHexByte(raw[index+1]) || !isHexByte(raw[index+2]) {
				return false
			}
			index += 2
		default:
			return false
		}
	}
	return true
}

func isHexByte(value byte) bool {
	return (value >= '0' && value <= '9') || (value >= 'a' && value <= 'f') || (value >= 'A' && value <= 'F')
}

func ValidateCollectionNSID(raw string) error {
	trimmed := strings.TrimSpace(raw)
	parts := strings.Split(trimmed, ".")
	if len(parts) < 3 {
		return fmt.Errorf("invalid nsid")
	}
	for _, part := range parts {
		if len(part) == 0 || part[0] == '-' || part[len(part)-1] == '-' {
			return fmt.Errorf("invalid nsid")
		}
		for _, r := range part {
			switch {
			case r >= 'a' && r <= 'z':
			case r >= 'A' && r <= 'Z':
			case r >= '0' && r <= '9':
			case r == '-':
			default:
				return fmt.Errorf("invalid nsid")
			}
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
