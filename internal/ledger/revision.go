package ledger

import "errors"

var ErrRebaseNeeded = errors.New("rebase needed")

func NextRevision(current int64, expected int64) (int64, error) {
	if current != expected {
		return 0, ErrRebaseNeeded
	}

	return current + 1, nil
}

func NextDualRevision(currentCase int64, currentReview int64, expectedCase int64, expectedReview int64, bumpReview bool) (int64, int64, error) {
	if currentCase != expectedCase || currentReview != expectedReview {
		return 0, 0, ErrRebaseNeeded
	}

	if bumpReview {
		return currentCase, currentReview + 1, nil
	}

	return currentCase + 1, currentReview, nil
}
