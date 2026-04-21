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

CREATE TABLE IF NOT EXISTS repo_collection_versions (
  repo_did TEXT NOT NULL,
  collection TEXT NOT NULL,
  version INTEGER NOT NULL,
  PRIMARY KEY (repo_did, collection)
);

CREATE TRIGGER IF NOT EXISTS records_repo_collection_versions_insert
AFTER INSERT ON records
BEGIN
  INSERT INTO repo_collection_versions (repo_did, collection, version)
  VALUES (NEW.repo_did, NEW.collection, 1)
  ON CONFLICT (repo_did, collection) DO UPDATE SET version = version + 1;
END;

CREATE TRIGGER IF NOT EXISTS records_repo_collection_versions_update
AFTER UPDATE ON records
BEGIN
  INSERT INTO repo_collection_versions (repo_did, collection, version)
  VALUES (NEW.repo_did, NEW.collection, 1)
  ON CONFLICT (repo_did, collection) DO UPDATE SET version = version + 1;
END;

CREATE TRIGGER IF NOT EXISTS records_repo_collection_versions_delete
AFTER DELETE ON records
BEGIN
  INSERT INTO repo_collection_versions (repo_did, collection, version)
  VALUES (OLD.repo_did, OLD.collection, 1)
  ON CONFLICT (repo_did, collection) DO UPDATE SET version = version + 1;
END;

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