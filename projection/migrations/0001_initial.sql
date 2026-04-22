CREATE TABLE IF NOT EXISTS scenario_catalog (
  scenario_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  ruleset_nsid TEXT,
  has_recommended_sheet_schema INTEGER NOT NULL,
  summary TEXT,
  PRIMARY KEY (scenario_ref)
);

CREATE INDEX IF NOT EXISTS scenario_catalog_by_ruleset_title
  ON scenario_catalog (ruleset_nsid, title, scenario_ref);