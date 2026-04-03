# AppViewテスト計画

## 目的

この文書は、[AppView層UI設計](README.md) を実装時の release gate に落とすための AppView 専用テスト計画である。対象は component 単体ではなく、Cerulia を end-user service として見たときの route、lens、copy、layout、mutation feedback、accessibility、full-stack UI journey 全体である。

AppView は system console ではなく service layer なので、この計画は「画面が出る」ことではなく、少なくとも次を証明することを目的にする。

- 既定入口、route tree、deep-link、return path が docs の情報設計に一致すること
- public、owner-steward、participant、governance、audit の lens が UI 上で混線しないこと
- AppView が backend の現行版解決、authority、secret boundary を勝手に再定義しないこと
- mutation の accepted / rejected / rebase-needed / manual-review を UI が誤魔化さずに表示すること
- user-visible copy、warning、tombstone、preflight、disabled reason が docs の意味論に一致すること
- desktop / mobile / keyboard / screen reader を含む主要利用面で、AppView が service として成立すること

## この計画と全体証明の関係

AppView は Cerulia 全体の一部であるため、この計画だけで backend / domain / infrastructure の全不変条件を証明することはしない。全体正常稼働の最終判定は、[システムテスト計画](../architecture/test-plan.md) と本計画の両方が green であることを前提に行う。

役割分担は次のとおりとする。

- [システムテスト計画](../architecture/test-plan.md): record、projection、fence semantics、service log、domain workflow の正しさを証明する
- 本計画: end-user service としての AppView が、その domain truth を正しく観測し、正しく説明し、誤った操作や誤解を誘発しないことを証明する

したがって、「このシステム全体が正常に稼働する」と判定してよいのは、本計画と [システムテスト計画](../architecture/test-plan.md) の必須 suite がともに green の場合に限る。

## この計画で主張できること

以下の前提が満たされ、かつ本計画の必須テストとレビューがすべて完了した場合、次を主張してよい。

- AppView は [サービスビジョン](service-vision.md)、[デザインシステム](design-system.md)、[レイヤー責務と境界](layer-boundaries.md)、[トップページ設計](top-page.md)、[必要機能一覧](features.md)、[遷移構造](navigation.md)、[UI/UX要件](ui-ux-requirements.md) に対して contract-conformant である。
- AppView の route、copy、mode badge、boundary explanation、warning banner、tombstone / preflight、mutation feedback は、少なくとも docs が規定する意味どおりに動作する。
- AppView は public shell、signed-in home、character studio、campaign workspace、publication library、session subtree、governance console、audit surface を、docs で定義した lens と権限境界で提供する。
- AppView は current edition、archive、reveal、redaction、retire、carrier、audit を混同しない。

## この計画で主張できないこと

以下は本計画だけでは証明しない。

- record chain、CAS、service log、cryptographic lifecycle の backend 内部整合
- browser engine ごとの完全な rendering 一致
- 外部 carrier の長期寿命
- screen reader / OS 組み合わせすべてでの完全同一体験
- 人間の GM / moderator / resolver の判断品質
- infrastructure 障害や分散競合の完全吸収

これらは [システムテスト計画](../architecture/test-plan.md)、運用 runbook、外部依存監視、supported browser policy、manual accessibility review で補う。

## テスト対象範囲

### 1. Surface

- public top `/`
- signed-in home `/home`
- characters `/characters`, `/characters/new`, `/characters/import`, `/characters/:branchRef`
- campaigns `/campaigns`, `/campaigns/:campaignRef`
- publications `/publications`, `/publications/:publicationRef`
- session subtree `/sessions/:sessionRef`, `/appeals`, `/board/:sceneRef`, `/handouts`, `/replay`, `/governance`, `/audit`

### 2. Shared Shell

- global navigation
- mode badge
- permission explanation
- mutation status banner
- warning rail / authority health rail
- archive drawer / audit split
- explanatory tombstone / preflight

### 3. Device / Accessibility

- desktop
- mobile
- keyboard-only
- screen reader semantic state

### 4. Full-Stack UI Journey

- anonymous public reader
- signed-in owner / steward
- joined participant
- appeal-only actor
- governance operator
- spectator / public replay reader

## テストハーネス前提

本計画を release gate として使うため、AppView テストハーネスは最低限次を持つ。

