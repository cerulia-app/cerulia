# Goサーバー実装計画

## 目的

この文書は、Cerulia の設計文書を Go サーバー実装へ落とすための実行計画である。対象は server-side の実装順、モジュール境界、並列作業の許容範囲、着手条件、完了条件であり、core と optional extension を混ぜずに前進できる形へ分解する。

前提となる設計判断は次の文書に従う。

- [設計概要](overview.md)
- [設計哲学](philosophy.md)
- [レイヤー構成](layers.md)
- [projection contract](projections.md)
- [実行権威拡張](authority.md)
- [秘匿と公開境界の拡張](secrets.md)
- [実プレイ拡張](actual-play.md)
- [MVPの実装順](mvp.md)

## 実装の基本方針

### 1. 最初は modular monolith で始める

初期実装は 1 つの Go サービスを基本にする。プロセス分割や別サービス化は、projection の負荷や realtime の要件が実測で問題になってから行う。最初から分散化すると、authority、service log、idempotency、projection 更新の整合性の方が難しくなる。

推奨する初期構成は次の 3 つで十分である。

- API サーバー: XRPC と補助 HTTP を提供する本体
- PostgreSQL: append-only ledger、head 解決、projection table、service log を保持する
- blob ストア: asset、secret payload、audit detail の内容参照を保持する

必要になった時だけ、projection 再構築や replay 集約のための worker を後から追加する。

### 2. docs をそのまま実装しない

現在の docs は Markdown であり、実装は machine-readable contract を必要とする。したがって最初にやるべきことは、lexicon と record 定義を JSON Lexicon と Go 型へ materialize することである。

### 3. core を先に閉じる

次の順を崩さない。

1. contract
2. ledger kernel
3. continuity core
4. core projection と core XRPC
5. structured run
6. disclosure / governance
7. live play / board / replay / realtime

### 4. 同期トランザクションを先に採る

core mutation は、少なくとも初期段階では record 書き込み、service log、current head 更新、必要最小限の projection 更新を 1 トランザクションで閉じる。非同期 projector は再構築や重い集約にだけ使う。これにより requestId、CAS fence、current head の整合を簡潔に保てる。

### 5. machine-readable contract は backend の公開 artifact として配る

frontend や別 repo の test harness は、backend source tree やこの docs repo の相対 path を直接参照しない。machine-readable な契約の正本は backend 実装が生成して配布する versioned artifact に置き、consumer はその immutable version だけを pin して使う。これにより別 repo 間でも schema drift を明示的に管理できる。

## 推奨 Go 構成

```text
cmd/
  api/
internal/
  platform/
  contract/
  atproto/
  ledger/
  authz/
  store/
  blob/
  core/
    scope/
    rules/
    character/
    sharing/
    projection/
  run/
    session/
    authority/
    membership/
    state/
    disclosure/
    live/
    board/
    governance/
    replay/
  audit/
  realtime/
  testkit/
```

設計上の要点は、microservice ではなく package 境界で core と extension を分けることにある。deployment を分けるのは package 境界が安定してからでよい。

## モジュール一覧

| # | モジュール | 主責務 | 主に扱う record / surface | 依存 | 並列可能 |
| --- | --- | --- | --- | --- | --- |
| 1 | contract materialization | core lexicon / core record と shared defs / auth を JSON と Go 型へ固定し、validator と versioned contract artifact を作る。extension contract は phase ごとに harden する | core docs と shared defs / auth | docs のみ | 2 |
| 2 | platform foundation | config、logging、metrics、migration、CI、ローカル起動、blob 抽象を用意する | サービス起動基盤 | なし | 1 |
| 3 | ATProto / auth gateway | DID 解決、OAuth permission-set 検証、repo / blob client、anonymous public mode を作る | auth bundle、repo access | 1, 2 | 4 |
| 4 | ledger kernel | requestId idempotency、service log、current-head helper、revision CAS helper、dual-revision helper、append-only helper を作る | mutationAck、service log、head chain、revision fence | 1, 2 | 3 |
| 5 | core scope / rules | world、house、campaign、ruleset-manifest、rule-profile と rule chain resolver を作る | core scope records | 3, 4 | 6 |
| 6 | character base | character-sheet、character-branch、import path、ownership 境界を作る | sheet / branch | 3, 4 | 5 |
| 7 | sharing ledger | publication、reuse-grant、retire / revoke を作る | publication / reuse | 5, 6 | 8 |
| 8 | continuity events | character-advancement、character-episode、character-conversion を作る | advancement / episode / conversion | 5, 6, 7 | 7 の一部 |
| 9 | core projection | character home、campaign view、publication summary を作る | core read model | 5, 6, 7, 8 | 10 |
| 10 | core XRPC | core query / procedure、error surface、auth mapping を作る | app.cerulia.rpc core endpoints | 3, 4, 5, 6, 7, 8, 9 | 9 の一部 |
| 11 | run foundation | session、session-authority、membership、最小の session-publication mirror、session lifecycle を作る | session / authority / membership / session-publication | 3, 4, 5, 7 | 12 |
| 12 | disclosure | audience、audience-grant、secret-envelope、reveal、redaction、key rotation を作る | secret records | 11, 4, blob | 13, 14 の一部 |
| 13 | live event / state | character-instance、character-state、message、roll、ruling-event を作る | run-time event / state | 11, 12 | 14 |
| 14 | board | scene、token、asset、handout、board-op、board-snapshot、board view を作る | board records | 11, 12, blob | 13 |
| 15 | governance / replay / audit | appeal-case、appeal-review-entry、audit-detail-envelope、replay view、audit view を作る | governance / replay surfaces | 11, 12, 13, 14, 7 | なし |
| 16 | realtime | drag、cursor、presence の揮発同期を作る | websocket / SSE | 14 | なし |
| 17 | hardening | scenario test、performance、migration rehearsal、運用 runbook を固める | 全体 | 10 以降段階的、最終的に 1-16 | 各フェーズ末 |

