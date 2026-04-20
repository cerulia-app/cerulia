# Cerulia

Cerulia は docs-first で再構成中の monorepo workspace です。

- backend の実装スタックは TypeScript + official AT Protocol SDK + Bun + SQLite-first です。
- Cloudflare Workers は当面の deploy target であり、runtime 境界や canonical authority の正本ではありません。
- root の Bun workspace で `appview`、`protocol`、`api`、`projection` をまとめて依存解決します。
- `protocol` は非デプロイの contract package、`api` は canonical service package、`projection` は optional discovery package として扱います。
- 今後の再実装は docs 配下の最新文書を正本として進めてください.

## Workspace Commands

- `bun install`
- `bun run workspace:check`
- `bun run workspace:build`
- `bun run workspace:test`
