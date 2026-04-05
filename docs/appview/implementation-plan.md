# SvelteKit ベース AppView 実装計画

## 目的

この文書は、[AppView 層 UI 設計](README.md) を SvelteKit ベースの実装へ落とすための core-only 実行計画である。対象は AppView の module 分割、実装順、並列作業の許容範囲、採用技術スタック、フェーズごとの release gate であり、Character Continuity Workbench を `/`, `/home`, `/characters`, `/campaigns`, `/publications` だけで成立させることを前提にする。

## 実装の基本方針

### 1. SvelteKit は BFF 兼 SSR shell として使う

AppView は browser から直接 privileged XRPC を叩く thin client ではなく、SvelteKit server load / action を通じて backend の XRPC を束ねる BFF として実装する。

### 2. core continuity surface を先に閉じる

public top、signed-in home、character studio、campaign workspace、publication library をこの順で成立させる。archive 側 workflow の route は product AppView に入れない。

### 3. authoritative data path を SvelteKit に一本化する

current edition、publication status、campaign shell の可視性のような authoritative な値は、SvelteKit の server load / action と backend の mutationAck を正本にする。client store は local presentation state に限る。

### 4. contract-first で進める

frontend repo は backend repo と分離し、backend が publish する package `@cerulia/contracts` から TypeScript 型、fixture、test harness を作る。archive 側 lexicon は取り込まない。

### 5. release gate は core-only に固定する

フェーズの完了判定は [AppView テスト計画](test-plan.md) の Core Shell Gate と Final Gate に合わせる。route-mounted assertion は repo 内 Browser Mode か workspace-level release smoke のどちらで満たしてもよい。session context gate は持たない。

## 推奨技術スタック

| 領域                      | 採用                                                                                  | 理由                                                             |
| ------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| runtime / package manager | Bun 1.x、bun                                                                          | SvelteKit / Vite と相性がよい                                    |
| repository topology       | frontend 単独 repo、Go backend は別 repo                                              | contract artifact で同期点を明確にできる                         |
| framework                 | SvelteKit 2 系、Svelte 5、TypeScript strict                                           | server load / action、SSR と相性がよい                           |
| adapter                   | `@sveltejs/adapter-node`                                                              | SSR と reverse proxy 配下運用に向く                              |
| 認証 / BFF                | `hooks.server.ts`、httpOnly session cookie、server-side fetch wrapper                 | reader lens と auth bundle を分離しやすい                        |
| contract / validation     | `@cerulia/contracts` artifact 由来の TypeScript client、Zod                           | XRPC schema drift を早く検知できる                               |
| form                      | SvelteKit form actions、`sveltekit-superforms`、Zod                                   | multi-step create flow を扱いやすい                              |
| UI primitive              | component-scoped CSS、feature-scoped CSS、global token CSS、small reset/base、Bits UI | 独自 visual language を保ちつつ a11y を担保できる                |
| unit / integration test   | Vitest、`@testing-library/svelte`、MSW                                                | route load / action を contract-first に検証できる               |
| browser journey / visual  | Vitest Browser Mode、semantic visual diff                                             | route contract と主要 surface の visual drift を早期に検出できる |

## styling decision

AppView の styling は native CSS を前提にし、次の 4 層で管理する。

1. global token CSS
2. small reset / base
3. shared semantic primitives
4. feature または component-scoped CSS

この構成により、AI agent は style の責務を「token」「shared primitive」「feature local」へ切り分けて探索できる。`app.css` へ全 route の rule を積み続ける方針は採らない。

Tailwind CSS は採用しない。utility-first は局所性を上げる一方で、Cerulia が重視する public / owner-steward、current / archive、draft / accepted の grammar を semantic に監査しづらくするためである。

DaisyUI のような preset UI library も採用しない。初速は出るが、Character Continuity Workbench を generic dashboard の grammar に引き戻しやすく、override と debug の責務が増えるためである。

