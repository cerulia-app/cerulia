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
| A-2 | auth bundle | mutation endpoint が定義された permission-set でしか到達できず、public/detail read は reader matrix どおりに動くこと |
| A-3 | visibility | draft record が一覧には出ず、direct link では draft state 付きで解決されること |
| A-4 | session input invariant | createSession が scenarioRef / scenarioLabel のどちらか必須を守ること |
| A-5 | reader matrix | owner / maintainer / public / anonymous の endpoint matrix が docs どおりに分かれること |
| A-6 | mutationAck taxonomy | reasonCode / correlationId が安定して返ること |

### B. Core Domain

| ID | 対象 | 検証点 |
|---|---|---|
| B-1 | sheet + branch ペア | createCharacterSheet が sheet + default branch をペアで生成すること |
| B-2 | advancement chain | sessionRef リンクと previousValues の保持が正しいこと |
| B-3 | session invariants | PL が自分の session を書けること。他人の DID を含まないこと |
| B-4 | campaign seed | campaign 作成時に house defaults を sharedRuleProfileRefs へ seed し、その後の正本は campaign.sharedRuleProfileRefs であること |
| B-5 | scenario registration | 誰でも scenario を登録できること |
| B-6 | conversion fence | source / target rulesetNsid が記録されること |
| B-7 | visibility toggle | draft ↔ public の切り替えが反映されること |
| B-8 | schema rebase | sheetSchemaRef の明示更新で rebase-needed / accepted が正しく分かれること |
| B-9 | branch visibility seed | createCharacterSheet が default branch に初期 visibility を seed すること |

### C. Projection

| ID | 対象 | 検証点 |
|---|---|---|
| C-1 | character home | core canonical input だけで再構築できること |
| C-2 | character branch detail | public mode で public branch が一覧され、draft branch は非一覧だが direct link では draft state 付きで解決されること |
| C-3 | campaign view | campaign に紐づく session が一覧されること |
| C-4 | scenario catalog | rulesetNsid でフィルタできること |
| C-5 | scenario → schema chain | scenario.recommendedSheetSchemaRef がある場合だけ deterministic に scenario → character-sheet-schema の chain が解決できること |
| C-6 | scenario browse-only | recommendedSheetSchemaRef が無い scenario は browse-only として扱われ、scenario 起点の create CTA を持たないこと |
| C-7 | draft child filtering | public campaign / house projection が draft child を返さないこと |

### D. End-to-End

| ID | シナリオ | ステップ | 合格条件 |
|---|---|---|---|
| D-1 | キャラクター作成 | rulesetNsid 選択 → schema 取得 → sheet + branch 作成 → stats 入力 | character home に表示されること |
| D-2 | セッション記録 | session 作成 → advancement 記録 → sessionRef リンク | session 履歴と成長履歴が追えること |
| D-3 | 共有 | visibility: public → public mode で閲覧 | 他人から character branch detail が見えること |
| D-4 | 長期卓 | campaign 作成 → session.campaignRef → campaign view | campaign view にセッションが並ぶこと |

## Release Gate

### Core Gate

A-1 〜 A-6、B-1 〜 B-9、C-1 〜 C-7、D-1 〜 D-4 が green であること。

### Final Gate

- projection rebuild
- migration rehearsal
- clean-slate review
