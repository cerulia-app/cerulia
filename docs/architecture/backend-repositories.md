# Backend リポジトリ構造と実行方針

## 目的

Cerulia の backend は TypeScript で構成する。
構成単位は Bluesky の用語ではなく、Cerulia 自身の責務境界で切る。
root repository は Bun workspace を使う monorepo とし、`appview`、`protocol`、`api`、`projection` を同一 repository 内の package として束ねる。

この判断の前提は次の通り。

- official AT Protocol SDK を first choice とする
- local / self-host の基準 runtime は Bun とする
- storage は SQLite-first とする
- 当面の deploy target は Cloudflare Workers とする
- canonical truth は常に AT Protocol 上の record とし、AppView や projection に移さない

## current topology

現在の backend topology は monorepo 内の次の 3 backend package を正本とする。

- `protocol`: 非デプロイの contract / generated artifact repo
- `api`: deployable な canonical write/read service
- `projection`: deployable だが optional な read-model / discovery service

## 比較した候補

### 候補 A: root repository 自体を monorepo にする

root repo で Bun workspace を使い、その直下に `appview/`、`api/`、`projection/`、`protocol/` を package として置く。

利点:

- 依存更新と型共有が最も簡単
- ローカル開発環境と issue / project 管理を 1 repo で閉じやすい
- package boundary を保ちながら変更横断の review と CI をまとめやすい

欠点:

- api と projection の release cadence が結合しやすい
- self-host 向けの publish unit を package metadata と build artifact で明示する必要がある
- boundary を雑にすると source-level reach-through が起きやすい

### 候補 B: api / projection を完全分離し、shared repo を持たない

親 repo には `api/` と `projection/` を個別 submodule として追加する。共有コードは各 repo 内に閉じる。

利点:

- deployable unit の独立性が最も高い
- self-host で必要なものだけ拾いやすい

欠点:

- lexicon generated types、validation、SDK 利用境界が複製されやすい
- protocol contract の drift が起きやすい
- 同じ修正を複数 repo に反復しやすい

### 候補 C: api / projection を分離し、薄い protocol repo を共有する

親 repo には `protocol/`、`api/`、`projection/` を個別 submodule として追加する。`protocol` は deployable ではなく、generated artifact と thin wrapper だけを持つ。

利点:

- deployable unit の分離を保ちながら drift を抑えられる
- official SDK first を共通 boundary として固定しやすい
- Bun self-host と Workers deploy の adapter 差分を各 service repo に閉じ込めやすい

欠点:

- repo 数が増える
- version pinning と互換性管理が必要になる
- `protocol` が太ると monorepo 的な結合へ逆戻りする

### 候補 D: protocol + api + projection + jobs に分割する

親 repo には `protocol/`、`api/`、`projection/`、`jobs/` を個別 submodule として追加する。

利点:

- retry、cron、queue を独立運用しやすい
- projection と非同期処理の変更軸を将来分けやすい

欠点:

- MVP 時点では unit 数が多すぎる
- jobs が projection と独立の change axis を持つ根拠がまだ弱い
- self-host の最小構成が重く見えやすい

## 採用

候補 A を採用する。

理由は次の通り。

- Cerulia では canonical truth を `api` 側に閉じ、`projection` は derived data と discovery だけに留める必要がある
- AppView は UI surface であり、`api` や `projection` の内部責務を吸収してはならない
- official SDK first を守りながら package boundary を維持するなら、monorepo 内 workspace package の方が drift を抑えやすい
- polyrepo + submodule は issue、project board、変更横断 review、依存更新、local verification が分散しやすく、現在の規模では運用コストの方が大きい
- self-host で必要なのは repository 数ではなく deployable unit の分離であり、それは monorepo でも package / artifact 単位で保てる

## 採用後のリポジトリ構造

root repo 自体を docs と code の両方を持つ monorepo とする。

```text
/
  AGENTS.md
  README.md
  docs/
  appview/    # workspace package
  protocol/   # workspace package
  api/        # workspace package
  projection/ # workspace package
  package.json
  bun.lock
```

ここでは `backend/` のような入れ子 package 群は置かない。deployable / contract / UI の各 unit を root 直下 package として見える形にする。

## 各リポジトリの責務

### protocol

`protocol` は deployable service ではなく、Cerulia backend 群が共有する薄い contract package とする。

意味上の authority は持たない。record semantics の設計正本は親 repo の `docs/lexicon` と `docs/records` にあり、runtime 上の authoritative accept/reject は `api` にある。

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
- `api` 固有または `projection` 固有の business workflow

`protocol` が実装本体を持ち始めたら境界逸脱とみなす。
`protocol` の parser / codec は再利用用の部品であり、write 可否の authoritative judgment そのものではない。
他 package から `protocol` を使うときは package import boundary を通す。`api` や `projection` の committed source が `protocol/src/*` を相対 import して直接読む構成は採らない。

### api

`api` は canonical write/read authority を持つ service package とする。

責務:

- mirrored OAuth session restore と actor binding
- repo write/read
- authoritative validation
- record lifecycle の正本判定
- projection なし最小構成での owner read と direct-ref public read
- SQLite schema と migration
- mirrored OAuth session、idempotency、cursor などの operational store
- Bun self-host entrypoint
- Cloudflare Workers entrypoint

非責務:

- public discovery 向けの大規模 projection
- catalog の read model
- AppView の UI concern

