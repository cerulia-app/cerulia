# world

## 役割

canon / setting の scope。世界観や上位設定の provenance をまとめる read-mostly な anchor として使う。

## 置き場所

world steward の repo、または library repo。

## 主なフィールド

- worldId
- title
- canonSummary
- defaultRuleProfileRefs
- stewardDids
- createdAt
- updatedAt

## 更新主体

world steward。

## 参照関係

- house
- campaign
- rule-profile

## 設計上の注意

- world は canon scope であり、runtime finalizer ではない
- 複数の house や campaign が同じ world を参照してよい
- defaultRuleProfileRefs は ordered list とし、world 固有の rules default や lore package への参照として使ってよいが、それを seed として受け取る house / campaign の executable contract を黙って置き換えてはならない
- defaultRuleProfileRefs は新規 house や campaign を作るときの seed-only default として扱い、既存 record に自動追随させない
- world は current product-core RPC surface では mutable anchor として扱わず、library-managed な read-mostly record として参照する
- world を参照しない campaign も許可してよい。MVP で mandatory root にしない方が運用しやすい
