package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"cerulia/internal/ledger"
	"cerulia/internal/platform/database"

	"github.com/jackc/pgx/v5"
)

type PostgresStore struct {
	db *database.DB
}

func NewPostgresStore(db *database.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (store *PostgresStore) WithTx(ctx context.Context, fn func(Tx) error) error {
	if store == nil || store.db == nil {
		return database.ErrDisabled
	}

	return store.db.WithTx(ctx, func(tx pgx.Tx) error {
		return fn(&postgresTx{tx: tx})
	})
}

func (store *PostgresStore) GetStable(ctx context.Context, ref string) (StableRecord, error) {
	if store == nil || store.db == nil {
		return StableRecord{}, database.ErrDisabled
	}

	record, err := scanStableRow(store.db.QueryRow(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, request_id, revision, body, created_at, updated_at
		FROM cerulia_stable_records
		WHERE record_ref = $1
	`, ref))
	if err != nil {
		return StableRecord{}, err
	}

	return record, nil
}

func (store *PostgresStore) ListStableByCollection(ctx context.Context, collection string) ([]StableRecord, error) {
	if store == nil || store.db == nil {
		return nil, database.ErrDisabled
	}

	rows, err := store.db.Query(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, request_id, revision, body, created_at, updated_at
		FROM cerulia_stable_records
		WHERE collection_nsid = $1
		ORDER BY updated_at DESC, record_ref ASC
	`, collection)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]StableRecord, 0)
	for rows.Next() {
		record, err := scanStableRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stable records: %w", err)
	}

	return items, nil
}

func (store *PostgresStore) GetAppend(ctx context.Context, ref string) (AppendRecord, error) {
	if store == nil || store.db == nil {
		return AppendRecord{}, database.ErrDisabled
	}

	record, err := scanAppendRow(store.db.QueryRow(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, governing_ref, request_id, body, created_at
		FROM cerulia_append_records
		WHERE record_ref = $1
	`, ref))
	if err != nil {
		return AppendRecord{}, err
	}

	return record, nil
}

func (store *PostgresStore) ListAppendByCollection(ctx context.Context, collection string) ([]AppendRecord, error) {
	if store == nil || store.db == nil {
		return nil, database.ErrDisabled
	}

	rows, err := store.db.Query(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, governing_ref, request_id, body, created_at
		FROM cerulia_append_records
		WHERE collection_nsid = $1
		ORDER BY created_at DESC, record_ref DESC
	`, collection)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]AppendRecord, 0)
	for rows.Next() {
		record, err := scanAppendRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate append records: %w", err)
	}

	return items, nil
}

func (store *PostgresStore) GetCurrentHead(ctx context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error) {
	if store == nil || store.db == nil {
		return nil, database.ErrDisabled
	}

	head, err := scanCurrentHeadRow(store.db.QueryRow(ctx, `
		SELECT subject_ref, subject_kind, current_head_ref, chain_root_ref, request_id
		FROM cerulia_current_heads
		WHERE subject_ref = $1 AND subject_kind = $2
	`, subjectRef, subjectKind))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &head, nil
}

