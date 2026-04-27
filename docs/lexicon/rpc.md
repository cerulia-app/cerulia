# XRPC と transport schema

XRPC 系は domain-scoped NSID families (app.cerulia.dev.character.*, app.cerulia.dev.session.*, app.cerulia.dev.actor.*, app.cerulia.dev.campaign.*, app.cerulia.dev.house.*, app.cerulia.dev.scenario.*, app.cerulia.dev.rule.*) にまとめる。

bare な `app.cerulia.*` route id は transport 互換 alias として受け入れるが、文書上の canonical source-of-truth は `app.cerulia.dev.*` に固定する。

## 共通ルール

- query は GET + Lexicon params、procedure は POST + application/json input / output
- list query は `limit` と `cursor` を共通で受ける。`limit` の既定値は 50、最大は 100
- domain-level result は `200 OK + mutationAck` に統一し、malformed request / auth failure / endpoint not found / service-side internal failure だけを XRPC error にする
- public-safe text と credential-free URI のポリシー正本は architecture / records 文書に置く。rpc.md では transport 上の要求だけを記述する
- schema-backed create / rebase / conversion で exact version が必要な linked record は `*Pin = { uri, cid }` を使う。live root 参照は `*Ref = at-uri` のまま分けて扱う
- owner mode と public / anonymous mode の両方を持つ query は、同じ record を返しても同じ payload shape を返さない。public mode は summary view に閉じ、owner-only field、raw payload、internal linkage を含めない
- query は route root record の欠落と non-root linked record の欠落を区別する。route root が解決できない場合だけ `NotFound` を返し、root が残っている場合は missing linked record を affected block / summary row の省略または downgraded shape で表し、query 全体を失敗させない

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

### app.cerulia.dev.character.getHome

- auth: `app.cerulia.dev.authCoreReader`
- params: none
- output: `ownerDid`, `branches`, `recentSessions`

owner-only query。public / anonymous には公開しない。

### app.cerulia.dev.character.getBranchView

- auth: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `characterBranchRef` required
- output:
	- owner mode: `branch`, `sheet`, `recentSessions`, `advancements`, `conversions`
	- public / anonymous mode: `branchSummary`, `sheetSummary`, `recentSessionSummaries`, `advancementSummaries`, `conversionSummaries`

draft branch も direct ref があれば解決するが、response に `visibility` を含めて AppView が draft state を表示する。public / anonymous mode では draft child を畳み込まず、`note`、`deltaPayload`、`previousValues`、`characterBranchRef` のような raw payload / linkage field を返さない。

`sheetSchemaPin` が unresolved になった場合も query は解決し、`sheetSummary.structuredStats` を省略する。embedded session / advancement summary で linked scenario が欠落した場合は `scenarioLabel` を省略してよい。

### app.cerulia.dev.actor.getProfileView

- auth: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで direct DID read を許す
- params: `did` required
- output:
	- owner mode: `profile`, `blueskyFallbackProfile`, `publicBranches`
	- public / anonymous mode: `profileSummary`, `publicBranches`

`did` は owner repo の `app.cerulia.dev.core.playerProfile/self` を解決するために使う。profile record が無い場合も、ownerDid に紐づく `app.bsky.actor.profile` fallback だけで public summary を返してよい。Cerulia override がある項目だけを fallback より優先する。
fallback 由来の field も public-safe 条件を満たすものだけを返す。`website` は credential-free 公開 URI 条件を満たさない場合、summary から省略する。
`publicBranches` は link-only summary row に固定し、`characterBranchRef`、`displayName`、`branchLabel`、`rulesetNsid` だけを返す。owner-only linkage や raw payload は含めない。

current head sheet が解決できない public branch row は省略してよく、profile view 全体を失敗させない。

### app.cerulia.dev.campaign.getView

- auth: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `campaignRef` required
- output:
	- owner mode: `campaign`, `sessions`, `ruleOverlay`
	- public / anonymous mode: `campaignSummary`, `sessionSummaries`, `ruleOverlaySummary`

draft campaign も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child session を返さず、owner-only linkage や raw rule-profile payload を返さない。
`sessionSummaries` は軽量な embedded summary に留め、`externalArchiveUris` は含めない。

missing `sharedRuleProfileRefs` は `ruleOverlay` / `ruleOverlaySummary` から省略してよく、missing house identity や linked scenario も affected block / field だけを省略して query 全体を失敗させない。

### app.cerulia.dev.scenario.list

