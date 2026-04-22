CREATE TABLE IF NOT EXISTS scenario_catalog_entries (
  scenario_ref TEXT NOT NULL,
  repo_did TEXT NOT NULL,
  generation INTEGER NOT NULL,
  title TEXT NOT NULL,
  ruleset_nsid TEXT,
  has_recommended_sheet_schema INTEGER NOT NULL,
  summary TEXT,
  PRIMARY KEY (scenario_ref, generation)
);

CREATE INDEX IF NOT EXISTS scenario_catalog_entries_by_repo_generation
  ON scenario_catalog_entries (repo_did, generation, scenario_ref);

CREATE INDEX IF NOT EXISTS scenario_catalog_entries_by_ruleset_title
  ON scenario_catalog_entries (ruleset_nsid, title, scenario_ref);

CREATE TABLE IF NOT EXISTS scenario_catalog_repo_state (
  repo_did TEXT NOT NULL,
  active_generation INTEGER NOT NULL,
  PRIMARY KEY (repo_did)
);

INSERT OR IGNORE INTO scenario_catalog_repo_state (repo_did, active_generation)
SELECT '__legacy_snapshot__', 1
WHERE EXISTS (SELECT 1 FROM scenario_catalog);

INSERT OR IGNORE INTO scenario_catalog_entries (
  scenario_ref,
  repo_did,
  generation,
  title,
  ruleset_nsid,
  has_recommended_sheet_schema,
  summary
)
SELECT
  scenario_ref,
  '__legacy_snapshot__',
  1,
  title,
  ruleset_nsid,
  has_recommended_sheet_schema,
  summary
FROM scenario_catalog;