# XRPC と transport schema

XRPC 系は app.cerulia.rpc.* にまとめる。

## 共通ルール

- query は GET + Lexicon params、procedure は POST + application/json input / output
- list query は `limit` と `cursor` を共通で受ける。`limit` の既定値は 50、最大は 100
- domain-level result は `200 OK + mutationAck` に統一し、malformed request / auth failure / endpoint not found だけを XRPC error にする

## 共通 error 名

| error | 用途 |
| --- | --- |
| InvalidRequest | required params の欠落、schema 不正 |
| Unauthorized | 認証が必要 |
| Forbidden | OAuth bundle はあるが呼び出し権限がない |
| NotFound | 参照先が存在しない |
| InternalError | service 側障害 |

## mutationAck schema

| field | type | required | notes |
| --- | --- | --- | --- |
| resultKind | string | yes | accepted / rejected / rebase-needed |
| emittedRecordRefs | array&lt;at-uri&gt; | no | accepted で永続 record を出した場合のみ |
| reasonCode | string | no | machine-readable stable failure category |
| correlationId | string | no | support / log correlation 用の request identifier |
| message | string | no | human-readable short explanation |

推奨 `reasonCode` は `forbidden-owner-mismatch`, `invalid-required-field`, `invalid-exactly-one`, `invalid-schema-link`, `rebase-required` とする。

## query contract

### app.cerulia.rpc.getCharacterHome

- auth: `app.cerulia.authCoreReader`
- params: none
- output: `ownerDid`, `branches`, `recentSessions`

owner-only query。public / anonymous には公開しない。

### app.cerulia.rpc.getCharacterBranchView

- auth: owner は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく read を許す
- params: `characterBranchRef` required
- output: `branch`, `sheet`, `recentSessions`, `advancements`, `conversions`

draft branch も direct ref があれば解決するが、response に `visibility` を含めて AppView が draft state を表示する。public / anonymous mode では draft child を畳み込まず、advancement / conversion は public-safe subset だけを返す。

### app.cerulia.rpc.getCampaignView

- auth: owner / maintainer は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく read を許す
- params: `campaignRef` required
- output: `campaign`, `sessions`, `ruleOverlay`

draft campaign も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child session を返さない。

### app.cerulia.rpc.listScenarios

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（scenario summary row）

### app.cerulia.rpc.getScenarioView

- auth: anonymous read を許す
- params: `scenarioRef` required
- output: `scenario`

recommendedSheetSchemaRef が無い scenario は browse-only とし、create flow 用の deterministic schema 解決結果を返さない。

### app.cerulia.rpc.listCharacterSheetSchemas

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（character-sheet-schema summary row）

generic create flow は rulesetNsid ごとに schema 一覧を取得し、caller が明示選択する。

### app.cerulia.rpc.getCharacterSheetSchema

- auth: anonymous read を許す
- params: `characterSheetSchemaRef` required
- output: `characterSheetSchema`

### app.cerulia.rpc.listSessions

- auth: `app.cerulia.authCoreReader`
- params: `limit`, `cursor`
- output: `items`（caller 自身の session summary row）

owner-only query。`/sessions` 一覧のために使う。

### app.cerulia.rpc.getSessionView

- auth: `app.cerulia.authCoreReader`
- params: `sessionRef` required
- output: `session`

owner-only query。`/sessions` 一覧内の inline detail / edit のために使う。

### app.cerulia.rpc.getHouseView

- auth: owner / maintainer は `app.cerulia.authCoreReader`。signed-in public viewer と anonymous は direct ref があれば visibility に関係なく read を許す
- params: `houseRef` required
- output: `house`, `campaigns`, `sessions`

draft house も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child campaign / session を返さない。

## procedure contract

### app.cerulia.rpc.createCharacterSheet

- auth: `app.cerulia.authCoreWriter`
- input: `rulesetNsid`, `sheetSchemaRef?`, `displayName`, `portraitRef?`, `profileSummary?`, `stats?`, `initialBranchVisibility?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef]`
- note: sheet + default branch をペアで生成する。default branch には `branchKind = main` を使い、`initialBranchVisibility` を seed する

`sheetSchemaRef` を渡す場合、schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。
`sheetSchemaRef` を渡す場合、server は fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。AppView の検証は preflight であり、server validation を代替しない。

### app.cerulia.rpc.updateCharacterSheet

- auth: `app.cerulia.authCoreWriter`
- input: `characterSheetRef`, `displayName?`, `portraitRef?`, `profileSummary?`, `stats?`
- output: `emittedRecordRefs = [characterSheetRef]`

### app.cerulia.rpc.rebaseCharacterSheet

- auth: `app.cerulia.authCoreWriter`
- input: `characterSheetRef`, `targetSheetSchemaRef`, `stats?`, `note?`
- output: `emittedRecordRefs = [characterSheetRef]`

schema pin を変更する dedicated operation。stats の移行が必要だが入力が不足する場合は `rebase-needed` を返してよい。

`targetSheetSchemaRef.baseRulesetNsid` は target sheet の `rulesetNsid` と一致しなければならない。
server は target schema の fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。

