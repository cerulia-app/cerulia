# rule-profile

## 役割

base ruleset の上に重ねるハウスルール overlay record。house や campaign が独自のルール調整を持つときに使う。

## 置き場所

scope に応じて置き場所を分ける。

- house shared の profile は house owner の repo
- campaign shared の profile は campaign owner の repo

## 主なフィールド

- baseRulesetNsid
- profileTitle
- scopeKind（house-shared / campaign-shared）
- scopeRef
- rulesPatchRef
- createdAt
- updatedAt

## 更新主体

その scope の owner、または maintainerDids に含まれる actor。

## 参照関係

- house
- campaign

## 設計上の注意

- scopeKind は house-shared、campaign-shared の閉じた値
- scopeRef は、その profile がどの scope に属するかを指す
- overlay 順序は house shared → campaign shared の 2 層。後ろほど優先する
- rulesPatchRef はルール差分の本文やドキュメントを指す自由な参照
