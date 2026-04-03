package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"cerulia/internal/ledger"
)

var (
	ErrNotFound = errors.New("store record not found")
	ErrConflict = errors.New("store revision conflict")
)

type StableRecord struct {
	Ref        string
	Collection string
	RepoDID    string
	RecordKey  string
	RequestID  string
	Revision   int64
	Body       json.RawMessage
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type AppendRecord struct {
	Ref          string
	Collection   string
	RepoDID      string
	RecordKey    string
	GoverningRef string
	RequestID    string
	Body         json.RawMessage
	CreatedAt    time.Time
}

type Reader interface {
	GetStable(ctx context.Context, ref string) (StableRecord, error)
	ListStableByCollection(ctx context.Context, collection string) ([]StableRecord, error)
	GetAppend(ctx context.Context, ref string) (AppendRecord, error)
	ListAppendByCollection(ctx context.Context, collection string) ([]AppendRecord, error)
	GetCurrentHead(ctx context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error)
	ListCurrentHeads(ctx context.Context) ([]ledger.HeadRecord, error)
	ListServiceLogs(ctx context.Context) ([]ledger.ServiceLogEntry, error)
}

type Tx interface {
	Reader
	GetIdempotency(ctx context.Context, key ledger.IdempotencyKey) (*ledger.MutationAck, error)
	PutIdempotency(ctx context.Context, key ledger.IdempotencyKey, ack ledger.MutationAck) error
	PutStable(ctx context.Context, record StableRecord) error
	PutAppend(ctx context.Context, record AppendRecord) error
	PutCurrentHead(ctx context.Context, head ledger.HeadRecord) error
	AppendServiceLog(ctx context.Context, entry ledger.ServiceLogEntry) error
}

type Store interface {
	Reader
	WithTx(ctx context.Context, fn func(Tx) error) error
}
