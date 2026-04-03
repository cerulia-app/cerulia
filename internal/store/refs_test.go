package store

import "testing"

func TestNormalizeRecordKeyPreservesValidValue(t *testing.T) {
	if got := NormalizeRecordKey("session-main_01"); got != "session-main_01" {
		t.Fatalf("expected valid record key to be preserved, got %q", got)
	}
}

func TestNormalizeRecordKeyHashesInvalidValue(t *testing.T) {
	got := NormalizeRecordKey("session with spaces")
	if got == "session with spaces" || got == "" {
		t.Fatalf("expected invalid record key to be sanitized, got %q", got)
	}
	if err := ValidateRecordKey(got); err != nil {
		t.Fatalf("expected sanitized record key to validate, got %v", err)
	}
}

func TestParseRefRejectsControlCharacters(t *testing.T) {
	if _, err := ParseRef("at://did:plc:alice/app.cerulia.core.campaign/bad\nkey"); err == nil {
		t.Fatal("expected ParseRef to reject control characters")
	}
}
