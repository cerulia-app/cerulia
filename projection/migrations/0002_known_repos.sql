CREATE TABLE IF NOT EXISTS known_repos (
  repo_did TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (repo_did)
);

CREATE INDEX IF NOT EXISTS known_repos_by_updated_at
  ON known_repos (updated_at, repo_did);