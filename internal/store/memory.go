package store

import (
	"context"
	"encoding/json"
	"sort"
	"sync"

	"cerulia/internal/ledger"
)

type MemoryStore struct {
	mu          sync.Mutex
	stable      map[string]StableRecord
	appendOnly  map[string]AppendRecord
	currentHead map[string]ledger.HeadRecord
	idempotency map[ledger.IdempotencyKey]ledger.MutationAck
	serviceLogs []ledger.ServiceLogEntry
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		stable:      map[string]StableRecord{},
		appendOnly:  map[string]AppendRecord{},
		currentHead: map[string]ledger.HeadRecord{},
		idempotency: map[ledger.IdempotencyKey]ledger.MutationAck{},
		serviceLogs: []ledger.ServiceLogEntry{},
	}
}

func (store *MemoryStore) WithTx(_ context.Context, fn func(Tx) error) error {
	store.mu.Lock()
	defer store.mu.Unlock()

	clone := store.clone()
	tx := &memoryTx{state: clone}
	if err := fn(tx); err != nil {
		return err
	}

	store.stable = clone.stable
	store.appendOnly = clone.appendOnly
	store.currentHead = clone.currentHead
	store.idempotency = clone.idempotency
	store.serviceLogs = clone.serviceLogs

	return nil
}

func (store *MemoryStore) GetStable(_ context.Context, ref string) (StableRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return getStable(store.stable, ref)
}

func (store *MemoryStore) ListStableByCollection(_ context.Context, collection string) ([]StableRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return listStableByCollection(store.stable, collection), nil
}

func (store *MemoryStore) GetAppend(_ context.Context, ref string) (AppendRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return getAppend(store.appendOnly, ref)
}

func (store *MemoryStore) ListAppendByCollection(_ context.Context, collection string) ([]AppendRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return listAppendByCollection(store.appendOnly, collection), nil
}

func (store *MemoryStore) GetCurrentHead(_ context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return getCurrentHead(store.currentHead, subjectRef, subjectKind), nil
}

func (store *MemoryStore) ListCurrentHeads(_ context.Context) ([]ledger.HeadRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return listCurrentHeads(store.currentHead), nil
}

func (store *MemoryStore) ListServiceLogs(_ context.Context) ([]ledger.ServiceLogEntry, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	return cloneServiceLogs(store.serviceLogs), nil
}

type memoryTx struct {
	state *MemoryStore
}

func (tx *memoryTx) GetStable(_ context.Context, ref string) (StableRecord, error) {
	return getStable(tx.state.stable, ref)
}

func (tx *memoryTx) ListStableByCollection(_ context.Context, collection string) ([]StableRecord, error) {
	return listStableByCollection(tx.state.stable, collection), nil
}

func (tx *memoryTx) GetAppend(_ context.Context, ref string) (AppendRecord, error) {
	return getAppend(tx.state.appendOnly, ref)
}

func (tx *memoryTx) ListAppendByCollection(_ context.Context, collection string) ([]AppendRecord, error) {
	return listAppendByCollection(tx.state.appendOnly, collection), nil
}

func (tx *memoryTx) GetCurrentHead(_ context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error) {
	return getCurrentHead(tx.state.currentHead, subjectRef, subjectKind), nil
}

func (tx *memoryTx) ListCurrentHeads(_ context.Context) ([]ledger.HeadRecord, error) {
	return listCurrentHeads(tx.state.currentHead), nil
}

func (tx *memoryTx) ListServiceLogs(_ context.Context) ([]ledger.ServiceLogEntry, error) {
	return cloneServiceLogs(tx.state.serviceLogs), nil
}

func (tx *memoryTx) GetIdempotency(_ context.Context, key ledger.IdempotencyKey) (*ledger.MutationAck, error) {
	ack, ok := tx.state.idempotency[key]
	if !ok {
		return nil, nil
	}
	clone := ack
	clone.EmittedRecordRefs = append([]string(nil), ack.EmittedRecordRefs...)
	return &clone, nil
}

func (tx *memoryTx) PutIdempotency(_ context.Context, key ledger.IdempotencyKey, ack ledger.MutationAck) error {
	tx.state.idempotency[key] = cloneAck(ack)
	return nil
}

func (tx *memoryTx) PutStable(_ context.Context, record StableRecord) error {
	if current, ok := tx.state.stable[record.Ref]; ok {
		if record.Revision != current.Revision+1 {
			return ErrConflict
		}
	} else if record.Revision != 1 {
		return ErrConflict
	}
	tx.state.stable[record.Ref] = cloneStableRecord(record)
	return nil
}

