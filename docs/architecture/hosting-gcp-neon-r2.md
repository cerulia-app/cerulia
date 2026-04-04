# GCP Cloud Run + Neon + R2 ホスティング / 運用方針

## 目的

この文書は、Cerulia の product-core を GCP Cloud Run + Neon + Cloudflare R2 で長期運用するための、既定の配置構成、環境分離、周辺サービス、復旧方針を固定するための文書である。対象は continuity core の API と AppView であり、archive 側 workflow 専用の storage や runtime は前提にしない。

## 採用構成

| レイヤー | 採用 | 役割 |
| --- | --- | --- |
| edge / DNS | Cloud DNS + Google Cloud External HTTPS Load Balancer | `cerulia.app` の入口、TLS 終端、path routing |
| AppView | Cloud Run `appview` | SvelteKit BFF / SSR shell |
| API | Cloud Run `api` | Go 製 XRPC / 補助 HTTP |
| batch / ops | Cloud Run Jobs + Cloud Scheduler | migration 実行 |
| database | Neon PostgreSQL | append-only ledger、current head、projection table、service log |
| object storage | Cloudflare R2 | portrait、import payload、contract artifact など immutable object の保管 |
| secret / config | Secret Manager | 機密値の集中管理 |
| build / release | Artifact Registry + repo 外 CI/CD もしくは manual deploy 手順 | build、deploy、promotion |
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
- mutationAck、service log、current head 更新、必要最小限の projection 更新を 1 transaction で閉じる

### Neon PostgreSQL

- ledger kernel、canonical record、publication current head、service log の正本
- application path は pooled connection string を使う
- migration、rebuild、logical backup は direct connection string を使う
- branch は staging / restore drill / incident recovery のために使う

### Cloudflare R2

- object は immutable にする。上書き更新を前提にしない
- day 1 の product-core では 1 つの asset bucket だけを使う
- blob 操作の専用 API surface は current product scope に含めない

### Cloud Run Jobs

current repo が直接提供する job entrypoint は次である。

- `db-migrate`: schema migration 実行
- `projection-rebuild`: Cloud Run job label。実体は `go run ./cmd/rebuild` で、publication current head replay と主要 projection query replay の drift を検証する

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
| R2 | `R2_ACCOUNT_ID`, `R2_ASSET_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| OAuth / auth | `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `SESSION_COOKIE_SECRET` |
| observability | `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL` |

`DATABASE_URL_DIRECT` は migration と rebuild に限定し、通常の app traffic に使わない。`APP_ENV` は Cloud Run revision ごとに明示する運用を原則にし、未指定時は Cloud Run metadata から production を推定してもよい。`api` では `AUTH_TRUSTED_PROXY_HMAC_SECRET` を Secret Manager から注入する。

M1 backend の `api` が直接読む値は `APP_ENV`, `HTTP_ADDR`, `PUBLIC_BASE_URL`, `AUTH_TRUSTED_PROXY_HMAC_SECRET`, `AUTH_TRUSTED_PROXY_MAX_SKEW`, `DATABASE_*`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT`, `MIGRATIONS_DIR`, `BLOB_*`, `R2_*` に限る。`INTERNAL_API_BASE_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `SESSION_COOKIE_SECRET`, `OTEL_EXPORTER_OTLP_ENDPOINT` は AppView または将来の周辺 runtime 向け予約値であり、現 M1 backend では未使用である。

この repo 自体は deploy workflow 定義を持たない。CI/CD を使う場合も、この repo 外の automation か運用 runbook で supply する。

## Backend Final Gate checklist

- versioned contract artifact を `./scripts/contracts.ps1 -Version <version>` で出す
- `db-migrate` か `./scripts/migrate.ps1` で schema を揃える
- `projection-rebuild` か `./scripts/rebuild.ps1` を実行し、publication current head と主要 projection query replay が green であることを確認する
- `api` を起動し、`/readyz` が green になることを確認する
- `./scripts/smoke.ps1 -RulesetManifestRef <known-manifest-ref>` を実行し、anonymous public read と authenticated core mutation を通す。restore rehearsal では `-ReadOnly` を使わない
- restore rehearsal では staging 用の Neon branch か snapshot restore 後に、migration と smoke を同じ順で再実行する
- 実行結果を `final-gate-report-YYYY-MM-DD.md` のような証跡へ固定する

Neon branch restore 自体の automation はこの repo の責務に含めない。backend repo の Final Gate は migrate、rebuild、smoke の再現可能性までを固定し、staging / prod の restore drill はその外側の release / operations artifact として扱う。

## 運用ルール

- prod への deploy は automation の有無にかかわらず manual approval を必須にする
- long-lived な GCP service account key JSON は置かない
- prod secret を staging / local と共有しない

## 非目標

この文書は次を前提にしない。

- archive 側 workflow 専用の bucket 分割
- archive 側 runtime を product-core と同一 service に混在させること
- product route tree に存在しない surface を hosting 既定値へ持ち込むこと
