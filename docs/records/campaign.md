# campaign

## 役割

複数のセッションとキャラクター履歴を束ねるシリーズ。shared rule chain と公開方針の anchor として使う。

## 置き場所

campaign owner の repo。

## 主なフィールド

- campaignId
- title
- visibility
- houseRef
- worldRef
- rulesetNsid
- rulesetManifestRef
- sharedRuleProfileRefs
- maintainerDids
- createdAt
- archivedAt
- revision
- requestId
- updatedAt

## 更新主体

campaign owner、または maintainerDids に含まれる actor。

## 参照関係

- session（session.campaignRef から逆参照される）
- publication

## 設計上の注意

- campaignId は record 内の stable identifier であり、cross-record reference、AppView route、XRPC、projection では campaignRef を使う
- houseRef と worldRef は任意とし、campaign を mandatory parent tree に固定しない
- houseRef が存在する場合、worldRef は省略するか、その house が指す worldRef と一致しなければならない
- campaign はセッションのシリーズであり、参加管理や通信の責務を持たない
- rulesetNsid と rulesetManifestRef は campaign の default contract を表す
- visibility は campaign projection の表示メタデータであり、public shell の最終 gate を単独で決めない
- sharedRuleProfileRefs は ordered list とし、campaign 独自の rule overlay を持てる
- maintainerDids は scope record（campaign）のみを更新できる。character 系 record の write authority には影響しない
- archivedAt はシリーズの終端を表すが、過去の session や advancement を巻き戻さない
- revision は createCampaign で 1 から始め、sharedRuleProfileRefs、archivedAt を変える accepted mutation ごとに 1 ずつ増やす