- Vitest Browser Mode。最終 gate は実 AppView と実 service endpoint をつないだ full-stack run で行う
- published contract artifact snapshot。同一 suite 内の generated client、MSW response、Browser Mode scenario fixture は同じ `@cerulia/contracts` version と `manifest.json` hash に基づくこと
- seeded fixture。anonymous、owner、steward、participant、viewer、spectator、operator、resolver、appeal-only actor を固定 DID で再現できること
- 固定時計。authority banner、published / retired、appeal due、warning rail を決定的に再現するため
- route-level assertion。URL、redirect、recommendedRoute、return path を検証できること
- network / transport fault injection。Unauthorized、Forbidden、NotFound、UnsupportedRuleset、InvalidRequest を UI へ返せること
- visual baseline。desktop と mobile の主要 surface で大崩れを検出できる screenshot or semantic visual diff を持つこと
- accessibility harness。Svelte compiler の a11y diagnostics と、Vitest Browser Mode による keyboard traversal、role/name/state、visible text の検証ができること
- mutation inspection。resultKind、disabled reason、warning banner、action queue 反映を観測できること

重要なのは、component test や mock-only test だけで final gate を通さないことだ。mock は局所回帰の早期検知に使ってよいが、最終判定は Vitest Browser Mode を使った full-stack browser test を前提にする。

## 成功条件の論理構造

AppView の正常稼働は、次の 6 段で証明する。

1. route と auth decision が正しい
2. lens と data boundary が正しい
3. copy と operation grammar が正しい
4. local state と mutation feedback が正直である
5. layout と accessibility が成立する
6. end-to-end journey が成立する

この順序を崩すと、たとえば deep-link の誤分岐や forbidden field leak を、見た目の snapshot だけで見逃すため、release gate として弱くなる。

## 必須テスト群

### A. Route and Navigation Contract Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| A-1 | integration | canonical landing | anonymous は `/`、認可直後の canonical landing は `/home`、明示的に `/` を開いた signed-in user は public badge のまま public lens を保つこと |
| A-2 | integration | global nav order and hub routes | primary nav が Home、Characters、Campaigns、Publications を中心に構成され、session が global root を奪わないこと。`/characters` と `/campaigns` の hub route が first-class surface として entry CTA、mode badge、public/owner-steward split を正しく持つこと |
| A-3 | integration | session subtree route matrix | `/sessions/:sessionRef`、`/sessions/:sessionRef/appeals`、`/sessions/:sessionRef/board/:sceneRef`、`/sessions/:sessionRef/handouts`、`/sessions/:sessionRef/replay`、`/sessions/:sessionRef/governance`、`/sessions/:sessionRef/audit` の lens、CTA、fallback shell が table-driven に一致し、no-access explanation も固定されること |
| A-4 | integration | deep-link resolution | publication / carrier / session deep-link が active detail、tombstone、preflight、neutral notice に正しく分岐すること |
| A-5 | integration | hidden route policy | 認可不足の route が無言の 404 ではなく、「この lens では見えない」説明に落ちること |
| A-6 | integration | return path | public reader、participant、appeal-only actor、operator が docs どおりの return path を持つこと |
| A-7 | integration | route-to-auth matrix | 各 AppView surface が exact auth bundle または anonymous public mode と結びつき、wrong bundle では preflight / forbidden / hidden-route policy に落ちること |
| A-8 | integration | transport error matrix | Unauthorized、Forbidden、NotFound、UnsupportedRuleset、InvalidRequest が surface ごとに distinct な UI state と copy に写像されること |

