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