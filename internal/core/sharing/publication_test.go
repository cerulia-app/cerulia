package sharing

import (
	"errors"
	"testing"
	"time"
)

func TestValidatePublicationHeadRejectsIndependentRoot(t *testing.T) {
	current := &Publication{Ref: "pub-1", SubjectRef: "subject-1", SubjectKind: "character-episode", PreferredSurfaceKind: "app-card", Status: "active", Surfaces: []SurfaceDescriptor{{SurfaceKind: "app-card", Status: "active"}}}
	candidate := Publication{Ref: "pub-2", SubjectRef: "subject-1", SubjectKind: "character-episode", PreferredSurfaceKind: "app-card", Status: "active", Surfaces: []SurfaceDescriptor{{SurfaceKind: "app-card", Status: "active"}}}

	err := ValidatePublicationHead(current, candidate)
	if !errors.Is(err, ErrInvalidPublication) {
		t.Fatalf("expected invalid publication root, got %v", err)
	}

	err = ValidatePublicationHead(nil, Publication{Ref: "pub-1", SubjectRef: "subject-1", SubjectKind: "character-episode", PreferredSurfaceKind: "app-card", Status: "active", Surfaces: []SurfaceDescriptor{{SurfaceKind: "app-card", Status: "active"}}})
	if err != nil {
		t.Fatalf("unexpected initial publication validation error: %v", err)
	}

	err = ValidatePublicationHead(current, Publication{Ref: "pub-2", SubjectRef: "subject-2", SubjectKind: "character-episode", PreferredSurfaceKind: "app-card", Status: "active", SupersedesRef: "pub-1", Surfaces: []SurfaceDescriptor{{SurfaceKind: "app-card", Status: "active"}}})
	if !errors.Is(err, ErrInvalidPublication) {
		t.Fatalf("expected subject mismatch to fail, got %v", err)
	}

	err = ValidatePublicationHead(current, Publication{Ref: "pub-2", SubjectRef: "subject-1", SubjectKind: "character-episode", PreferredSurfaceKind: "app-card", Status: "active", SupersedesRef: "pub-0", Surfaces: []SurfaceDescriptor{{SurfaceKind: "app-card", Status: "active"}}})
	if !errors.Is(err, ErrInvalidPublication) {
		t.Fatalf("expected supersedes mismatch to fail, got %v", err)
	}
}

func TestRetirePublicationRemovesActiveSurfaces(t *testing.T) {
	now := time.Date(2026, 4, 3, 0, 0, 0, 0, time.UTC)
	current := Publication{
		Ref:                  "pub-1",
		SubjectRef:           "subject-1",
		SubjectKind:          "character-episode",
		PreferredSurfaceKind: "app-card",
		Status:               "active",
		PublishedAt:          now,
		Surfaces: []SurfaceDescriptor{{
			SurfaceKind: "app-card",
			PurposeKind: "stable-entry",
			SurfaceURI:  "https://example.com/publications/1",
			Status:      "active",
		}, {
			SurfaceKind: "thread",
			PurposeKind: "discovery",
			SurfaceURI:  "https://example.com/thread/1",
			Status:      "active",
		}},
	}

	retired, err := RetirePublication(current, "pub-2", now.Add(time.Hour))
	if err != nil {
		t.Fatalf("unexpected retire error: %v", err)
	}
	if retired.Status != "retired" || retired.RetiredAt == nil {
		t.Fatalf("unexpected retired publication: %+v", retired)
	}
	for _, surface := range retired.Surfaces {
		if surface.Status != "retired" || surface.RetiredAt == nil {
			t.Fatalf("expected all surfaces to be retired, got %+v", retired.Surfaces)
		}
	}
}
