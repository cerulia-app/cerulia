# システムテスト計画

## 目的

Cerulia の core 実装を release gate として検証するためのテスト計画。PL がキャラクターを作り、セッション経験を記録し、共有できることを実証する。

## テスト対象

### Core Records

- character-sheet + character-branch（ペア作成）
- character-advancement
- character-conversion
- session
- scenario
- campaign
- house
- ruleset-manifest
- rule-profile
- character-sheet-schema

### Projections

- character home
- campaign view
- scenario catalog
- house activity

## 必須テスト群

### A. Contract / Lexicon

| ID | 対象 | 検証点 |
|---|---|---|
| A-1 | record schema | Lexicon schema が相互参照可能であること |
| A-2 | auth bundle | core endpoint が定義された permission-set でしか到達できないこと |
| A-3 | visibility | draft record が public mode の一覧に出ないこと |

### B. Core Domain

| ID | 対象 | 検証点 |
|---|---|---|
| B-1 | sheet + branch ペア | createCharacterSheet が sheet + default branch をペアで生成すること |
| B-2 | advancement chain | sessionRef リンクと previousValues の保持が正しいこと |
| B-3 | session invariants | PL が自分の session を書けること。他人の DID を含まないこと |
| B-4 | campaign seed | house defaults → campaign additions の順で merge すること |
| B-5 | scenario registration | 誰でも scenario を登録できること |
| B-6 | conversion fence | source / target rulesetNsid が記録されること |
| B-7 | visibility toggle | draft ↔ public の切り替えが反映されること |

### C. Projection

| ID | 対象 | 検証点 |
|---|---|---|
| C-1 | character home | core canonical input だけで再構築できること |
| C-2 | character home public | public mode で draft branch / session が除外されること |
| C-3 | campaign view | campaign に紐づく session が一覧されること |
| C-4 | scenario catalog | rulesetNsid でフィルタできること |
| C-5 | scenario → schema chain | scenario → manifest → sheetSchemaRefs の chain が解決できること |

### D. End-to-End

| ID | シナリオ | ステップ | 合格条件 |
|---|---|---|---|
| D-1 | キャラクター作成 | rulesetNsid 選択 → schema 取得 → sheet + branch 作成 → stats 入力 | character home に表示されること |
| D-2 | セッション記録 | session 作成 → advancement 記録 → sessionRef リンク | session 履歴と成長履歴が追えること |
| D-3 | 共有 | visibility: public → public mode で閲覧 | 他人から character home が見えること |
| D-4 | 長期卓 | campaign 作成 → session.campaignRef → campaign view | campaign view にセッションが並ぶこと |

## Release Gate

### Core Gate

A-1 〜 A-3、B-1 〜 B-7、C-1 〜 C-5、D-1 〜 D-4 が green であること。

### Final Gate

- projection rebuild
- migration rehearsal
- clean-slate review
# システムテスト計画

## 目的

この文書は、Cerulia の core-only 実装を release gate として検証するためのテスト計画である。対象は continuity core とそれを返す AppView core surface であり、archive 側の session / governance / disclosure / board / replay workflow は含めない。

本計画は、少なくとも次を実証することを目的にする。

- 実装が current docs の contract と invariant に整合すること
- product-core と archive の境界を破っていないこと
- public と owner の lens が混線していないこと
- reject、rebase-needed、tombstone まで documented behavior に一致すること

## この計画で主張できること

以下の前提が満たされ、かつ本計画の必須テストとレビューが完了した場合、次を主張してよい。

- Cerulia 実装は core-only docs と contract に対して conformant である
- documented な record lifecycle、fence semantics、projection folding、permission-set separation が破綻していない
- character continuity、campaign、publication、append-only correction の各経路が設計文書どおりに動作する

## この計画で主張できないこと

以下は本計画だけでは証明しない。

- 外部 carrier の長期可用性
- archive 側 workflow の正しさ
- ruleset resolver が返す内容そのものの妥当性
- production インフラ上の障害吸収の完全性

## テスト対象範囲

### 1. Continuity Core

- campaign、world、house
- ruleset-manifest、rule-profile
- character-sheet、character-branch、character-advancement、character-conversion
- session、session-participation、scenario
- publication
- character-sheet-schema
- character home、campaign view、publication summary

### 2. AppView Core Contract

- public top `/`
- signed-in home `/home`
- characters `/characters`, `/characters/new`, `/characters/import`, `/characters/:branchRef`
- campaigns `/campaigns`, `/campaigns/:campaignRef`
- publications `/publications`, `/publications/:publicationRef`
- tombstone と return path

## テストハーネス前提

- 固定時計
- requestId を固定できる generator
- DID fixture。branch owner、campaign maintainer、public reader、anonymous を分けるため
- raw record と projection の両方を読める API
- manifest、rule-profile、campaign seed merge の fixture
- route resolution を検証できる AppView integration harness
- archive source set を除外した contract validation

## 成功条件の論理構造

システム全体の正常稼働は次の 5 段で証明する。

1. contract が正しい
2. ledger kernel が正しい
3. domain invariant が正しい
4. projection と route resolution が正しい
5. end-to-end workflow が正しい

## 必須テスト群

### A. Contract / Lexicon Unit Test

| ID  | level | 対象                   | 主要検証点                                                                                           |
| --- | ----- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| A-1 | unit  | defs / refs validation | named ref、enum、Lexicon schema が相互参照可能であること                                             |
| A-2 | unit  | auth bundle matrix     | core endpoint が定義された permission-set か documented anonymous public mode でしか到達できないこと |
| A-3 | unit  | mutationAck schema     | accepted / rejected / rebase-needed の field shape が core endpoint family で一貫すること            |
| A-4 | unit  | transport contract     | public mode で不正な includeRetired などが InvalidRequest になること                                 |
| A-5 | unit  | archive exclusion      | archive source set が contract catalog と validation に入らないこと                                  |

