# Backend リポジトリ構造と実行方針

## 目的

Cerulia の backend は TypeScript で構成する。
構成単位は Bluesky の用語ではなく、Cerulia 自身の責務境界で切る。
親 workspace では `appview` と同様に submodule として束ねる。

この判断の前提は次の通り。

- official AT Protocol SDK を first choice とする
- local / self-host の基準 runtime は Bun とする
- storage は SQLite-first とする
- 当面の deploy target は Cloudflare Workers とする
- canonical truth は常に AT Protocol 上の record とし、AppView や projection に移さない

## current topology

現在の backend topology は次の 3 単位を正本とする。

- `protocol`: 非デプロイの contract / generated artifact repo
- `api`: deployable な canonical write/read service
- `projection`: deployable だが optional な read-model / discovery service

## 比較した候補

### 候補 A: backend monorepo を 1 submodule にまとめる

親 repo には `backend/` だけを submodule として追加し、その中で `apps/api`、`apps/projection`、`packages/*` を持つ。

利点:

- 依存更新と型共有が最も簡単
- ローカル開発環境を 1 repo で閉じやすい

欠点:

- api と projection の release cadence が結合しやすい
- self-host では deployable unit ごとの切り出しが弱くなる
- Cerulia の core truth、projection、transport adapter が同じ change axis に乗りやすい

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

候補 C を採用する。

理由は次の通り。

- Cerulia では canonical truth を `api` 側に閉じ、`projection` は derived data と discovery だけに留める必要がある
- AppView は UI surface であり、`api` や `projection` の内部責務を吸収してはならない
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
  api/        # submodule
  projection/ # submodule
```

ここでは `backend/` という umbrella submodule は置かない。
deployable unit ごとの境界を親 repo でもそのまま見える形にする。

## 各リポジトリの責務

### protocol

`protocol` は deployable service ではなく、Cerulia backend 群が共有する薄い contract repo とする。

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
他 repo から `protocol` を使うときは package import boundary を通す。`api` や `projection` の committed source が sibling path を相対 import して `protocol/src/*` を直接読む構成は採らない。

### api

`api` は canonical write/read authority を持つ service repo とする。

責務:

- OAuth と actor binding
- repo write/read
- authoritative validation
- record lifecycle の正本判定
- projection なし最小構成での owner read と direct-ref public read
- SQLite schema と migration
- OAuth session、idempotency、cursor などの operational store
- Bun self-host entrypoint
- Cloudflare Workers entrypoint

非責務:

- public discovery 向けの大規模 projection
- 横断検索と catalog の read model
- AppView の UI concern

### projection

`projection` は canonical record から導出される read model と discovery surface の service repo とする。

責務:

- event ingestion
- projection の更新
- read-optimized index
- scenario catalog、campaign view、house activity などの一覧系 query
- AppView や将来の reader surface 向けの discovery query
- SQLite ベースの derived store

非責務:

- canonical record の所有
- owner-only write authority の判定
- source of truth としての record validation

`projection` は optional extension であり、core truth を再定義してはならない。

## 認可・可視性・secret の境界

- OAuth session、token、binding secret などの operational secret は `api` だけが保持する
- permission bundle の解決、owner / public mode の判定、visibility の authoritative judgment は `api` に置く
- `projection` は public-safe な derived data だけを保持し、draft や owner-only payload を public discovery 用 store に持ち込まない
- `protocol` は auth state や secret を保持しない
- Cerulia product-core は disclosure / secret payload を扱わない。仮に周辺 extension が存在しても `protocol` や `projection` に平文 ownership を置かない

## projection なし最小構成

最小 self-host 構成は `appview + api` とする。

- owner の workbench 系 read/write は `api` だけで成立させる
- direct ref を知っている public read は `api` だけで成立させる
- `projection` が必要なのは catalog、discovery、横断検索、大きな reverse index、公開一覧系 surface だけに限る

この制約により、`projection` は optional extension のまま保ち、`api` が無いと成立しない canonical path と、`projection` があると便利になる derived path を分ける。

## AppView との接続境界

- owner の作成、編集、draft 含む詳細表示は `api` を正本にする
- direct ref が既知の shared detail は `api` で解決できるようにする
- 一覧、検索、catalog、community discovery は `projection` を使う
- `projection` が無い構成では、AppView は discovery 導線を縮退させても canonical flow を壊さない
- auth bundle や visibility の最終判定は常に `api` 側で行い、AppView は advisory UI として扱う

## runtime 方針

### TypeScript と official SDK

- backend 実装言語は TypeScript に統一する
- AT Protocol の transport、repo、OAuth、identity 周辺は official SDK を first choice とする
- SDK を直接散在させず、`protocol` の thin wrapper 経由で service から利用する
- service repo 間の共有は package dependency + package import を正本にし、workspace 相対 path を committed source に持ち込まない

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

- `api` は operational store として SQLite を持つ
- `projection` は derived store として別 SQLite を持つ
- Bun self-host では file-backed SQLite を基準実装にする
- Workers では D1 を SQLite operational adapter として扱う
- schema と migration は SQLite の制約を正本にして設計する
- D1 都合の例外で domain model を歪めない

この方針は「Cloudflare 固有 DB を正本にする」のではなく、「SQLite を正本にし、Workers 側ではその operational variant を使う」という意味である。

## submodule 追加順

最初に追加する順序は次を推奨する。

1. `protocol`
2. `api`
3. `projection`

理由:

- `protocol` が無いまま `api` と `projection` を並行に起こすと contract drift が出やすい
- `api` が先に固まると canonical boundary を維持したまま `projection` の optionality を保ちやすい
- `projection` は discovery 導線の必要性に応じて段階導入できる

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

親 repo では submodule path と実 repo 名を一致させ、`cerulia-app/{name}` でそのまま解決できる形を採る。

URL 未発行の段階では、親 repo から見て sibling の local repository を相対 URL として登録する。

remote 発行後は次の順で切り替える。

1. sibling の local repository をそのまま remote へ push する
2. 親 repo の `.gitmodules` を remote URL に更新する
3. 各 submodule の `origin` を同じ remote URL に合わせる
4. 親 repo で submodule pointer の解決が変わっていないことを確認する

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