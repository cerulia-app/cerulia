# AppView テスト計画

## 目的

この文書は、[AppView 層 UI 設計](README.md) を release gate に落とすための AppView 専用テスト計画である。対象は component 単体ではなく、Cerulia を end-user service として見たときの route、lens、copy、layout、mutation feedback、accessibility、full-stack UI journey 全体である。

AppView は system console ではなく Character Continuity Workbench なので、この計画は次を証明することを目的にする。

- canonical landing、route tree、return path が docs の情報設計に一致すること
- public と owner-steward の lens が UI 上で混線しないこと
- AppView が backend の現行版解決や publication truth を勝手に再定義しないこと
- mutation の accepted / rejected / rebase-needed を UI が誤魔化さずに表示すること
- tombstone、disabled reason、warning copy が docs の意味論に一致すること
- desktop / mobile / keyboard / screen reader を含む主要利用面で AppView が workbench として成立すること

## テスト対象範囲

### 1. Surface

- public top `/`
- signed-in home `/home`
- characters `/characters`, `/characters/new`, `/characters/import`, `/characters/:branchRef`
- campaigns `/campaigns`, `/campaigns/:campaignRef`
- publications `/publications`, `/publications/:publicationRef`

### 2. Shared Shell

- global navigation
- primary nav context
- permission explanation
- mutation status banner
- archive split
- explanatory tombstone

### 3. Device / Accessibility

- desktop
- mobile
- keyboard-only
- screen reader semantic state

## テストハーネス前提

- Vitest Browser Mode
- published contract artifact snapshot
- seeded fixture。anonymous、owner、steward を固定 DID で再現できること
- 固定時計
- route-level assertion
  実装段階の browser smoke では route page component を直接 render して surface contract を先に固定してよい。release gate の route-mounted assertion は、この repo の Browser Mode に限らず、preview build に対する workspace-level release smoke でも満たしてよい。
  現在は Playwright Test の `bun run test:e2e:campaign-detail` が preview build を起動し、`/campaigns/:campaignRef` の active public shell と NotFound fail-close を実ルートで確認する。
- network / transport fault injection
- visual baseline
- accessibility harness
- mutation inspection

## 必須テスト群

### A. Route and Navigation Contract Test

| ID  | level       | 対象                            | 主要検証点                                                                                                                |
| --- | ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| A-1 | integration | canonical landing               | anonymous は `/`、認可直後の canonical landing は `/home`、明示的に `/` を開いた signed-in user は public lens を保つこと |
| A-2 | integration | global nav order and hub routes | primary nav が Home、Characters、Campaigns、Publications を中心に構成されること                                           |
| A-3 | integration | deep-link resolution            | publication deep-link が active detail、tombstone、neutral notice に正しく分岐すること                                    |
| A-4 | integration | return path                     | public reader と owner-steward が docs どおりの return path を持つこと                                                    |
| A-5 | integration | transport error matrix          | Unauthorized、Forbidden、NotFound、InvalidRequest が distinct な UI state に写像されること                                |

### B. Lens and Boundary Integration Test

| ID  | level       | 対象                              | 主要検証点                                                                                                                                                                      |
| --- | ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 | integration | reader lens matrix                | `/`、`/home`、`/characters/:branchRef`、`/campaigns/:campaignRef`、`/publications/:publicationRef` で current reader lens が primary nav または surface copy から判別できること |
| B-2 | integration | public campaign deny-list         | public campaign shell に rule provenance detail や非公開 continuity summary が出ないこと                                                                                        |
| B-3 | integration | public publication deny-list      | public publication surface に retired chain、raw derivation detail、非公開 continuity detail が出ないこと                                                                       |
| B-4 | integration | current / archive split           | current edition と archive が 1 面に混ざらないこと                                                                                                                              |
| B-5 | integration | carrier / publication explanation | publication detail が「導線」と「正本」を混同させないこと                                                                                                                       |

### C. Interaction and Mutation UX Test

| ID  | level       | 対象                     | 主要検証点                                                                                 |
| --- | ----------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| C-1 | integration | create lane matrix       | new sheet、import、branch、convert の 4 lane が別 card と別 copy を持つこと                |
| C-2 | integration | draft vs accepted        | create flow と publication preview が accepted 前は draft と明示されること                 |
| C-3 | integration | campaign intent only     | campaign selection が canonical linkage と誤認されないこと                                 |
| C-4 | integration | mutationAck mapping      | accepted、rejected、rebase-needed が card、banner、navigation に docs どおり反映されること |
| C-5 | integration | destructive action split | publish、retire、archive notice が別操作、別ラベル、別確認として表示されること             |

### D. Visual, Layout, and Accessibility Test

| ID  | level              | 対象                       | 主要検証点                                                                                           |
| --- | ------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| D-1 | visual/integration | public top composition     | hero stage、value lane、publication shelf、final sign-in CTA が存在すること                          |
| D-2 | visual/integration | signed-in home composition | continue zone、create zone、publish zone、campaign context が成立すること                            |
| D-3 | responsive         | viewport matrix            | `/home`、`/characters`、`/campaigns`、publication detail が desktop と mobile の両方で意味を保つこと |
| D-4 | a11y               | keyboard path              | hero CTA、create lane、current edition card、publication row に keyboard-only で到達できること       |
| D-5 | a11y               | screen reader state        | current edition、superseded、retired が text で判別できること                                        |

### E. Full-Stack AppView Journey Test

| ID  | シナリオ                          | 主要ステップ                                                        | 合格条件                                                                                                                   |
| --- | --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| E-1 | anonymous public reader           | `/` -> `/publications/:publicationRef` -> `/campaigns/:campaignRef` | public top が価値説明と公開中の版だけを出し、campaign shell が read-only continuity summary に留まること                   |
| E-2 | signed-in owner landing           | sign-in -> `/home` -> create lane -> `/characters/:branchRef`       | canonical landing が `/home` で、create / continue / publish の 3 導線が Character Continuity Workbench として成立すること |
| E-3 | create flow journey               | new / import / branch / convert を開始 -> review step -> detail     | lane 分岐、draft / accepted distinction、campaign intent、publication / reuse review が docs どおりに出ること              |
| E-4 | publication and tombstone journey | active detail -> superseded / retired direct link -> tombstone      | current edition detail、explanatory tombstone、CTA の出し分けが正しいこと                                                  |
| E-5 | public campaign shell journey     | public campaign shell -> sign-in bridge -> `/home`                  | public campaign が read-only shell であり、participation を暗示しないこと                                                  |

## フェーズ別 gate

### AppView Core Shell Gate

最低限次が green であること。

- A-1 から A-5
- B-1 から B-5
- C-1 から C-5
- D-1 から D-5
- E-1 から E-5

この gate は「core continuity を読む AppView」が成立したことを示す。

### Final Gate

最低限次が green であること。

- visual baseline diff
- copy regression check
- route manifest check
- [システムテスト計画](../architecture/test-plan.md) の必須 suite も同一 build で green
