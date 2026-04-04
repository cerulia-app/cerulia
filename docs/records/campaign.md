# campaign

## 役割

複数の character lineage と continuity artifact を束ねる continuity scope。shared rule chain、reuse policy、公開方針の anchor として使う。

## 置き場所

campaign steward の repo。

## 主なフィールド

- campaignId
- title
- visibility
- houseRef
- worldRef
- rulesetNsid
- rulesetManifestRef
- sharedRuleProfileRefs
- defaultReusePolicyKind
- stewardDids
- createdAt
- archivedAt
- revision
- requestId
- updatedAt

## 更新主体

campaign steward。

## 参照関係

- character-branch
- character-episode
- publication
- reuse-grant

## 設計上の注意

- campaignId は record 内の stable identifier であり、cross-record reference、AppView route、XRPC、projection では campaignRef を使う
- houseRef と worldRef は任意とし、campaign を mandatory parent tree に固定しない
- houseRef が存在する場合、worldRef は省略するか、その house が指す worldRef と一致しなければならない
- campaign は continuity scope であり、共有継続線の anchor を担う。参加管理や通信の責務を持たない
- rulesetNsid と rulesetManifestRef は campaign continuity の default contract を表し、branch / episode / conversion provenance に使う
- visibility は campaign projection と publication 既定の表示メタデータであり、public shell の最終 gate を単独で決めない
- public campaign shell の可視性は campaign.visibility 単独では決めず、active な public publication current head と projection auth で決める
- sharedRuleProfileRefs は ordered list とし、新規 campaign 作成時に world defaults、house defaults、campaign 独自追加の順で seed merge してよい
- sharedRuleProfileRefs は campaign の default contract に互換でなければならず、互換性の検証は attachRuleProfile が受ける expectedRulesetManifestRef と campaign.rulesetManifestRef の一致で行う
- stewardDids は current product-core では create-time の管理集合として扱う。変更を許す dedicated scope mutation は現行 RPC surface に含めない
- defaultReusePolicyKind は campaign 側の値を常に優先する。house default は campaign 作成時の初期値としてコピーしてよいが、campaign 作成後は暗黙に追随させない
- archivedAt は continuity の終端を表すが、過去の character-episode や advancement を巻き戻さない
- revision は createCampaign で 1 から始め、sharedRuleProfileRefs、defaultReusePolicyKind、archivedAt を変える accepted mutation ごとに 1 ずつ増やす
