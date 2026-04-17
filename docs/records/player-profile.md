# player-profile

## 役割

PL の自己紹介プロフィール。character detail とは別に、卓前の相性確認や自己紹介共有に使う。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- blueskyProfileRef（任意: `app.bsky.actor.profile` の参照。通常は owner 自身）
- displayNameOverride（任意）
- descriptionOverride（任意）
- avatarOverrideRef（任意）
- bannerOverrideRef（任意）
- websiteOverride（任意）
- pronounsOverride（任意）
- roleDistribution（任意: PL --- 両方 --- GM の割合）
- playFormats（任意: string 配列）
- tools（任意: string 配列）
- ownedRulebooks (任意: 自由記述テキスト)
- playableTimeSummary（任意: 自由記述テキスト）
- preferredScenarioStyles（任意: string 配列）
- playStyles（任意: string 配列）
- boundaries（任意: string 配列）
- skills（任意: string 配列）
- createdAt
- updatedAt

## 更新主体

owner のみ。

## 参照関係

- app.bsky.actor.profile（fallback 表示元）
- character-branch（profile からの共有導線先）

## 設計上の注意

- `app.bsky.actor.profile` の既存項目（displayName、description、avatar、banner、website、pronouns）は、Cerulia 側の override が無い場合に fallback 表示する
- TRPG 固有項目はすべて任意。初回連携時に入力必須にしない
- `tools`、`preferredScenarioStyles`、`playStyles`、`boundaries`、`skills` は Lexicon 上では自由記述 string 配列とし、AppView のチェック項目は入力補助に留める
- `roleDistribution` は手動指定を基本とし、session 実績が十分（目安 10 件以上）ある時に Cerulia 側で自動比率適用を提案してよい
- player-profile は shared surface だが canonical shared root ではない。shared root は character detail に固定する
- follower / following や timeline のような social graph 情報は持たない
- public record であるため、保存する内容は public-safe に限る
