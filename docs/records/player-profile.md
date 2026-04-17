# player-profile

## 役割

PL の自己紹介プロフィール。character detail とは別に、卓前の相性確認や自己紹介共有に使う。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- blueskyProfileRef（任意: ownerDid が持つ `app.bsky.actor.profile` の at-uri。省略時は ownerDid から自動解決する。他の DID の profile は指定不可）
- displayNameOverride（任意）
- descriptionOverride（任意）
- avatarOverrideBlob（任意: blob）
- bannerOverrideBlob（任意: blob）
- websiteOverride（任意）
- pronounsOverride（任意）
- roleDistribution（任意: PL --- 両方 --- GM の割合）
- playFormats（任意: closed multi-select string 配列。有効値は `text` / `semi-text` / `voice` / `offline`）
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

- app.bsky.actor.profile（fallback 表示元。ownerDid の profile に限定）
- character-branch（profile からの共有導線先）

## 設計上の注意

- `app.bsky.actor.profile` の既存項目（displayName、description、avatar、banner、website、pronouns）は、Cerulia 側の override が無い場合に fallback 表示する
- `blueskyProfileRef` は ownerDid が持つ自分自身の `app.bsky.actor.profile` に限定する。他人の profile を指定してはならない。省略時は ownerDid から解決する
- `avatarOverrideBlob` と `bannerOverrideBlob` は blob 型であり、at-uri record 参照（`*Ref`）ではない
- TRPG 固有項目はすべて任意。初回連携時に入力必須にしない
- `tools`、`preferredScenarioStyles`、`playStyles`、`boundaries`、`skills` は Lexicon 上では自由記述 string 配列とし、AppView のチェック項目は入力補助に留める
- `playFormats` は closed multi-select とし、有効値（`text`、`semi-text`、`voice`、`offline`）以外は保存しない
- `roleDistribution` は手動指定を基本とし、session 実績が十分（目安 10 件以上）ある時に Cerulia 側で自動比率適用を提案してよい
- player-profile は shared surface だが canonical shared root ではない。shared root は character detail に固定する
- follower / following や timeline のような social graph 情報は持たない
- public record であるため、保存する内容は public-safe に限る