### B. Lens and Boundary Integration Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| B-1 | integration | mode badge matrix | `/`、`/home`、`/characters/:branchRef`、`/campaigns/:campaignRef`、`/publications/:publicationRef`、`/sessions/:sessionRef`、`/sessions/:sessionRef/governance`、`/sessions/:sessionRef/audit` の各 surface に current reader lens が text 付きで表示されること |
| B-2 | integration | public campaign deny-list | public campaign shell に houseRef、worldRef、rulesetNsid、rulesetManifestRef、roster、join、governance CTA が出ないこと。read-only 注記と sign-in bridge だけが出ること |
| B-3 | integration | public publication deny-list | public publication surface に retired chain、raw derivation detail、session-publication の retired metadata、detailEnvelopeRef、private disclosure 情報、hidden successor CTA が出ないこと |
| B-4 | integration | participant vs governance split | participant session surface が participant-safe summary に留まり、controller list、recovery detail、audit detail は governance / audit にだけ出ること |
| B-5 | integration | board lens split | participant board が hidden token、unrevealed handout、secret facet、operator metadata を表示せず、operator board だけが mutate affordance を持つこと |
| B-6 | integration | replay lens split | public replay、participant replay、spectator-safe replay の文言と情報量が分かれ、spectator-safe replay が participant transport mode の role-filtered read-only labelとして扱われ、private audienceRef、unrevealed secret、detailEnvelopeRef、bodyRef、audit-only note を漏らさないこと |
| B-7 | integration | carrier / publication explanation | publication detail と必要な補助説明が「carrier は導線、正本は publication ledger」に相当する説明を持ち、session-publication を canonical source of truth と誤認させないこと |
| B-8 | integration | disabled reason matrix | disabled button / panel の理由が OAuth bundle 不足、session role 不足、audience grant 不足、publication 未公開のいずれかに落ちて visible text で説明されること |
| B-9 | integration | authority health banner | lease-expired、controller-missing、transfer-in-progress、blocked-appeal の各 banner が意味、next actor、next action、blocked operation を正しく表示すること。transfer-in-progress では pendingControllerDids、transferPhase、transferCompletedAt の witness が揃うまで gameplay resume affordance を出さないこと |
| B-10 | integration | current / archive / audit split | current edition、archive drawer、audit route が 1 面に混ざらず、superseded / retired / redacted / pending review が distinct state として見えること |
| B-11 | integration | audit summary vs raw export split | `/sessions/:sessionRef/audit` が redacted summary に留まり、raw append-only export は別操作、別権限、別結果として扱われること |
| B-12 | integration | core surface exclusion stability | extension record を注入しても `/`、`/home`、`/characters/:branchRef`、`/campaigns/:campaignRef`、`/publications/:publicationRef` の canonical row が docs にない enrichment で変化しないこと |
| B-13 | integration | publication library index split | `/publications` が canonical list surface として機能し、public では公開中の版のみ、owner-steward では retired を含められ、derivation hint は redacted のままであること |
| B-14 | integration | handout and appeal row-level split | `/sessions/:sessionRef/handouts` が secretEnvelopeRef や audienceRef の不当露出を起こさず、`/sessions/:sessionRef/appeals` が participant view に reviewOutcomeSummary、controllerReviewDueAt、recoveryAuthorityRequestId を出さないこと |

### C. Interaction and Mutation UX Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| C-1 | integration | create lane matrix | new sheet、import、branch、convert の 4 lane が別 card と別 copy を持ち、new -> import -> branch -> convert の順で並び、continue zone の近くに置かれて generic builder に見えないこと |
| C-2 | integration | draft vs accepted | create flow、publication preview、import preview が accepted 前は draft と明示され、current edition と視覚的に区別されること |
| C-3 | integration | campaign intent only | campaign selection が canonical linkage と誤認されず、`intent only / not yet linked` 相当の状態表示を持つこと |
| C-4 | integration | mutationAck mapping | accepted、rejected、rebase-needed、manual-review が card、banner、action queue、navigation に docs どおり反映されること。mutation family ごとに currentState/currentVisibility、publicationRef/sessionPublicationRef、transferPhase/transferCompletedAt、controllerDids/pendingControllerDids、keyVersion/updatedGrantRefs、caseRevision/reviewRevision の witness を UI が消費すること |
| C-5 | integration | destructive action split | close / archive、publication retire、carrier retire、reveal、redaction が別操作、別ラベル、別確認として表示されること |
| C-6 | integration | access preflight explanation | preflight が今の lens で何ができないか、次に何ができるかを薄い state として説明し、session shell の代用品にならないこと |
| C-7 | integration | warning rail and queue | `/home` の session rail と action queue が authorityHealthKind、manual-review、rebase-needed、招待応答を docs の優先順位で出すこと。participant、steward、operator で queue の内容が役割別に分かれること |

### D. Visual, Layout, and Accessibility Test

| ID | level | 対象 | 主要検証点 |
| --- | --- | --- | --- |
| D-1 | visual/integration | public top composition | hero stage、value lane、featured editions、short continuity note、final sign-in CTA が存在し、primary CTA が sign-in を経て `/home` へ接続し、public top 自体が creation wizard にならないこと。governance detail、retired carrier history、membership roster、private replay の示唆を置かないこと |
| D-2 | visual/integration | signed-in home composition | continue zone、create zone、continuity workbench、campaign context、session rail、action queue が成立し、create zone が continue zone の近くに置かれること |
| D-3 | visual/integration | surface grammar | character studio、campaign workspace、publication detail、governance console が docs の screen grammar で成立し、別製品のように分断されないこと |
| D-4 | responsive | viewport matrix | `/home`、`/characters`、`/campaigns`、campaign workspace、publication detail が desktop と mobile の両方で意味を保つこと |
| D-5 | responsive | mobile participant board | mobile participant board が read-only で、edit affordance を route 前後で出さないこと |
| D-6 | a11y | keyboard path | hero CTA、create lane、current edition card、publication row、session local nav、governance panel に keyboard-only で到達できること |
| D-7 | a11y | screen reader state | current edition、superseded、retired、redacted、pending review、blocked banner が text で判別できること |
| D-8 | a11y | color independence | mode badge、status、visibility、warning が色だけに依存せず text で区別できること |

