# cerulia-api

Cerulia backend の canonical write/read service repository。

- authoritative semantic validation を置くための共通基盤
- Bun self-host と Cloudflare Workers entrypoint
- core flow endpoint を載せるための transport/store boundary

## Current Shape

現在は API 基盤の scaffold 段階で、公開 route は health check のみです。次の方針に沿って domain endpoint を積み上げる。

- transport は Hono ベースの XRPC route
- storage は SQLite-first の record store abstraction
- auth は caller proof boundary を分離し、owner/public mode を API 側で決定
- schema / URI / owner consistency は API の semantic validation で再検証

## Development Auth Shim

OAuth 本実装の前段として、ローカル開発用 entrypoint では次の header resolver を opt-in で使う。

- `x-cerulia-did`: caller DID
- `x-cerulia-scopes`: comma separated scope list

有効な scope 名:

- `app.cerulia.authCoreReader`
- `app.cerulia.authCoreWriter`

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