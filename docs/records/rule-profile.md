# rule-profile

## 役割

base ruleset の上に重ねる continuity overlay record。core では world、house、campaign の shared rule を扱い、run-time override は optional extension に委ねる。`rulesetManifestRef` を置き換えるのではなく、その上に順序付きで重ねる。

## 置き場所

scope に応じて置き場所を分ける。

- world / house shared の profile は library repo か steward repo
- campaign shared の profile は campaign steward repo
- session override と temporary ruling は optional extension 側の record として扱う

## 主なフィールド

- baseRulesetNsid
- profileTitle
- scopeKind
- scopeRef
- status
- effectiveFrom
- effectiveUntil
- supersedesRef
- rulesPatchRef
- approvedByDid
- requestId
- createdAt
- updatedAt

## 更新主体

その scope の steward。core では campaign shared は campaign steward、world / house shared は対応する steward が管理する。

## 参照関係

- world
- house
- campaign
- character-sheet
- character-branch

## 設計上の注意

- scopeKind は world-shared、house-shared、campaign-shared の閉じた値を core で使う。session-override と temporary-ruling は optional extension の語彙である。
- scopeRef は、その profile がどの continuity scope に属するかを指す。world-shared は worldRef、house-shared は houseRef、campaign-shared は campaignRef を使う。
- continuity core の effective order は world shared、house shared、campaign shared の順とし、後ろほど優先する。world / house shared profile は campaign 作成時の seed merge に使い、campaign 側では sharedRuleProfileRefs を正本として持つ。
- rule-profile 自体は reusable overlay record のまま保ち、record field として rulesetManifestRef は持たない。
- pinned manifest との互換性は attachRuleProfile や createSessionDraft が受ける expectedRulesetManifestRef で検証し、record 自体に二重の pin を持たせない。
- provisional な裁定を後から active な house rule に昇格するときは、同じ profile を上書きせず supersedesRef で新しい record を積む。
- supersedesRef を使う場合、参照先は同じ baseRulesetNsid、scopeKind、scopeRef を持つ rule-profile に限る。
- effective window の外にある profile は通常解決に使わない。
- rulesPatchRef は ruleset 固有の差分 payload や人間向けの方針本文を指してよいが、campaign.rulesetManifestRef や参照先の continuity contract を壊してはならない。
- action grammar や resolver contract を互換なしで変える場合は、同じ manifest を黙って再解釈せず、新しい ruleset-manifest または migration として扱う。
- continuity の閲覧や監査では、その時点で有効だった profile chain を使い、現在の設定で過去の lineage を黙って再解釈しない。