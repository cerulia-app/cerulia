CREATE TABLE IF NOT EXISTS cerulia_stable_records (
	record_ref TEXT PRIMARY KEY,
	collection_nsid TEXT NOT NULL,
	repo_did TEXT NOT NULL,
	record_key TEXT NOT NULL,
	request_id TEXT NOT NULL,
	revision BIGINT NOT NULL,
	body JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL,
	UNIQUE (collection_nsid, repo_did, record_key)
);

CREATE INDEX IF NOT EXISTS cerulia_stable_records_collection_idx ON cerulia_stable_records (collection_nsid, updated_at DESC, record_ref ASC);

CREATE TABLE IF NOT EXISTS cerulia_append_records (
	record_ref TEXT PRIMARY KEY,
	collection_nsid TEXT NOT NULL,
	repo_did TEXT NOT NULL,
	record_key TEXT NOT NULL,
	governing_ref TEXT NOT NULL,
	request_id TEXT NOT NULL,
	body JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL,
	UNIQUE (collection_nsid, repo_did, record_key)
);

CREATE INDEX IF NOT EXISTS cerulia_append_records_collection_idx ON cerulia_append_records (collection_nsid, created_at DESC, record_ref DESC);
CREATE INDEX IF NOT EXISTS cerulia_append_records_governing_idx ON cerulia_append_records (governing_ref, created_at DESC);