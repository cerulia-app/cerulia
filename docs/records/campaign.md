# campaign

## 役割

複数のセッションを束ねる長期卓のシリーズ。単発セッションが多数派であり、campaign はオプション。

## 置き場所

campaign owner の repo。

## 主なフィールド

- campaignId
- title
- houseRef（任意）
- rulesetNsid
- sharedRuleProfileRefs
- maintainerDids
- visibility（draft / public）
- createdAt
- archivedAt
- updatedAt

## 更新主体

campaign owner、または maintainerDids に含まれる actor。

## 参照関係

- session（session.campaignRef から逆参照される）
- house

## 設計上の注意

- 単発セッションが多数派であり、campaign は長期卓のオプションである
- campaign はセッションのシリーズであり、参加管理や通信の責務を持たない
- rulesetNsid は campaign のデフォルトルールシステムを表す
- sharedRuleProfileRefs は ordered list とし、campaign 独自の rule overlay を持てる。overlay 順序は house shared → campaign shared
- maintainerDids は scope record（campaign）のみを更新できる。character 系 record の write authority には影響しない
- archivedAt はシリーズの終端を表すが、過去の session や advancement を巻き戻さない
- visibility: draft の campaign は AppView の一覧から除外される
