# Cerulia Backend

Cerulia の Go バックエンド実装です。現在の製品スコープは character continuity service に固定しており、character lineage、campaign continuity、rules provenance、publication、reuse boundary、append-only correction を扱います。session lifecycle、membership と run authority、disclosure、board、replay、appeal、audit surface は製品スコープ外であり、[docs/archive/out-of-product-scope/README.md](docs/archive/out-of-product-scope/README.md) に研究履歴として隔離しています。

## 現在入っているもの

- Go 1.26 ベースの API エントリポイント
- 環境変数ベースの設定読み込み
- slog を使った JSON ログ
- pgx/v5 による Postgres 接続の受け皿
- phase 0 の SQL migration runner と ledger kernel 初期スキーマ
- stable record / append-only record を保持する generic core store
- JSON Lexicon と example payload を出力する contract artifact generator
- versioned contract artifact を生成する release helper
- requestId idempotency / current head / revision CAS の最小 helper
- continuity core の write path
- character home / campaign view / publication list などの core projection query
- publication current head replay と projection rebuild validator
- trusted proxy HMAC auth と explicit local direct opt-in を持つ auth gateway
- /healthz、/readyz、/xrpc/app.cerulia.rpc.* core エンドポイント
- optional local-db 用の Docker Compose
- readyz + public read + authenticated mutation を確認する smoke script

## ディレクトリ構成

```text
cmd/
  api/
internal/
  authz/
  contract/
  core/
  ledger/
  platform/
    config/
    database/
    httpserver/
    logging/
  store/
migrations/
scripts/
```

## クイックスタート

1. `.env.example` を `.env.local` にコピーして必要な値を入れる
2. ローカル DB を使う場合だけ `docker compose --profile local-db up -d` を実行する
3. migration は `./scripts/migrate.ps1` か `go run ./cmd/migrate` で先に流す
4. contract artifact を出す場合は `go run ./cmd/contracts -out .artifacts/contracts` を実行する
5. PowerShell では `./scripts/dev.ps1`、もしくは直接 `go run ./cmd/api` で起動する
6. `http://localhost:8080/healthz` と `http://localhost:8080/readyz` を確認する
7. ローカル直叩きは `AUTH_ALLOW_INSECURE_DIRECT=true` のときだけ許可する。`./scripts/dev.ps1` は local helper として、この値が未設定なら local/test でだけ opt-in を入れる。deployed 環境では trusted proxy が `X-Cerulia-Auth-Timestamp`、`X-Cerulia-Auth-Nonce`、`X-Cerulia-Auth-Signature` を付与する前提にする

デフォルトではローカルの `APP_ENV=development` で `DATABASE_URL` が空なら DB 接続なしで起動します。Cloud Run などの deployed 環境では `APP_ENV` 明示を運用上の原則にし、API は `AUTH_TRUSTED_PROXY_HMAC_SECRET` と DB 接続がないと起動しません。未指定でも Cloud Run metadata から production を推定しますが、運用では値を固定してください。Neon dev branch を使う場合は `DATABASE_URL` に接続文字列を入れてください。オフライン検証や CI 向けに、Docker Compose の `local-db` プロファイルも用意しています。

運用前提では、API は `DATABASE_URL_POOLED`、migration は `DATABASE_URL_DIRECT` を優先して読みます。ローカルでは `DATABASE_URL` 1 本でも動作します。

ローカルで `./scripts/dev.ps1` を使う場合は、`AUTH_ALLOW_INSECURE_DIRECT` を空のままにしておけば local/test に限って helper が opt-in を入れます。`go run ./cmd/api` を直接使う場合は `.env.local` に `AUTH_ALLOW_INSECURE_DIRECT=true` を明示してください。staging / production ではこの設定は拒否されます。

## 開発コマンド

```powershell
go test ./...
./scripts/migrate.ps1
./scripts/rebuild.ps1
./scripts/contracts.ps1 -Version 0.1.0
./scripts/smoke.ps1 -RulesetManifestRef at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1
go run ./cmd/contracts -out .artifacts/contracts
go run ./cmd/rebuild
go run ./cmd/api
docker compose --profile local-db up -d
docker compose --profile local-db down
```

## Versioned Contract Artifact

release 用の contract artifact は versioned directory に固定して出します。

```powershell
./scripts/contracts.ps1 -Version 0.1.0
```

これは `.artifacts/contracts/0.1.0` に manifest、checksums、CHANGELOG-contract、lexicon、examples を git metadata 付きで出力します。

## Smoke Rehearsal

M1 の backend rehearsal は `readyz`、anonymous public read、authenticated core mutation をまとめて確認します。

```powershell
./scripts/smoke.ps1 -RulesetManifestRef at://did:plc:rules/app.cerulia.core.rulesetManifest/ruleset-1
```

trusted proxy HMAC secret があるときは署名付きで叩き、無いときは local/test かつ `AUTH_ALLOW_INSECURE_DIRECT` が未設定または `true` の場合に insecure direct へ自動で落とします。mutation を含む full rehearsal では `-RulesetManifestRef` が必須です。read-only の確認だけに落とす場合は `-ReadOnly` を付けます。

## Projection Rebuild

Cerulia backend の projection は materialized table を再生成する方式ではなく、canonical record と publication current head を replay しながら query fold の drift を検証する。`cmd/rebuild` と `./scripts/rebuild.ps1` はその Final Gate 用 validator である。

```powershell
./scripts/rebuild.ps1
```

backend Final Gate の実行結果は [docs/architecture/final-gate-report-2026-04-04.md](docs/architecture/final-gate-report-2026-04-04.md) に固定する。

## XRPC 直叩き例

この例は local/test で `AUTH_ALLOW_INSECURE_DIRECT=true` を明示したときだけ使います。deployed 環境では `scripts/smoke.ps1` か trusted proxy 署名付きヘッダーを使ってください。

```powershell
$headers = @{
  "X-Cerulia-Actor-Did" = "did:plc:alice"
  "X-Cerulia-Permission-Sets" = "app.cerulia.authCoreWriter"
}

Invoke-RestMethod \
  -Method Post \
  -Uri http://localhost:8080/xrpc/app.cerulia.rpc.createCampaign \
  -Headers $headers \
  -ContentType application/json \
  -Body '{"title":"Campaign","visibility":"public","rulesetNsid":"app.cerulia.rules.core","rulesetManifestRef":"at://did:plc:alice/app.cerulia.core.rulesetManifest/ruleset-1","defaultReusePolicyKind":"same-campaign-default","stewardDids":["did:plc:alice"],"requestId":"req-1"}'
```

## 次のフェーズ

- M2: `appview` submodule で AppView foundation を実装する
- M3: AppView core shell と route slices を実装する
