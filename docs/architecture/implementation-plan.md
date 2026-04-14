# 実装計画

この計画は `protocol`、`api`、`projection` の 3 単位を前提に、Cerulia backend を TypeScript で起こす順序を定義する。

## 原則

- canonical truth の write/read authority は `api` に置く
- `projection` は derived read model と discovery に限定する
- `protocol` は generated artifact と thin wrapper に限定する
- `projection` が無い状態でも `appview + api` で canonical flow を成立させる

## フェーズ 1: protocol を固定する

親 repo で固定済みの `docs/records`、`docs/lexicon`、`docs/architecture` を入力にして、`protocol` submodule を起こす。

実装範囲:

- generated TypeScript types
- codec / parser / decoder
- official SDK thin wrapper
- shared error surface の最小定義

完了条件:

- `api` と `projection` が `protocol` にだけ依存して型共有できる
- `protocol` 自体は DB、HTTP server、Workers binding を持たない

## フェーズ 2: api を起こす

`api` は owner write と direct read の authoritative boundary として先に作る。

実装範囲:

- OAuth
- repo write/read
- authoritative validation
- owner workbench 向け read
- public / anonymous の direct-ref detail read
- SQLite schema と migration
- Bun entrypoint
- Workers entrypoint

完了条件:

- character create / edit / session record の canonical flow が `appview + api` だけで成立する
- `projection` が未実装でも direct-link 共有 detail が壊れない

## フェーズ 3: appview を api に接続する

AppView の owner workbench を `api` に接続し、MVP の優先度に従って先にキャラクター作成を完成させる。

実装範囲:

- character create / edit
- schema-backed form
- draft / public 切り替え
- session record create
- direct-link detail

完了条件:

- MVP の core flow が `appview + api` の最小構成で end-to-end に通る

## フェーズ 4: projection を追加する

`projection` は catalog、discovery、公開一覧系 surface のために後置きで追加する。

実装範囲:

- event ingestion
- replay / refold
- scenario catalog
- campaign view
- house activity
- search / reverse index
- SQLite derived store

完了条件:

- `projection` を有効にすると一覧・検索・discoverability が増える
- `projection` を止めても canonical flow は維持される

## フェーズ 5: self-host と Workers 配布を固める

実装範囲:

- Bun self-host 用の最小構成
- Workers 用 adapter と binding
- SQLite file-backed と D1 の差分吸収
- 運用 runbook

完了条件:

- `appview + api` の最小構成を self-host できる
- `projection` を追加した拡張構成も別途デプロイできる
