# システムテスト計画

## 目的

この文書は、[実装計画](implementation-plan.md) のテスト計画節を、実際に release gate として使える形へ展開したものである。対象は Cerulia の continuity core と optional extension を含むシステム全体であり、実装が現時点の設計文書に整合しているかを、unit test、integration test、projection test、route test、scenario test で検証する。

本計画は「全テストが通れば何を主張してよいか」と「何はまだ主張できないか」を明示する。ここで言う証明とは数学的完全性ではなく、少なくとも次を満たすことの実証である。

- 実装が current docs の contract と invariant に整合すること
- core と optional extension の境界を破っていないこと
- public、owner-steward、participant、governance、audit の lens が混線していないこと
- 正常系だけでなく reject、rebase-needed、manual-review、tombstone、preflight の失敗経路まで documented behavior に一致すること

## この計画で主張できること

以下の前提が満たされ、かつ本計画の必須テストとレビューがすべて完了した場合、次を主張してよい。

- Cerulia 実装は、[README](../../README.md)、[設計概要](overview.md)、[設計哲学](philosophy.md)、[レイヤー構成](layers.md)、[projection contract](projections.md)、[実行権威拡張](authority.md)、[秘匿と公開境界の拡張](secrets.md)、[MVPの実装順](mvp.md)、[AppView 設計群](../appview/README.md)、[records 群](../records)、[lexicon 群](../lexicon) に対して contract-conformant である。
- documented な record lifecycle、fence semantics、projection folding、permission-set separation、deep-link resolution が破綻していない。
- system-wide workflow として重要な continuity、publication、session governance、disclosure、board、appeal、audit の各経路が、少なくとも設計文書で定義した意味どおりに動作する。

## この計画で主張できないこと

以下は本計画だけでは証明しない。

- Bluesky や外部 carrier の長期可用性
- PDS や外部 AT Protocol 実装の分散競合が常に理想的に解決されること
- 暗号ライブラリそのものの安全性、鍵喪失からの完全復旧
- 各 ruleset resolver が返す裁定内容そのものの妥当性
- 人間の moderator、GM、resolver の判断品質
- production インフラ上のネットワーク分断、時刻ずれ、外部障害の完全吸収

これらは別途、運用 runbook、chaos test、外部依存の監視、ruleset ごとの test suite、暗号運用レビューで担保する。

## テスト対象範囲

### 1. Continuity Core

- campaign、world、house
- ruleset-manifest、rule-profile
- character-sheet、character-branch、character-advancement、character-episode、character-conversion
- publication、reuse-grant
- character home、campaign view、publication summary

### 2. Structured Run / Governance

- session、session-authority、membership、session-publication
- getSessionAccessPreflight、getSessionView、getGovernanceView

### 3. Disclosure / Replay / Audit

- audience、audience-grant、secret-envelope、reveal-event、redaction-event
- getReplayView、getAuditView、exportServiceLog

### 4. Board / Live Mutation

- scene、token、handout、board-op、board-snapshot
- applyBoardOp、getBoardView

### 5. AppView Contract

- public top、/home、/characters、/campaigns、/publications、/sessions 以下の deep-link
- tombstone / preflight
- mode badge と return path

## テストハーネス前提

本計画を成立させるため、テストハーネスは最低限次を持つ。

- 固定時計。lease expiry、controllerReviewDueAt、publishedAt、retiredAt、keyVersion 更新を決定的に再現するため
- requestId を固定できる generator
- DID fixture。branch owner、campaign steward、participant、viewer、spectator、controller、pending controller、recovery controller、resolver、anonymous を分けるため
- raw record と projection の両方を読める API
- raw service log と redacted audit projection の両方を読める API
- core repo と authority repo を分けた fixture
- manifest、rule-profile、campaign seed merge の fixture
- blob / carrier の stub または fake
- route resolution を検証できる AppView integration harness

## 成功条件の論理構造

システム全体の正常稼働は、次の 5 段で証明する。

1. contract が正しい
2. ledger kernel が正しい
3. domain invariant が正しい
4. projection と route resolution が正しい
5. end-to-end workflow が正しい

この順序を崩すと、下位の矛盾を上位のシナリオでたまたま見逃すため、release gate として弱くなる。

## 必須テスト群

