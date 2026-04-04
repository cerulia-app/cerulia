# Go サーバー実装計画

## 目的

この文書は、Cerulia の設計文書を Go サーバー実装へ落とすための core-only 実行計画である。対象は server-side の実装順、module boundary、並列作業の許容範囲、着手条件、完了条件であり、character continuity service を session/run なしで閉じることを前提にする。

前提となる設計判断は次の文書に従う。

- [設計概要](overview.md)
- [設計哲学](philosophy.md)
- [スコープ再編の採用記録](scope-realignment.md)
- [レイヤー構成](layers.md)
- [projection contract](projections.md)
- [MVP の実装順](mvp.md)

## source set boundary

### product-core source set

- `docs/architecture/overview.md`
- `docs/architecture/philosophy.md`
- `docs/architecture/scope-realignment.md`
- `docs/architecture/decisions.md`
- `docs/architecture/layers.md`
- `docs/architecture/projections.md`
- `docs/architecture/mvp.md`
- `docs/architecture/implementation-plan.md`
- `docs/architecture/test-plan.md`
- `docs/records` の continuity core record
- `docs/lexicon/auth.md`, `docs/lexicon/core.md`, `docs/lexicon/defs.md`, `docs/lexicon/rpc.md`

### appview design source set

- `docs/appview/**`

AppView docs は M2 以降の `appview` frontend repo / submodule の規範入力として扱う。backend の contract 生成、validation、Go test gate は `docs/appview/**` を直接 source set にしない。

### archive source set

- `docs/archive/out-of-product-scope/**`

contract 生成、validation、docs index、test gate、implementation review は archive source set を走査しない。archive を読んで product-core の規範依存を復活させてはならない。

## 実装の基本方針

### 1. modular monolith で始める

初期実装は 1 つの Go サービスを基本にする。product-core を閉じる段階で process 分割や別 service 化は行わない。

### 2. contract-first で進める

最初にやるべきことは、core lexicon と core record 定義を JSON Lexicon と Go 型へ materialize することである。archive 側 namespace や record を main catalog に含めない。

### 3. core を先に閉じる

次の順を崩さない。

1. contract
2. ledger kernel
3. continuity core write path
4. core projection と core XRPC
5. hardening

### 4. 同期トランザクションを先に採る

core mutation は、少なくとも初期段階では record 書き込み、service log、current head 更新、必要最小限の projection 更新を 1 transaction で閉じる。非同期 projector は再構築や重い集約にだけ使う。

### 5. machine-readable contract を公開 artifact として配る

frontend や test harness は backend source tree や Markdown docs を直接参照しない。machine-readable な契約の正本は backend 実装が生成して配布する versioned artifact に置く。

## 推奨 Go 構成

```text
cmd/
  api/
internal/
  authz/
  contract/
  core/
    command/
    model/
    projection/
    scope/
    sharing/
  ledger/
  platform/
    config/
    database/
    httpserver/
    logging/
  store/
```

product-core へ戻さないものは、`internal/run` やそれに準ずる public module として残さない。archive 相当の実験コードが必要なら、product build と contract catalog から外れた場所に隔離する。

## モジュール一覧

| # | モジュール | 主責務 | 主に扱う record / surface | 依存 | 並列可能 |
| --- | --- | --- | --- | --- | --- |
| 1 | contract materialization | core lexicon / core record と shared defs / auth を JSON と Go 型へ固定し、validator と versioned contract artifact を作る | core docs と shared defs / auth | docs のみ | 2 |
| 2 | platform foundation | config、logging、metrics、migration、CI、ローカル起動を用意する | サービス起動基盤 | なし | 1 |
| 3 | auth gateway | DID 解決、OAuth permission-set 検証、anonymous public mode を作る | auth bundle、repo access | 1, 2 | 4 |
| 4 | ledger kernel | requestId idempotency、service log、current-head helper、revision CAS helper を作る | mutationAck、service log、head chain | 1, 2 | 3 |
| 5 | continuity scope / rules | world、house、campaign、ruleset-manifest、rule-profile と rule chain resolver を作る | core scope records | 3, 4 | 6 |
| 6 | character lineage | character-sheet、character-branch、character-conversion、character-advancement、character-episode を作る | sheet / branch / conversion / advancement / episode | 3, 4, 5 | 7 |
| 7 | sharing ledger | publication、reuse-grant、retire / revoke を作る | publication / reuse | 5, 6 | 8 |
| 8 | core projection | character home、campaign view、publication summary を作る | core read model | 5, 6, 7 | 9 |
| 9 | core XRPC | core query / procedure、error surface、auth mapping を作る | app.cerulia.rpc core endpoints | 3, 4, 5, 6, 7, 8 | 8 の一部 |
| 10 | hardening | scenario test、performance、migration rehearsal、運用 runbook を固める | 全体 | 1-9 | 各フェーズ末 |

