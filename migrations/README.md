# Migrations

このディレクトリは ledger kernel と core record / projection schema の SQL migration を置く場所です。

phase 0 では Go から直接再現できる migration runner を追加し、最初の永続化テーブルとして次を固定しました。

- `cerulia_idempotency_keys`
- `cerulia_service_log`
- `cerulia_current_heads`
- `cerulia_revision_fences`
- `cerulia_dual_revision_fences`

phase 1 では continuity core の正本を保持する generic record table を追加しました。

- `cerulia_stable_records`
- `cerulia_append_records`

実行方法:

- `./scripts/migrate.ps1`
- または `go run ./cmd/migrate`
