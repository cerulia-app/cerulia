# roll

## 役割

ダイス結果の監査ログ。TRPGでは履歴価値が高いので、messageとは別recordにする。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- actorDid
- command
- normalizedCommand
- resultSummary
- detailPayload
- targetRef
- audienceRef
- secretEnvelopeRef
- requestId
- rngVersion
- createdAt

## 更新主体

session authority。必要ならダイス実行サービスの結果を受けて確定する。

## 参照関係

- character-instance
- audience
- secret-envelope
- ruling-event
- redaction-event

## 設計上の注意

- command と result を分離しすぎない。あとからreplayするときに対応づけが難しくなる。
- 公開rollと秘匿rollを同じrecord形で扱い、公開先だけ audience で変える。
- requestId は accepted された rollDice と service log を相関づける共通 field とし、submitAction から生成された場合は ruling-event とも結びつける。resultSummary や rngVersion とは役割を混ぜない。
- 不正や仕様変更の追跡のため、乱数系や解釈系のversionを残せるようにする。