func (tx *memoryTx) PutAppend(_ context.Context, record AppendRecord) error {
	tx.state.appendOnly[record.Ref] = cloneAppendRecord(record)
	return nil
}

func (tx *memoryTx) PutCurrentHead(_ context.Context, head ledger.HeadRecord) error {
	tx.state.currentHead[headKey(head.SubjectRef, head.SubjectKind)] = head
	return nil
}

func (tx *memoryTx) AppendServiceLog(_ context.Context, entry ledger.ServiceLogEntry) error {
	tx.state.serviceLogs = append(tx.state.serviceLogs, cloneServiceLog(entry))
	return nil
}

func (store *MemoryStore) clone() *MemoryStore {
	clone := NewMemoryStore()
	for ref, record := range store.stable {
		clone.stable[ref] = cloneStableRecord(record)
	}
	for ref, record := range store.appendOnly {
		clone.appendOnly[ref] = cloneAppendRecord(record)
	}
	for key, head := range store.currentHead {
		clone.currentHead[key] = head
	}
	for key, ack := range store.idempotency {
		clone.idempotency[key] = cloneAck(ack)
	}
	clone.serviceLogs = cloneServiceLogs(store.serviceLogs)
	return clone
}

func getStable(records map[string]StableRecord, ref string) (StableRecord, error) {
	record, ok := records[ref]
	if !ok {
		return StableRecord{}, ErrNotFound
	}
	return cloneStableRecord(record), nil
}

func getAppend(records map[string]AppendRecord, ref string) (AppendRecord, error) {
	record, ok := records[ref]
	if !ok {
		return AppendRecord{}, ErrNotFound
	}
	return cloneAppendRecord(record), nil
}

func listStableByCollection(records map[string]StableRecord, collection string) []StableRecord {
	items := make([]StableRecord, 0)
	for _, record := range records {
		if record.Collection != collection {
			continue
		}
		items = append(items, cloneStableRecord(record))
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].UpdatedAt.Equal(items[right].UpdatedAt) {
			return items[left].Ref < items[right].Ref
		}
		return items[left].UpdatedAt.After(items[right].UpdatedAt)
	})
	return items
}

func listAppendByCollection(records map[string]AppendRecord, collection string) []AppendRecord {
	items := make([]AppendRecord, 0)
	for _, record := range records {
		if record.Collection != collection {
			continue
		}
		items = append(items, cloneAppendRecord(record))
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].CreatedAt.Equal(items[right].CreatedAt) {
			return items[left].Ref > items[right].Ref
		}
		return items[left].CreatedAt.After(items[right].CreatedAt)
	})
	return items
}

func getCurrentHead(records map[string]ledger.HeadRecord, subjectRef string, subjectKind string) *ledger.HeadRecord {
	head, ok := records[headKey(subjectRef, subjectKind)]
	if !ok {
		return nil
	}
	clone := head
	return &clone
}

func listCurrentHeads(records map[string]ledger.HeadRecord) []ledger.HeadRecord {
	items := make([]ledger.HeadRecord, 0, len(records))
	for _, record := range records {
		items = append(items, record)
	}
	sort.Slice(items, func(left int, right int) bool {
		if items[left].SubjectKind == items[right].SubjectKind {
			return items[left].SubjectRef < items[right].SubjectRef
		}
		return items[left].SubjectKind < items[right].SubjectKind
	})
	return items
}

func cloneStableRecord(record StableRecord) StableRecord {
	clone := record
	clone.Body = append(json.RawMessage(nil), record.Body...)
	return clone
}

func cloneAppendRecord(record AppendRecord) AppendRecord {
	clone := record
	clone.Body = append(json.RawMessage(nil), record.Body...)
	return clone
}

func cloneAck(ack ledger.MutationAck) ledger.MutationAck {
	clone := ack
	clone.EmittedRecordRefs = append([]string(nil), ack.EmittedRecordRefs...)
	return clone
}

func cloneServiceLog(entry ledger.ServiceLogEntry) ledger.ServiceLogEntry {
	clone := entry
	clone.EmittedRecordRefs = append([]string(nil), entry.EmittedRecordRefs...)
	clone.RawPayload = append(json.RawMessage(nil), entry.RawPayload...)
	clone.RedactedPayload = append(json.RawMessage(nil), entry.RedactedPayload...)
	return clone
}

func cloneServiceLogs(entries []ledger.ServiceLogEntry) []ledger.ServiceLogEntry {
	items := make([]ledger.ServiceLogEntry, 0, len(entries))
	for _, entry := range entries {
		items = append(items, cloneServiceLog(entry))
	}
	return items
}

func headKey(subjectRef string, subjectKind string) string {
	return subjectKind + "\x00" + subjectRef
}
