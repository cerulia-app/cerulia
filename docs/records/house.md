# house

## 役割

コミュニティの単位。ハウスルール、コミュニティ方針をまとめる anchor として使う。

## 置き場所

house owner の repo。

## 主なフィールド

- houseId
- title
- worldRef
- defaultRuleProfileRefs
- policySummary
- maintainerDids
- createdAt
- updatedAt

## 更新主体

house owner、または maintainerDids に含まれる actor。

## 参照関係

- world
- campaign
- rule-profile

## 設計上の注意

- house はコミュニティの単位であり、参加管理や通信の責務を持たない
- 複数の campaign や scenario が同じ house を参照してよい
- defaultRuleProfileRefs は ordered list とし、campaign が継承してよいが、campaign 側で追加してもよい
- defaultRuleProfileRefs は新規 campaign を作るときの seed-only default として扱い、既存 campaign に自動追随させない
- maintainerDids は scope record（house）のみを更新できる。character 系 record の write authority には影響しない
- house から過去の session を辞るのは projection で扱う。house record 自体に sessions リストは持たない
