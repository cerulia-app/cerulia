# XRPC と transport schema

XRPC 系は domain-scoped NSID families (app.cerulia.character.*, app.cerulia.session.*, app.cerulia.actor.*, app.cerulia.campaign.*, app.cerulia.house.*, app.cerulia.scenario.*, app.cerulia.rule.*) にまとめる。

## 共通ルール

- query は GET + Lexicon params、procedure は POST + application/json input / output
- list query は `limit` と `cursor` を共通で受ける。`limit` の既定値は 50、最大は 100
- domain-level result は `200 OK + mutationAck` に統一し、malformed request / auth failure / endpoint not found / service-side internal failure だけを XRPC error にする
- public-safe text と credential-free URI のポリシー正本は architecture / records 文書に置く。rpc.md では transport 上の要求だけを記述する
- owner mode と public / anonymous mode の両方を持つ query は、同じ record を返しても同じ payload shape を返さない。public mode は summary view に閉じ、owner-only field、raw payload、internal linkage を含めない

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

推奨 `reasonCode` は `forbidden-owner-mismatch`, `invalid-required-field`, `invalid-exactly-one`, `invalid-schema-link`, `invalid-public-uri`, `rebase-required`, `terminal-state-readonly` とする。

## query contract

### app.cerulia.character.getHome

- auth: `app.cerulia.authCoreReader`
- params: none
- output: `ownerDid`, `branches`, `recentSessions`

owner-only query。public / anonymous には公開しない。

### app.cerulia.character.getBranchView

- auth: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `characterBranchRef` required
- output:
	- owner mode: `branch`, `sheet`, `recentSessions`, `advancements`, `conversions`
	- public / anonymous mode: `branchSummary`, `sheetSummary`, `recentSessionSummaries`, `advancementSummaries`, `conversionSummaries`

draft branch も direct ref があれば解決するが、response に `visibility` を含めて AppView が draft state を表示する。public / anonymous mode では draft child を畳み込まず、`note`、`deltaPayload`、`previousValues`、`overridePayload`、`characterBranchRef` のような raw payload / linkage field を返さない。

### app.cerulia.actor.getProfileView

- auth: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしで direct DID read を許す
- params: `did` required
- output:
	- owner mode: `profile`, `blueskyFallbackProfile`, `publicBranches`
	- public / anonymous mode: `profileSummary`, `publicBranches`

`did` は owner repo の `app.cerulia.core.playerProfile/self` を解決するために使う。profile record が無い場合も、ownerDid に紐づく `app.bsky.actor.profile` fallback だけで public summary を返してよい。Cerulia override がある項目だけを fallback より優先する。
fallback 由来の field も public-safe 条件を満たすものだけを返す。`website` は credential-free 公開 URI 条件を満たさない場合、summary から省略する。
`publicBranches` は link-only summary row に固定し、`characterBranchRef`、`displayName`、`branchLabel`、`rulesetNsid` だけを返す。owner-only linkage や raw payload は含めない。

### app.cerulia.campaign.getView

- auth: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `campaignRef` required
- output:
	- owner mode: `campaign`, `sessions`, `ruleOverlay`
	- public / anonymous mode: `campaignSummary`, `sessionSummaries`, `ruleOverlaySummary`

draft campaign も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child session を返さず、owner-only linkage や raw rule-profile payload を返さない。
`sessionSummaries` の public-safe field には `externalArchiveUris` を含めてよい。

### app.cerulia.scenario.list

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（scenario summary row）, `cursor?`

scenario summary row は `hasRecommendedSheetSchema` を返し、AppView が browse-only と createable を分岐できるようにする。

### app.cerulia.scenario.getView

- auth: anonymous read を許す
- params: `scenarioRef` required
- output: `scenarioSummary`

recommendedSheetSchemaRef が無い scenario は browse-only とし、create flow 用の deterministic schema 解決結果を返さない。public summary は `hasRecommendedSheetSchema` を返して create CTA の可否を表現する。

### app.cerulia.rule.listSheetSchemas

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（character-sheet-schema summary row）, `cursor?`

generic create flow は rulesetNsid ごとに schema 一覧を取得し、caller が明示選択する。summary row の短い説明は追加の free-text field を持たず、schema metadata から導出してよい。

