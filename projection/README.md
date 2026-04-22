# cerulia-projection

Cerulia monorepo 内の optional projection and discovery package。

- scenario catalog
- campaign view
- house activity
- search and other derived read models

現在の bootstrap では scenario catalog を derived SQLite store に rebuild して提供する。

- self-host: `bun run --cwd=projection migrate` -> `bun run --cwd=projection dev`
- Workers: `bun run --cwd=projection dev:worker`
- seed repos: `CERULIA_PROJECTION_REPOS=did:plc:alice,did:plc:bob`
- internal repo ingest token: `CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN`