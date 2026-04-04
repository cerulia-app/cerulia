package ledger

import (
	"errors"
	"fmt"
	"sync"
)

type IdempotencyKey struct {
	GoverningRef  string
	OperationNSID string
	RequestID     string
}

type MemoryIdempotencyStore struct {
	mu      sync.Mutex
	records map[IdempotencyKey]MutationAck
}

func NewMemoryIdempotencyStore() *MemoryIdempotencyStore {
	return &MemoryIdempotencyStore{
		records: map[IdempotencyKey]MutationAck{},
	}
}

func (store *MemoryIdempotencyStore) CheckOrRecord(key IdempotencyKey, ack MutationAck) (MutationAck, bool, error) {
	if err := key.Validate(); err != nil {
		return MutationAck{}, false, err
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	if existing, ok := store.records[key]; ok {
		return cloneAck(existing), true, nil
	}

	store.records[key] = cloneAck(ack)
	return cloneAck(ack), false, nil
}

func (key IdempotencyKey) Validate() error {
	if key.GoverningRef == "" {
		return errors.New("governing ref is required")
	}
	if key.OperationNSID == "" {
		return errors.New("operation NSID is required")
	}
	if key.RequestID == "" {
		return errors.New("request ID is required")
	}

	return nil
}

func (key IdempotencyKey) String() string {
	return fmt.Sprintf("%s:%s:%s", key.GoverningRef, key.OperationNSID, key.RequestID)
}

func cloneAck(ack MutationAck) MutationAck {
	clone := ack
	clone.EmittedRecordRefs = append([]string(nil), ack.EmittedRecordRefs...)

	return clone
}
