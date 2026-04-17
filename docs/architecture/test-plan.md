# テスト計画

この計画は TypeScript backend の `protocol`、`api`、`projection` を前提にした検証方針を定義する。

## 状態

この workspace skeleton の `api`、`projection`、`protocol` package には、まだ共通ゲート用の script が定義されていない。以下は bootstrap 後に各 repo が満たすべき required gate であり、現時点では aspirational list ではなく target contract として扱う。

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
- createCharacterSheet が sheet と default `main` branch をペア生成する test
- permission bundle 解決と visibility 判定の test
- mutation result contract が `accepted` / `rejected` / `rebase-needed` に閉じていることの test
- direct-ref public read と owner read の mode 差分 test
- getPlayerProfileView が owner mode / public mode で異なる summary shape を返す test
- scenario.recommendedSheetSchemaRef と rulesetNsid の整合 test
- scenario / campaign / house の mutable update contract test
- player-profile の `literal:self` upsert と Bluesky fallback / Cerulia override 合成の test
- archived campaign が archive 以外の mutable update を拒否する test
- same-owner conversion の許可と cross-owner conversion の拒否 test
- rule-profile の caller-owned scope invariant test
- `retrain` / `respec` / `correction` で previousValues 必須、`milestone` / `xp-spend` で optional の test
- public URI field が credential-free 条件を満たさない場合に reject する test
- rules provenance record が public-only のままで visibility lifecycle に乗らない test
- public direct read が raw payload と owner-only linkage を返さない redaction shape test
- SQLite migration test
- Bun entrypoint integration test
- Workers adapter smoke test

重点リスク:

- AppView preflight と API authoritative validation の不一致
- `projection` が無いときに canonical flow が壊れること

## projection の検証

- fold / replay の determinism test
- scenario catalog、campaign view、house activity の query test
- player profile summary と public branch link の query test
- reverse index と draft 除外の test
- SQLite derived store rebuild test
- owner-only payload や auth secret を保持しない boundary test
- public summary fixture から raw payload field が欠落していることの test

重点リスク:

- derived view が canonical truth を上書きしたように振る舞うこと
- draft や owner-only 情報が public list に漏れること

## end-to-end ゲート

- `appview + api` だけで character create と session record が完了すること
- direct-link shared detail が `projection` なしでも解決すること
- `/players/[did]` が `projection` なしでも `api` の direct read で解決すること
- public session 専用 route を持たず、public-safe な session 情報が character detail / campaign / house にだけ出ること
- draft record は一覧から隠れ、direct link では draft state を明示して解決すること
- scenario に recommendedSheetSchemaRef が無い場合、scenario 起点の create CTA を出さないこと
- AppView の `pending` state が accepted 前に確定状態として露出しないこと
- public direct read と projection summary が不一致でも canonical detail は `api` を正本にすること
- owner read と public read の payload shape 差分が route で崩れないこと
- `projection` 追加時に catalog / search / public list が増えること
- `projection` を停止しても owner flow と direct detail が維持されること

## service-level non-functional rehearsal

- browser-level の自動検証が入るまでは、この section は release gate ではなく rehearsal として扱う
- warm path の public character detail が 0.3 秒以内を目標に測定できること
- warm path の owner list と save 完了表示が 0.5 秒以内を目標に測定できること
- 低速回線の条件でプロフィールと structured stats が portrait より先に見えること
- public direct detail は短時間 stale を許容しても direct link が安定して開けること
- public から draft への visibility 変更時に stale public detail を返さないこと
- ブラウザレベルの遅延注入や帯域制御下で、pending 表示、text-first 表示、stale direct link の rehearsal ができること
- 画像遅延時でも大きな layout shift を起こさないことを rehearsal で確認できること
- 初期 self-host 構成で構造化ログが取れること

## self-host / deploy ゲート

- Bun self-host で file-backed SQLite が動くこと
- Workers deploy で D1 adapter が同じ domain rule を維持すること
- `api` と `projection` が別々にデプロイされても contract drift が起きないこと
- `api` と `projection` の summary shape contract を snapshot または version matrix で比較できること