### projection

`projection` は canonical record から導出される read model と discovery surface の service package とする。

責務:

- event ingestion
- projection の更新
- read-optimized index
- scenario registry view、campaign view、house activity などの一覧系 query
- AppView や将来の reader surface 向けの derived query
- SQLite ベースの derived store

非責務:

- canonical record の所有
- owner-only write authority の判定
- source of truth としての record validation

`projection` は optional extension であり、core truth を再定義してはならない。

## 認可・可視性・secret の境界

- browser-facing OAuth session、callback state、session cookie は `appview` が保持する
- owner write に必要な mirrored OAuth session と repo actor restore 材料は `api` が保持する
- permission bundle の解決、owner / public mode の判定、visibility の authoritative judgment は `api` に置く
- `projection` は public-safe な derived data だけを保持し、draft や owner-only payload を public discovery 用 store に持ち込まない
- `protocol` は auth state や secret を保持しない
- Cerulia product-core は disclosure / secret payload を扱わない。仮に周辺 extension が存在しても `protocol` や `projection` に平文 ownership を置かない

## projection なし最小構成

最小 self-host 構成は `appview + api` とする。

- owner の workbench 系 read/write は `api` だけで成立させる
- direct ref を知っている public read は `api` だけで成立させる
- `projection` が必要なのは catalog、discovery、大きな reverse index、公開一覧系 surface だけに限る
- deployable `api` entrypoint は current DID document と safe PDS endpoint を解決して direct-ref public read を成立させてよい。これは Bun / Workers のどちらでも同じ boundary に属する

この制約により、`projection` は optional extension のまま保ち、`api` が無いと成立しない canonical path と、`projection` があると便利になる derived path を分ける。

## AppView との接続境界

- owner の作成、編集、draft 含む詳細表示は `api` を正本にする
- direct ref が既知の shared detail は `api` で解決できるようにする
- 一覧、catalog、community discovery は `projection` を使う
- `projection` が無い構成では、AppView は discovery 導線を縮退させても canonical flow を壊さない
- browser-facing OAuth route、session cookie、callback state は `appview` が持つ
- AppView は owner DID / scope を signed internal auth として `api` に渡し、`api` は mirrored OAuth session で repo actor を復元する
- visibility と owner/public mode の最終判定は常に `api` 側で行う

## runtime 方針

### TypeScript と official SDK

- backend 実装言語は TypeScript に統一する
- AT Protocol の transport、repo、OAuth、identity 周辺は official SDK を first choice とする
- SDK を直接散在させず、`protocol` の thin wrapper 経由で service から利用する
- monorepo 内の package 間共有は workspace dependency + package import を正本にし、他 package の source tree への相対 reach-through を committed source に持ち込まない

### Bun first

- local 開発、self-host、test、build は Bun を基準 runtime とする
- service code は Node 互換 API を前提に書く
- Bun 固有最適化は runtime adapter に閉じ込める

### Workers deploy

- Cloudflare Workers は最初の配布先であり、唯一の runtime ではない
- Workers 依存 API は service composition と adapter 層に閉じ込める
- core domain、validation、contract、projection rule は Workers 非依存に保つ
- canonical runtime/authority は Workers ではなく service boundary 側にある
- public-agent の live fetch は pre-connect pin できる runtime に限定する。Workers adapter は live public-agent lookup を canonical path に使わない

## storage 方針

Cerulia backend の storage は SQLite-first とする。

- `api` は operational store として SQLite を持つ
- `projection` は derived store として別 SQLite を持つ
- Bun self-host では file-backed SQLite を基準実装にする
- Workers では D1 を SQLite operational adapter として扱う
- schema と migration は SQLite の制約を正本にして設計する
- D1 都合の例外で domain model を歪めない

この方針は「Cloudflare 固有 DB を正本にする」のではなく、「SQLite を正本にし、Workers 側ではその operational variant を使う」という意味である。

## workspace 運用

- dependency 解決は root の Bun workspace で行う
- package 間依存は `workspace:*` または package 名 import で表す
- root の issue / milestone / project board で横断タスクを扱い、package directory は boundary と deployable unit の整理に使う

## 命名方針

親 repo の path は短く保つ。

- `protocol`
- `api`
- `projection`
- `appview`

実リポジトリ名も path と同じ責務名に揃える。

- `protocol`
- `api`
- `projection`

package 名と directory 名は揃え、workspace 内で `@cerulia/{name}` と path の対応が即座に読めるようにする。

## 現在不足している文書

この文書は topology と boundary の正本であり、運用 runbook ではない。

- 起動手順
- ready / health 判定
- migration / rollback
- backup / restore

これらは repo 作成後に `api` と `projection` ごとの runbook として別途固定する。

## review trigger

次のいずれかが起きたら、この構造を再レビューする。

- `protocol` に runtime 実装や storage 実装を入れたくなった
- `api` と `projection` が同じ release cadence を強く要求し始めた
- Workers 固有事情のために domain model 変更が必要になった
- AppView が `projection` なしで解決できる read model と `projection` 前提の read model を混在させ始めた
- self-host 運用で `projection` を省いた最小構成が成立しなくなった

## 現時点で保留するもの

この段階では、次を別 repo として先に増やさない。

- identity 専用 service
- queue / scheduler 専用 service
- migration / ops 専用 repo

これらは実際に change axis が独立した時点で追加検討する。