## Lexicon artifact 配布方式

backend repo は machine-readable contract を、npm 互換 registry に publish する package `@cerulia/contracts` を正規配布チャネルとして出す。registry は GitHub Packages を第一候補とし、同じ内容の tarball を GitHub Release asset にも添付する。frontend の Bun 環境では package 取り込みが最も扱いやすく、非 JavaScript consumer や監査用途では tarball を参照できるようにする。

### artifact の中身

| path | 内容 | 用途 |
| --- | --- | --- |
| `manifest.json` | artifactVersion、sourceGitSha、sourceTag、builtAt、schemaHash、exampleHash、compatibilityChannel を持つ manifest | frontend と test harness の pin 対象 |
| `lexicon/*.json` | 生成済み JSON Lexicon | TypeScript client、Go schema validation、docs 差分検知 |
| `examples/rpc/*.json` | query / procedure の canonical example payload | MSW fixture、Browser test scenario、golden test |
| `checksums.txt` | artifact 内ファイルの checksum 一覧 | 改ざん検知、CI 検証 |
| `CHANGELOG-contract.md` | contract 変更点の要約。breaking / additive / rename を明記する | consumer 側の upgrade 判断 |

### version と channel

- stable release は `X.Y.Z` の semver で publish し、registry の `latest` tag に載せる
- release candidate は `X.Y.Z-rc.N` で publish し、`rc` tag に載せる
- main branch の継続統合用 snapshot は `0.0.0-main.<runNumber>` の prerelease とし、`next` tag に載せる
- frontend は `latest` や `next` を浮動参照せず、常に exact version を pin する

### publish flow

1. backend CI が docs/lexicon と records / defs から JSON Lexicon と example payload を生成する
2. contract validation test と unresolved contract fail-fast を通す
3. `manifest.json` と `checksums.txt` を生成し、artifact bundle を組み立てる
4. tag build では `@cerulia/contracts` を registry へ publish し、同じ tarball を Release asset として添付する
5. main build では `next` 向け prerelease publish か、少なくとも CI artifact を生成して integration branch が取得できるようにする

### consumer ルール

- frontend repo と外部 test harness は `@cerulia/contracts` の exact version だけを依存に持つ
- generated client、MSW fixture、browser scenario fixture、golden payload は同じ artifact version から生成する
- docs の Markdown と published artifact の間に差分が出た場合、consumer は docs ではなく published artifact を優先し、backend 側で差分を解消する
- release 判定では backend image version と contract artifact version を対応付けて記録する

## 実装順序

### Phase 0: contract と基盤を固定する

対象モジュール:

- 1. contract materialization
- 2. platform foundation
- 3. ATProto / auth gateway
- 4. ledger kernel

この段階で揃えるもの:

- core JSON Lexicon、shared defs / auth、Go DTO
- extension 用の shared ref / enum だけを先に固定し、run / disclosure / board / governance の concrete contract は各 phase の直前に harden する
- versioned contract artifact `@cerulia/contracts` と同内容 tarball の生成パイプライン
- `manifest.json`、`checksums.txt`、canonical example payload bundle
- AT URI、DID、record ref、requestId、revision などの value object
- permission-set 検証 middleware
- repo / blob 抽象
- service log table
- idempotency table
- current head table と current-head helper
- campaign / board / character-state 向けの revision CAS helper
- appeal 向けの caseRevision / reviewRevision dual CAS helper
- idempotency unique key を governingRef + operationNsid + requestId で固定する
- 最小の exportServiceLog
- migration と test harness