func (store *PostgresStore) ListCurrentHeads(ctx context.Context) ([]ledger.HeadRecord, error) {
	if store == nil || store.db == nil {
		return nil, database.ErrDisabled
	}

	rows, err := store.db.Query(ctx, `
		SELECT subject_ref, subject_kind, current_head_ref, chain_root_ref, request_id
		FROM cerulia_current_heads
		ORDER BY subject_kind ASC, subject_ref ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ledger.HeadRecord, 0)
	for rows.Next() {
		var head ledger.HeadRecord
		if err := rows.Scan(&head.SubjectRef, &head.SubjectKind, &head.CurrentHeadRef, &head.ChainRootRef, &head.RequestID); err != nil {
			return nil, fmt.Errorf("scan current head: %w", err)
		}
		items = append(items, head)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current heads: %w", err)
	}

	return items, nil
}

func (store *PostgresStore) ListServiceLogs(ctx context.Context) ([]ledger.ServiceLogEntry, error) {
	if store == nil || store.db == nil {
		return nil, database.ErrDisabled
	}

	rows, err := store.db.Query(ctx, `
		SELECT request_id, operation_nsid, governing_ref, actor_did, result_kind, reason_code, message, emitted_record_refs, created_at, raw_payload, redacted_payload
		FROM cerulia_service_log
		ORDER BY created_at DESC, id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]ledger.ServiceLogEntry, 0)
	for rows.Next() {
		var entry ledger.ServiceLogEntry
		var emitted []string
		if err := rows.Scan(&entry.RequestID, &entry.OperationNSID, &entry.GoverningRef, &entry.ActorDID, &entry.ResultKind, &entry.ReasonCode, &entry.Message, &emitted, &entry.CreatedAt, &entry.RawPayload, &entry.RedactedPayload); err != nil {
			return nil, fmt.Errorf("scan service log: %w", err)
		}
		entry.EmittedRecordRefs = append([]string(nil), emitted...)
		items = append(items, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate service logs: %w", err)
	}

	return items, nil
}

type postgresTx struct {
	tx pgx.Tx
}

