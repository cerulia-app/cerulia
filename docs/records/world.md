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
- maintainerDids
- createdAt
- updatedAt

## 更新主体

world owner、または maintainerDids に含まれる actor。

## 参照関係

- house
- campaign
- rule-profile

## 設計上の注意

- world は canon scope であり、runtime finalizer ではない
- 複数の house や campaign が同じ world を参照してよい
- defaultRuleProfileRefs は ordered list とし、world 固有の rules default への参照として使ってよい
- defaultRuleProfileRefs は新規 house や campaign を作るときの seed-only default として扱い、既存 record に自動追随させない
- maintainerDids は scope record（world）のみを更新できる。character 系 record の write authority には影響しない
- world を参照しない campaign も許可してよい
