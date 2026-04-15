# AppView Navigation

## current runtime

2026-04-14 のリセット時点で、現行 AppView の runtime surface は最小スケルトンだけです。

## 現在の導線

- `/`: reset 状態を示すトップページ

## target MVP route tree

| route | surface | 役割 |
| --- | --- | --- |
| `/` | public top | Cerulia の価値説明、共有キャラクターへの入口、サインイン導線 |
| `/home` | signed-in home | 継続作業、最近の記録、次にやること |
| `/characters` | owner-only | 自分の branch 一覧、draft 管理、作成導線 |
| `/characters/new` | owner-only | schema-backed create flow |
| `/characters/[branch]` | public + owner | canonical shared detail。owner には編集導線も出す |
| `/sessions` | owner-only | session workbench。一覧、inline detail、再編集 |
| `/sessions/new` | owner-only | session record create |
| `/scenarios` | public + owner | scenario catalog |
| `/scenarios/new` | owner / maintainer | scenario create |
| `/scenarios/[scenario]` | public | scenario detail |
| `/campaigns/new` | owner / maintainer | campaign create |
| `/campaigns/[campaign]` | public + owner / maintainer | campaign detail |
| `/houses/new` | owner / maintainer | house create |
| `/houses/[house]` | public + owner / maintainer | house detail |

## 明示的に置かない route

- public session 専用 route は置かない。public-safe な session 情報は character detail、campaign、house の surface に畳み込む
- プレイヤー単位の public profile / public character collection route は MVP に置かない