### app.cerulia.rpc.createCharacterBranch

- auth: `app.cerulia.authCoreWriter`
- input: `baseSheetRef`, `branchKind`, `branchLabel`, `overridePayloadRef?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`
- note: 2 本目以降の branch を作る場合に使う。`branchKind = main` は createCharacterSheet が生成する default branch 専用

### app.cerulia.rpc.updateCharacterBranch

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`, `branchLabel?`, `overridePayloadRef?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`

### app.cerulia.rpc.retireCharacterBranch

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`
- output: `emittedRecordRefs = [characterBranchRef]`

### app.cerulia.rpc.recordCharacterAdvancement

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`, `advancementKind`, `deltaPayloadRef`, `sessionRef?`, `previousValues?`, `effectiveAt`, `note?`
- output: `emittedRecordRefs = [characterAdvancementRef]`

### app.cerulia.rpc.createSession

- auth: `app.cerulia.authCoreWriter`
- input:
	- common: `characterBranchRef?`, `role`, `campaignRef?`, `playedAt`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
	- scenario identity: exactly one of `scenarioRef` or `scenarioLabel`
- output: `emittedRecordRefs = [sessionRef]`
- note: PL が自分の repo に作成する

`hoLabel` と `hoSummary` は Handout Overview の略で、spoiler-safe な公開ラベルだけを扱う。secret disclosure や handout payload は product-core に入れない。
`role = pl` のときは `characterBranchRef` 必須。`role = gm` のときは省略してよい。

### app.cerulia.rpc.updateSession

- auth: `app.cerulia.authCoreWriter`
- input: `sessionRef`, `scenarioRef?`, `scenarioLabel?`, `characterBranchRef?`, `role?`, `campaignRef?`, `playedAt?`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
- output: `emittedRecordRefs = [sessionRef]`

`scenarioRef` と `scenarioLabel` を更新する場合も、結果は exactly one を満たさなければならない。
`role = pl` の結果になるときは `characterBranchRef` 必須。`role = gm` の結果になるときは省略してよい。

### app.cerulia.rpc.createScenario

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `rulesetNsid?`, `recommendedSheetSchemaRef?`, `sourceCitationUri?`, `summary?`, `spoilerRef?`, `maintainerDids[]?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaRef` がある場合、`rulesetNsid` は必須であり、その schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。

### app.cerulia.rpc.updateScenario

- auth: `app.cerulia.authCoreWriter`
- input: `scenarioRef`, `title?`, `rulesetNsid?`, `recommendedSheetSchemaRef?`, `sourceCitationUri?`, `summary?`, `spoilerRef?`, `maintainerDids[]?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaRef` を持つ結果になる場合、`rulesetNsid` を必須とし、schema の `baseRulesetNsid` と一致しなければならない。`recommendedSheetSchemaRef` を省略した scenario は browse-only のままとする。

### app.cerulia.rpc.createCampaign

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `houseRef?`, `rulesetNsid`, `sharedRuleProfileRefs[]?`, `maintainerDids[]?`, `visibility?`
- output: `emittedRecordRefs = [campaignRef]`

### app.cerulia.rpc.updateCampaign

- auth: `app.cerulia.authCoreWriter`
- input: `campaignRef`, `title?`, `houseRef?`, `rulesetNsid?`, `sharedRuleProfileRefs[]?`, `maintainerDids[]?`, `visibility?`, `archivedAt?`
- output: `emittedRecordRefs = [campaignRef]`

### app.cerulia.rpc.createHouse

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `maintainerDids[]?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

### app.cerulia.rpc.updateHouse

- auth: `app.cerulia.authCoreWriter`
- input: `houseRef`, `title?`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `maintainerDids[]?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

### app.cerulia.rpc.createRuleProfile

- auth: `app.cerulia.authCoreWriter`
- input: `baseRulesetNsid`, `profileTitle`, `scopeKind`, `scopeRef`, `rulesPatchUri`, `maintainerDids[]?`
- output: `emittedRecordRefs = [ruleProfileRef]`

### app.cerulia.rpc.updateRuleProfile

- auth: `app.cerulia.authCoreWriter`
- input: `ruleProfileRef`, `profileTitle?`, `rulesPatchUri?`, `maintainerDids[]?`
- output: `emittedRecordRefs = [ruleProfileRef]`

### app.cerulia.rpc.createCharacterSheetSchema

- auth: `app.cerulia.authCoreWriter`
- input: `baseRulesetNsid`, `schemaVersion`, `title`, `fieldDefs`, `maintainerDids[]?`
- output: `emittedRecordRefs = [characterSheetSchemaRef]`

### app.cerulia.rpc.recordCharacterConversion

- auth: `app.cerulia.authCoreWriter`
- input: `sourceSheetRef`, `sourceBranchRef`, `sourceRulesetNsid`, `targetSheetRef`, `targetBranchRef`, `targetRulesetNsid`, `conversionContractRef?`, `convertedAt`, `note?`
- output: `emittedRecordRefs = [characterConversionRef]`
