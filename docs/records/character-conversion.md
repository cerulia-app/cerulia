# character-conversion

## 役割

ruleset をまたぐ character continuity の変換 provenance を append-only に残す record。ある source sheet / branch を、どの source / target contract と conversion contract で、どの target sheet / branch に写したかを固定する。character-conversion 自体は公開や reuse の durable subject ではなく、変換後の target branch または target episode がその役割を持つ。

## 置き場所

基本は target sheet owner の個人repo。continuity steward が target branch の運用を委ねられている場合は、その steward repo に置いてもよい。

## 主なフィールド

- sourceSheetRef
- sourceSheetVersion
- sourceBranchRef
- sourceEpisodeRefs
- sourceRulesetManifestRef
- sourceEffectiveRuleProfileRefs
- targetSheetRef
- targetSheetVersion
- targetBranchRef
- targetCampaignRef
- targetRulesetManifestRef
- targetEffectiveRuleProfileRefs
- conversionContractRef
- conversionContractVersion
- reuseGrantRef
- supersedesRef
- convertedByDid
- convertedAt
- requestId
- note

## 更新主体

target sheet owner、または owner から委任を受けた continuity steward。

## 参照関係

- character-sheet
- character-branch
- character-episode
- campaign
- ruleset-manifest
- reuse-grant

## 設計上の注意

- character-conversion は branch provenance ledger であり、公開や reuse の durable subject にしない。公開や持ち出しは target branch または target episode に対して既存の publication / reuse-grant を使う。
- sourceRulesetManifestRef と targetRulesetManifestRef は必須とし、変換時にどの contract で source / target を解釈したかを pin する。
- sourceSheetVersion と targetSheetVersion は、変換時に使った sheet snapshot を pin する。stable-key record の現在値を後から黙って再解釈しない。
- sourceEffectiveRuleProfileRefs と targetEffectiveRuleProfileRefs は ordered snapshot とし、world / house / campaign overlay が無い場合は空配列でよい。
- conversionContractRef と conversionContractVersion は中立な contract metadata とし、ruleset 固有 spec、library record、service release、manual mapping doc を指してよい。core に universal DSL を押し込まない。
- sourceBranchRef がある場合、sourceSheetRef はその branch の baseSheetRef と一致しなければならない。targetBranchRef は必須とし、その branch の baseSheetRef は targetSheetRef と一致しなければならない。
- targetCampaignRef は、変換 path がどの campaign shared chain に正規化されたかを示す canonical provenance field とする。campaign-less な local conversion では省略してよい。
- 同じ conversion outcome を後続の character-episode で要約するとき、episode.campaignRef は targetCampaignRef と同値を mirror してよいが、より広い campaign linkage を新設してはならない。
- same-owner conversion は新しい consent primitive を要求しない。cross-boundary または delegated conversion を explicit な同意に基づいて行う場合は、reuseGrantRef でその grant を必ず指す。
- convertedByDid は変換 write を確定した actor を表す。target sheet owner と異なる場合、その actor は targetCampaignRef が指す campaign の stewardDids に含まれていなければならず、campaign-less local conversion では non-owner write を許さない。reuseGrantRef は source 側 reuse の根拠だけを与え、target 側 write authority を広げない。
- character home の conversion summary で返す authorityKind は閉じた導出値として扱ってよい。reuseGrantRef がある場合は grant-backed、そうでなく convertedByDid が target sheet owner と一致する場合は same-owner、残る許可された non-owner write は campaign-steward とする。
- campaign-less な local conversion を後から explicit reuse-grant で持ち出したい場合は、reuse-grant の source boundary 規則に従って source campaign を明示した branch か fork を先に作る。
- sourceEpisodeRefs は変換時に参照した continuity summary を補助的に残す field であり、growth fact の authoritative source にしない。source state の authority は source sheet / branch とその advancement sequence に残る。
- 訂正は既存 record を直接編集せず、supersedesRef 付きの新規 character-conversion で扱う。
- character-conversion 自体を publication.subjectKind に追加しない。public / stable entry は既存の target branch / target episode の publication で扱う。