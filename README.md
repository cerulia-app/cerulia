# Cerulia

Cerulia は docs-first で再構成中の workspace です。

- appview submodule は維持し、現時点では最小スケルトンを置いています。
- backend の実装スタックは TypeScript + official AT Protocol SDK + Bun + SQLite-first です。
- Cloudflare Workers は当面の deploy target であり、runtime 境界や canonical authority の正本ではありません。
- backend は `protocol`、`api`、`projection` を deployable / contract 単位の個別リポジトリとして管理し、親 repo から submodule として束ねる方針です。
- `protocol` は非デプロイの contract repo、`api` は canonical service、`projection` は optional discovery service として扱います。
- 今後の再実装は docs 配下の最新文書を正本として進めてください.
