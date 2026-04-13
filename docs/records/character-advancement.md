# character-advancement

## 役割

character-branch に対する成長、XP 消費、retrain、respec、訂正を append-only に記録する record。キャラ成長の監査台帳になる。

## 置き場所

対象の character-branch と同じ repo。

## 主なフィールド

- characterBranchRef
- advancementKind
- deltaPayloadRef
- sessionRef
- effectiveAt
- supersedesRef
- requestId
- createdAt
- note

## 更新主体

branch owner のみ。

## 参照関係

- character-branch
- session（sessionRef で任意に参照）

## 設計上の注意

- advancement は append-only にし、XP spend、milestone、retrain、respec、correction を同じ ledger で扱う
- sessionRef は任意。どのセッションで得た成長かをリンクできるが、リンクしなくても有効
- advancementKind が import-sync のときは、imported base の sourceRevision を明示的に進める同期イベントとして扱う
- correction は既存 entry を消さず、supersedesRef か補正 entry で扱う
- supersedesRef を使う場合、参照先は同じ characterBranchRef を指す advancement に限る
- 現在の branch 解決結果は、base sheet、branch override、active な advancement sequence から投影する
- active な advancement sequence の canonical ordering は effectiveAt 昇順とし、同時刻なら record-key の tid 順で解決する
- external runtime provenance は現行 product-core の field として持たない。必要な説明は note や将来の product-neutral summary field で扱う
- deltaPayloadRef には ruleset 固有の能力値差分や成長内容を入れてよい
