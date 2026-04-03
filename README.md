# Cerulia Backend

Cerulia の Go バックエンド実装です。現時点では phase 0 の platform foundation として、API の起動土台、設定読み込み、構造化ログ、任意の Postgres 接続、ヘルスチェック、ローカル開発用の最小構成を用意しています。

## 現在入っているもの

- Go 1.26 ベースの API エントリポイント
- 環境変数ベースの設定読み込み
- slog を使った JSON ログ
- pgx/v5 による Postgres 接続の受け皿
- `/healthz` と `/readyz` エンドポイント
- optional local-db 用の Docker Compose

## ディレクトリ構成

```text
cmd/
  api/
internal/
  platform/
    config/
    database/
    httpserver/
    logging/
migrations/
scripts/
```

## クイックスタート

1. `.env.example` を `.env.local` にコピーして必要な値を入れる
2. ローカル DB を使う場合だけ `docker compose --profile local-db up -d` を実行する
3. PowerShell では `./scripts/dev.ps1`、もしくは直接 `go run ./cmd/api` で起動する
4. `http://localhost:8080/healthz` と `http://localhost:8080/readyz` を確認する

デフォルトでは `DATABASE_URL` が空なら DB 接続なしで起動します。Neon dev branch を使う場合は `DATABASE_URL` に接続文字列を入れてください。オフライン検証や CI 向けに、Docker Compose の `local-db` プロファイルも用意しています。

## 開発コマンド

```powershell
go test ./...
go run ./cmd/api
docker compose --profile local-db up -d
docker compose --profile local-db down
```

## 次の実装対象

- contract materialization の配置
- migration runner の固定
- ledger kernel の初期スキーマ
- auth gateway と blob abstraction の実装
