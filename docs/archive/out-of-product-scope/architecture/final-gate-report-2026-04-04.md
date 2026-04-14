# Backend Final Gate Report 2026-04-04

## Scope

この報告は Cerulia backend の Final Gate 証跡を固定するためのものである。対象は product-core backend に限り、`appview` submodule 自体の実装レビューは含めない。

## Automated Evidence

- code-only full suite: `runTests` で 92 passed, 0 failed
- versioned contract artifact: `./scripts/contracts.ps1 -Version 0.1.0` を実行し、`.artifacts/contracts/0.1.0/manifest.json` で `artifactVersion = 0.1.0` と `sourceGitSha = d815c8f10bf5c3b636d9b5ea35420f8ec50700ce` を確認した
- Postgres を含む full suite: ephemeral Postgres に migration を適用した後の `go test ./...` が green
- Postgres final gate rehearsal: `CERULIA_TEST_DATABASE_URL` を与えた `go test ./internal/core/projection -run TestPostgresFinalGateRehearsal` が green
- non-local direct-URL proof: `APP_ENV=staging` と `DATABASE_URL_DIRECT` だけを与えた `go run ./cmd/migrate` と `go run ./cmd/rebuild` が green
- rebuild validator: `./scripts/rebuild.ps1` が次の report を返した

```json
{
  "publicationChains": 2,
  "currentHeads": 2,
  "characterHomes": 1,
  "characterEpisodePages": 1,
  "reuseGrantPages": 1,
  "campaignOwnerViews": 1,
  "campaignPublicViews": 1,
  "publicationOwnerLists": 2,
  "publicationPublicLists": 2
}
```

- smoke rehearsal: ephemeral Postgres と一時 API を起動したうえで `./scripts/smoke.ps1 -RulesetManifestRef at://did:plc:rules/app.cerulia.core.rulesetManifest/final-gate` が成功

## Final Gate Mapping

- projection rebuild: `cmd/rebuild`, `scripts/rebuild.ps1`, `TestValidateRebuildReplaysLongRunningAuditScenario`, `TestPostgresFinalGateRehearsal`
- migration rehearsal: `./scripts/migrate.ps1` と `TestPostgresFinalGateRehearsal`
- long-running correction / retire / revoke 監査: `TestValidateRebuildReplaysLongRunningAuditScenario`
- clean-slate review: completion review agents signoff with no blocking findings

## Notes

- backend projection は materialized table を再生成する方式ではなく、canonical record と publication current head を再計算しながら主要 query fold を replay して drift を検証する
- restore drill の staging / Neon branch 実行は repo 外の release / operations artifact とし、backend repo の Final Gate は migrate + rebuild + smoke の再現可能性と自動テスト証跡で閉じる