### A. Contract / Lexicon Unit Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| A-1 | unit | defs / refs validation | named ref、enum、at-uri ref、Lexicon schema が相互参照可能であること |
| A-2 | unit | auth bundle matrix | endpoint が定義された permission-set か documented anonymous public mode でしか到達できないこと。getSessionView / getGovernanceView / listAppealCases(participant,resolver) / publishSessionLink / retireSessionLink を right bundle / wrong bundle で table-driven に検証すること |
| A-3 | unit | mutationAck schema | accepted / rejected / rebase-needed / manual-review の field shape が endpoint family ごとに一貫すること |
| A-4 | unit | transport contract | public mode で不正な includeRetired などが InvalidRequest になること |
| A-5 | unit | unresolved contract fail-fast | undefined shared refs、enum drift、cross-file contract drift を CI で即時失敗にすること |

補足:

- A-5 は current docs の曖昧さを早期に露出させるために必須にする。
- shared defs にない named ref と enum はこの層で止める。record-local field 名は、その field を所有する schema 群の整合として別に検証する。

### B. Ledger Kernel Unit Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| B-1 | unit | requestId idempotency | governingRef + operationNsid + requestId の重複が accepted / rejected を問わず再現可能であること |
| B-2 | unit | current-head helper | supersedes chain の current head が一意に解決できること |
| B-3 | unit | revision CAS helper | campaign / board / character-state の expectedRevision が stale のとき rebase-needed になること |
| B-4 | unit | state CAS helper | session state / visibility が current state 不一致で rejected になること |
| B-5 | unit | authority snapshot CAS | transferAuthority が expectedAuthorityRequestId と expectedTransferPhase で原子的に失敗すること |
| B-6 | unit | dual revision CAS | appeal-case の caseRevision と reviewRevision が stale のとき review が reject されること |
| B-7 | unit | service log split | raw export と redacted audit view が別 contract で維持されること |

### C. Core Domain Unit Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| C-1 | unit | campaign seed merge | world defaults -> house defaults -> campaign additions の順で merge し、重複除去と内部順序保持を行うこと |
| C-2 | unit | campaign non-follow | campaign 作成後に house/world default が変わっても既存 campaign が暗黙追随しないこと |
| C-3 | unit | branch update / retire | metadata update は stable-object mutation であり、retired branch を通常 update で再活性化しないこと |
| C-4 | unit | advancement chain | supersedesRef correction が append-only で、active sequence が決定的に畳み込まれること |
| C-5 | unit | episode summary | advancementRefs が同一 branch のみを指し、episode が growth fact の正本にならないこと |
| C-6 | unit | conversion fence | source/target manifest、sheet snapshot、target owner / steward authority、reuseGrantRef の条件が守られ、conversion path の canonical campaign linkage が targetCampaignRef に固定されること |
| C-7 | unit | publication chain | subject ごとに current head が一意で、独立 root の並立を許さないこと |
| C-8 | unit | retirePublication | current head retired 時に active surface を残さないこと |
| C-9 | unit | reuse-grant invariants | targetKind ごとの targetRef / targetDid 制約、public target の summary-share 限定が守られること |
| C-10 | unit | campaign intent separation | createCharacterBranch が campaign linkage を確定せず、episode / conversion 側だけが canonical linkage を materialize すること |
| C-11 | unit | ruleset manifest immutability | pin 済み rulesetManifestRef の意味を後から上書きせず、contract 変更は常に新しい manifest ref を発行すること |

