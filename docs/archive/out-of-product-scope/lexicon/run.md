# run extension namespace

ここでは、optional run / governance extension に含める record 群を app.cerulia.run.* に分ける前提で整理する。continuity core の正本ではなく、structured run を採る場合だけ有効になる namespace である。

## 推奨 NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.run.session | record | stable | optional structured run の envelope |
| app.cerulia.run.sessionAuthority | record | stable | shared run mutation の control plane |
| app.cerulia.run.membership | record | stable | run への所属 |
| app.cerulia.run.sessionPublication | record | tid | core publication を mirror する session-backed carrier |
| app.cerulia.run.characterInstance | record | stable | run 内での利用単位 |
| app.cerulia.run.characterState | record | stable | run-time の現在状態 |
| app.cerulia.run.message | record | tid | run 中の chat log |
| app.cerulia.run.roll | record | tid | run 中の dice log |
| app.cerulia.run.rulingEvent | record | tid | run 中の authoritative decision log |
| app.cerulia.run.appealCase | record | tid | optional dispute workflow の case header |
| app.cerulia.run.appealReviewEntry | record | tid | optional dispute workflow の review trail |
| app.cerulia.run.auditDetailEnvelope | record | tid | audit-only detail payload carrier |

## 設計上の注意

- run namespace は optional extension であり、campaign、character-branch、publication の canonical root を置き換えない。
- sessionPublication は core publication を mirror する adapter であり、単独で canonical publication を作らない。
- sessionPublication は supersedesRef で current head を進める append-only chain として扱い、stable mutable row にしない。
- session と sessionAuthority は continuity core が成立した後にだけ追加する。
- membership は session authority repo 全体で一意な opaque stable key を使い、同じ actorDid の複数 session 参加を key で潰さない。
- message、roll、rulingEvent、appealReviewEntry、auditDetailEnvelope は append-only log として扱う。
- stable key を使う record は current run state を指し、tid を使う record は時系列 log を指す。