この段階を終える条件:

- core の全 endpoint が、少なくとも request / response の schema validation だけは通る
- accepted / rejected / rebase-needed / manual-review を mutationAck と service log へ一貫して記録できる
- current-head chain、revision CAS、dual revision の 3 種類を混ぜずに使い分けられる
- exportServiceLog で requestId と governing scope ごとの raw 監査列を読める
- frontend repo が exact version の contract artifact を source path 依存なしに取得し、型生成と fixture 生成を再現できる

### Phase 1: continuity core の書き込み正本を作る

対象モジュール:

- 5. core scope / rules
- 6. character base
- 7. sharing ledger
- 8. continuity events

推奨順:

1. campaign と rule-profile chain
2. character-sheet と character-branch
3. publication と reuse-grant
4. character-advancement と character-episode
5. character-conversion

理由:

- conversion は source / target manifest、branch、reuse 境界に依存するため最後でよい
- publication と reuse は product value の中心であり、run extension より前に閉じる必要がある
- episode は summary、advancement は fact なので、同一 branch に対する folding 規則を先に実装できる

この段階を終える条件:

- session が無くても character lineage、campaign continuity、publication、reuse が一通り成立する
- supersedes、retire、revoke が delete なしで動く
- cross-boundary reuse と conversion の consent fence がテストで確認できる

### Phase 2: core read surface を閉じる

対象モジュール:

- 9. core projection
- 10. core XRPC

この段階で揃えるもの:

- character home
- campaign view
- publication summary
- getCharacterHome、getCampaignView、listCharacterEpisodes、listReuseGrants、listPublications
- createCampaign、createCharacterBranch、recordCharacterAdvancement、recordCharacterEpisode、recordCharacterConversion、importCharacterSheet、attachRuleProfile、retireRuleProfile、publishSubject、retirePublication、grantReuse、revokeReuse

この段階を終える条件:

- core projection が core canonical input のみで再構築できる
- public mode と owner / steward mode の差分が auth と data folding の両方で再現できる
- converted branch / episode の publication summary で derivation hint を返せる
- session / message / board / secret が無くても product demo が成立する

### Phase 3: structured run の control plane を足す

対象モジュール:

- 11. run foundation

着手条件:

- full な core XRPC 完了を待つ必要はない
- 3, 4, 5, 7 が揃った時点で record / domain 実装に着手し、handler binding は 10 と並走してよい

推奨順:

1. session draft / lifecycle
2. session-authority
3. membership
4. 最小の session-publication mirror

この段階で揃えるもの:

- createSessionDraft
- open / start / pause / resume / close / archive / reopen
- transferAuthority
- invite / join / leave / moderate membership
- publishSessionLink / retireSessionLink の最小 mirror path
- publishSessionLink は current publication head だけを受ける
- roster-only session mode。secret-bearing audience、secret handout、private replay はまだ出さない

この段階を終える条件:

- controllerDids、lease、pendingControllerDids、transferPhase が文書どおりに動く
- handoff 完了条件に transferCompletedAt と gmAudienceRef の再配布完了が含まれる
- GM role と controller 権限が別物として実装される
- core branch ownership と publication 正本を authority が直接書き換えない
- session-backed carrier を持つ session では close / archive と adapter head の retirement が同期する
- core publication の retire / supersede では、依存する session-publication を同じ requestId / service-log chain で retire または rewrite する

### Phase 4: disclosure と runtime mutation を足す

対象モジュール:

- 12. disclosure
- 13. live event / state

推奨順:

1. audience と audience-grant
2. secret-envelope と鍵ローテーション
3. character-instance / character-state
4. message / roll / ruling-event

この段階を終える条件:

- secret-envelope がアクセス権ではなく payload wrapper として実装される
- audience-grant revoke と reuse-grant revoke が別 ledger として扱われる
- phase 3 の membership が audience-grant side effect を持つ session へ昇格する
- private state や secret message を core projection に混ぜない

### Phase 5: board と replay / governance を足す

対象モジュール:

- 14. board
- 15. governance / replay / adapter

推奨順:

1. asset と handout
2. scene / token
3. board-op / board-snapshot
4. getBoardView
5. replay view
6. appeal-case / appeal-review-entry / audit-detail-envelope / getAuditView

