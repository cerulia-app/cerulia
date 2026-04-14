# Backend リポジトリ構造と実行方針

## 目的

Cerulia の backend は Go ではなく TypeScript で再構成する。
構成単位は Bluesky に寄せ、PDS、relay のような deployable unit ごとに個別リポジトリとして管理する。
親 workspace では `appview` と同様に submodule として束ねる。

この判断の前提は次の通り。

- official AT Protocol SDK を first choice とする
- local / self-host の基準 runtime は Bun とする
- storage は SQLite-first とする
- 当面の deploy target は Cloudflare Workers とする
- canonical truth は常に AT Protocol 上の record とし、AppView や relay に移さない

## 比較した候補

### 候補 A: backend monorepo を 1 submodule にまとめる

親 repo には `backend/` だけを submodule として追加し、その中で `apps/pds`、`apps/relay`、`packages/*` を持つ。

利点:

- 依存更新と型共有が最も簡単
- ローカル開発環境を 1 repo で閉じやすい

欠点:

- PDS と relay の release cadence が結合しやすい
- self-host では deployable unit ごとの切り出しが弱くなる
- Cerulia の core truth、projection、transport adapter が同じ change axis に乗りやすい

### 候補 B: PDS / relay を完全分離し、shared repo を持たない

親 repo には `pds/` と `relay/` を個別 submodule として追加する。共有コードは各 repo 内に閉じる。

利点:

- deployable unit の独立性が最も高い
- self-host で必要なものだけ拾いやすい

欠点:

- lexicon generated types、validation、SDK 利用境界が複製されやすい
- protocol contract の drift が起きやすい
- 同じ修正を複数 repo に反復しやすい

### 候補 C: PDS / relay を分離し、薄い protocol repo を共有する

親 repo には `protocol/`、`pds/`、`relay/` を個別 submodule として追加する。`protocol` は deployable ではなく、generated artifact と thin wrapper だけを持つ。

利点:

- deployable unit の分離を保ちながら drift を抑えられる
- official SDK first を共通 boundary として固定しやすい
- Bun self-host と Workers deploy の adapter 差分を各 service repo に閉じ込めやすい

欠点:

- repo 数が増える
- version pinning と互換性管理が必要になる
- `protocol` が太ると monorepo 的な結合へ逆戻りする

### 候補 D: edge API と projection relay の 2 層に寄せ、PDS を独立させない

親 repo には `edge-api/`、`relay/` を置き、PDS 相当の責務を `edge-api` に吸収する。

利点:

- Workers への初期 deploy は最も単純
- repo 数を抑えられる

欠点:

- write authority を持つ PDS と edge surface が同居しやすい
- canonical truth と projection edge の境界が曖昧になる
- self-host 時に service boundary を切り出し直す必要が出やすい

## 採用

候補 C を採用する。

理由は次の通り。

- Cerulia では canonical truth を PDS 側に閉じ、relay は derived data と配送だけに留める必要がある
- AppView は UI surface であり、PDS や relay の内部責務を吸収してはならない
- official SDK first を守るには、SDK 利用境界を各 repo が好きに持つより、薄い shared contract に集約した方が安定する
- self-host を重視するなら、deployable unit を個別 repo のまま保ち、必要なモジュールだけ選んで動かせる方がよい
- Workers は初期配布先として有効だが、runtime 都合で core boundary を決めるべきではない

## 採用後の親リポジトリ構造

親 repo は docs と integration point を持つ orchestration repo のまま維持する。

```text
/
  AGENTS.md
  README.md
  docs/
  appview/    # submodule
  protocol/   # submodule
  pds/        # submodule
  relay/      # submodule
```

ここでは `backend/` という umbrella submodule は置かない。
deployable unit ごとの境界を親 repo でもそのまま見える形にする。

## 各リポジトリの責務

### protocol

`protocol` は deployable service ではなく、Cerulia backend 群が共有する薄い contract repo とする。

意味上の authority は持たない。record semantics の設計正本は親 repo の `docs/lexicon` と `docs/records` にあり、runtime 上の authoritative accept/reject は `pds` にある。

含めてよいもの:

- docs 正本から生成した TypeScript types と codec
- record / XRPC / auth contract に関する transport artifact
- official AT Protocol SDK を使うための薄い wrapper
- service 間で共有してよい pure parser / decoder

