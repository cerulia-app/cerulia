# GCP Cloud Run + Neon + R2 ホスティング / 運用方針

## 目的

この文書は、Cerulia の product-core を GCP Cloud Run + Neon + Cloudflare R2 で長期運用するための、既定の配置構成、環境分離、周辺サービス、復旧方針を固定するための文書である。対象は continuity core の API と AppView であり、archive 側 workflow 専用の storage や runtime は前提にしない。

## 採用構成

| レイヤー | 採用 | 役割 |
| --- | --- | --- |
| edge / DNS | Cloud DNS + Google Cloud External HTTPS Load Balancer | `cerulia.app` の入口、TLS 終端、path routing |
| AppView | Cloud Run `appview` | SvelteKit BFF / SSR shell |
| API | Cloud Run `api` | Go 製 XRPC / 補助 HTTP |
| batch / ops | Cloud Run Jobs + Cloud Scheduler | migration、backup、projection rebuild、整合性検査 |
| database | Neon PostgreSQL | append-only ledger、current head、projection table、service log |
| object storage | Cloudflare R2 | portrait、import payload、contract artifact など immutable object の保管 |
| secret / config | Secret Manager | 機密値の集中管理 |
| build / release | GitHub Actions + Artifact Registry + Workload Identity Federation | build、deploy、promotion |
| observability | Cloud Logging、Cloud Monitoring、OpenTelemetry | 監視、アラート、調査 |

## 既定の公開境界

- `cerulia.app` と `www.cerulia.app` は AppView へ向ける
- `cerulia.app/xrpc/*` は API へ path routing する
- Cloud Run の直 URL は user-facing canonical URL にしない
- Cloud Run service の ingress は `internal-and-cloud-load-balancing` を基本にする

## コンポーネント責務

### Cloud Run `appview`

- SvelteKit adapter-node を載せる
- browser からの canonical entry とする
- privileged XRPC を browser から直接叩かせず、server load / action を通す
- OAuth session cookie、reader lens、error mapping、copy rule をここで閉じる
- DB へ直接はつながない。authoritative data は API を経由して得る

### Cloud Run `api`

- Go API 本体
- XRPC、supplemental HTTP、healthcheck を持つ
- Neon を唯一の authoritative DB とする
- object key の発行、upload finalize、reference 検証を担当する
- mutationAck、service log、current head 更新、必要最小限の projection 更新を 1 transaction で閉じる

### Neon PostgreSQL

- ledger kernel、projection table、service log の正本
- application path は pooled connection string を使う
- migration、rebuild、logical backup は direct connection string を使う
- branch は staging / restore drill / incident recovery のために使う

### Cloudflare R2

- object key は immutable にする。上書き更新を前提にしない
- browser upload は signed URL で直接 R2 へ流し、Cloud Run を file relay にしない
- public object bucket は day 1 では作らない。まずは private bucket + signed access で始める

### Cloud Run Jobs

最低限次を job 化する。

- `db-migrate`: schema migration 実行
- `db-backup-nightly`: `pg_dump` を R2 に保存
- `projection-rebuild`: projection 再構築と検証
- `blob-reference-scan`: dangling ref 検出

## 環境分離

| 環境 | 用途 | GCP | Neon | R2 | ドメイン |
| --- | --- | --- | --- | --- | --- |
| local | 日常開発、unit / integration test | なし。必要なら local process | dev project か dev branch | `cerulia-dev-content` | なし |
| staging | deploy rehearsal、migration rehearsal、smoke test | `cerulia-stg` | staging project か staging branch | `cerulia-stg-content` | `stg.cerulia.app` |
| prod | 本番 | `cerulia-prod` | prod project | `cerulia-prod-content` | `cerulia.app` |

preview 環境を branch ごとに量産する構成は取らない。少人数運用では、環境を増やすより local と staging を強くする方が保守が軽い。

## 主要 secret / config

| 種別 | 例 |
| --- | --- |
| app runtime | `APP_ENV`, `PUBLIC_BASE_URL`, `INTERNAL_API_BASE_URL`, `AUTH_TRUSTED_PROXY_HMAC_SECRET`, `AUTH_TRUSTED_PROXY_MAX_SKEW` |
| Neon pooled | `DATABASE_URL_POOLED` |
| Neon direct | `DATABASE_URL_DIRECT` |
| R2 | `R2_ACCOUNT_ID`, `R2_CONTENT_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| OAuth / auth | `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `SESSION_COOKIE_SECRET` |
| observability | `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL` |

`DATABASE_URL_DIRECT` は migration と backup job に限定し、通常の app traffic に使わない。`APP_ENV` は Cloud Run revision ごとに明示し、`api` では `AUTH_TRUSTED_PROXY_HMAC_SECRET` を Secret Manager から注入する。

## 運用ルール

- GitHub から prod への deploy は manual approval を必須にする
- long-lived な GCP service account key JSON は置かない
- logical backup を Neon branch の代用品にしない
- prod secret を staging / local と共有しない
- restore rehearsal を staging か一時 Neon branch で定期実施する

## 非目標

この文書は次を前提にしない。

- archive 側 workflow 専用の bucket 分割
- archive 側 runtime を product-core と同一 service に混在させること
- product route tree に存在しない surface を hosting 既定値へ持ち込むこと
