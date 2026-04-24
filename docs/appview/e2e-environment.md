# AppView E2E テスト環境

## 目的

この文書は、Cerulia AppView の E2E テスト環境を 3 枠で固定する。

- Core: AppView の canonical flow を支える最小 self-host 構成
- Discovery: projection を含む公開一覧と catalog の構成
- OAuth smoke: OAuth route と browser session 境界の smoke 構成

この文書が固定する対象は、各枠の目的、起動するサーバー、認証モード、現在の smoke 対象、実行コマンドである。

## なぜ 3 枠に分けるか

AppView の設計では、最小 self-host 構成は AppView + API であり、projection は discovery 向けの optional extension である。OAuth はさらに別の失敗軸を持つため、通常の owner flow から分離した方が切り分けが明確になる。

1. Core は AppView + API だけで成立する flow を守る
2. Discovery は projection を追加したときだけ成立する flow を守る
3. OAuth smoke は OAuth route の存在と session 境界だけを薄く確認する

## 現在の前提

現時点の AppView 実装は最小スケルトンであり、route ごとの product behavior はまだ実装していない。そのため、先行して導入する E2E は correctness suite ではなく smoke suite として扱う。

現在の smoke suite は AppView product behavior を検証する test ではない。これらは E2E runner、server 起動、認証 mode 切り替え、projection 起動を先に固定するための疎通確認用 test である。

AppView 側の `+page.server.ts`、`+layout.server.ts`、route 実装、fixture seed path が揃い、route ごとの product behavior E2E を追加できる段階になったら、現在の `appview/e2e/**/smoke.spec.ts` は削除する。AppView test として残すべきなのは、AppView route が実際に API と projection を読み書きした結果を検証する test だけである。

現在の temporary smoke suite は次を確認する。

- AppView の built server が起動して `/` を返すこと
- API が suite ごとの認証モードで起動すること
- projection が suite ごとの mode で起動すること
- Core では header auth shim が有効であること
- Discovery では scenario catalog route と internal ingest guard が有効であること
- OAuth smoke では metadata、JWK、session route が有効であること

現在の readiness suite は、temporary smoke とは別に、AppView server 層が将来の route 実装に必要な橋渡しを既に持っていることを確認する。

- Core readiness: AppView server が owner auth cookie を読み、API の owner home を解決できること
- Discovery readiness: AppView server が projection catalog を解決できること
- OAuth readiness: AppView server が OAuth session payload を解決できること

将来、AppView 側の `+page.server.ts` と route 実装が揃ったら、temporary smoke suite は削除する。readiness suite も、同じ責務を実際の route behavior E2E が吸収したら削除してよい。

## Suite 一覧

| suite | 起動対象 | API auth mode | projection | 現在の smoke 対象 |
| --- | --- | --- | --- | --- |
| Core | AppView、API | header auth shim | なし | AppView `/`、API `/_health`、writer route の 401/400 分岐 |
| Discovery | AppView、API、projection | header auth shim | あり | AppView `/`、projection `scenario.list`、internal ingest 401 |
| OAuth smoke | AppView、API | OAuth runtime | なし | AppView `/`、`/client-metadata.json`、`/jwks.json`、`/oauth/session` |

readiness suite は次の route を使う。

- `/__e2e__/readiness/owner-home`
- `/__e2e__/readiness/scenario-catalog`
- `/__e2e__/readiness/oauth-session`

## 起動契約

### 共通

- runner は JavaScript で実装する
- runner は suite ごとに AppView、API、projection の必要なプロセスだけを起動する
- runner は readiness URL を polling してから Playwright を実行する
- runner は suite 開始前に suite 専用 SQLite file を削除する
- runner は Playwright 終了後に起動したプロセスを停止する

### AppView

- AppView は Vite dev server ではなく built server を使う
- runner は `bun run build` の成功を確認してから `bun run start` を起動する
- smoke suite の現段階では AppView は backend をまだ参照しない

### API

- Core と Discovery は `CERULIA_ENABLE_HEADER_AUTH_SHIM=1` を使う
- Core と Discovery の local E2E は test-only API entrypoint を使い、canonical data を local SQLite に直接書けるようにする
- OAuth smoke は `CERULIA_PUBLIC_BASE_URL` と固定 test JWK を使って OAuth runtime を起動する
- Discovery では projection ingest 用の base URL と token も API に渡す

### projection

- Discovery だけが projection を起動する
- Discovery の local E2E は test-only projection entrypoint を使い、API の local canonical SQLite を source として読む
- projection は `CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN` を受け取り、internal ingest route を公開する
- 現在の temporary smoke suite は catalog の件数を固定しない

## 実行コマンド

root workspace から実行する。

- `bun run test:e2e:core`
- `bun run test:e2e:discovery`
- `bun run test:e2e:oauth`
- `bun run test:e2e`

`bun run test:e2e` は 3 枠を順に実行する。

## agent 実行の前提

- agent は root workspace で上記コマンドをそのまま実行してよい
- 追加の手動サーバー起動は不要
- 初回に Playwright browser が未導入なら `bun x playwright install chromium` が必要になる

## 今後の拡張順序

1. Core に `/characters`、`/characters/new`、`/characters/[branch]` の route behavior test を追加する
2. Discovery に `/scenarios`、`/campaigns/[campaign]`、`/houses/[house]` の route behavior test を追加する
3. AppView route behavior test が置き換わった枠から、現在の `appview/e2e/**/smoke.spec.ts` を削除する
4. AppView route behavior test が置き換わった枠から、`appview/e2e/**/readiness.spec.ts` も削除する
5. OAuth smoke に AppView 側の sign-in 導線 test を追加する
6. performance rehearsal と low-bandwidth rehearsal は別枠のまま維持する