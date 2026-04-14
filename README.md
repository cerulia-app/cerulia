# Cerulia

新方針への移行に伴い、既存実装はリセット済みです。

- Go 側の実装、実行スクリプト、ローカル運用ファイルは削除しました。
- appview submodule は残し、実装だけを最小スケルトンへ戻しました。
- backend の実装スタックは TypeScript + official AT Protocol SDK + Bun + SQLite-first です。
- Cloudflare Workers は当面の deploy target であり、runtime 境界や canonical authority の正本ではありません。
- backend は `protocol`、`pds`、`relay` を deployable / contract 単位の個別リポジトリとして管理し、親 repo から submodule として束ねる方針です。
- 今後の再実装は docs 配下の最新文書を正本として進めてください.
