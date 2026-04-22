# cerulia-projection

Cerulia monorepo 内の optional projection and discovery package。

- scenario catalog
- campaign view
- house activity
- search and other derived read models

現在の bootstrap では scenario catalog を derived SQLite store から提供する。

- Bun/self-host は pinned public adapter で seeded repo を rebuild できる
- Workers は injected canonical source がある場合だけ startup rebuild と internal ingest を有効にする
- injected canonical source が無い Workers は cached catalog だけを提供する

- self-host: `bun run --cwd=projection migrate` -> `bun run --cwd=projection dev`
- Workers: `bun run --cwd=projection dev:worker`
- seed repos: `CERULIA_PROJECTION_REPOS=did:plc:alice,did:plc:bob`
- internal repo ingest token: `CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN`