# character-conversion

## 役割

ruleset をまたぐ character continuity の変換 provenance を append-only に残す record。ある source sheet / branch を、どの source / target contract と conversion contract で、どの target sheet / branch に写したかを固定する。character-conversion 自体は公開や reuse の durable subject ではなく、変換後の target branch または target episode がその役割を持つ。

## 置き場所

基本は target sheet owner の個人rep。

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
- supersedesRef
- convertedByDid
- convertedAt
- requestId
- note

## 更新主体

target sheet owner のみ。

## 参照関係

- character-sheet
- character-branch
- session
- campaign
- ruleset-manifest

## 設計上の注意

- character-conversion は branch provenance ledger であり、公開の durable subject にしない。公開は target branch の publication で扱う。
- sourceRulesetManifestRef と targetRulesetManifestRef は必須とし、変換時にどの contract で source / target を解釈したかを pin する。
- sourceSheetVersion と targetSheetVersion は、変換時に使った sheet snapshot を pin する。stable-key record の現在値を後から黙って再解釈しない。
- sourceEffectiveRuleProfileRefs と targetEffectiveRuleProfileRefs は ordered snapshot とし、world / house / campaign overlay が無い場合は空配列でよい。
- conversionContractRef と conversionContractVersion は中立な contract metadata とし、ruleset 固有 spec、library record、service release、manual mapping doc を指してよい。core に universal DSL を押し込まない。
- sourceBranchRef がある場合、sourceSheetRef はその branch の baseSheetRef と一致しなければならない。targetBranchRef は必須とし、その branch の baseSheetRef は targetSheetRef と一致しなければならない。
- targetCampaignRef は、変換 path がどの campaign shared chain に正規化されたかを示す canonical provenance field とする。campaign-less な local conversion では省略してよい。
- 同じ conversion outcome を後続の session で要約するとき、session.campaignRef は targetCampaignRef と同値を mirror してよいが、より広い campaign linkage を新設してはならない。
- same-owner conversion は制限なく行える。cross-boundary の変換はコミュニケーションによる
- convertedByDid は変換 write を確定した actor を表す。target sheet owner と異なる場合は不正とする（owner のみが変換を確定できる）
- character home の conversion summary で返す authorityKind は導出値として扱ってよい。convertedByDid が target sheet owner と一致する場合は same-owner とする
- sourceEpisodeRefs は変換時に参照した summary を補助的に残す field であり、growth fact の authoritative source にしない
- 訂正は既存 record を直接編集せず、supersedesRef 付きの新規 character-conversion で扱う
- character-conversion 自体を publication.subjectKind に追加しない