この段階を終える条件:

- board-op が durable な確定操作だけを記録し、drag や cursor は入らない
- stale board mutation が current revision と snapshotRef を返して rebase へ誘導できる
- replay public mode が unrevealed secret と private audienceRef を返さない
- listSessionPublications public mode が active summary だけを返し、retired history は governance mode にだけ出る
- blocked appeal だけが recovery controller 経路へ上がる

### Phase 6: realtime と全体 hardening

対象モジュール:

- 16. realtime
- 17. hardening

この段階で揃えるもの:

- drag、cursor、presence の揮発チャネル
- projection 再構築ツール
- golden test、scenario test、migration rehearsal
- [GCP Cloud Run + Neon + R2 ホスティング / 運用方針](hosting-gcp-neon-r2.md) に沿った運用 runbook と障害復旧手順

この段階を終える条件:

- realtime を止めても durable ledger の正しさが壊れない
- snapshot から board が再構築できる
- authority handoff、secret reveal、appeal escalation、publication retire の一連シナリオが再現できる

## 並列レーン

### レーン A: contract / platform

- 1 と 2 は同時着手してよい
- 3 と 4 も同時に進めてよい
- ただし 1 で最初に harden するのは core contract と shared defs / auth に限る
- 1 は JSON Lexicon 生成だけで終えず、publish 可能な artifact bundle まで閉じる
- 4 の table 設計は 1 の record ref / requestId 型が固まってから固定する

### レーン B: continuity core write path

- 5 と 6 は並列で進めてよい
- 7 は 5 と 6 の current head と ownership 判定が揃ったら着手する
- 8 のうち advancement / episode は 7 とかなり並列に進められる
- 8 の conversion だけは 7 の reuse 境界まで終わってから着手する

### レーン C: core read surface

- 9 の projection folding と 10 の handler 実装は並列に進めてよい
- ただし public mode の境界は 9 側の folding 規則を先に確定する

### レーン D: run extension

- 11 は 3, 4, 5, 7 完了後に着手でき、10 の全面完了は不要である
- 11 完了後、12 と 13 は並列化できる
- 14 も 11 完了後に着手できるが、hidden token / handout を本実装するには 12 が必要である
- 15 は 12, 13, 14 の current head と redaction ルールが揃ってから着手する

### レーン E: hardening

- 17 は 10 以降、各フェーズ末ごとに前倒しで進める
- 最後にまとめてやるのではなく、Phase 2 で core scenario test、Phase 3 で authority test、Phase 5 で replay / appeal / disclosure test を積み上げる

## 破綻防止ルール

次の実装順は取らない。

- session を core より先に作らない
- GM / PL role を OAuth permission-set 名へ直結しない
- publication と reveal を同じ write path にしない
- retire と redaction を同じ workflow にしない
- reuse revoke と audience-grant revoke を同じ table / enum に寄せない
- board の drag、cursor、presence を board-op に永続化しない
- replay public mode で未公開 secret を引ける query を作らない
- authority が branch ownership や core publication の canonical head を直接更新する設計にしない
- event bus を先に導入して requestId と CAS の整合を複雑化しない

## テスト計画

### Phase 0-2 で必須

- contract validation test
- ledger kernel property test
- publication / reuse / supersedes folding test
- character home / campaign view / publication summary golden test

### Phase 3-5 で必須

- authority handoff scenario test
- membership state transition test
- audience key rotation test
- board revision conflict test
- replay redaction test
- blocked appeal escalation test

### 最終段階で必須

- projection rebuild test
- migration forward / backward rehearsal
- blob 参照切れ検出 test
- long-running campaign の correction / retire / revoke 監査 test

## 実装上の判断メモ

- database は PostgreSQL を第一候補にする。revision CAS、current head 解決、append-only service log、再構築 SQL が素直だからである。
- blob は S3 互換を第一候補にする。asset、secret payload、audit detail の参照先を一本化しやすい。
- projection は最初から CQRS 分離サービスにしない。まずは同一 DB 内の read table で十分である。
- repo 書き込みは domain module から直接散らさず、atproto gateway と ledger kernel を経由させる。
- realtime は durable path の上に被せるだけにし、authoritative source にしない。

## この計画で先に作れるデモ

Phase 2 完了時点で、次の demo が可能になる。

- campaign 作成
- character import と branch 作成
- advancement / episode 記録
- publication / retire
- reuse grant / revoke
- character home と campaign view の表示

この時点で Cerulia の core thesis は検証できる。run、board、secret、replay はその後に extension として追加すればよい。