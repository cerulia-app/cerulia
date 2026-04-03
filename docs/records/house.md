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
- revision
- requestId
- createdAt
- updatedAt

## 更新主体

house steward。

## 参照関係

- world
- campaign
- rule-profile

## 設計上の注意

- house は community / policy scope であり、session の live authority を直接持たない。
- 複数の campaign が同じ house を参照してよい。
- defaultRuleProfileRefs は ordered list とし、campaign が継承してよいが、campaign 側で sharedRuleProfileRefs を追加してもよい。
- defaultRuleProfileRefs に入る profile は、それを seed として受け取る campaign の ruleset pin と互換でなければならない。session 側の互換性判定は optional extension の責務とする。
- defaultRuleProfileRefs は新規 campaign を作るときの seed-only default として扱い、既存 campaign に自動追随させない。既存 campaign を変えたい場合は campaign.sharedRuleProfileRefs で明示更新する。
- defaultReusePolicyKind は same house 内の既定動作を示すだけであり、より狭い campaign policy や explicit reuse-grant を上書きしない。
- revision は create で 1 から始め、title、worldRef、defaultRuleProfileRefs、defaultReusePolicyKind、policySummary、stewardDids を変える accepted mutation ごとに 1 ずつ増やす。将来の mutable procedure は expectedRevision を必須にし、house seed を暗黙更新にしない。
- requestId は現在の house 版を確定した直近 steward mutation と service log を相関づける field として使う。