含めないもの:

- HTTP server
- SQLite / D1 の実装詳細
- queue、cron、projection storage
- Bun / Workers の runtime entrypoint
- service ごとの config / env schema
- PDS 固有または relay 固有の business workflow

`protocol` が実装本体を持ち始めたら境界逸脱とみなす。
`protocol` の parser / codec は再利用用の部品であり、write 可否の authoritative judgment そのものではない。

### pds

`pds` は canonical write/read authority を持つ service repo とする。

責務:

- OAuth と actor binding
- repo write/read
- authoritative validation
- record lifecycle の正本判定
- relay なし最小構成での owner read と direct-ref public read
- SQLite schema と migration
- Bun self-host entrypoint
- Cloudflare Workers entrypoint

非責務:

- public discovery 向けの大規模 projection
- feed/relay 的な配送責務
- AppView の UI concern

### relay

`relay` は PDS から導出される event / projection / fanout の service repo とする。

責務:

- event ingestion
- projection の更新
- read-optimized index
- AppView や将来の reader surface 向けの配送

非責務:

- canonical record の所有
- owner-only write authority の判定
- source of truth としての record validation

relay は optional extension であり、core truth を再定義してはならない。

## relay なし最小構成

最小 self-host 構成は `appview + pds` とする。

- owner の workbench 系 read/write は `pds` だけで成立させる
- direct ref を知っている public read は `pds` だけで成立させる
- relay が必要なのは catalog、discovery、横断検索、大きな reverse index、広域 fanout だけに限る

この制約により、relay は optional extension のまま保ち、PDS が無いと成立しない canonical path と、relay があると便利になる derived path を分ける。

## runtime 方針

### TypeScript と official SDK

- backend 実装言語は TypeScript に統一する
- AT Protocol の transport、repo、OAuth、identity 周辺は official SDK を first choice とする
- SDK を直接散在させず、`protocol` の thin wrapper 経由で service から利用する

### Bun first

- local 開発、self-host、test、build は Bun を基準 runtime とする
- service code は Node 互換 API を前提に書く
- Bun 固有最適化は runtime adapter に閉じ込める

### Workers deploy

- Cloudflare Workers は最初の配布先であり、唯一の runtime ではない
- Workers 依存 API は service composition と adapter 層に閉じ込める
- core domain、validation、contract、projection rule は Workers 非依存に保つ
- canonical runtime/authority は Workers ではなく service boundary 側にある

## storage 方針

Cerulia backend の storage は SQLite-first とする。

- Bun self-host では file-backed SQLite を基準実装にする
- Workers では D1 を SQLite operational adapter として扱う
- schema と migration は SQLite の制約を正本にして設計する
- D1 都合の例外で domain model を歪めない

この方針は「Cloudflare 固有 DB を正本にする」のではなく、「SQLite を正本にし、Workers 側ではその operational variant を使う」という意味である。

## submodule 追加順

最初に追加する順序は次を推奨する。

1. `protocol`
2. `pds`
3. `relay`

理由:

- `protocol` が無いまま `pds` と `relay` を並行に起こすと contract drift が出やすい
- `pds` が先に固まると canonical boundary を維持したまま relay の optionality を保ちやすい
- `relay` は projection / discovery 導線の必要性に応じて段階導入できる

## 命名方針

親 repo の path は短く保つ。

- `protocol`
- `pds`
- `relay`
- `appview`

リモート repo 名も同名を第一候補とする。

## 現在不足している文書

この文書は topology と boundary の正本であり、運用 runbook ではない。

- 起動手順
- ready / health 判定
- migration / rollback
- backup / restore

これらは repo 作成後に `pds` と `relay` ごとの runbook として別途固定する。

## review trigger

次のいずれかが起きたら、この構造を再レビューする。

- `protocol` に runtime 実装や storage 実装を入れたくなった
- `pds` と `relay` が同じ release cadence を強く要求し始めた
- Workers 固有事情のために domain model 変更が必要になった
- AppView が relay なしで解決できる read model と relay 前提の read model を混在させ始めた
- self-host 運用で `relay` を省いた最小構成が成立しなくなった

## 現時点で保留するもの

この段階では、次を別 repo として先に増やさない。

- identity 専用 service
- queue / scheduler 専用 service
- migration / ops 専用 repo

これらは実際に change axis が独立した時点で追加検討する。