### app.cerulia.rule.getSheetSchema

- auth: anonymous read を許す
- params: `characterSheetSchemaRef` required
- output: `characterSheetSchema`

### app.cerulia.session.list

- auth: `app.cerulia.authCoreReader`
- params: `limit`, `cursor`
- output: `items`（caller 自身の session summary row）, `cursor?`

owner-only query。`/sessions` 一覧のために使う。

### app.cerulia.session.getView

- auth: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `sessionRef` required
- output:
	- owner mode: `session`
	- public / anonymous mode: `sessionSummary`（public-safe fields only, `visibility` を含む）

owner workbench の inline detail / edit と、public surface へ埋め込む summary 解決に使う。standalone な public session root は持たない。

### app.cerulia.house.getView

- auth: owner mode は `app.cerulia.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `houseRef` required
- output:
	- owner mode: `house`, `campaigns`, `sessions`
	- public / anonymous mode: `houseSummary`, `campaignSummaries`, `sessionSummaries`

draft house も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child campaign / session を返さず、draft house を参照する public campaign からは house identity を省略してよい。
`sessionSummaries` の public-safe field には `externalArchiveUris` を含めてよい。

### app.cerulia.rule.listProfiles

- auth: `app.cerulia.authCoreReader`
- params: `scopeRef` optional, `baseRulesetNsid` optional, `limit`, `cursor`
- output: `items`（rule-profile summary row）, `cursor?`

owner 向けの rule-profile 読取一覧。public surface は getCampaignView / getHouseView に畳み込まれた rule overlay summary を使い、raw profile read に依存しない。

### app.cerulia.rule.getProfile

- auth: `app.cerulia.authCoreReader`
- params: `ruleProfileRef` required
- output: `ruleProfile`

owner 向けの rule-profile canonical read。public surface は raw profile を直接返さない。

## procedure contract

### app.cerulia.character.createSheet

- auth: `app.cerulia.authCoreWriter`
- input: `rulesetNsid`, `sheetSchemaRef`, `displayName`, `portraitBlob?`, `profileSummary?`, `stats?`, `initialBranchVisibility?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef]`
- note: sheet + default branch をペアで生成する。default branch には `branchKind = main` を使い、`initialBranchVisibility` を seed する

server は create 時に `character-sheet.version = 1` を設定する。

`sheetSchemaRef` は active create contract では必須とする。schema-less create は legacy/import/recovery の historical data intake として別経路で扱い、この procedure には含めない。

`sheetSchemaRef` を渡す場合、schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。
`sheetSchemaRef` を渡す場合、server は fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。AppView の検証は preflight であり、server validation を代替しない。
`portraitBlob` を渡す場合、caller repo で upload された blob metadata でなければならない。外部 URL や他 actor repo の blob 参照は受け付けない。

### app.cerulia.character.updateSheet

- auth: `app.cerulia.authCoreWriter`
- input: `characterSheetRef`, `expectedVersion`, `displayName?`, `portraitBlob?`, `profileSummary?`, `stats?`
- output: `emittedRecordRefs = [characterSheetRef]`

accepted な update は `character-sheet.version` を 1 ずつ増やす。
`expectedVersion` は caller が編集基準にした sheet version を表す。最新 version と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.character.rebaseSheet

- auth: `app.cerulia.authCoreWriter`
- input: `characterSheetRef`, `expectedVersion`, `targetSheetSchemaRef`, `stats?`, `note?`
- output: `emittedRecordRefs = [characterSheetRef]`

schema pin を変更する dedicated operation。stats の移行が必要だが入力が不足する場合は `rebase-needed` を返してよい。

`targetSheetSchemaRef.baseRulesetNsid` は target sheet の `rulesetNsid` と一致しなければならない。
server は target schema の fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。
accepted な rebase は `character-sheet.version` を 1 ずつ増やす。
`expectedVersion` は caller が rebase 基準にした sheet version を表す。最新 version と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.character.createBranch

- auth: `app.cerulia.authCoreWriter`
- input: `baseSheetRef`, `branchKind`, `branchLabel`, `overridePayload?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`
- note: 2 本目以降の branch を作る場合に使う。`branchKind = main` は createCharacterSheet が生成する default branch 専用であり、`campaign-fork` と `local-override` は用途ラベルであって canonical root を置き換えない

`baseSheetRef` の ownerDid は callerDid と一致しなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`overridePayload` を使う場合、それは active schema の fieldId / group key に沿う public-safe な inline object に限る。payload 専用 record や owner-only sidecar を参照してはならない。

### app.cerulia.character.updateBranch

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`, `expectedRevision`, `branchLabel?`, `overridePayload?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`

