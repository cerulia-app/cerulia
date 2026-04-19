# 実装計画

この計画は `protocol`、`api`、`projection` の 3 単位を前提に、Cerulia backend を TypeScript で起こす順序を定義する。

## 原則

- canonical truth の write/read authority は `api` に置く
- `projection` は derived read model と discovery に限定する
- `protocol` は generated artifact と thin wrapper に限定する
- `projection` が無い状態でも `appview + api` で canonical flow を成立させる

## API read と redaction の契約

`api` は read mode を `owner` と `public` に分け、同じ record でも mode ごとに返却 shape を固定する。

- `owner` mode: owner workbench 向け。編集に必要な full payload を返す
- `public` mode: direct-link 共有向け。public-safe summary shape のみ返す

`api` が mode を決めるときの permission bundle は次の判定軸に閉じる。

- `actorDid`（呼び出し主体）
- `ownerDid`（record owner）
- `isOwner`（owner 判定）
- `visibility`（record visibility）
- `callerProof`（OAuth token と DID 解決で結びつく caller 証明）

判定結果は次の contract に閉じる。

- owner かつ record が存在する場合は `owner` mode を返す
- owner 以外は `public` mode だけを返す
- public に許可できない record は非公開状態として返し、private payload は返さない

caller と owner の拘束条件は次で固定する。

- mutation は caller-owned repo にだけ許可する
- same-owner 制約を持つ record（character-conversion など）は `callerDid == ownerDid` を必須とする
- third-party repo への write proxy は許可しない

mutation result の返却条件は次で固定する。

- `accepted`: validation と ownership 制約を満たし、base rev が最新
- `rejected`: validation / ownership / policy のいずれかに違反
- `rebase-needed`: validation と ownership は満たすが base rev が古い

AppView preflight はこの contract を上書きしない。最終判定は常に `api` authoritative validation と read policy が担う。

public mode の redaction 粒度は record ごとの matrix で固定する。

- character detail: public-safe summary（profile、structured stats、portrait 参照、公開 session summary）だけ返す
- player profile: Cerulia override と Bluesky fallback を合成した表示 shape を返す。credential-bearing URI は返さない
- session / campaign / house 一覧: discovery 用 summary だけ返す
- scenario detail: summary と source citation だけ返す。owner-private memo は返さない
- rule-profile / character-sheet-schema: public-only の canonical field だけ返す。visibility 派生 field は返さない
- owner workbench route: `owner` mode で full payload を返すが、public route は同一 endpoint でも `public` mode summary に固定する

`credential-free` URI は、認証ヘッダ、cookie、署名付き query を必要としない公開 URI を指す。

## OAuth 戦略の固定

Cerulia の実装パターンは Authorization Code + PKCE に固定する。

- AppView は public client として動作し、token を長期保存しない
- `api` は caller DID と token claim を照合して callerProof を確定する
- refresh と再認証は caller の PDS / authorization server の current authority に追随する

この戦略は `api` フェーズ開始前に変更しない。別案比較は実装後ではなく設計段階でのみ行う。

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
- Workers entrypoint が placeholder ではなく canonical API handler に配線される

## フェーズ 3: appview を api に接続する

AppView 接続の hardening と UX 改善を行う。phase 2 の時点で最小 canonical flow は接続済みであることを前提にする。

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
