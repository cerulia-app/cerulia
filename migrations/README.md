# Migrations

このディレクトリは ledger kernel と projection schema の SQL migration を置く場所です。

phase 0 では Go から直接再現できる migration runner を追加し、最初の永続化テーブルとして次を固定しました。

- `cerulia_idempotency_keys`
- `cerulia_service_log`
- `cerulia_current_heads`
- `cerulia_revision_fences`
- `cerulia_dual_revision_fences`

実行方法:

- `./scripts/migrate.ps1`
- または `go run ./cmd/migrate`