retiredAt が設定された branch への mutation は `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。
`overridePayload` を更新する場合も、active schema の fieldId / group key に沿う public-safe な inline object に限る。
`expectedRevision` は caller が編集基準にした branch revision を表す。最新 revision と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.character.retireBranch

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`, `expectedRevision`
- output: `emittedRecordRefs = [characterBranchRef]`

すでに retiredAt が設定された branch に対しては `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。
`expectedRevision` は caller が retire 基準にした branch revision を表す。最新 revision と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.character.recordAdvancement

- auth: `app.cerulia.authCoreWriter`
- input: `characterBranchRef`, `advancementKind`, `deltaPayload`, `sessionRef?`, `previousValues?`, `effectiveAt`, `note?`
- output: `emittedRecordRefs = [characterAdvancementRef]`

`deltaPayload` と `previousValues` は公開前提の public-safe inline payload として扱う。hidden correction memo や owner-only 情報は入れない。
`advancementKind` が `retrain`、`respec`、`correction` の場合、`previousValues` は必須とする。`milestone` と `xp-spend` では省略してよい。

### app.cerulia.session.create

- auth: `app.cerulia.authCoreWriter`
- input:
	- common: `characterBranchRef?`, `role`, `campaignRef?`, `playedAt`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
	- scenario identity: exactly one of `scenarioRef` or `scenarioLabel`
- output: `emittedRecordRefs = [sessionRef]`
- note: PL が自分の repo に作成する

`hoLabel` と `hoSummary` は Handout Overview の略で、spoiler-safe な公開ラベルだけを扱う。secret disclosure や handout payload は product-core に入れない。
`role = pl` のときは `characterBranchRef` 必須。`role = gm` のときは省略してよい。
`characterBranchRef` を渡す場合、その branch の ownerDid は callerDid と一致しなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`externalArchiveUris` は credential-free な公開 URI に限る。署名付き query や閲覧 token を含む URL は `resultKind = rejected` と `reasonCode = invalid-public-uri` を返す。
AT Protocol lexicon は exactly-one / conditional required を型として直接表現できないため、これらの条件は authoritative validation（protocol validator + API runtime）で必ず再検証する。

### app.cerulia.session.update

- auth: `app.cerulia.authCoreWriter`
- input: `sessionRef`, `scenarioRef?`, `scenarioLabel?`, `characterBranchRef?`, `role?`, `campaignRef?`, `playedAt?`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
- output: `emittedRecordRefs = [sessionRef]`

`scenarioRef` と `scenarioLabel` を更新する場合も、結果は exactly one を満たさなければならない。
`role = pl` の結果になるときは `characterBranchRef` 必須。`role = gm` の結果になるときは省略してよい。
`characterBranchRef` を渡す結果になる場合、その branch の ownerDid は callerDid と一致しなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`externalArchiveUris` を渡す結果になる場合、それらは credential-free な公開 URI に限る。
AT Protocol lexicon は exactly-one / conditional required を型として直接表現できないため、update の条件判定も authoritative validation で必ず再検証する。

### app.cerulia.scenario.create

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `rulesetNsid?`, `recommendedSheetSchemaRef?`, `sourceCitationUri?`, `summary?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaRef` がある場合、`rulesetNsid` は必須であり、その schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。
`summary` と `sourceCitationUri` は public-safe な情報だけを扱う。spoiler payload は product-core に入れない。
`sourceCitationUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.scenario.update

