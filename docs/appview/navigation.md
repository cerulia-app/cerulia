# 遷移構造

## Route 方針

sign-in 後は character-first。anonymous では共有リンク経由のキャラクター閲覧と Cerulia の価値説明。

## Global Navigation

| 状態 | 表示 |
| --- | --- |
| anonymous | Cerulia (`/`)、Sign in |
| signed-in | Home、Characters、Scenarios、Sign out |

## Route tree

```
/                               public top
/home                           signed-in home（キャラクター一覧 + 最近の活動）
/characters                     キャラクター一覧
/characters/new                 キャラクター作成
/characters/:branchRef          キャラクター詳細
/characters/:branchRef/edit     キャラクター編集
/sessions/new                   セッション記録
/scenarios                      シナリオ一覧
/scenarios/new                  シナリオ登録
/scenarios/:scenarioRef         シナリオ詳細
/campaigns                      campaign 一覧
/campaigns/new                  campaign 作成
/campaigns/:campaignRef         campaign 詳細
/houses/new                     house 作成
/houses/:houseRef               house 詳細
/profile/:did                   他人の public profile（キャラクター一覧）
```

## 遷移の優先順位

1. `/home` → `/characters/new`（キャラクターを作る）
2. `/home` → `/characters/:branchRef`（キャラクターを見る）
3. `/home` → `/sessions/new`（セッション記録を残す）
4. `/scenarios/:scenarioRef` → `/characters/new`（シナリオからキャラ作成）
5. `/` → sign-in → `/home`（初回利用）
6. shared link → `/profile/:did` or `/characters/:branchRef`（共有経由の閲覧）

## Navigation 原則

- `/home` が signed-in の canonical landing
- anonymous の `/` は価値説明と sign-in CTA
- 共有リンクは anonymous でも見える（visibility: public のキャラクターのみ）
- route tree に `/sessions/*`（セッション進行画面）は持たない
