ALTER TABLE records ADD COLUMN cid TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS pinned_records (
  uri TEXT NOT NULL,
  cid TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (uri, cid)
);