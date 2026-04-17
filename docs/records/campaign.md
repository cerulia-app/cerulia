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
- visibility（draft / public）
- createdAt
- archivedAt
- updatedAt

## 更新主体

campaign owner。

## 参照関係

- session（session.campaignRef から逆参照される）
- house

## 設計上の注意

- 単発セッションが多数派であり、campaign は長期卓のオプションである
- campaign はセッションのシリーズであり、参加管理や通信の責務を持たない
- rulesetNsid は campaign のデフォルトルールシステムを表す
- campaign 作成時に house.defaultRuleProfileRefs を初期 sharedRuleProfileRefs にコピーしてよい。以後の正本は campaign.sharedRuleProfileRefs とする
- sharedRuleProfileRefs は ordered list とし、campaign 独自の rule overlay を持てる。live な effective overlay の唯一の正本は campaign.sharedRuleProfileRefs である
- sharedRuleProfileRefs に含める rule-profile は、すべて `baseRulesetNsid == campaign.rulesetNsid` を満たさなければならない
- archivedAt はシリーズの終端を表すが、過去の session や advancement を巻き戻さない
- visibility: draft の campaign は Cerulia AppView では一覧から隠すが、direct link では draft 状態を明示して表示する
- public campaign projection は draft house の identity を表示しない
- archivedAt が設定された campaign は read-only とし、updateCampaign で archivedAt 以外の mutable field を変更しない
