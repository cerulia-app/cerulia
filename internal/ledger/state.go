package ledger

import (
	"errors"
	"slices"
)

var ErrRejected = errors.New("rejected")

func EnsureExpectedState(current string, expected string) error {
	if current != expected {
		return ErrRejected
	}

	return nil
}

func EnsureExpectedVisibility(current string, expected string) error {
	if current != expected {
		return ErrRejected
	}

	return nil
}

type AuthoritySnapshot struct {
	RequestID      string
	TransferPhase  string
	ControllerDids []string
}

func EnsureAuthoritySnapshot(current AuthoritySnapshot, expectedRequestID string, expectedTransferPhase string, expectedControllerDids []string) error {
	if current.RequestID != expectedRequestID || current.TransferPhase != expectedTransferPhase {
		return ErrRejected
	}

	controllers := append([]string(nil), current.ControllerDids...)
	expected := append([]string(nil), expectedControllerDids...)
	slices.Sort(controllers)
	slices.Sort(expected)
	if !slices.Equal(controllers, expected) {
		return ErrRejected
	}

	return nil
}
