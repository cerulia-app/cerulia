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
- visibility（draft / public）
- createdAt
- updatedAt

## 更新主体

house owner。

## 参照関係

- campaign
- rule-profile

## 設計上の注意

- house はコミュニティの anchor であり、参加管理や通信の責務を持たない
- 複数の campaign や scenario が同じ house を参照してよい
- defaultRuleProfileRefs は ordered list とし、campaign が継承してよいが、campaign 側で追加してもよい
- defaultRuleProfileRefs は新規 campaign を作るときの seed-only default として扱う。campaign 作成時にコピーした後は campaign.sharedRuleProfileRefs が正本であり、既存 campaign に自動追随させない
- defaultRuleProfileRefs を使う場合、その house は 1 つの ruleset family に閉じる。複数 ruleset を併用する house では空にして、campaign 側で明示する
- house.defaultRuleProfileRefs は campaign 作成時の seed source に限る。live な effective overlay を直接構成しない
- title は public-safe なコミュニティ名に限る
- house から過去の session を辿るのは projection で扱う。house record 自体に sessions リストは持たない
- canonSummary は public-safe な世界観や上位設定のフリーテキスト。運用上の世界観ラベルとして使う
- policySummary は public-safe なコミュニティ方針の説明に限る
- externalCommunityUri は外部コミュニティへのリンク。メンバー管理自体は外部に任せる
- visibility: draft の house は Cerulia AppView では一覧から隠すが、direct link では draft 状態を明示して表示する
- direct-link の house detail では draft state 付きで identity を返してよい。一方、埋め込み public projection は draft house の identity を露出しない。public campaign が draft house を参照していても、house block は省略する
