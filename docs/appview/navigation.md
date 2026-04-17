# AppView Navigation

## target MVP route tree

| route | surface | 役割 |
| --- | --- | --- |
| `/` | public top | Cerulia の価値説明、共有キャラクターへの入口、サインイン導線 |
| `/home` | signed-in home | 継続作業、最近の記録、次にやること |
| `/characters` | owner-only | 自分の branch 一覧、draft 管理、作成導線 |
| `/characters/new` | owner-only | schema-backed create flow |
| `/characters/[branch]` | public + owner | canonical shared detail。owner には編集導線も出す |
| `/players/[did]` | public + owner | player profile。卓前の自己紹介と character detail への導線 |
| `/profile` | owner-only | 自分の player profile 編集 |
| `/sessions` | owner-only | session workbench。一覧、inline detail、再編集 |
| `/sessions/new` | owner-only | session record create |
| `/scenarios` | public + owner | scenario catalog |
| `/scenarios/new` | owner | scenario create |
| `/scenarios/[scenario]` | public + owner | scenario detail。owner には編集導線も出す |
| `/campaigns/new` | owner | campaign create |
| `/campaigns/[campaign]` | public + owner | campaign detail |
| `/houses/new` | owner | house create |
| `/houses/[house]` | public + owner | house detail |

## 明示的に置かない route

- public session 専用 route は置かない。public-safe な session 情報は character detail、campaign、house の surface に畳み込む
- canonical shared surface は character detail に固定する。player profile route は置くが、shared root は移さない