func (tx *postgresTx) GetStable(ctx context.Context, ref string) (StableRecord, error) {
	return scanStableRow(tx.tx.QueryRow(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, request_id, revision, body, created_at, updated_at
		FROM cerulia_stable_records
		WHERE record_ref = $1
	`, ref))
}

func (tx *postgresTx) ListStableByCollection(ctx context.Context, collection string) ([]StableRecord, error) {
	rows, err := tx.tx.Query(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, request_id, revision, body, created_at, updated_at
		FROM cerulia_stable_records
		WHERE collection_nsid = $1
		ORDER BY updated_at DESC, record_ref ASC
	`, collection)
	if err != nil {
		return nil, fmt.Errorf("query stable records: %w", err)
	}
	defer rows.Close()

	items := make([]StableRecord, 0)
	for rows.Next() {
		record, err := scanStableRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stable records: %w", err)
	}

	return items, nil
}

func (tx *postgresTx) GetAppend(ctx context.Context, ref string) (AppendRecord, error) {
	return scanAppendRow(tx.tx.QueryRow(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, governing_ref, request_id, body, created_at
		FROM cerulia_append_records
		WHERE record_ref = $1
	`, ref))
}

func (tx *postgresTx) ListAppendByCollection(ctx context.Context, collection string) ([]AppendRecord, error) {
	rows, err := tx.tx.Query(ctx, `
		SELECT record_ref, collection_nsid, repo_did, record_key, governing_ref, request_id, body, created_at
		FROM cerulia_append_records
		WHERE collection_nsid = $1
		ORDER BY created_at DESC, record_ref DESC
	`, collection)
	if err != nil {
		return nil, fmt.Errorf("query append records: %w", err)
	}
	defer rows.Close()

	items := make([]AppendRecord, 0)
	for rows.Next() {
		record, err := scanAppendRows(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate append records: %w", err)
	}

	return items, nil
}

func (tx *postgresTx) GetCurrentHead(ctx context.Context, subjectRef string, subjectKind string) (*ledger.HeadRecord, error) {
	head, err := scanCurrentHeadRow(tx.tx.QueryRow(ctx, `
		SELECT subject_ref, subject_kind, current_head_ref, chain_root_ref, request_id
		FROM cerulia_current_heads
		WHERE subject_ref = $1 AND subject_kind = $2
	`, subjectRef, subjectKind))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &head, nil
}

func (tx *postgresTx) ListCurrentHeads(ctx context.Context) ([]ledger.HeadRecord, error) {
	rows, err := tx.tx.Query(ctx, `
		SELECT subject_ref, subject_kind, current_head_ref, chain_root_ref, request_id
		FROM cerulia_current_heads
		ORDER BY subject_kind ASC, subject_ref ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query current heads: %w", err)
	}
	defer rows.Close()

	items := make([]ledger.HeadRecord, 0)
	for rows.Next() {
		var head ledger.HeadRecord
		if err := rows.Scan(&head.SubjectRef, &head.SubjectKind, &head.CurrentHeadRef, &head.ChainRootRef, &head.RequestID); err != nil {
			return nil, fmt.Errorf("scan current head: %w", err)
		}
		items = append(items, head)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate current heads: %w", err)
	}

	return items, nil
}

func (tx *postgresTx) ListServiceLogs(ctx context.Context) ([]ledger.ServiceLogEntry, error) {
	rows, err := tx.tx.Query(ctx, `
		SELECT request_id, operation_nsid, governing_ref, actor_did, result_kind, reason_code, message, emitted_record_refs, created_at, raw_payload, redacted_payload
		FROM cerulia_service_log
		ORDER BY created_at DESC, id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("query service logs: %w", err)
	}
	defer rows.Close()

	items := make([]ledger.ServiceLogEntry, 0)
	for rows.Next() {
		var entry ledger.ServiceLogEntry
		var emitted []string
		if err := rows.Scan(&entry.RequestID, &entry.OperationNSID, &entry.GoverningRef, &entry.ActorDID, &entry.ResultKind, &entry.ReasonCode, &entry.Message, &emitted, &entry.CreatedAt, &entry.RawPayload, &entry.RedactedPayload); err != nil {
			return nil, fmt.Errorf("scan service log: %w", err)
		}
		entry.EmittedRecordRefs = append([]string(nil), emitted...)
		items = append(items, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate service logs: %w", err)
	}

	return items, nil
}

func (tx *postgresTx) GetIdempotency(ctx context.Context, key ledger.IdempotencyKey) (*ledger.MutationAck, error) {
	var payload []byte
	err := tx.tx.QueryRow(ctx, `
		SELECT response_payload
		FROM cerulia_idempotency_keys
		WHERE governing_ref = $1 AND operation_nsid = $2 AND request_id = $3
	`, key.GoverningRef, key.OperationNSID, key.RequestID).Scan(&payload)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("query idempotency key: %w", err)
	}

	var ack ledger.MutationAck
	if err := json.Unmarshal(payload, &ack); err != nil {
		return nil, fmt.Errorf("decode idempotency payload: %w", err)
	}

	return &ack, nil
}

func (tx *postgresTx) PutIdempotency(ctx context.Context, key ledger.IdempotencyKey, ack ledger.MutationAck) error {
	payload, err := json.Marshal(ack)
	if err != nil {
		return fmt.Errorf("encode idempotency payload: %w", err)
	}

	_, err = tx.tx.Exec(ctx, `
		INSERT INTO cerulia_idempotency_keys (governing_ref, operation_nsid, request_id, result_kind, response_payload)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (governing_ref, operation_nsid, request_id)
		DO UPDATE SET result_kind = EXCLUDED.result_kind, response_payload = EXCLUDED.response_payload
	`, key.GoverningRef, key.OperationNSID, key.RequestID, string(ack.ResultKind), payload)
	if err != nil {
		return fmt.Errorf("store idempotency key: %w", err)
	}

	return nil
}

func (tx *postgresTx) PutStable(ctx context.Context, record StableRecord) error {
	_, err := tx.tx.Exec(ctx, `
		INSERT INTO cerulia_stable_records (
			record_ref, collection_nsid, repo_did, record_key, request_id, revision, body, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (record_ref)
		DO UPDATE SET request_id = EXCLUDED.request_id, revision = EXCLUDED.revision, body = EXCLUDED.body, updated_at = EXCLUDED.updated_at
	`, record.Ref, record.Collection, record.RepoDID, record.RecordKey, record.RequestID, record.Revision, record.Body, record.CreatedAt, record.UpdatedAt)
	if err != nil {
		return fmt.Errorf("upsert stable record %s: %w", record.Ref, err)
	}

	return nil
}

func (tx *postgresTx) PutAppend(ctx context.Context, record AppendRecord) error {
	_, err := tx.tx.Exec(ctx, `
		INSERT INTO cerulia_append_records (
			record_ref, collection_nsid, repo_did, record_key, governing_ref, request_id, body, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, record.Ref, record.Collection, record.RepoDID, record.RecordKey, record.GoverningRef, record.RequestID, record.Body, record.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert append record %s: %w", record.Ref, err)
	}

	return nil
}

func (tx *postgresTx) PutCurrentHead(ctx context.Context, head ledger.HeadRecord) error {
	_, err := tx.tx.Exec(ctx, `
		INSERT INTO cerulia_current_heads (subject_ref, subject_kind, current_head_ref, chain_root_ref, request_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (subject_ref, subject_kind)
		DO UPDATE SET current_head_ref = EXCLUDED.current_head_ref, chain_root_ref = EXCLUDED.chain_root_ref, request_id = EXCLUDED.request_id, updated_at = NOW()
	`, head.SubjectRef, head.SubjectKind, head.CurrentHeadRef, head.ChainRootRef, head.RequestID)
	if err != nil {
		return fmt.Errorf("upsert current head: %w", err)
	}

	return nil
}

func (tx *postgresTx) AppendServiceLog(ctx context.Context, entry ledger.ServiceLogEntry) error {
	_, err := tx.tx.Exec(ctx, `
		INSERT INTO cerulia_service_log (
			request_id, operation_nsid, governing_ref, actor_did, result_kind, reason_code, message, emitted_record_refs, created_at, raw_payload, redacted_payload
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, entry.RequestID, entry.OperationNSID, entry.GoverningRef, entry.ActorDID, string(entry.ResultKind), entry.ReasonCode, entry.Message, entry.EmittedRecordRefs, entry.CreatedAt, entry.RawPayload, entry.RedactedPayload)
	if err != nil {
		return fmt.Errorf("append service log: %w", err)
	}

	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

type rowsScanner interface {
	Scan(dest ...any) error
}

func scanStableRow(row rowScanner) (StableRecord, error) {
	var record StableRecord
	if err := row.Scan(&record.Ref, &record.Collection, &record.RepoDID, &record.RecordKey, &record.RequestID, &record.Revision, &record.Body, &record.CreatedAt, &record.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, database.ErrDisabled) {
			return StableRecord{}, ErrNotFound
		}
		return StableRecord{}, fmt.Errorf("scan stable record: %w", err)
	}
	return record, nil
}

func scanStableRows(rows rowsScanner) (StableRecord, error) {
	var record StableRecord
	if err := rows.Scan(&record.Ref, &record.Collection, &record.RepoDID, &record.RecordKey, &record.RequestID, &record.Revision, &record.Body, &record.CreatedAt, &record.UpdatedAt); err != nil {
		return StableRecord{}, fmt.Errorf("scan stable record: %w", err)
	}
	return record, nil
}

func scanAppendRow(row rowScanner) (AppendRecord, error) {
	var record AppendRecord
	if err := row.Scan(&record.Ref, &record.Collection, &record.RepoDID, &record.RecordKey, &record.GoverningRef, &record.RequestID, &record.Body, &record.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, database.ErrDisabled) {
			return AppendRecord{}, ErrNotFound
		}
		return AppendRecord{}, fmt.Errorf("scan append record: %w", err)
	}
	return record, nil
}

func scanAppendRows(rows rowsScanner) (AppendRecord, error) {
	var record AppendRecord
	if err := rows.Scan(&record.Ref, &record.Collection, &record.RepoDID, &record.RecordKey, &record.GoverningRef, &record.RequestID, &record.Body, &record.CreatedAt); err != nil {
		return AppendRecord{}, fmt.Errorf("scan append record: %w", err)
	}
	return record, nil
}

func scanCurrentHeadRow(row rowScanner) (ledger.HeadRecord, error) {
	var head ledger.HeadRecord
	if err := row.Scan(&head.SubjectRef, &head.SubjectKind, &head.CurrentHeadRef, &head.ChainRootRef, &head.RequestID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, database.ErrDisabled) {
			return ledger.HeadRecord{}, ErrNotFound
		}
		return ledger.HeadRecord{}, fmt.Errorf("scan current head: %w", err)
	}
	return head, nil
}
