# rule-profile

## 役割

base ruleset の上に重ねる continuity overlay record。core では world、house、campaign の shared rule を扱い、`rulesetManifestRef` を置き換えるのではなく、その上に順序付きで重ねる。

## 置き場所

scope に応じて置き場所を分ける。

- world / house shared の profile は library repo か steward repo
- campaign shared の profile は campaign steward repo

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

- scopeKind は world-shared、house-shared、campaign-shared の閉じた値を core で使う
- scopeRef は、その profile がどの continuity scope に属するかを指す
- continuity core の effective order は world shared、house shared、campaign shared の順とし、後ろほど優先する
- rule-profile 自体は reusable overlay record のまま保ち、record field として rulesetManifestRef は持たない
- pinned manifest との互換性は attachRuleProfile が受ける expectedRulesetManifestRef と campaign.rulesetManifestRef の一致で検証する
- provisional な裁定を後から active な house rule に昇格するときは、同じ profile を上書きせず supersedesRef で新しい record を積む
- supersedesRef を使う場合、参照先は同じ baseRulesetNsid、scopeKind、scopeRef を持つ rule-profile に限る
- effective window の外にある profile は通常解決に使わない
- rulesPatchRef は ruleset 固有の差分 payload や人間向けの方針本文を指してよいが、campaign.rulesetManifestRef や continuity contract を壊してはならない
