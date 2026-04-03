# SvelteKitベースAppView実装計画

## 目的

この文書は、[AppView層UI設計](README.md) を SvelteKit ベースの実装へ落とすための実行計画である。対象は AppView のモジュール分割、実装順、並列作業の許容範囲、採用技術スタック、フェーズごとの release gate であり、core continuity surface と session context surface を混ぜずに前進できる形へ分解する。

前提となる設計判断は次の文書に従う。

- [サービスビジョン](service-vision.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [必要機能一覧](features.md)
- [遷移構造](navigation.md)
- [UI/UX要件](ui-ux-requirements.md)
- [AppViewテスト計画](test-plan.md)
- [Goサーバー実装計画](../architecture/implementation-plan.md)
- [MVPの実装順](../architecture/mvp.md)
- [projection contract](../architecture/projections.md)

## 実装の基本方針

### 1. SvelteKit は BFF 兼 SSR shell として使う

AppView は browser から直接 privileged XRPC を叩く thin client ではなく、SvelteKit server load / action を通じて backend の XRPC を束ねる BFF として実装する。これにより OAuth session、reader lens、error mapping、copy、preflight の整合を 1 箇所で保ちやすくする。

### 2. core continuity surface を先に閉じる

実装順は server 側の [MVPの実装順](../architecture/mvp.md) と合わせ、public top、signed-in home、character studio、campaign workspace、publication library を session subtree より先に成立させる。session、board、governance、audit は重要だが optional extension なので、product root を奪わせない。

### 3. authoritative data path を SvelteKit に一本化する

current edition、publication status、authority health、appeal 状態のような authoritative な値は、SvelteKit の server load / action と backend の mutationAck を正本にする。client store は最近見た項目、drawer 開閉、create flow draft などの local presentation state に限る。

### 4. contract-first で進め、backend 待ちを最小化する

frontend repo は backend repo と分離し、backend が publish する package `@cerulia/contracts` と同内容 tarball から TypeScript 型、MSW fixture、Vitest Browser Mode 用シナリオ fixture を先に作る。backend 実装待ちで UI 全体を止めず、route と lens の contract を mocks で先に固定する。

### 5. AppView の release gate は docs で固定済みの gate に合わせる

フェーズの完了判定は [AppViewテスト計画](test-plan.md) の AppView Core Shell Gate、AppView Session Context Gate、Final AppView Gate に合わせる。見た目の完成ではなく、route、boundary、copy、mutation feedback、accessibility の contract を通した時だけ次へ進む。

## 推奨技術スタック

| 領域 | 採用 | 理由 |
| --- | --- | --- |
| runtime / package manager | Bun 1.x、bun | SvelteKit / Vite と相性がよく、runtime と package manager を 1 ツールで閉じられる |
| repository topology | frontend 単独 repo、Go backend は別 repo | UI 実装と backend 実装を分離しつつ、contract artifact で同期点を明確にできる |
| framework | SvelteKit 2 系、Svelte 5、TypeScript strict | server load / action、SSR、form action、typed routing と相性がよい |
| adapter | `@sveltejs/adapter-node` | custom OAuth、SSR、reverse proxy 配下運用、Go backend との同一 origin 構成に向く |
| 認証 / BFF | SvelteKit `hooks.server.ts`、httpOnly session cookie、server-side fetch wrapper | browser 側に OAuth bundle を露出しすぎず、reader lens と auth bundle を分離しやすい |
| contract / validation | backend repo が publish する `@cerulia/contracts` artifact 由来の TypeScript client、Zod | 別 repo 間でも XRPC schema drift を早く検知し、UI 側でも runtime parse をかけられる |
| form | SvelteKit form actions、`sveltekit-superforms`、Zod | multi-step create flow と governance form を progressive enhancement 付きで扱いやすい |
| UI primitive | component-scoped CSS、global design token CSS、Bits UI | [デザインシステム](design-system.md) の独自 visual language を守りつつ、dialog / menu / popover の a11y を自前実装しすぎない |
| icon / motion | `lucide-svelte`、Svelte transition / motion の最小利用 | 情報密度の高い画面でも過剰に依存せず、必要な意味付けだけに motion を使える |
| data refresh | SvelteKit `depends` / `invalidate`、optimistic UI は local state のみ | TanStack Query などの二重 cache を避け、authoritative truth を 1 経路に保つ |
| realtime | WebSocket を board の揮発同期専用に限定し、durable board shell は WS なしでも成立させる。低頻度更新は SSE を許容 | 揮発同期だけに高頻度 transport を閉じ、backend の realtime Phase 6 完了前でも board surface を先に閉じられる |
| unit / integration test | Vitest、`@testing-library/svelte`、MSW | component と route load / action を contract-first に検証できる |
| browser journey / visual | Vitest Browser Mode、semantic visual diff | route contract、keyboard、major surface の visual drift を同じ Vitest 系で早期に検出できる |
| a11y baseline | Svelte compiler の a11y diagnostics、Vitest Browser Mode の focus / role / visible text 検証 | axe-core を追加せずに、compile-time と browser runtime の両方で主要な利用面を確認できる |
| observability | OpenTelemetry、structured logger、Web Vitals 計測 | route 失敗、XRPC error mapping、mutation latency、board reconnect を追跡できる |
| CI | GitHub Actions | bun install、lint、typecheck、Vitest、Vitest Browser Mode、copy regression を一つの gate に載せやすい |

## 採らない構成

- privileged XRPC を browser から直接叩く構成
- current edition や authority health を client-side cache のみで保持する構成
- full visual UI kit を前提にして [デザインシステム](design-system.md) の独自性を失う構成
- secret plaintext や grant material を localStorage や IndexedDB に平文保存する構成
- publication、reveal、redaction、retire を単一トグルにまとめる構成

## 推奨ディレクトリ構成

```text
src/
  app.html
  hooks.server.ts
  lib/
    auth/
    rpc/
    design/
    shell/
    telemetry/
    testkit/
    features/
      public-entry/
      home/
      characters/
      campaigns/
      publications/
      sessions/
      board/
      replay/
      governance/
  routes/
    +layout.server.ts
    +layout.svelte
    +page.svelte
    home/
    characters/
    campaigns/
    publications/
    sessions/
tests/
  browser/
  integration/
contracts/
  manifest.lock.json
  lexicon/
  fixtures/
scripts/
  sync-contracts.ts
```

ポイントは frontend を単独 repo とし、route ごとの page ファイルに business logic を溶かし込まず、`lib/features/*` に surface 単位の load helper、action wrapper、view model、copy rule を閉じることにある。`+layout.server.ts` は current user、global nav、mode badge、return path のような shell 共通情報に留め、route 固有の projection 解決は各 `+page.server.ts` へ置く。backend repo 由来の contract snapshot は `contracts/` に取り込み、frontend 側で version を固定する。

## backend 由来 Lexicon artifact の取り込み

- backend repo は `@cerulia/contracts` を exact version で publish し、同じ内容の tarball を Release asset として配る
- frontend repo は `bun add -d -E @cerulia/contracts@<version>` で exact version を取得し、浮動 tag を直接使わない
- `bun run sync-contracts` は `node_modules/@cerulia/contracts` から `contracts/lexicon/`、`contracts/fixtures/`、`contracts/manifest.lock.json` を更新する
- CI は install 済み package version、`contracts/manifest.lock.json` の version、生成済み TypeScript client の hash が一致しなければ fail-fast する
- integration branch で `next` や `rc` を使う場合でも、merge 前には exact prerelease version を lock して再現可能性を残す

## モジュール一覧

| # | モジュール | 主責務 | 着手条件 | 並列可能 | 完了条件 |
| --- | --- | --- | --- | --- | --- |
| 1 | frontend repo foundation | SvelteKit app 作成、bun init、env schema、lint、format、Node adapter、CI 雛形を用意する | なし | 2, 3, 4 | local 起動、SSR build、lint / typecheck が通る |
| 2 | contract / auth / BFF gateway | `hooks.server.ts`、session cookie、XRPC client、error mapping、request tracing、server fetch wrapper を作る | 1 | 3, 4 | server load / action から XRPC を認証付きで安定して呼べる |
| 3 | design system / shared shell | design token、global layout、primary nav、mode badge、banner、dialog、empty state を作る | 1 | 2, 4 | public / owner-steward / participant / governance / audit を shell で見分けられる |
| 4 | test harness / fixture kit | Vitest、MSW、Testing Library、Vitest Browser Mode、semantic visual diff、seed loader を揃える | 1 | 2, 3 | route / auth / copy の基礎テストが CI で回る |
| 5 | public entry / discovery | `/`、featured editions、`/publications`、public publication detail の骨格を作る | 2, 3, 4 | 6, 8 | public value first と public lens が安定する |
| 6 | signed-in home workbench | `/home`、continue zone、create zone、publish zone、session rail、action queue を作る | 2, 3, 4、`getCharacterHome` | 5, 7, 8 | canonical landing が `/home` で固定され、session が root を奪わない |
| 7 | character continuity studio | `/characters`、`/characters/new`、`/characters/import`、`/characters/:branchRef` を作り、new / import / branch / convert を lane で分離する | 2, 3, 4、`getCharacterHome`、core mutation 群 | 6, 8 | draft / accepted、intent-only campaign、publication preview が docs どおりに見える |
| 8 | campaign workspace | `/campaigns`、`/campaigns/:campaignRef` を owner-steward / public の 2 lens で作る | 2, 3, 4、`getCampaignView` | 5, 7 | public campaign shell の deny-list と owner-steward の provenance 表示が分離される |
| 9 | publication management / tombstone | publish / retire UI、`/publications/:publicationRef` の active detail、superseded / retired tombstone、carrier explanation を作る | 5, 7, 8、`listPublications`、publication mutation 群 | 10 | publication / reveal / redaction / retire を語彙でも導線でも混ぜない |
| 10 | session access preflight | `/sessions/:sessionRef` deep-link の preflight、no-access explanation、recommendedRoute 分岐を作る | 2, 3, 4、`getSessionAccessPreflight` | 9 | session route の入口判断が client-side ad-hoc 条件分岐から独立する |
| 11 | session run shell / membership | `/sessions/:sessionRef`、membership flow、runtime state panel、session local nav を作る | 10、`getSessionView`、session mutation 群 | 13, 14 | participant-safe summary と membership action が成立する |
| 12 | board workspace / optional realtime | `/sessions/:sessionRef/board/:sceneRef`、participant read / operator mutate split、board CAS / rebase UX を作る。presence / drag preview / WS reconnect は backend realtime 完了後に追加する | 10, 11、`getBoardView`、`applyBoardOp` | 13, 14 | operator と participant が同一 surface に崩れず、mobile participant board は read-only を守る。realtime 未投入でも durable board shell は成立する |
| 13 | disclosure / replay / handouts | `/handouts`、`/replay`、public / participant replay split、handout disclosure UI を作る | 10, 11、`listHandouts`、`getReplayView` | 12, 14 | replay と disclosure が publication と混ざらず、public deny-list を守る |
| 14 | governance / appeal / audit | `/governance`、`/appeals`、`/audit`、authority banner、resolver queue、raw export handoff を作る | 10、`getGovernanceView`、`listAppealCases`、`getAuditView`、`exportServiceLog` | 12, 13 | governance read model が participant shell と分離され、appeal-only access を正しく扱える |
| 15 | hardening / release ops | perf、a11y、copy regression、route manifest check、observability dashboard、release runbook を固める | 5-14 | 継続実施 | Core Shell Gate、Session Context Gate、Final Gate が green になる |

## 実装順序

### Phase 0: foundation を固定する

対象モジュール:

- 1. frontend repo foundation
- 2. contract / auth / BFF gateway
- 3. design system / shared shell
- 4. test harness / fixture kit

推奨順:

1. 1 を先に終える
2. 2、3、4 を並列で進める
3. 2 の contract wrapper と 4 の MSW fixture を同じ schema source から生成する

この段階で揃えるもの:

- Bun 上での SvelteKit SSR / adapter-node 起動
- `hooks.server.ts` による auth session と current user 取得
- `@cerulia/contracts` を exact version で取り込み、`contracts/` へ同期する `sync-contracts.ts`
- global shell、mode badge、error panel、empty state
- Vitest、Vitest Browser Mode、Svelte compiler a11y diagnostics、semantic visual diff の最小 pipeline
- route manifest と copy regression の土台

この repo は frontend 単独で進め、backend とは contract artifact の version 固定で同期する。frontend と backend を同一 workspace に入れる前提は置かない。

この段階を終える条件:

- anonymous と signed-in の layout が切り替わる
- `Unauthorized`、`Forbidden`、`NotFound`、`UnsupportedRuleset`、`InvalidRequest` が UI state に写像できる
- mock-only でも `/` と `/home` の smoke test が回る
- exact version の contract artifact から型生成と fixture 生成が再現でき、frontend repo に backend source path 依存が残っていない

### Phase 1: core shell を立ち上げる

対象モジュール:

- 5. public entry / discovery
- 6. signed-in home workbench

推奨順:

1. 5 と 6 を並列で進める
2. `/` の public lens と `/home` の owner-steward lens を最初に固定する
3. session rail は 6 に置くが、route 主体の実装はまだ始めない

この段階で揃えるもの:

- public top の hero、value lane、featured editions
- signed-in home の continue / create / publish / session rail / action queue
- global nav と return path
- public badge と owner-steward badge の切り替え

この段階を終える条件:

- anonymous の canonical landing が `/`
- sign-in 後の canonical landing が `/home`
- signed-in user が明示的に `/` を開いたときも public lens のまま閲覧できる

### Phase 2: continuity workbench を閉じる

対象モジュール:

- 7. character continuity studio
- 8. campaign workspace
- 9. publication management / tombstone

推奨順:

1. 7 と 8 を並列で進める
2. 9 は 5、7、8 で publication 語彙と row grammar を固めてから着手する
3. 7 の create flow と 9 の publication preview は同じ review step vocabulary を使う

この段階で揃えるもの:

- create lane 4 種と review step
- character detail の current edition、origin line、archive split
- campaign hub と public campaign shell
- publication detail、active surface summary、superseded / retired tombstone

この段階を終える条件:

- AppView Core Shell Gate の必須 suite が green
- public / owner-steward の boundary が publication detail と campaign shell で崩れない
- current edition、archive、retire、reveal、redaction を UI 文言で混同しない

### Phase 3: session entry と session shell を足す

対象モジュール:

- 10. session access preflight
- 11. session run shell / membership

推奨順:

1. 10 を先に終える
2. 11 は 10 の decisionKind / recommendedRoute をそのまま受ける形で実装する
3. participant-safe summary と governance detail の分離をこの時点で固定する

この段階で揃えるもの:

- deep-link 入口での sign-in / join / participant-shell / governance / appeal-only / replay 分岐
- session shell、membership action、runtime panel
- session local nav と `/home` への escape hatch

この段階を終える条件:

- session deep-link が route guard の推測ではなく preflight query で決まる
- participant shell に controller list や raw audit detail が漏れない

### Phase 4: live context module を並列で足す

対象モジュール:

- 12. board workspace / optional realtime
- 13. disclosure / replay / handouts
- 14. governance / appeal / audit

推奨順:

1. 12、13、14 を並列で進める
2. 12 は 11 の session shell と shared breadcrumb を再利用する
3. 13 と 14 は disclosure vocabulary と appeal vocabulary を publication / participant surface に漏らさないよう別担当でも同じ copy checklist を使う

この段階で揃えるもの:

- board participant / operator split
- replay public / participant split
- handout disclosure panel
- governance console、appeal route、audit summary、raw export handoff
- authority health banner と warning rail
- realtime transport は feature flag でよく、backend の realtime Phase 6 完了までは poll / invalidate fallback でもよい

この段階を終える条件:

- AppView Session Context Gate の必須 suite が green
- board / replay / governance / audit が session shell の extension として成立し、root を奪わない

### Phase 5: hardening と release 判定

対象モジュール:

- 15. hardening / release ops

この段階で揃えるもの:

- performance budget
- visual baseline diff
- keyboard / screen reader の final review
- copy regression check
- route manifest check
- OpenTelemetry dashboard と release runbook

この段階を終える条件:

- Final AppView Gate が green
- [システムテスト計画](../architecture/test-plan.md) の必須 suite も同一 build で green

## 並列レーン

### レーン A: foundation

- 1 の後に 2、3、4 を並列で進めてよい
- 2 の auth / contract 変更は 4 の fixture generator と同じ schema source に寄せる

### レーン B: core shell

- 5 と 6 は並列で進めてよい
- ただし `/home` の session rail が 10 の preflight 仕様を先取りして route 分岐を埋め込まないようにする

### レーン C: continuity workspace

- 7 と 8 は並列で進めてよい
- 9 は publication semantics の drift を避けるため、7 と 8 の review step / public shell を確認してから着手する

### レーン D: session context

- 10 が session subtree 全体の入口になるため、11、12、13、14 より先に閉じる
- 12、13、14 は 10 と 11 が揃えば並列化できる
- ただし 12 の realtime sub-scope は backend realtime 完了後まで feature flag で温存してよい

### レーン E: hardening

- 15 は各フェーズで部分着手してよい
- ただし final gate の判定は 5 から 14 の完了後にまとめて行う

## backend 実装との同期点

| AppView 側 | backend 側の必要フェーズ | 備考 |
| --- | --- | --- |
| 1-4 | [Goサーバー実装計画](../architecture/implementation-plan.md) の Phase 0 | frontend はこの段階から published `@cerulia/contracts` を使って mock contract で着手してよい |
| 5-9 | backend Phase 2 | `getCharacterHome`、`getCampaignView`、`listPublications`、core mutation 群が揃うと full-stack 化できる |
| 10-11 | backend Phase 3 | `getSessionAccessPreflight`、`getSessionView`、session lifecycle / membership が必要 |
| 12 | backend Phase 4-5。realtime sub-scope は backend Phase 6 | durable board shell、CAS、snapshot hint は Phase 4-5 でよい。presence / drag preview / WS reconnect は Phase 6 完了後に有効化する |
| 13 | backend Phase 4-5 | handout、replay、disclosure contract が必要 |
| 14 | backend Phase 5 | governance、appeal、audit、`exportServiceLog` が必要 |
| 15 | backend 全体 + [システムテスト計画](../architecture/test-plan.md) | AppView 単独で final release 判定はしない |

backend は別 repo 実装なので、frontend は backend の release tag と `@cerulia/contracts` の artifact version を追う形で同期する。branch 名や workspace 相対参照を前提にしない。

重要なのは、frontend が backend より先に進める範囲と、release 判定に backend の実装完了が必要な範囲を分けることだ。mock contract で route、copy、layout、boundary を先に閉じてよいが、session context surface を mock だけで release してはならない。

## フェーズ別 gate

### Foundation Gate

最低限次を満たすこと。

- 1 から 4 が完了している
- bun install、lint、typecheck、Vitest smoke、Vitest Browser Mode smoke、Svelte compile が green
- error mapping と mode badge の共通部品が用意されている

### AppView Core Shell Gate

最低限次を満たすこと。

- 5 から 9 が完了している
- [AppViewテスト計画](test-plan.md) の AppView Core Shell Gate が green
- public / owner-steward の boundary leak がない

### AppView Session Context Gate

最低限次を満たすこと。

- 10 から 14 が完了している
- [AppViewテスト計画](test-plan.md) の AppView Session Context Gate が green
- session subtree が participant shell、board、replay、governance、appeal、audit の各 lens を守っている

### Final AppView Gate

最低限次を満たすこと。

- 15 が完了している
- [AppViewテスト計画](test-plan.md) の Final AppView Gate が green
- [システムテスト計画](../architecture/test-plan.md) の必須 suite も同一 build で green

## 実装時の注意点

### 1. route guard を auth source にしない

SvelteKit 側で route を隠しても、可否の正本は backend query / procedure にある。特に session deep-link は `getSessionAccessPreflight` を canonical source にし、client 内の if 文で target route を決めない。

### 2. local state と authoritative state を混ぜない

create flow draft、sidebar 開閉、recent items は local state でよいが、current edition、publication status、authority health、appeal status は backend response を正本にする。`resultKind = accepted` 前に current edition を確定表示してはならない。

### 3. public copy に内部語を流し込みすぎない

`publication`、`carrier`、`reveal`、`audit` のような内部語は public top の first viewport で主語にしない。必要な場合も補助説明に留める。

### 4. session surface を別製品に見せない

session subtree は高密度でもよいが、brand、breadcrumb、global nav、mode badge、`/home` への戻りは維持する。board / governance だけ別製品のような shell に分断しない。

### 5. secret と audit を client persistence に落としすぎない

handout plaintext、grant material、raw audit export を browser storage に残さない。必要なら memory 上の短寿命 state に留め、download や export は明示的操作に限定する。

## この計画の完了条件

次が満たされたとき、この計画は完了したと見なしてよい。

- SvelteKit ベースの AppView が docs の route、lens、copy、boundary に従って実装されている
- core continuity surface が session extension なしでも product root として成立している
- session subtree は preflight、participant shell、board、replay、governance、appeal、audit を route と read model の両方で分離している
- AppView の final gate と backend の system gate が同一 build で通っている
