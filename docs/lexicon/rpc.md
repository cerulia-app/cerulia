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
| message | string | no | human-readable short explanation |

## query contract

### app.cerulia.rpc.getCharacterHome

- auth: `app.cerulia.authCoreReader`
- params: `ownerDid` optional（未指定時は caller）
- output: `ownerDid`, `branches`, `recentSessions`
- public mode: visibility: public な branch と session のみ

### app.cerulia.rpc.getCharacterBranchView

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required
- output: `branch`, `sheet`, `recentSessions`, `advancements`, `conversions`

### app.cerulia.rpc.getCampaignView

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `campaignRef` required
- output: `campaign`, `sessions`, `ruleOverlay`

### app.cerulia.rpc.listScenarios

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（scenario summary row）

### app.cerulia.rpc.getScenarioView

- auth: anonymous read を許す
- params: `scenarioRef` required
- output: `scenario`, `sheetSchemaRefs`（manifest chain 経由で解決）

### app.cerulia.rpc.getHouseView

- auth: anonymous read を許す
- params: `houseRef` required
- output: `house`, `campaigns`, `sessions`

## procedure contract

### app.cerulia.rpc.createCharacterSheet

- input: `rulesetNsid`, `sheetSchemaRef?`, `displayName`, `portraitRef?`, `publicProfile?`, `stats?`, `visibility?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef]`
- note: sheet + default branch をペアで生成する

### app.cerulia.rpc.updateCharacterSheet

- input: `characterSheetRef`, `displayName?`, `portraitRef?`, `publicProfile?`, `stats?`, `visibility?`
- output: `emittedRecordRefs = [characterSheetRef]`

### app.cerulia.rpc.createCharacterBranch

- input: `baseSheetRef`, `branchKind`, `branchLabel`, `overridePayloadRef?`
- output: `emittedRecordRefs = [characterBranchRef]`
- note: 2 本目以降の branch を作る場合に使う

### app.cerulia.rpc.updateCharacterBranch

- input: `characterBranchRef`, `branchLabel?`, `overridePayloadRef?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`

### app.cerulia.rpc.retireCharacterBranch

- input: `characterBranchRef`
- output: `emittedRecordRefs = [characterBranchRef]`

### app.cerulia.rpc.recordCharacterAdvancement

- input: `characterBranchRef`, `advancementKind`, `deltaPayloadRef`, `sessionRef?`, `previousValues?`, `effectiveAt`, `note?`
- output: `emittedRecordRefs = [characterAdvancementRef]`

### app.cerulia.rpc.createSession

- input: `scenarioRef?`, `scenarioLabel?`, `characterBranchRef?`, `role`, `campaignRef?`, `playedAt`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
- output: `emittedRecordRefs = [sessionRef]`
- note: PL が自分の repo に作成する

### app.cerulia.rpc.createScenario

- input: `title`, `rulesetNsid?`, `summary?`, `spoilerRef?`
- output: `emittedRecordRefs = [scenarioRef]`

### app.cerulia.rpc.createCampaign

- input: `title`, `houseRef?`, `rulesetNsid`, `sharedRuleProfileRefs[]?`, `maintainerDids[]?`, `visibility?`
- output: `emittedRecordRefs = [campaignRef]`

### app.cerulia.rpc.createHouse

- input: `title`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `maintainerDids[]?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

### app.cerulia.rpc.recordCharacterConversion

- input: `sourceSheetRef`, `sourceBranchRef?`, `sourceRulesetNsid`, `targetSheetRef`, `targetBranchRef`, `targetRulesetNsid`, `conversionContractRef?`, `convertedAt`, `note?`
- output: `emittedRecordRefs = [characterConversionRef]`
