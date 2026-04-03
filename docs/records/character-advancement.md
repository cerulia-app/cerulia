# character-advancement

## 役割

character-branch に対する成長、XP 消費、retrain、respec、訂正を append-only に記録するrecord。キャラ成長の監査台帳になる。

## 置き場所

対象の character-branch と同じrepo。

## 主なフィールド

- characterBranchRef
- sourceRunRef
- advancementKind
- deltaPayloadRef
- approvedByDid
- effectiveAt
- supersedesRef
- requestId
- createdAt
- note

## 更新主体

branch owner、または成長処理を確定できる continuity steward。

## 参照関係

- character-branch
- character-episode

## 設計上の注意

- advancement は append-only にし、XP spend、milestone、retrain、respec、correction を同じ ledger で扱う。
- advancementKind が import-sync のときは、imported base の sourceRevision を明示的に進める同期イベントとして扱う。
- correction は既存 entry を消さず、supersedesRef か補正 entry で扱う。
- supersedesRef を使う場合、参照先は同じ characterBranchRef を指す advancement に限る。
- 現在の branch 解決結果は、base sheet、branch override、active な advancement sequence から投影する。
- active な advancement sequence の canonical ordering は effectiveAt 昇順とし、同時刻なら record-key の tid 順で解決する。
- sourceRunRef は optional extension の run provenance を追いたい場合だけ持たせる。core は sourceRunRef がなくても成立する。
- deltaPayloadRef には ruleset 固有の能力値差分や成長内容を入れてよい。