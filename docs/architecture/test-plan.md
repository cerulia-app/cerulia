# テスト計画

この計画は TypeScript backend の `protocol`、`api`、`projection` を前提にした検証方針を定義する。

## 共通ゲート

各 backend repo は少なくとも次のコマンドを持つ。

- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`

`appview` は既存の check / lint / test / build を維持する。

## protocol の検証

- generated types が docs 正本と一致すること
- codec / parser / decoder が round-trip できること
- thin wrapper が service-specific な runtime 依存を持たないこと
- HTTP / DB / workflow dependency を持ち込まない boundary test があること

重点リスク:

- generated artifact と docs 正本の drift
- SDK wrapper への business logic 混入

## api の検証

- authoritative validation の unit test
- owner-only write authority の test
- permission bundle 解決と visibility 判定の test
- direct-ref public read と owner read の mode 差分 test
- SQLite migration test
- Bun entrypoint integration test
- Workers adapter smoke test

重点リスク:

- AppView preflight と API authoritative validation の不一致
- `projection` が無いときに canonical flow が壊れること

## projection の検証

- fold / replay の determinism test
- scenario catalog、campaign view、house activity の query test
- reverse index と draft 除外の test
- SQLite derived store rebuild test
- owner-only payload や auth secret を保持しない boundary test

重点リスク:

- derived view が canonical truth を上書きしたように振る舞うこと
- draft や owner-only 情報が public list に漏れること

## end-to-end ゲート

- `appview + api` だけで character create と session record が完了すること
- direct-link shared detail が `projection` なしでも解決すること
- `projection` 追加時に catalog / search / public list が増えること
- `projection` を停止しても owner flow と direct detail が維持されること

## self-host / deploy ゲート

- Bun self-host で file-backed SQLite が動くこと
- Workers deploy で D1 adapter が同じ domain rule を維持すること
- `api` と `projection` が別々にデプロイされても contract drift が起きないこと
