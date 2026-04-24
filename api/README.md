# cerulia-api

Cerulia backend の canonical write/read service repository。

- authoritative semantic validation を置くための共通基盤
- Bun self-host と Cloudflare Workers entrypoint
- core flow endpoint を載せるための transport/store boundary

## Current Shape

現在の Bun self-host entrypoint は Phase 2 の canonical path を持つ。

- transport は Hono ベースの XRPC route
- storage は SQLite-first の local mirror と AT Protocol repo write/read の boundary を分離する
- auth は AppView signed internal auth と mirrored OAuth session restore で caller proof boundary を確定し、owner/public mode を API 側で決定する
- schema / URI / owner consistency は API の semantic validation で再検証

`createApiApp` に渡す store は atomic multi-record write を持つ app composition 用 backend に限る。deployable entrypoint の supported write backend は AtprotoMirrorRecordStore とし、MemoryRecordStore / SqlRecordStore direct write は cache / test utility であって app runtime の supported path には含めない。

character-branch / character-conversion は current branch-centered contract だけを read/write する。api runtime は legacy shape の dual-read や backfill job を持たないため、既存の legacy branch / conversion data を継続利用する場合は deploy 前に operator が手動 migration または再作成を行う。

Bun / Workers entrypoint で AppView OAuth 連携を有効にした場合、API は browser-facing OAuth route を公開しない。代わりに AppView が同期する internal route を公開する。

- `/internal/oauth/session` `POST`
- `/internal/oauth/session?did=<did>` `DELETE`

## Development Auth Shim

OAuth を設定しないローカル開発、または `CERULIA_ENABLE_HEADER_AUTH_SHIM=1` を有効にした Bun entrypoint では、次の header resolver を opt-in で使える。

- `x-cerulia-did`: caller DID
- `x-cerulia-scopes`: comma separated scope list

有効な scope 名:

- `app.cerulia.dev.authCoreReader`
- `app.cerulia.dev.authCoreWriter`

bare な `app.cerulia.auth*` scope 名は互換入力として受け入れるが、運用上の canonical source-of-truth は `app.cerulia.dev.auth*` とする。

## OAuth Setup

`.env.example` を `api/.env` にコピーしてから値を埋めると、Bun self-host の起動前提を揃えやすい。

AppView BFF 連携を有効にする Bun entrypoint では、少なくとも次を設定する。

- `CERULIA_APPVIEW_PUBLIC_BASE_URL`: AppView が公開する HTTPS base URL
- `CERULIA_OAUTH_PRIVATE_JWK`: confidential client 用 private JWK JSON
- `CERULIA_APPVIEW_INTERNAL_AUTH_SECRET`: AppView signed internal auth 用 shared secret

任意設定:

- `CERULIA_API_DB`: SQLite file path
- `CERULIA_OAUTH_CLIENT_NAME`: client metadata の表示名
- `CERULIA_DOH_ENDPOINT`: public read 用の DoH endpoint
- `CERULIA_ENABLE_HEADER_AUTH_SHIM=1`: AppView signed internal auth と並行して local header shim を許可する

Workers では同じ `CERULIA_*` 名を Wrangler の `vars` / `secrets` として設定する。`DB` は environment variable ではなく D1 binding なので、`wrangler.toml` を正本にする。

## Scripts

- `bun run dev`
- `bun run dev:worker`
- `bun run migrate`
- `bun run migrate:d1:local`
- `bun run migrate:d1:remote`
- `bun run build`
- `bun run test`
- `bun run check`

## Migration

ランタイムは起動時に migration を実行しない。SQLite / D1 の schema 更新は deploy 前に script として明示的に実行する。

- Bun self-host: `bun run migrate`
- Cloudflare D1 local: `bun run migrate:d1:local`
- Cloudflare D1 remote: `bun run migrate:d1:remote`

monorepo では root Bun workspace が `@cerulia/protocol` を解決する。local link 用の補助 script は使わない。

## Workers

Cloudflare Workers entrypoint は `wrangler.toml` を正本にする。`[[d1_databases]]` の `database_id` は実環境の値に置き換えてから deploy する。