- auth: anonymous read を許す
- params: `ownerDid` optional, `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（scenario summary row）, `cursor?`

`ownerDid` を指定した場合は、その owner/repo DID に登録された scenario row だけを返す。これは `/profile/[actor]` の scenario registry を owner 単位で表示するために使う。

`ownerDid` を省略した場合は、owner で絞らない現行の scenario list を返す。

scenario summary row は `hasRecommendedSheetSchema` を返し、AppView が browse-only と createable を分岐できるようにする。

`hasRecommendedSheetSchema` は raw field presence ではなく、current read で usable な create chain が解決できるかを表す。unresolved `recommendedSheetSchemaPin` は `false` として扱う。

### app.cerulia.dev.scenario.getView

- auth: anonymous read を許す
- params: `scenarioRef` required
- output: `scenarioSummary`

recommendedSheetSchemaPin が無い scenario は browse-only とし、create flow 用の deterministic schema 解決結果を返さない。public summary は `hasRecommendedSheetSchema` を返して create CTA の可否を表現する。

`recommendedSheetSchemaPin` が field 上は存在していても、linked schema が解決できない場合は browse-only として返す。

### app.cerulia.dev.rule.listSheetSchemas

- auth: anonymous read を許す
- params: `rulesetNsid` optional, `limit`, `cursor`
- output: `items`（`schemaPin` を含む character-sheet-schema summary row）, `cursor?`

generic create flow は rulesetNsid ごとに schema 一覧を取得し、caller が明示選択する。summary row の短い説明は追加の free-text field を持たず、schema metadata から導出してよい。

### app.cerulia.dev.rule.getSheetSchema

- auth: anonymous read を許す
- params: `characterSheetSchemaRef` required
- output: `characterSheetSchema`

### app.cerulia.dev.session.list

- auth: `app.cerulia.dev.authCoreReader`
- params: `limit`, `cursor`
- output: `items`（caller 自身の session summary row）, `cursor?`

owner-only query。`/sessions` 一覧のために使う。

### app.cerulia.dev.session.getView

- auth: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `sessionRef` required
- output:
	- owner mode: `session`
	- public / anonymous mode: `sessionSummary`（public-safe fields only, `visibility` を含む）

owner workbench の inline detail / edit と、public surface へ埋め込む summary 解決に使う。standalone な public session root は持たない。
`sessionSummary` には `externalArchiveUris` を含めてよい。

linked scenario が欠落しても session root 自体は失わない。stored `scenarioLabel` が無い場合は `scenarioLabel` field を省略してよい。

### app.cerulia.dev.house.getView

- auth: owner mode は `app.cerulia.dev.authCoreReader`。public / anonymous mode は auth bundle なしで direct ref read を許す
- params: `houseRef` required
- output:
	- owner mode: `house`, `campaigns`, `sessions`
	- public / anonymous mode: `houseSummary`, `campaignSummaries`, `sessionSummaries`

draft house も direct ref があれば解決するが、list query には含めない。public / anonymous mode では draft child campaign / session を返さず、draft house を参照する public campaign からは house identity を省略してよい。
`sessionSummaries` は軽量な embedded summary に留め、`externalArchiveUris` は含めない。

linked campaign / session が欠落した場合は surviving linked items だけを返し、欠落 item のために query 全体を失敗させない。

### app.cerulia.dev.rule.listProfiles

- auth: `app.cerulia.dev.authCoreReader`
- params: `scopeRef` optional, `baseRulesetNsid` optional, `limit`, `cursor`
- output: `items`（rule-profile summary row）, `cursor?`

owner 向けの rule-profile 読取一覧。public surface は getCampaignView / getHouseView に畳み込まれた rule overlay summary を使い、raw profile read に依存しない。

### app.cerulia.dev.rule.getProfile

- auth: `app.cerulia.dev.authCoreReader`
- params: `ruleProfileRef` required
- output: `ruleProfile`

owner 向けの rule-profile canonical read。public surface は raw profile を直接返さない。

## procedure contract

### app.cerulia.dev.character.createSheet

- auth: `app.cerulia.dev.authCoreWriter`
- input: `rulesetNsid`, `sheetSchemaPin`, `displayName`, `stats`, `portraitBlob?`, `profileSummary?`, `initialBranchVisibility?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef]`
- note: sheet + default branch をペアで生成する。default branch には `branchKind = main` を使い、`initialBranchVisibility` を seed し、branch の `sheetRef` は新しい sheet を指す

`stats` は create 時点で必須であり、`sheetSchemaPin` が指す schema の `fieldDefs` に適合しなければならない。

server は create 時に `character-sheet.version = 1` を設定する。

`sheetSchemaPin` は active create contract では必須とする。schema-less create は legacy/import/recovery の historical data intake として別経路で扱い、この procedure には含めない。

`sheetSchemaPin` を渡す場合、`uri` は character-sheet-schema record を指し、resolved exact schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。
`sheetSchemaPin` を渡す場合、server は exact pin の解決と fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。AppView の検証は preflight であり、server validation を代替しない。
`portraitBlob` を渡す場合、caller repo で upload された blob metadata でなければならない。外部 URL や他 actor repo の blob 参照は受け付けない。

### app.cerulia.dev.character.updateSheet

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterSheetRef`, `expectedVersion`, `displayName?`, `portraitBlob?`, `profileSummary?`, `stats?`
- output: `emittedRecordRefs = [characterSheetRef]`

