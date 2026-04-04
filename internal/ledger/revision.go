package ledger

import "errors"

var ErrRebaseNeeded = errors.New("rebase needed")

func NextRevision(current int64, expected int64) (int64, error) {
	if current != expected {
		return 0, ErrRebaseNeeded
	}

	return current + 1, nil
}
