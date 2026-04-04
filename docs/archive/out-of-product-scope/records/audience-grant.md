# audience-grant

## 役割

どのactorが、どのaudienceのどの鍵世代を復号できるかを表すrecord。秘匿権限の実体になる。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- audienceRef
- actorDid
- requestId
- keyVersion
- wrappedKey
- grantStatus
- validFrom
- revokedAt
- grantedByDid
- revokedByDid
- revokeReasonCode

## 更新主体

session authority。

## 参照関係

- audience
- secret-envelope
- membership

## 設計上の注意

- membership と別recordにすることで、途中参加や追放時の鍵再配布を扱いやすくする。
- revoke しただけでは過去の暗号文は消えない。厳密な失効が必要なら keyVersion を更新して再暗号化する。
- requestId は rotateAudienceKey や membership 変化に伴う grant 更新と service log を相関づける。
- grantStatus を revoked にするときは revokedAt、revokedByDid、revokeReasonCode を必須にする。
- wrappedKey の形式は暗号方式と一緒に管理する。
- role / membership 再計算の結果として effective recipient 集合が変わらない場合は、既存 active grant をそのまま維持してよい。
- 新しい participant や controller を future-only で追加するときは、古い keyVersion をそのまま共有せず、新しい keyVersion を切ってその世代の grant だけを配る。過去 ciphertext の共有は別 workflow とする。
- removed / banned や GM交代で今後の秘匿を止めたいときは、古い grant を止めるだけでなく、新しい keyVersion と新しい grant を揃えてから次の暗号文を出す。
- 公開replay の見え方は stale な grant ではなく reveal と redaction を反映した公開投影で決める。

## grantStatus の既定値

- pending: wrappedKey の配布待ちで、まだ通常の復号に使わない。
- active: 現在の keyVersion を復号できる。
- revoked: 今後の復号には使わず、revokedAt、revokedByDid、revokeReasonCode を必ず埋める。