### D. Extension Domain Unit Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| D-1 | unit | session lifecycle | planning -> open -> active -> paused -> ended -> active/paused(reopen) -> archived の許容遷移のみ受理すること。archived では通常 gameplay mutation を hard reject すること |
| D-2 | unit | authority transfer | controller 切替と gmAudienceRef 再配布が揃うまで transferCompletedAt を出さないこと。gmAudienceRef は explicit-members snapshot で、snapshotSourceRequestId を持つこと |
| D-3 | unit | recovery limits | recovery controller が transfer 関連以外の gameplay mutation を再開できないこと |
| D-4 | unit | membership chain | invited / joined / left / removed / banned の current head が一意であり、restore は removed / banned -> joined の新しい superseding transition として扱うこと |
| D-5 | unit | audience lifecycle | audienceKind × status × snapshotSourceRequestId の table-driven test で、derived と explicit snapshot の制約、snapshotSourceRequestId の要件、active / rotating / retired の遷移と、recipient 集合 unchanged / shrink / expand の keyVersion matrix が守られること |
| D-6 | unit | audience-grant lifecycle | pending / active / revoked と keyVersion の関係が正しいこと |
| D-7 | unit | reveal / redaction precedence | 通常 view で redaction が reveal より優先し、audit view では両方残ること |
| D-8 | unit | board-op fence and variant matrix | stale expectedRevision は board-op を書かずに reject し、current revision と snapshotRef を返すこと。7 variant の closed union と updateTokenFacet discriminator を table-driven に検証すること |
| D-9 | unit | board-snapshot canonicality | 同一 sessionRef / sceneRef / snapshotRevision の canonical snapshot が 1 つだけであること |
| D-10 | unit | appeal quorum logic | conflicted controller 除外、requiredCount、deadline-expired、quorum-impossible が文書どおりに導出されること |
| D-11 | unit | appeal review trail | latest effective approve / deny 集計、withdraw semantics、terminal 後の review reject が正しいこと |
| D-12 | unit | audit detail isolation | detailEnvelopeRef と bodyRef が participant / public / replay に出ないこと |

### E. Projection and Route Integration Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| E-1 | integration | getCharacterHome | core canonical input だけで再構築でき、targetBranchRef ごとの conversion current head と reuse-grant status folding が決定的で、session / board / secret を混ぜないこと |
| E-2 | integration | getCampaignView | owner-steward / public の block matrix が厳密に分かれ、public shell が active public publication current head に裏づくときだけ成立し、0 件のときは NotFound で fail-closed し、campaign.visibility 単独では gate にならないこと |
| E-3 | integration | listPublications | public mode は active current head のみ、owner-steward mode でも既定は active current head のみ、includeRetired で retired current head row だけを列挙できること |
| E-4 | integration | projection exclusion | extension record を注入しても core projection family の canonical row が変わらないこと |
| E-5 | integration | anonymous core read matrix | getCampaignView(public) と listPublications(public) が anonymous で documented field だけを返し、includeRetired を拒否すること |
| E-6 | integration | session vs governance read split | getSessionView は participant-safe summary に留まり、getGovernanceView だけが controller / recovery / pendingAppeals / governance detail を返すこと |
| E-7 | integration | access preflight and route guard | participant-shell、public-replay、join、sign-in、appeal-only、governance-console、no-access が decisionKind / recommendedRoute と一致し、重複適格時は documented precedence で 1 つに決まること。current `sessionRef` ベース preflight では `retired-carrier` を返さないこと。`/sessions/:sessionRef/governance` と `/sessions/:sessionRef/audit` は documented operator / audit 権限でしか開かないこと |
| E-8 | integration | publication tombstone | retired / superseded publication deep-link が explanatory tombstone / preflight を返すこと。successor が非 public の場合は neutral tombstone だけを返し、hidden successor CTA を出さないこと |
| E-9 | integration | carrier deep-link reservation | retired / superseded session carrier deep-link 用の explanatory preflight は carrier-specific preflight 追加まで release scope 外であり、current `sessionRef` ベース preflight が `retired-carrier` を返さないこと |
| E-10 | integration | return path and appeal-only summary | removed / banned の appeal-only actor、restored actor、joined participant、public reader が expected return path を持つこと。appeal-only summary は resolver detail を含まないこと |
| E-11 | integration | public explanation copy | public top、campaign shell、publication detail / tombstone、access preflight が mode badge と公開境界の説明を表示すること |

### F. End-to-End Scenario Test

以下は system-wide 正常稼働の中核を成す必須シナリオである。すべて green でなければ release しない。

