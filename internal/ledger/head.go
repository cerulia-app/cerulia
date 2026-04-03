package ledger

import "errors"

var ErrInvalidHeadTransition = errors.New("invalid current head transition")

type HeadRecord struct {
	SubjectRef     string
	SubjectKind    string
	CurrentHeadRef string
	ChainRootRef   string
	RequestID      string
}

type HeadCandidate struct {
	SubjectRef    string
	SubjectKind   string
	HeadRef       string
	SupersedesRef string
	RequestID     string
}

func AdvanceCurrentHead(current *HeadRecord, candidate HeadCandidate) (HeadRecord, error) {
	if candidate.HeadRef == "" {
		return HeadRecord{}, ErrInvalidHeadTransition
	}

	if current == nil {
		if candidate.SubjectRef == "" || candidate.SubjectKind == "" {
			return HeadRecord{}, ErrInvalidHeadTransition
		}
		if candidate.SupersedesRef != "" {
			return HeadRecord{}, ErrInvalidHeadTransition
		}

		return HeadRecord{
			SubjectRef:     candidate.SubjectRef,
			SubjectKind:    candidate.SubjectKind,
			CurrentHeadRef: candidate.HeadRef,
			ChainRootRef:   candidate.HeadRef,
			RequestID:      candidate.RequestID,
		}, nil
	}

	if current.CurrentHeadRef == "" || current.SubjectRef == "" || current.SubjectKind == "" {
		return HeadRecord{}, ErrInvalidHeadTransition
	}
	if candidate.SubjectRef != "" && candidate.SubjectRef != current.SubjectRef {
		return HeadRecord{}, ErrInvalidHeadTransition
	}
	if candidate.SubjectKind != "" && candidate.SubjectKind != current.SubjectKind {
		return HeadRecord{}, ErrInvalidHeadTransition
	}
	if candidate.SupersedesRef != current.CurrentHeadRef {
		return HeadRecord{}, ErrInvalidHeadTransition
	}

	return HeadRecord{
		SubjectRef:     current.SubjectRef,
		SubjectKind:    current.SubjectKind,
		CurrentHeadRef: candidate.HeadRef,
		ChainRootRef:   current.ChainRootRef,
		RequestID:      candidate.RequestID,
	}, nil
}
