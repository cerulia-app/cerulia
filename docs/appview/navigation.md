# AppView Navigation

## target MVP route tree

| route | surface | 役割 |
| --- | --- | --- |
| `/` | public top | Cerulia の価値説明、共有キャラクターへの入口、サインイン導線 |
| `/home` | signed-in home | 継続作業、最近の記録、次にやること |
| `/profile/[actor]` | public + owner | プロフィールページ。`actor` は DID または handle。自分の actor なら owner mode（draft 含む、編集導線あり）、他人の actor なら public mode |
| `/profile/[actor]/edit` | owner-only | プロフィール編集（自分のみ。デスクトップのみ遷移。モバイルは `/profile/[actor]` から直接ボトムシートを開く）|
| `/characters/new` | owner-only | schema-backed create flow |
| `/characters/[branch]` | public + owner | canonical shared detail。キャラクター自体の共有が主目的のため独立ページとする |
| `/characters/[branch]/edit` | owner-only | character 編集 |

## 専用 route を持たない surface（サイドペイン / ボトムシートで完結）

すべて `/profile/[actor]` のタブ、`/home`、または作成メニューから開く。

- **セッション**: 作成・詳細・編集はすべて右サイドペイン（デスクトップ）/ モーダルボトムシート（モバイル）
- **シナリオ**: 作成・詳細・編集は同上
- **キャンペーン**: 同上
- **ハウス**: 同上。ハウスルールはハウスペイン内にサブセクションとして展開する

## 明示的に置かない route

- public session 専用 route は置かない。public-safe な session 情報は character detail に畳み込む
- canonical shared surface は character detail に固定する。`/profile/[actor]` は同格に近い共有面として扱うが、shared root は移さない
- `/characters`（owner-only キャラ一覧）は `/profile/[actor]` のキャラクタータブに統合する
- `/scenarios`、`/scenarios/[scenario]`、`/scenarios/[scenario]/schema`、`/houses/[house]`、`/houses/[house]/rules` を含む一切の scenario / house 専用 route は作らない
- `/sessions`、`/campaigns/*` は作らない
- `/players/[did]` は作らない。プロフィール共有面は `/profile/[actor]` に固定する

## 導線・インタラクション詳細

[interaction-design.md](interaction-design.md) を参照する。

