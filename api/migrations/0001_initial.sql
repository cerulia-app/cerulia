CREATE TABLE IF NOT EXISTS records (
  repo_did TEXT NOT NULL,
  collection TEXT NOT NULL,
  rkey TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (repo_did, collection, rkey)
);

CREATE INDEX IF NOT EXISTS records_by_collection
  ON records (collection, repo_did, updated_at);

CREATE TABLE IF NOT EXISTS owned_blobs (
  repo_did TEXT NOT NULL,
  blob_cid TEXT NOT NULL,
  blob_json TEXT NOT NULL,
  PRIMARY KEY (repo_did, blob_cid)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (state_key)
);

CREATE TABLE IF NOT EXISTS oauth_sessions (
  subject TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (subject)
);

CREATE TABLE IF NOT EXISTS browser_sessions (
  session_id TEXT NOT NULL,
  did TEXT NOT NULL,
  granted_scope TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (session_id)
);

CREATE INDEX IF NOT EXISTS browser_sessions_by_did
  ON browser_sessions (did, updated_at);