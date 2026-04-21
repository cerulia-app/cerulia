# テスト計画

この計画は TypeScript backend の `protocol`、`api`、`projection` を前提にした検証方針を定義する。

## 状態

`api` と `protocol` package には check / test 用 script が定義されている。`projection` は minimal package のままであり、この計画は bootstrap 後の target contract と current gate の両方を兼ねる。

branch-centered lineage に関する createBranch / recordConversion の項目は current gate である。docs / protocol / api の同期が崩れた場合は、この節のテストと review を両方で fail とみなす。

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
- semantic validation matrix test
	- createCharacterSheet で `sheetSchemaRef.baseRulesetNsid == rulesetNsid` を満たさない入力を reject すること
	- createCharacterSheet で schema-backed active sheet に `stats` を省略した入力を reject すること
	- createCharacterSheet / updateCharacterSheet / rebaseCharacterSheet で `stats` が active schema の `fieldDefs` に反する場合に reject すること
	- createCharacterBranch で sourceBranchRef が caller-owned でない場合と retired branch を source にした場合に reject すること
	- createCharacterBranch の accepted で source branch の current head を materialize した新しい target sheet と branch ref が返り、新 branch の `forkedFromBranchRef = sourceBranchRef` になること
	- createCharacterBranch で materialization 中に source branch record または source branch の current state が変わった場合に `rebase-needed` を返すこと
	- AT Protocol backend が repo-scope compare-and-swap しか提供しない場合、materialization fence は source branch と無関係な同 owner repo write でも保守的に `rebase-needed` へ倒してよいこと
	- recordCharacterConversion で `targetSheetSchemaRef.baseRulesetNsid != targetRulesetNsid` を reject すること
	- recordCharacterConversion で `targetRulesetNsid == source.rulesetNsid` を reject すること
	- recordCharacterConversion で backdated な `convertedAt`（latest conversion または current epoch の active advancement より canonical ordering で前または同順になるもの）を reject すること
	- recordCharacterConversion で retired branch を reject すること
	- recordCharacterConversion で `expectedRevision` が stale な場合に `rebase-needed` を返すこと
	- recordCharacterConversion で materialization 中に source branch record または source branch の current state が変わった場合に `rebase-needed` を返すこと
	- createCharacterSheet / updatePlayerProfile で caller-owned でない blob を reject すること
	- createScenario / updateScenario で `recommendedSheetSchemaRef.baseRulesetNsid != scenario.rulesetNsid` を reject すること
	- createCampaign / updateCampaign で `sharedRuleProfileRefs[*].baseRulesetNsid != campaign.rulesetNsid` を reject すること
	- createRuleProfile で caller-owned でない scopeRef を reject すること
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
- conversion が新しい target sheet を作り、same branch の head を更新する test
- conversion ack が `characterBranchRef` を含み、branch head 更新を caller が観測できる test
- parallel line を残したい場合は createCharacterBranch と recordCharacterConversion の組み合わせで表現できる test
- rule-profile の caller-owned scope invariant test
- OAuth BFF route と browser session cookie の integration test
- `retrain` / `respec` / `correction` で previousValues 必須、`milestone` / `xp-spend` で optional の test
- public URI field が credential-free 条件を満たさない場合に reject する test
- rules provenance record が public-only のままで visibility lifecycle に乗らない test
- public direct read が raw payload と owner-only linkage を返さない redaction shape test
- public redaction matrix を record 行単位で検証する test
	- character detail が summary shape のみ返し、owner-only field を含まないこと
	- character detail が draft child session を public summary に含めないこと
	- player profile が override + fallback 合成 shape のみ返し、credential-bearing URI を含まないこと
	- session / campaign / house 一覧が discovery summary のみ返すこと
	- scenario detail が summary + source citation のみ返すこと
	- rule-profile / character-sheet-schema が public-only canonical field のみ返すこと
	- owner workbench route が owner mode full payload を返し、同一 record の public route は summary shape に留まること
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
