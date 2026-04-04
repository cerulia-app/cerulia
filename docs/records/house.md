# house

## 役割

community と policy の scope。shared library、default reuse policy、community rule をまとめる read-mostly な anchor として使う。

## 置き場所

house steward の repo、または library repo。

## 主なフィールド

- houseId
- title
- worldRef
- defaultRuleProfileRefs
- defaultReusePolicyKind
- policySummary
- stewardDids
- createdAt
- updatedAt

## 更新主体

house steward。

## 参照関係

- world
- campaign
- rule-profile

## 設計上の注意

- house は community / policy scope であり、進行や参加管理の責務を持たない
- 複数の campaign が同じ house を参照してよい
- defaultRuleProfileRefs は ordered list とし、campaign が継承してよいが、campaign 側で sharedRuleProfileRefs を追加してもよい
- defaultRuleProfileRefs に入る profile は、それを seed として受け取る campaign の ruleset pin と互換でなければならない
- defaultRuleProfileRefs は新規 campaign を作るときの seed-only default として扱い、既存 campaign に自動追随させない
- defaultReusePolicyKind は same house 内の既定動作を示すだけであり、より狭い campaign policy や explicit reuse-grant を上書きしない
- house は current product-core RPC surface では mutable anchor として扱わず、library-managed な read-mostly record として参照する
