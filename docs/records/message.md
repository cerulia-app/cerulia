# message

## 役割

チャットログの正本。卓内発言、システムメッセージ、秘匿メッセージの共通の入れ物になる。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- authorDid
- channelKind
- audienceRef
- bodyText
- secretEnvelopeRef
- replyToRef
- requestId
- clientNonce
- createdAt

## 更新主体

session authority。送信要求自体は利用者のXRPCから来る。

## 参照関係

- session
- audience
- secret-envelope
- ruling-event
- redaction-event

## 設計上の注意

- channelKind はUI上の整理用であり、秘匿制御そのものではない。
- 限定公開messageは audienceRef と secretEnvelopeRef を使う。
- 誤爆や撤回はdeleteではなく redaction-event で扱う。
- requestId は accepted された sendMessage と service log を相関づける共通 field とする。submitAction から message が出力された場合は、同じ requestId を持つ ruling-event とも相関できるようにする。
- clientNonce は旧クライアント互換用の alias として残してよいが、新規実装では requestId に正規化する。