### E. Full-Stack AppView Journey Test

以下は AppView を end-user service として見たときの必須シナリオである。これらは Vitest Browser Mode を使った browser-driven full-stack test として実行する。

| ID | シナリオ | 主要ステップ | 合格条件 |
| --- | --- | --- | --- |
| E-1 | anonymous public reader | `/` -> `/publications/:publicationRef` -> `/campaigns/:campaignRef` | public top が価値説明と公開中の版だけを出し、campaign shell が admission gate にならず、active public publication current head が無い campaign では fail-closed すること |
| E-2 | signed-in owner landing | sign-in -> `/home` -> create lane -> `/characters/:branchRef` | canonical landing が `/home` で、create / continue / publish の 3 導線が first workbench として成立すること |
| E-3 | create flow journey | new / import / branch / convert のいずれかを開始 -> review step -> detail | lane 分岐、draft / accepted distinction、intent-only campaign、publication / reuse review が docs どおりに出ること |
| E-4 | publication and tombstone journey | `/publications/:publicationRef` active -> superseded / retired direct link -> tombstone | current edition detail、explanatory tombstone、neutral tombstone、CTA の出し分けが正しいこと |
| E-5 | public campaign shell journey | public campaign shell -> sign-in bridge -> `/home` | public campaign が read-only shell であり、join や governance へ誤導しないこと |
| E-6 | participant session return | `/home` or deep-link -> `/sessions/:sessionRef` -> board / handouts / replay -> `/home` | global escape hatch と session local nav が成立し、participant-safe surface を超えないこと |
| E-7 | governance operator journey | deep-link or queue -> `/sessions/:sessionRef/governance` -> `/sessions/:sessionRef/audit` -> raw export | governance console が participant view の延長ではなく dedicated read model として成立し、audit summary と raw export が分離していること |
| E-8 | appeal-only journey | removed / banned actor deep-link -> preflight -> `/sessions/:sessionRef/appeals` -> resolve or restore -> `/sessions/:sessionRef` | appeal-only access が通常参加権と混ざらず、resolver detail を漏らさず、復帰後の primary landing が `/sessions/:sessionRef`、secondary CTA が `/home` に固定されること |
| E-9 | recovery banner journey | `/home` rail -> `/sessions/:sessionRef` -> `/sessions/:sessionRef/governance` | lease-expired、controller-missing、transfer-in-progress、blocked-appeal で危険操作が read-only に落ち、transferCompletedAt witness が揃うまで gameplay resume affordance を出さないこと |
| E-10 | replay journey | public / participant / spectator の各 lens で `/sessions/:sessionRef/replay` を開く | 文言と情報量が lens ごとに分かれ、spectator が participant transport mode の role-filtered read-only lens に固定され、隠しているものの説明はしても hidden content の具体を示さず、audit-only detail を漏らさないこと |
| E-11 | retire / archive journey | session close / archive、carrier retire、publication retire の各画面を操作 | どの入口が止まる操作かを UI が混同せず、確認ダイアログと結果 state が別々に表示されること |

## リリース判定のための追加チェック

次のチェックは unit / integration / journey の外に独立して持つ。

- visual baseline diff。major surface の大崩れを検知する
- copy regression check。publication / reveal / redaction / retire / archive / audit を混同する文言が入っていないこと
- route manifest check。documented route が存在し、hidden route を作っていないこと
- unsupported error mapping check。Unauthorized / Forbidden / NotFound / UnsupportedRuleset / InvalidRequest を UI が別扱いできること

## フェーズ別 gate

### AppView Core Shell Gate

最低限次が green であること。

- A-1、A-2、A-4、A-8
- B-1、B-2、B-3、B-7、B-8、B-10、B-12、B-13
- C-1、C-2、C-3、C-6
- D-1、D-2、D-4
- E-1 から E-5

この gate は「core continuity を読む AppView」が成立したことを示す。ここでは session context surface をまだ release 判定に使わない。

### AppView Session Context Gate

最低限次が green であること。

- A-3、A-5、A-6、A-7、A-8
- B-4、B-5、B-6、B-9、B-11、B-14
- C-4、C-5、C-7
- D-5
- E-6 から E-11

この gate は session subtree、governance、audit、appeal-only、replay、board、warning banner を含む AppView が成立したことを示す。

### Final AppView Gate

最低限次が green であること。

