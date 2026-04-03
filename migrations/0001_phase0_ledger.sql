CREATE TABLE IF NOT EXISTS cerulia_idempotency_keys (
	governing_ref TEXT NOT NULL,
	operation_nsid TEXT NOT NULL,
	request_id TEXT NOT NULL,
	result_kind TEXT NOT NULL,
	response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (governing_ref, operation_nsid, request_id)
);

CREATE TABLE IF NOT EXISTS cerulia_service_log (
	id BIGSERIAL PRIMARY KEY,
	request_id TEXT NOT NULL,
	operation_nsid TEXT NOT NULL,
	governing_ref TEXT NOT NULL,
	actor_did TEXT,
	result_kind TEXT NOT NULL,
	reason_code TEXT,
	message TEXT,
	emitted_record_refs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	redacted_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS cerulia_service_log_governing_ref_idx ON cerulia_service_log (governing_ref, created_at DESC);
CREATE INDEX IF NOT EXISTS cerulia_service_log_request_id_idx ON cerulia_service_log (request_id);

CREATE TABLE IF NOT EXISTS cerulia_current_heads (
	subject_ref TEXT NOT NULL,
	subject_kind TEXT NOT NULL,
	current_head_ref TEXT NOT NULL,
	chain_root_ref TEXT NOT NULL,
	request_id TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (subject_ref, subject_kind)
);

CREATE TABLE IF NOT EXISTS cerulia_revision_fences (
	resource_ref TEXT PRIMARY KEY,
	revision BIGINT NOT NULL,
	request_id TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cerulia_dual_revision_fences (
	resource_ref TEXT PRIMARY KEY,
	case_revision BIGINT NOT NULL,
	review_revision BIGINT NOT NULL,
	request_id TEXT NOT NULL,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);