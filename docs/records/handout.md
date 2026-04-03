# handout

## 役割

セッション内で資料をどう見せるかを表すrecord。公開資料にも秘匿資料にも使い、いつ誰に見せるかを管理する。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- title
- assetRef
- audienceRef
- secretEnvelopeRef
- currentVisibility
- orderKey
- createdAt

## 更新主体

session authority。

## 参照関係

- asset
- audience
- secret-envelope
- reveal-event
- redaction-event

## 設計上の注意

- handout は卓上の見せ方を表し、暗号文そのものは secret-envelope に寄せる。
- 後から公開する場合は handout を書き換えるだけでなく、reveal-event を残す。
- orderKey を持つと、配布順やUI上の並びを安定化しやすい。
- currentVisibility は初期配置と reveal-event / redaction-event から導出される投影値とする。保存してもよいが source of truth にはしない。
- `revealMode = publish-publicly` によって currentVisibility が public になっても、public projection に出してよいのは handout title、assetRef 由来の公開本文、participant-safe metadata だけである。secretEnvelopeRef、audienceRef、監査 detail は公開 replay や public handout list にそのまま出してはならない。