| ID | シナリオ | 主要ステップ | 合格条件 |
| --- | --- | --- | --- |
| F-1 | core continuity lifecycle | importCharacterSheet -> createCharacterBranch -> recordCharacterAdvancement -> recordCharacterEpisode -> publishSubject -> getCharacterHome | branch lineage、advancement correction、episode summary、publication current head が一貫すること |
| F-2 | cross-boundary reuse and conversion | branch 作成 -> grantReuse -> recordCharacterConversion -> recordCharacterEpisode -> listPublications | reuse 境界、conversion provenance、targetCampaignRef の canonical linkage、target branch authority、public derivation hint が一貫すること |
| F-3 | publication supersede and retire | publishSubject -> superseding publishSubject -> retirePublication -> publication direct-link | current head 一意、retired chain、tombstone CTA、public mode の active-only が一貫すること |
| F-4 | session lifecycle and access preflight | createSessionDraft -> openSession -> invite/join -> startSession -> pause/resume -> closeSession -> reopenSession -> archiveSession -> archived で gameplay mutation 試行 -> deep-link 分岐 | session state machine、reopen 経路、archived の hard reject、preflight decision matrix、return path が一貫すること |
| F-5 | authority handoff with completion fence | stable authority -> lease expiry or controller absent -> recovery controller が transfer field のみ更新 -> transferAuthority preparing -> rotating-grants -> finalizing -> completed -> 最初の gameplay mutation | transferCompletedAt は controller 切替と gmAudienceRef 再配布の両方が済んだ時だけ出ること。旧 controller と recovery controller が早期に gameplay mutation を再開できないこと |
| F-6 | membership remove, appeal-only, restore | invited -> join -> removed or banned -> session deep-link -> appeal-only access -> resolveAppeal or moderate restore -> joined -> /sessions/:sessionRef | invite / cancel / join / leave / remove / ban / restore の区別、appeal-only carve-out、resolver detail 非表示、復帰後の participant shell return が一貫すること |
| F-7 | disclosure lifecycle with membership churn | joined -> grant 発行 -> secret handout / message / character-state 作成 -> reveal -> redact -> spectator lane read -> remove or ban -> rotateAudienceKey -> replay/public read | grant lifecycle、recipient 集合 shrink / expand ごとの keyVersion rule、handout metadata からの plaintext 非露出、spectator-safe disclosure、redaction precedence、public/private separation、future secret 停止が一貫すること |
| F-8 | board operator vs participant | getBoardView(participant) -> getBoardView(operator) -> applyBoardOp -> stale applyBoardOp -> rebase -> snapshot restore -> raw op replay -> 次の applyBoardOp | participant-safe read と operator mutate の分離、hidden token / unrevealed handout / secret facet / controller metadata の非露出、stale reject、snapshot canonicality、復元後の継続整合が一貫すること |
| F-9 | carrier mirror freshness | core publication current head 作成 -> publishSessionLink -> core publication supersede or retire -> session-publication rewrite or retireSessionLink -> listSessionPublications | active carrier が stale publicationRef を指さず、retired or superseded publication に対して active surface を残さないこと。同一 requestId または service-log chain で追跡でき、retired history は governance 以外に出ないこと |
| F-10 | appeal lifecycle | submitAppeal -> reviewAppeal -> stale review reject -> quorum or block -> escalateAppeal(blocked only) -> recovery review -> resolveAppeal -> terminal 後 review 試行 | caseRevision / reviewRevision CAS、targetKind × requestedOutcomeKind compatibility、latest effective review、blocked 条件、terminal freeze、targetKind ごとの単一 canonical domain correction が一貫すること |
| F-11 | replay and audit isolation | sendMessage or rollDice -> revealSubject -> redactRecord -> spectator/public/participant replay 読取 -> getAuditView -> exportServiceLog | spectator/public replay に private audienceRef、unrevealed secret、audit detail が出ず、audit と raw export にだけ detail が残ること |
| F-12 | projection rebuild | raw ledger から projection rebuild -> current projection と比較 | character home の conversion / reuse folding、campaign view、publication summary、session-publication head、board snapshot 関連の再構築結果が一致すること |
| F-13 | blob reference liveness | asset / handout / secret-envelope / audit-detail-envelope の blob or body 参照を走査 -> projection / route から読取 | dangling な contentRef / bodyRef / assetRef を release 前に必ず検出し、public surface は fail-closed、audit surface は診断可能であること |

## フェーズ別 release gate

### Phase 0-2 gate

最低限次が green であること。

- A-1 から A-5
- B-1 から B-7
- C-1 から C-11
- E-1 から E-5
- E-8、E-11
- F-1 から F-3

この gate を通過した時点で、Cerulia の continuity core は docs 準拠の demo が可能とみなしてよい。

