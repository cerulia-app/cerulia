# house

## 役割

コミュニティの単位。ハウスルール、コミュニティ方針、世界観ラベルをまとめる anchor。Discord サーバー、ゲーム会、サークルなど あらゆるコミュニティの形をカバーする汎用概念。メンバー管理は持たない。

## 置き場所

house owner の repo。

## 主なフィールド

- houseId
- title
- canonSummary（任意: 世界観や設定のフリーテキスト補足）
- defaultRuleProfileRefs
- policySummary
- externalCommunityUri（任意: Discord サーバーや外部サイトへのリンク）
- maintainerDids
- visibility（draft / public）
- createdAt
- updatedAt

## 更新主体

house owner、または maintainerDids に含まれる actor。

## 参照関係

- campaign
- rule-profile

## 設計上の注意

- house はコミュニティの anchor であり、参加管理や通信の責務を持たない
- 複数の campaign や scenario が同じ house を参照してよい
- defaultRuleProfileRefs は ordered list とし、campaign が継承してよいが、campaign 側で追加してもよい
- defaultRuleProfileRefs は新規 campaign を作るときの seed-only default として扱い、既存 campaign に自動追随させない
- rules overlay 順序は house shared → campaign shared の 2 層
- maintainerDids は scope record（house）のみを更新できる。character 系 record の write authority には影響しない
- house から過去の session を辿るのは projection で扱う。house record 自体に sessions リストは持たない
- canonSummary は世界観や上位設定を説明するフリーテキスト。運用上の世界観ラベルとして使う
- externalCommunityUri は外部コミュニティへのリンク。メンバー管理自体は外部に任せる
