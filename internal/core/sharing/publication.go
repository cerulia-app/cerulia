package sharing

import (
	"errors"
	"time"
)

var ErrInvalidPublication = errors.New("invalid publication")

type SurfaceDescriptor struct {
	SurfaceKind string
	PurposeKind string
	SurfaceURI  string
	Status      string
	RetiredAt   *time.Time
}

type Publication struct {
	Ref                  string
	SubjectRef           string
	SubjectKind          string
	ReuseGrantRef        string
	EntryURL             string
	PreferredSurfaceKind string
	Surfaces             []SurfaceDescriptor
	Status               string
	SupersedesRef        string
	PublishedAt          time.Time
	RetiredAt            *time.Time
}

func ValidatePublicationHead(current *Publication, candidate Publication) error {
	if candidate.Ref == "" || candidate.SubjectRef == "" || candidate.SubjectKind == "" {
		return ErrInvalidPublication
	}
	if err := ValidatePublication(candidate); err != nil {
		return err
	}

	if current == nil {
		if candidate.SupersedesRef != "" {
			return ErrInvalidPublication
		}
		return nil
	}
	if candidate.Ref == current.Ref {
		return ErrInvalidPublication
	}

	if candidate.SubjectRef != current.SubjectRef || candidate.SubjectKind != current.SubjectKind {
		return ErrInvalidPublication
	}
	if candidate.SupersedesRef != current.Ref {
		return ErrInvalidPublication
	}

	return nil
}

func ValidatePublication(publication Publication) error {
	if publication.SubjectKind != "campaign" && publication.SubjectKind != "character-branch" && publication.SubjectKind != "character-episode" {
		return ErrInvalidPublication
	}
	if publication.Status != "active" && publication.Status != "retired" {
		return ErrInvalidPublication
	}
	if publication.Status == "active" && publication.PreferredSurfaceKind == "" {
		return ErrInvalidPublication
	}

	activeByKind := map[string]int{}
	activeSurfaces := 0
	preferredActive := false
	for _, surface := range publication.Surfaces {
		if surface.Status != "active" {
			continue
		}
		activeSurfaces++
		activeByKind[surface.SurfaceKind]++
		if activeByKind[surface.SurfaceKind] > 1 {
			return ErrInvalidPublication
		}
		if surface.SurfaceKind == publication.PreferredSurfaceKind {
			preferredActive = true
		}
	}

	if publication.Status == "retired" {
		if publication.RetiredAt == nil {
			return ErrInvalidPublication
		}
		for _, surface := range publication.Surfaces {
			if surface.Status == "active" {
				return ErrInvalidPublication
			}
		}
		return nil
	}

	if activeSurfaces == 0 || !preferredActive {
		return ErrInvalidPublication
	}

	return nil
}

func RetirePublication(current Publication, newRef string, retiredAt time.Time) (Publication, error) {
	if newRef == current.Ref {
		return Publication{}, ErrInvalidPublication
	}

	retired := current
	retired.Ref = newRef
	retired.Status = "retired"
	retired.SupersedesRef = current.Ref
	retired.RetiredAt = &retiredAt
	retired.Surfaces = make([]SurfaceDescriptor, 0, len(current.Surfaces))
	for _, surface := range current.Surfaces {
		retired.Surfaces = append(retired.Surfaces, SurfaceDescriptor{
			SurfaceKind: surface.SurfaceKind,
			PurposeKind: surface.PurposeKind,
			SurfaceURI:  surface.SurfaceURI,
			Status:      "retired",
			RetiredAt:   &retiredAt,
		})
	}

	if err := ValidatePublicationHead(&current, retired); err != nil {
		return Publication{}, err
	}

	return retired, nil
}