- D-3、D-6、D-7、D-8
- visual baseline diff
- copy regression check
- unsupported error mapping check
- [システムテスト計画](../architecture/test-plan.md) の必須 suite も同一 build で green

この gate は、AppView Core Shell Gate と AppView Session Context Gate を通過済みであることを前提にする。この gate を通過したときに限り、Cerulia は「AppView を含む end-user service として」正常に稼働すると判定してよい。

## 依存関係

AppView のテストは次の順で積む。

1. route / auth / error matrix
2. lens / boundary / deny-list
3. mutation UX / local-state honesty
4. layout / accessibility / visual baseline
5. full-stack user journey
6. backend system gate との合流

重要なのは、screenshot test だけで release しないことだ。特に以下は独立の failure class として残す。

- route decision drift
- lens explanation drift
- forbidden field leak
- copy terminology drift
- mutation feedback drift
- accessibility drift

## カバレッジ

この計画が直接カバーするもの:

- canonical landing と deep-link の整合
- route-to-auth matrix と transport error matrix
- public / owner-steward / participant / governance / audit の lens 表示
- public shell の allowlist と deny-list
- mode badge、disabled reason、warning banner、archive / audit split
- create lane、draft / accepted、intent-only campaign の見え方
- destructive operation の語彙分離
- participant / operator / spectator / appeal-only の surface 分離
- audit summary と raw export の分離
- keyboard-only と screen reader での主要 state 判別

この計画が直接カバーしないもの:

- backend 内部の current head 解決や CAS
- external carrier の寿命
- browser matrix 全体の完全保証
- cryptographic primitive の安全性
- human moderation judgment

## 定期レビュー手順

この計画は作って終わりではなく、AppView docs や backend 契約の変化に応じて更新する。レビューは次の cadence で行う。

### レビュー実施タイミング

- docs/appview 配下に変更が入るたび
- docs/architecture/projections.md、docs/lexicon/rpc.md、docs/lexicon/auth.md、docs/records の AppView 影響箇所に変更が入るたび
- AppView Core Shell Gate 前
- AppView Session Context Gate 前
- release candidate 作成前

### レビュー観点

毎回、少なくとも次の 6 観点でレビューする。

- architecture 整合性
- records / lexicon 整合性
- GM / operator 運用
- 一般 PL / spectator
- コミュニティ運営 / moderation
- service language / accessibility

### レビューで確認する項目

1. 新しい surface、route、CTA、banner、dialog がどの suite に紐づくか
2. 既存 suite の assert が docs の新しい invariant と矛盾していないか
3. public/private、participant/governance、publication/carrier、reveal/retire の境界が UI で後退していないか
4. copy が internal term に寄りすぎていないか
5. AppView が backend truth を勝手に再定義していないか
6. proof claim を超える過剰な表現が計画に紛れていないか

### レビューの成果物

レビューごとに次を更新する。

- suite 一覧
- gate 条件
- coverage / non-coverage
- 固定済み運用前提からの逸脱有無

## 現時点の固定済み運用前提

以下は AppView release gate を実装者ごとにぶらさないため、この文書で固定済みとみなす。

- visual baseline diff は CI 上の Chromium 系 Browser Mode を正本にし、desktop は 1440x900、mobile は 390x844 の固定 viewport で major surface を比較する
- visual baseline diff の fail 条件は、primary CTA の欠落、主要 panel の重なり、global nav / mode badge / warning banner の欠落、主要 card grammar の崩壊とする。文字レンダリング由来の軽微な anti-alias 差分だけでは fail にしない
- automated final gate の browser matrix は Chromium 系 1 系統に固定し、manual release check として最新 major の Chrome または Edge on Windows、Firefox on desktop、Safari on macOS / iOS を spot check する
- assistive technology の manual release check は NVDA + Chrome on Windows と VoiceOver + Safari on macOS / iOS を最小セットにする。すべての screen reader / OS 組み合わせの完全同一体験は主張しない

## 最終判定

本計画の必須 suite がすべて green であり、かつ [システムテスト計画](../architecture/test-plan.md) の必須 suite も同一 build で green の場合に限り、「Cerulia は AppView を含む end-user service として、現時点の設計文書に整合して正常に稼働する」と判定してよい。

逆に、以下のどれかが欠けている場合は green でも release gate を通してはならない。

- canonical landing と deep-link 分岐の未検証
- lens / mode badge / disabled reason の未検証
- public shell deny-list の未検証
- warning banner と blocked operation の未検証
- create flow の draft / accepted / intent-only の未検証
- governance / audit / appeal-only の route guard 未検証
- keyboard / screen reader の未検証