- auth: `app.cerulia.authCoreWriter`
- input: `scenarioRef`, `title?`, `rulesetNsid?`, `recommendedSheetSchemaRef?`, `sourceCitationUri?`, `summary?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaRef` を持つ結果になる場合、`rulesetNsid` を必須とし、schema の `baseRulesetNsid` と一致しなければならない。`recommendedSheetSchemaRef` を省略した scenario は browse-only のままとする。
`sourceCitationUri` を更新する場合も、credential-free な公開 URI に限る。条件を満たさない場合は `resultKind = rejected` と `reasonCode = invalid-public-uri` を返す。

### app.cerulia.actor.updateProfile

- auth: `app.cerulia.authCoreWriter`
- input: `blueskyProfileRef?`, `displayNameOverride?`, `descriptionOverride?`, `avatarOverrideBlob?`, `bannerOverrideBlob?`, `websiteOverride?`, `pronounsOverride?`, `roleDistribution?`, `playFormats[]?`, `tools[]?`, `ownedRulebooks?`, `playableTimeSummary?`, `preferredScenarioStyles[]?`, `playStyles[]?`, `boundaries[]?`, `skills[]?`
- output: `emittedRecordRefs = [playerProfileRef]`

player-profile は `literal:self` singleton とし、この procedure は record が無ければ create、あれば update として扱ってよい。
`blueskyProfileRef` を使う場合、それは callerDid 自身の `app.bsky.actor.profile` に限る。`avatarOverrideBlob` と `bannerOverrideBlob` は caller repo で upload された blob metadata に限る。
`websiteOverride` を使う場合、それは credential-free な公開 URI に限る。`playFormats` は `text`、`semi-text`、`voice`、`offline` の閉じた値に限る。

### app.cerulia.campaign.create

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `houseRef?`, `rulesetNsid`, `sharedRuleProfileRefs[]?`, `visibility?`
- output: `emittedRecordRefs = [campaignRef]`

### app.cerulia.campaign.update

- auth: `app.cerulia.authCoreWriter`
- input: `campaignRef`, `title?`, `houseRef?`, `rulesetNsid?`, `sharedRuleProfileRefs[]?`, `visibility?`, `archivedAt?`
- output: `emittedRecordRefs = [campaignRef]`

archivedAt が設定された campaign に対して archivedAt 以外の mutable field を更新しようとした場合は `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。

### app.cerulia.house.create

- auth: `app.cerulia.authCoreWriter`
- input: `title`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

`externalCommunityUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.house.update

- auth: `app.cerulia.authCoreWriter`
- input: `houseRef`, `title?`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

`externalCommunityUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.rule.createProfile

- auth: `app.cerulia.authCoreWriter`
- input: `baseRulesetNsid`, `profileTitle`, `scopeKind`, `scopeRef`, `rulesPatchUri`
- output: `emittedRecordRefs = [ruleProfileRef]`

`scopeKind = house-shared` の場合、`scopeRef` は callerDid 自身が owner である house を指さなければならない。`scopeKind = campaign-shared` の場合も同様に callerDid 自身が owner である campaign に限る。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`rulesPatchUri` は credential-free な公開 URI に限る。

### app.cerulia.rule.updateProfile

- auth: `app.cerulia.authCoreWriter`
- input: `ruleProfileRef`, `profileTitle?`, `rulesPatchUri?`
- output: `emittedRecordRefs = [ruleProfileRef]`

`rulesPatchUri` を更新する場合も、credential-free な公開 URI に限る。

### app.cerulia.rule.createSheetSchema

- auth: `app.cerulia.authCoreWriter`
- input: `baseRulesetNsid`, `schemaVersion`, `title`, `fieldDefs`
- output: `emittedRecordRefs = [characterSheetSchemaRef]`

### app.cerulia.character.recordConversion

- auth: `app.cerulia.authCoreWriter`
- input: `sourceSheetRef`, `sourceBranchRef`, `sourceRulesetNsid`, `targetSheetRef`, `targetBranchRef`, `targetRulesetNsid`, `conversionContractRef?`, `convertedAt`, `note?`
- output: `emittedRecordRefs = [characterConversionRef]`

server は accepted 時に source / target の current `sheet.version` を読み取り、conversion record に `sourceSheetVersion` と `targetSheetVersion` として固定する。
source / target の sheet と branch はすべて callerDid 所有でなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`conversionContractRef` を使う場合、その参照先は public-safe な guide / tool / contract に限る。