### B. Ledger Kernel Unit Test

| ID  | level | 対象                  | 主要検証点                                                                                       |
| --- | ----- | --------------------- | ------------------------------------------------------------------------------------------------ |
| B-1 | unit  | requestId idempotency | governingRef + operationNsid + requestId の重複が accepted / rejected を問わず再現可能であること |
| B-2 | unit  | current-head helper   | supersedes chain の current head が一意に解決できること                                          |
| B-3 | unit  | revision CAS helper   | campaign / character-branch の expectedRevision が stale のとき rebase-needed になること         |
| B-4 | unit  | service log split     | raw service log と user-facing projection が別責務で維持されること                               |

### C. Core Domain Unit Test

| ID  | level | 対象                   | 主要検証点                                                                                          |
| --- | ----- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| C-1 | unit  | campaign seed merge    | world defaults -> house defaults -> campaign additions の順で merge すること                        |
| C-2 | unit  | branch update / retire | metadata update は stable-object mutation であり、retired branch を通常 update で再活性化しないこと |
| C-3 | unit  | advancement chain      | supersedes correction が append-only で、active sequence が決定的に畳み込まれること                 |
| C-4 | unit  | episode summary        | advancementRefs が同一 branch のみを指し、episode が growth fact の正本にならないこと               |
| C-5 | unit  | conversion fence       | source / target manifest、sheet snapshot、target authority 条件が守られること        |
| C-6 | unit  | publication chain      | subject ごとに current head が一意で、独立 root の並立を許さないこと                                |
| C-7 | unit  | retirePublication      | retired current head が active surface を残さないこと                                               |
| C-8 | unit  | session invariants     | session の participantEntries と session-participation の merge が想定どおりに動くこと     |

### D. Projection and Route Integration Test

| ID  | level       | 対象                       | 主要検証点                                                                                                                                 |
| --- | ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | integration | getCharacterHome           | core canonical input だけで再構築できること                                                                                                |
| D-2 | integration | getCampaignView            | owner / public の block matrix が厳密に分かれ、public shell が active public publication current head に裏づくときだけ成立すること |
| D-3 | integration | listPublications           | public mode は active current head のみ、owner mode では includeRetired で retired current head row を明示 opt-in で列挙できること |
| D-4 | integration | projection exclusion       | archive record を注入しても core projection family の canonical row が変わらないこと                                                       |
| D-5 | integration | anonymous core read matrix | getCampaignView(public) と listPublications(public) が anonymous で documented field だけを返すこと                                        |
| D-6 | integration | publication tombstone      | retired / superseded publication deep-link が explanatory tombstone を返すこと                                                             |
| D-7 | integration | public explanation copy    | public top、campaign shell、publication detail / tombstone が primary nav / surface copy と公開境界の説明を表示すること                    |

### E. End-to-End Scenario Test

| ID  | シナリオ                            | 主要ステップ                                                                                                                                | 合格条件                                                                                                         |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| E-1 | core character lifecycle             | importCharacterSheet -> createCharacterBranch -> recordCharacterAdvancement -> createSession -> publishSubject -> getCharacterHome | branch lineage、advancement correction、session summary、publication current head が一貫すること                 |
| E-2 | cross-ruleset conversion             | branch 作成 -> recordCharacterConversion -> createSession -> listPublications                                                         | conversion provenance、targetCampaignRef の canonical linkage、public derivation hint が一貫すること |
| E-3 | publication supersede and retire    | publishSubject -> superseding publishSubject -> retirePublication -> publication direct-link                                                | current head 一意、retired chain、tombstone CTA、public mode の active-only が一貫すること                       |
| E-4 | public reading journey              | `/` -> `/publications/:publicationRef` -> `/campaigns/:campaignRef`                                                                         | public top が価値説明と公開中の版だけを出し、campaign shell が continuity summary に留まること                   |
| E-5 | signed-in owner journey             | sign-in -> `/home` -> `/characters/new` or `/characters/import` -> `/characters/:branchRef`                                                 | canonical landing が `/home` で、create / continue / publish の導線が continuity workbench として成立すること    |

## release gate

### Core Gate

最低限次が green であること。

- A-1 から A-5
- B-1 から B-4
- C-1 から C-8
- D-1 から D-7
- E-1 から E-5

この gate を通過した時点で、Cerulia の product-core は docs 準拠の demo が可能とみなしてよい。

### Final Gate

最低限次が green であること。

- projection rebuild
- migration rehearsal
- long-running correction / retire / revoke 監査
- clean-slate review による残骸なし確認

backend repo では次を Final Gate の既定証跡に使う。

- projection rebuild: `cmd/rebuild` / `scripts/rebuild.ps1` と `TestValidateRebuildReplaysLongRunningAuditScenario`
- migration rehearsal: `CERULIA_TEST_DATABASE_URL` を与えた `TestPostgresFinalGateRehearsal` と migrate + rebuild + smoke の実行証跡
- long-running correction / retire / revoke 監査: `TestValidateRebuildReplaysLongRunningAuditScenario` と Postgres rehearsal
- clean-slate review: Cerulia 実装レビュー agents の signoff と final gate report

## カバレッジ

この計画が直接カバーするもの:

- record 参照整合性
- append-only chain と current head 解決
- requestId idempotency
- revision CAS
- public / owner lens の分離
- tombstone と公開説明の明示的な挙動
- archive exclusion の継続検証

この計画が直接カバーしないもの:

- archive 側 workflow
- external carrier の寿命
- cryptographic primitive の安全性
- human moderation judgment