accepted な update は `character-sheet.version` を 1 ずつ増やす。
`expectedVersion` は caller が編集基準にした sheet version を表す。最新 version と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.dev.character.rebaseSheet

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterSheetRef`, `expectedVersion`, `targetSheetSchemaPin`, `stats?`, `note?`
- output: `emittedRecordRefs = [characterSheetRef]`

schema pin を変更する dedicated operation。stats の移行が必要だが入力が不足する場合は `rebase-needed` を返してよい。

`targetSheetSchemaPin` は character-sheet-schema の exact pin でなければならず、resolved schema の `baseRulesetNsid` は target sheet の `rulesetNsid` と一致しなければならない。
server は target schema の fieldDefs に対する stats の構造検証を行う。extensible な group で許可された追加 field は valid とし、それ以外の unknown field は reject する。
accepted な rebase は `character-sheet.version` を 1 ずつ増やす。
`expectedVersion` は caller が rebase 基準にした sheet version を表す。最新 version と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.dev.character.createBranch

- auth: `app.cerulia.dev.authCoreWriter`
- input: `sourceBranchRef`, `branchKind`, `branchLabel`, `visibility?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef]`
- note: 2 本目以降の branch を作る場合に使う。source branch の current resolved state を新しい sheet snapshot に materialize し、その snapshot を指す新 branch を作る。新 branch の `forkedFromBranchRef` は `sourceBranchRef` に固定する。`branchKind = main` は createCharacterSheet が生成する default branch 専用であり、`campaign-fork` と `local-override` は用途ラベルであって canonical root を置き換えない。`local-override` は retained enum name であり、field override payload を意味しない

`sourceBranchRef` の ownerDid は callerDid と一致しなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
retiredAt が設定された source branch から新 branch を作ろうとした場合は `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。
materialization 中に source branch record または source branch の current state（sheetRef / current sheet / active advancements for current epoch）が変化した場合は `resultKind = rebase-needed` を返して再試行を促してよい。branchLabel や visibility のような metadata-only update も、server は保守的に競合として扱ってよい。write backend が repo-scope compare-and-swap しか提供しない場合、server は source branch state の不変を証明できない同 owner repo write も保守的に競合として扱ってよい。

### app.cerulia.dev.character.updateBranch

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterBranchRef`, `expectedRevision`, `branchLabel?`, `visibility?`
- output: `emittedRecordRefs = [characterBranchRef]`

retiredAt が設定された branch への mutation は `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。
`expectedRevision` は caller が編集基準にした branch revision を表す。最新 revision と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.dev.character.retireBranch

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterBranchRef`, `expectedRevision`
- output: `emittedRecordRefs = [characterBranchRef]`

すでに retiredAt が設定された branch に対しては `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。
`expectedRevision` は caller が retire 基準にした branch revision を表す。最新 revision と一致しない場合は `resultKind = rebase-needed` を返す。