reset CSS は small reset / base として採用してよいが、方針の中心ではない。baseline normalization と focus / form control の整備に限って用いる。

## 推奨ディレクトリ構成

```text
src/
  app.html
  hooks.server.ts
  lib/
    auth/
    design/
      tokens.css
      base.css
      primitives.css
    rpc/
    shell/
    testkit/
    features/
      public-entry/
      home/
      characters/
      campaigns/
      publications/
  routes/
    +layout.server.ts
    +layout.svelte
    +page.svelte
    home/
    characters/
    campaigns/
    publications/
tests/
  component/
  contract/
  mounted/
contracts/
  manifest.lock.json
  lexicon/
  fixtures/
```

## モジュール一覧

| #   | モジュール                          | 主責務                                                                                  | 着手条件                    | 並列可能 | 完了条件                                                                      |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------- | --------------------------- | -------- | ----------------------------------------------------------------------------- |
| 1   | frontend repo foundation            | SvelteKit app、env schema、lint、format、Node adapter、CI 雛形を用意する                | なし                        | 2, 3, 4  | local 起動、SSR build、lint / typecheck が通る                                |
| 2   | contract / auth / BFF gateway       | `hooks.server.ts`、session cookie、XRPC client、error mapping を作る                    | 1                           | 3, 4     | server load / action から XRPC を認証付きで呼べる                             |
| 3   | design system / shared shell        | design token、global layout、primary nav、banner、empty state を作る                    | 1                           | 2, 4     | public / owner-steward を primary nav と surface copy で見分けられる          |
| 4   | test harness / fixture kit          | Vitest、MSW、Testing Library、Browser Mode を揃える                                     | 1                           | 2, 3     | route / auth / copy の基礎テストが CI で回る                                  |
| 5   | public entry / workbench promise    | `/`、publication shelf、`/publications`、public publication detail の骨格を作る         | 2, 3, 4                     | 6, 8     | public value first と public lens が安定する                                  |
| 6   | character continuity workbench home | `/home`、continue zone、create zone、publish zone を作る                                | 2, 3, 4、`getCharacterHome` | 5, 7, 8  | canonical landing が `/home` で固定される                                     |
| 7   | character continuity studio         | `/characters`、`/characters/new`、`/characters/import`、`/characters/:branchRef` を作る | 2, 3, 4、`getCharacterHome` | 6, 8     | draft / accepted、campaign intent、publication preview が docs どおりに見える |
| 8   | campaign workspace                  | `/campaigns`、`/campaigns/:campaignRef` を owner-steward / public の 2 lens で作る      | 2, 3, 4、`getCampaignView`  | 5, 7     | public campaign shell と owner-steward provenance 表示が分離される            |
| 9   | publication management / tombstone  | publish / retire UI、`/publications/:publicationRef` の active detail、tombstone を作る | 5, 7, 8                     | 10       | publication / retire / archive が語彙でも導線でも混ざらない                   |
| 10  | hardening / release ops             | perf、a11y、copy regression、route manifest check を固める                              | 5-9                         | 継続実施 | Core Shell Gate と Final Gate が green                                        |

## 実装順序

### Phase 0: foundation を固定する

対象モジュール:

- 1. frontend repo foundation
- 2. contract / auth / BFF gateway
- 3. design system / shared shell
- 4. test harness / fixture kit

### Phase 1: public top と home を立ち上げる

対象モジュール:

- 5. public entry / workbench promise
- 6. character continuity workbench home

### Phase 2: Character Continuity Workbench を閉じる

対象モジュール:

- 7. character continuity studio
- 8. campaign workspace
- 9. publication management / tombstone

### Phase 3: hardening と release 判定

対象モジュール:

- 10. hardening / release ops

## 破綻防止ルール

- `/sessions/*` の route を product AppView に入れない
- current edition や publication status を client-side cache のみで保持しない
- archive 側 lexicon や fixture を contract source に混ぜない
- publication、retire、archive を 1 つの UI toggle にまとめない
- draft を authoritative fact に見せない