### Phase 3 gate

最低限次が green であること。

- D-1 から D-4
- E-6、E-7
- F-4、F-5

### Phase 4-5 gate

最低限次が green であること。

- D-5 から D-12
- E-9、E-10
- F-6 から F-11

### Final gate

最低限次が green であること。

- F-12
- F-13
- migration rehearsal
- long-running correction / retire / revoke 監査

## 依存関係

テストは次の依存順で積む。

1. contract validation
2. ledger kernel property test
3. domain unit test
4. projection / auth matrix test
5. route / tombstone / preflight integration test
6. end-to-end scenario test
7. projection rebuild / audit / migration rehearsal

重要なのは、上位シナリオだけで release しないことだ。特に以下を独立の failure class として残す。

- Lexicon / defs drift
- fence semantics drift
- projection folding drift
- auth bundle drift
- route resolution drift

## カバレッジ

この計画が直接カバーするもの:

- record 参照整合性
- append-only chain と current head 解決
- requestId idempotency
- revision CAS、state CAS、authority snapshot CAS、dual CAS
- public / owner-steward / participant / governance / audit lens の分離
- tombstone / preflight / no-access の明示的な挙動
- carrier と core publication の mirror 関係
- reveal、redaction、revoke、retire の別 workflow
- appeal の blocked 判定と recovery handoff
- board durable state と realtime 的な未確定状態の分離

この計画が直接カバーしないもの:

- infrastructure chaos
- cryptographic primitive の安全性
- external carrier の運用寿命
- ruleset-specific 裁定の意味論
- human governance judgment

## 定期レビュー手順

この計画は作って終わりではなく、設計変更と実装進捗に応じて更新する。レビューは次の cadence で実施する。

### レビュー実施タイミング

- 設計文書、records、lexicon、rpc、auth、appview に変更が入るたび
- Phase 0-2 gate 前
- Phase 3 gate 前
- Phase 4-5 gate 前
- release candidate 作成前

### レビュー観点

毎回、少なくとも次の 5 観点でレビューする。

- architecture 整合性
- records / lexicon 整合性
- GM 運用
- 一般 PL / spectator
- コミュニティ運営 / moderation

### レビューで確認する項目

1. 新しい record、field、endpoint、route がこの文書のどの suite に紐づくか
2. 既存 suite の assertion が docs の新しい invariant と矛盾していないか
3. テストが「正常系だけ通る状態」になっていないか
4. public/private lens、tombstone/preflight、audit isolation のいずれかが後退していないか
5. proof claim を超える過剰な表現が計画に紛れていないか

### レビューの成果物

レビューごとに次を更新する。

- 本文書の suite 一覧
- coverage / non-coverage
- 未解決論点
- phase gate の pass 条件

## 現時点の固定済み判定事項

以下は release gate を組む前提として current docs 上で固定済みとみなす。

- conversion path の canonical campaign linkage は character-conversion.targetCampaignRef であり、character-episode.campaignRef は summary mirror に留まる
- derived audience と membership / controller 連動 audience の keyVersion 運用は recipient 集合 unchanged / shrink / expand の 3 パターンに固定する
- owner-steward の publication / carrier list でも既定は active current head のみとし、retired current head は includeRetired 相当の明示 opt-in で archived summary にだけ出す
- blocked appeal を扱う MVP session-authority は recoveryControllerDids 非空を前提にし、resolveAppeal の accepted は targetKind ごとに単一 canonical domain correction を emit する
- public campaign shell の成立条件は active public publication current head であり、campaign.visibility 単独では gate にしない
- rulesetManifestRef は immutable contract version を pin し、公開済み manifest の意味を in-place update しない

## 最終判定

本計画の必須 suite がすべて green であり、定期レビューで未解決の high-risk gap が残っていない場合に限り、「この実装は現時点の Cerulia 設計文書に対して、システム全体として整合的に正常稼働する」と判定してよい。

逆に、以下のどれかが欠けている場合は green でも release gate を通してはならない。

- public/private lens matrix の欠落
- tombstone / preflight の未検証
- authority handoff completion fence の未検証
- session-publication mirror freshness の未検証
- appeal lifecycle の dual CAS と terminal freeze の未検証
- audit isolation の未検証
