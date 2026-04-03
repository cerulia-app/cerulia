# campaign

## 役割

複数の character lineage と continuity artifact を束ねる continuity scope。runtime finalizer ではなく、shared rule chain、reuse policy、公開方針の anchor として使う。

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

- campaignId は record 内の stable identifier であり、cross-record reference、AppView route、XRPC、projection では campaignRef を使う。campaignId を campaignRef の代わりに外部 surface へ露出させない。
- houseRef と worldRef は任意とし、campaign を mandatory parent tree に固定しない。
- houseRef が存在する場合、worldRef は省略するか、その house が指す worldRef と一致しなければならない。
- campaign は continuity scope であり、session authority の代わりに runtime mutation を確定しない。
- rulesetNsid と rulesetManifestRef は campaign continuity の default contract を表し、branch / episode / optional run extension の provenance に使う。
- visibility は campaign projection と publication 既定の表示メタデータであり、runtime admission gate ではない。
- public campaign shell の可視性は campaign.visibility 単独では決めず、active な public publication current head と projection auth で決める。visibility を変えるだけで shell を新設したり tombstone 化したりしない。
- sharedRuleProfileRefs は ordered list とし、runtime では campaign shared 区間そのものを表す。world / house defaults を live で再評価するのではなく、新規 campaign 作成時に seed merge してこの配列へ畳み込む。
- 新規 campaign を作るときの seed merge は、world defaults、house defaults、campaign 独自追加の順に行い、重複 profile は除去しつつ各配列の内部順序は保存する。
- sharedRuleProfileRefs は campaign の default contract に互換でなければならず、campaign 配下の branch、episode、optional run artifact はその continuity chain を provenance として参照してよい。互換性の検証は attachRuleProfile が受ける expectedRulesetManifestRef と campaign.rulesetManifestRef の一致で行う。
- defaultReusePolicyKind は campaign 側の値を常に優先する。house default は campaign 作成時の初期値としてコピーしてよいが、campaign 作成後は暗黙に追随させない。
- same campaign 内の reuse は defaultReusePolicyKind で扱ってよいが、cross-campaign や cross-house の持ち出しは reuse-grant に戻す方が安全である。
- archivedAt は continuity の終端を表すが、過去の character-episode や advancement を巻き戻さない。
- revision は createCampaign で 1 から始め、sharedRuleProfileRefs、defaultReusePolicyKind、archivedAt を変える accepted mutation ごとに 1 ずつ増やす。
- attachRuleProfile のような mutable procedure は expectedRevision を受け、current revision と一致したときだけ campaign を更新する。
- 同じ campaignRef と requestId の組は、accepted / rejected を問わず idempotent に扱う。