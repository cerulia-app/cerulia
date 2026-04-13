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
