# 遷移構造

## Route 方針

sign-in 後は character-first。anonymous では共有リンク経由のキャラクター閲覧と Cerulia の価値説明。

## Global Navigation

| 状態 | 表示 |
| --- | --- |
| anonymous | Cerulia (`/`)、Sign in |
| signed-in | Home、Characters、Sessions、Scenarios、Sign out |

## Route tree

```
/                               public top
/home                           signed-in home（継続作業 + 最近の活動）
/characters                     キャラクター library
/characters/new                 キャラクター作成
/characters/:branchRef          キャラクター詳細
/characters/:branchRef/edit     キャラクター編集
/sessions                       自分のセッション一覧
/sessions/new                   セッション記録
/scenarios                      シナリオ一覧
/scenarios/new                  シナリオ登録
/scenarios/:scenarioRef         シナリオ詳細
/scenarios/:scenarioRef/edit    シナリオ編集（owner / maintainer）
/campaigns                      campaign 一覧
/campaigns/new                  campaign 作成
/campaigns/:campaignRef         campaign 詳細
/campaigns/:campaignRef/edit    campaign 編集（owner / maintainer）
/houses/new                     house 作成
/houses/:houseRef               house 詳細
/houses/:houseRef/edit          house 編集（owner / maintainer）
```

## 遷移の優先順位

1. `/home` → `/characters/new`（キャラクターを作る）
2. `/home` → `/characters/:branchRef`（キャラクターを見る）
3. `/home` or `/sessions` → `/sessions/new`（セッション記録を残す）
4. `recommendedSheetSchemaRef` を持つ `/scenarios/:scenarioRef` → `/characters/new`（シナリオからキャラ作成）
5. `/` → sign-in → `/home`（初回利用）
6. shared link → `/characters/:branchRef`（canonical shared route）

## Navigation 原則

- `/home` が signed-in の継続作業 dashboard
- `/characters` は branch library
- anonymous の `/` は価値説明と sign-in CTA
- 共有リンクの canonical surface は `/characters/:branchRef`
- MVP の core surface は home / characters / sessions / scenarios。campaign / house は secondary surface とする
- signed-in public viewer は anonymous と同じ public lens で shared surface を閲覧する
- route tree に session runtime 用の route は持たない。`/sessions` と `/sessions/new` は記録用 surface として置いてよい
- session detail / edit は MVP では `/sessions` 一覧内の inline detail で扱い、専用 route は置かない
- retired branch の `/characters/:branchRef` は branch が public の場合だけ read-only historical detail とし、edit CTA を出さない
- public session は embedded-only とし、standalone な public session route は持たない
- mutable な shared-maintained record は owner / maintainer 向け edit route を持つ
