# audit-detail-envelope

## 役割

appeal-case、appeal-review-entry、ruling-event などが参照する audit-only detail payload の carrier。通常 surface に出さない補足理由、証跡、内部説明を authority repo 側で durable に保持する。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- subjectRef
- requestId
- createdByDid
- createdAt
- envelopeKind
- bodyRef

## 更新主体

session authority、または blocked appeal を処理している recovery controller。通常 participant は更新しない。

## 参照関係

- appeal-case
- appeal-review-entry
- ruling-event

## 設計上の注意

- detailEnvelopeRef はこの record を指す at-uri とする。
- envelopeKind は appeal-case-detail、appeal-review-detail、ruling-detail のような有限集合にしてよい。
- subjectRef は詳細の対象 record を指し、通常は appeal-case、appeal-review-entry、ruling-event のいずれかにする。
- bodyRef は immutable な blob または external URI を指す audit-only payload とし、既存 envelope を in-place で差し替えない。詳細を更新したい場合は新しい audit-detail-envelope を追加する。
- 公開説明に必要な短い要約は元 record 側の resultSummary、handoffSummary、note に残し、秘密や内部証跡は audit-detail-envelope に逃がす。
- getAuditView と export はこの record を含んでよいが、participant view、resolver summary、public replay には含めない。