### app.cerulia.dev.character.recordAdvancement

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterBranchRef`, `advancementKind`, `deltaPayload`, `sessionRef?`, `previousValues?`, `effectiveAt`, `note?`
- output: `emittedRecordRefs = [characterAdvancementRef]`

`deltaPayload` と `previousValues` は公開前提の public-safe inline payload として扱う。hidden correction memo や owner-only 情報は入れない。
`advancementKind` が `retrain`、`respec`、`correction` の場合、`previousValues` は必須とする。`milestone` と `xp-spend` では省略してよい。

### app.cerulia.dev.session.create

- auth: `app.cerulia.dev.authCoreWriter`
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

### app.cerulia.dev.session.update

- auth: `app.cerulia.dev.authCoreWriter`
- input: `sessionRef`, `scenarioRef?`, `scenarioLabel?`, `characterBranchRef?`, `role?`, `campaignRef?`, `playedAt?`, `hoLabel?`, `hoSummary?`, `outcomeSummary?`, `externalArchiveUris[]?`, `visibility?`, `note?`
- output: `emittedRecordRefs = [sessionRef]`

`scenarioRef` と `scenarioLabel` を更新する場合も、結果は exactly one を満たさなければならない。
`role = pl` の結果になるときは `characterBranchRef` 必須。`role = gm` の結果になるときは省略してよい。
`characterBranchRef` を渡す結果になる場合、その branch の ownerDid は callerDid と一致しなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`externalArchiveUris` を渡す結果になる場合、それらは credential-free な公開 URI に限る。
AT Protocol lexicon は exactly-one / conditional required を型として直接表現できないため、update の条件判定も authoritative validation で必ず再検証する。

### app.cerulia.dev.scenario.create

- auth: `app.cerulia.dev.authCoreWriter`
- input: `title`, `rulesetNsid?`, `recommendedSheetSchemaPin?`, `sourceCitationUri?`, `summary?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaPin` がある場合、`rulesetNsid` は必須であり、その schema の `baseRulesetNsid` は `rulesetNsid` と一致しなければならない。
`summary` と `sourceCitationUri` は public-safe な情報だけを扱う。spoiler payload は product-core に入れない。
`sourceCitationUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.dev.scenario.update

- auth: `app.cerulia.dev.authCoreWriter`
- input: `scenarioRef`, `title?`, `rulesetNsid?`, `recommendedSheetSchemaPin?`, `sourceCitationUri?`, `summary?`
- output: `emittedRecordRefs = [scenarioRef]`

`recommendedSheetSchemaPin` を持つ結果になる場合、`rulesetNsid` を必須とし、schema の `baseRulesetNsid` と一致しなければならない。`recommendedSheetSchemaPin` を省略した scenario は browse-only のままとする。
`sourceCitationUri` を更新する場合も、credential-free な公開 URI に限る。条件を満たさない場合は `resultKind = rejected` と `reasonCode = invalid-public-uri` を返す。

### app.cerulia.dev.actor.updateProfile

- auth: `app.cerulia.dev.authCoreWriter`
- input: `blueskyProfileRef?`, `displayNameOverride?`, `descriptionOverride?`, `avatarOverrideBlob?`, `bannerOverrideBlob?`, `websiteOverride?`, `pronounsOverride?`, `roleDistribution?`, `playFormats[]?`, `tools[]?`, `ownedRulebooks?`, `playableTimeSummary?`, `preferredScenarioStyles[]?`, `playStyles[]?`, `boundaries[]?`, `skills[]?`
- output: `emittedRecordRefs = [playerProfileRef]`

player-profile は `literal:self` singleton とし、この procedure は record が無ければ create、あれば update として扱ってよい。
`blueskyProfileRef` を使う場合、それは callerDid 自身の `app.bsky.actor.profile` に限る。`avatarOverrideBlob` と `bannerOverrideBlob` は caller repo で upload された blob metadata に限る。
`websiteOverride` を使う場合、それは credential-free な公開 URI に限る。`playFormats` は `text`、`semi-text`、`voice`、`offline` の閉じた値に限る。

### app.cerulia.dev.campaign.create

- auth: `app.cerulia.dev.authCoreWriter`
- input: `title`, `houseRef?`, `rulesetNsid`, `sharedRuleProfileRefs[]?`, `visibility?`
- output: `emittedRecordRefs = [campaignRef]`

### app.cerulia.dev.campaign.update

- auth: `app.cerulia.dev.authCoreWriter`
- input: `campaignRef`, `title?`, `houseRef?`, `rulesetNsid?`, `sharedRuleProfileRefs[]?`, `visibility?`, `archivedAt?`
- output: `emittedRecordRefs = [campaignRef]`

archivedAt が設定された campaign に対して archivedAt 以外の mutable field を更新しようとした場合は `resultKind = rejected` と `reasonCode = terminal-state-readonly` を返す。

### app.cerulia.dev.house.create

- auth: `app.cerulia.dev.authCoreWriter`
- input: `title`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

`externalCommunityUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.dev.house.update

- auth: `app.cerulia.dev.authCoreWriter`
- input: `houseRef`, `title?`, `canonSummary?`, `defaultRuleProfileRefs[]?`, `policySummary?`, `externalCommunityUri?`, `visibility?`
- output: `emittedRecordRefs = [houseRef]`

`externalCommunityUri` を使う場合、それは credential-free な公開 URI に限る。

### app.cerulia.dev.rule.createProfile

- auth: `app.cerulia.dev.authCoreWriter`
- input: `baseRulesetNsid`, `profileTitle`, `scopeKind`, `scopeRef`, `rulesPatchUri`
- output: `emittedRecordRefs = [ruleProfileRef]`

`scopeKind = house-shared` の場合、`scopeRef` は callerDid 自身が owner である house を指さなければならない。`scopeKind = campaign-shared` の場合も同様に callerDid 自身が owner である campaign に限る。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`rulesPatchUri` は credential-free な公開 URI に限る。

### app.cerulia.dev.rule.updateProfile

- auth: `app.cerulia.dev.authCoreWriter`
- input: `ruleProfileRef`, `profileTitle?`, `rulesPatchUri?`
- output: `emittedRecordRefs = [ruleProfileRef]`

`rulesPatchUri` を更新する場合も、credential-free な公開 URI に限る。

### app.cerulia.dev.rule.createSheetSchema

- auth: `app.cerulia.dev.authCoreWriter`
- input: `baseRulesetNsid`, `schemaVersion`, `title`, `authoring?`, `fieldDefs`
- output: `emittedRecordRefs = [characterSheetSchemaRef]`

### app.cerulia.dev.character.recordConversion

- auth: `app.cerulia.dev.authCoreWriter`
- input: `characterBranchRef`, `expectedRevision`, `targetRulesetNsid`, `targetSheetSchemaPin`, `convertedAt`, `conversionContractRef?`, `note?`
- output: `emittedRecordRefs = [characterSheetRef, characterBranchRef, characterConversionRef]`

server は accepted 時に `characterBranchRef` が現在参照している source sheet を読み取り、新しい target sheet snapshot を作成し、conversion record に `sourceSheetPin` と `targetSheetPin` を固定したうえで branch の `sheetRef` を target sheet に進める。
`characterBranchRef` は callerDid 所有でなければならない。一致しない場合は `resultKind = rejected` と `reasonCode = forbidden-owner-mismatch` を返す。
`expectedRevision` は caller が conversion 基準にした branch revision を表す。最新 revision と一致しない場合は `resultKind = rebase-needed` を返す。
`targetRulesetNsid` は source sheet の `rulesetNsid` と異ならなければならない。
`targetSheetSchemaPin` は character-sheet-schema の exact pin でなければならず、resolved schema の `baseRulesetNsid` は `targetRulesetNsid` と一致しなければならない。
server は source branch の current resolved state を carry-forward した target sheet で初期化し、target schema の fieldDefs に対する構造検証を行う。ruleset 固有の automatic transformation や target-only field の自動補完はこの procedure の contract に含めない。carry-forward state が target schema の required field を満たせない場合は `resultKind = rejected` を返してよい。
materialization 中に source branch record または source branch の current state（sheetRef / current sheet / active advancements for current epoch）が変化した場合は `resultKind = rebase-needed` を返して再試行を促してよい。branchLabel や visibility のような metadata-only update も、server は保守的に競合として扱ってよい。write backend が repo-scope compare-and-swap しか提供しない場合、server は source branch state の不変を証明できない同 owner repo write も保守的に競合として扱ってよい。
`convertedAt` は current branch head の時系列を逆流させてはならない。latest conversion と current epoch の active advancements に対して、canonical ordering（convertedAt / effectiveAt 昇順、同時刻は record-key の tid 順）で後ろに来る場合だけ受け入れてよい。same-timestamp accepted を行う実装は、新しい `characterConversion` の record-key がその時刻の tie-break floor より lexicographically 後ろになることを保証しなければならない。
`conversionContractRef` を使う場合、その参照先は public-safe な guide / tool / contract に限る。
conversion は branch divergence 自体を作らない。parallel line を残したい場合は先に createBranch を行う。
conversion は round-trip を保証しない。accepted 後の target sheet は通常の updateSheet で手動修正してよい。runtime は legacy branch / conversion shape の dual-read を行わず、既存 legacy data は operator 側で migration または再作成する。