## 実装順序

### Phase 0: contract と基盤を固定する

対象モジュール:

- 1. contract materialization
- 2. platform foundation
- 3. auth gateway
- 4. ledger kernel

この段階で揃えるもの:

- core JSON Lexicon、shared defs / auth、Go DTO
- versioned contract artifact と example payload bundle
- requestId、AT URI、DID、revision などの value object
- permission-set 検証 middleware
- service log table
- idempotency table
- current head table と current-head helper
- campaign / character-branch 向け revision CAS helper
- archive source set を除外した unresolved contract fail-fast

### Phase 1: continuity core の書き込み正本を作る

対象モジュール:

- 5. continuity scope / rules
- 6. character lineage
- 7. sharing ledger

推奨順:

1. campaign と rule-profile chain
2. character-sheet と character-branch
3. publication と reuse-grant
4. character-advancement と character-episode
5. character-conversion

この段階を終える条件:

- character lineage、campaign continuity、publication、reuse が一通り成立する
- supersedes、retire、revoke が delete なしで動く
- core record から session 固有 ref が除去されている

### Phase 2: core read surface を閉じる

対象モジュール:

- 8. core projection
- 9. core XRPC

この段階で揃えるもの:

- character home
- campaign view
- publication summary
- getCharacterHome、getCampaignView、listCharacterEpisodes、listReuseGrants、listPublications
- createCampaign、createCharacterBranch、updateCharacterBranch、retireCharacterBranch、recordCharacterAdvancement、recordCharacterEpisode、recordCharacterConversion、importCharacterSheet、attachRuleProfile、retireRuleProfile、publishSubject、retirePublication、grantReuse、revokeReuse

この段階を終える条件:

- core projection が core canonical input のみで再構築できる
- public mode と owner / steward mode の差分が auth と data folding の両方で再現できる
- public HTTP surface、authz、contract catalog に run/session/gov/disclosure endpoint が残っていない

### Phase 3: hardening と cleanup を完了する

対象モジュール:

- 10. hardening

この段階で揃えるもの:

- scenario test
- projection rebuild test
- migration rehearsal
- archive 除外の継続検証
- clean-slate review と残骸除去

この段階を終える条件:

- product-core build だけで demo と test gate が成立する
- archive 側 docs や code が product-core の catalog、router、authz、mutationAck を再汚染しない

## 破綻防止ルール

次の実装順は取らない。

- session を core より先に作らない
- publication と外部 carrier を同じ write path にしない
- reuse revoke と別 concern の revoke を同じ table / enum に寄せない
- archive docs を contract catalog や test fixture の入力にしない
- core record に run 固有 field を暫定互換として残し続けない

## テスト計画

具体的な release gate は [システムテスト計画](test-plan.md) に従う。implementation plan 上の最低条件は次のとおりである。

- Phase 0: contract validation、ledger kernel property test
- Phase 1: core domain unit test
- Phase 2: projection / auth / route integration test
- Phase 3: end-to-end scenario test、projection rebuild test、migration rehearsal

## 非目標

この計画は次を扱わない。

- session lifecycle
- membership と authority transfer
- disclosure、secret、handout
- board、realtime、replay
- appeal、governance、audit export

これらは archive に残すが、現行 product の実装計画には入れない。
