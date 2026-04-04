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
- requestId idempotency / current head / revision CAS の最小 helper
- continuity core の write path
- character home / campaign view / publication list などの core projection query
- trusted header で permission-set を検証する auth gateway と anonymous public mode
- /healthz、/readyz、/xrpc/app.cerulia.rpc.* core エンドポイント
- optional local-db 用の Docker Compose

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
7. ローカル直叩きでは `APP_ENV=development` のまま `X-Cerulia-Actor-Did` と `X-Cerulia-Permission-Sets` を付ける。deployed 環境では trusted proxy が `X-Cerulia-Auth-Timestamp`、`X-Cerulia-Auth-Nonce`、`X-Cerulia-Auth-Signature` を付与する前提にする

デフォルトではローカルの `APP_ENV=development` で `DATABASE_URL` が空なら DB 接続なしで起動します。Cloud Run などの deployed 環境では `APP_ENV` を明示し、API は `AUTH_TRUSTED_PROXY_HMAC_SECRET` と DB 接続がないと起動しません。Neon dev branch を使う場合は `DATABASE_URL` に接続文字列を入れてください。オフライン検証や CI 向けに、Docker Compose の `local-db` プロファイルも用意しています。

運用前提では、API は `DATABASE_URL_POOLED`、migration は `DATABASE_URL_DIRECT` を優先して読みます。ローカルでは `DATABASE_URL` 1 本でも動作します。

## 開発コマンド

```powershell
go test ./...
./scripts/migrate.ps1
go run ./cmd/contracts -out .artifacts/contracts
go run ./cmd/api
docker compose --profile local-db up -d
docker compose --profile local-db down
```

## XRPC スモーク例

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

## 次の実装対象

- production-grade OAuth / ATProto token validation
- contract、router、authz の core-only 化の完了
- persistence、projection、テストの hardening
