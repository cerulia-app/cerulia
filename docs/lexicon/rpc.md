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
# XRPC と transport schema

XRPC 系は app.cerulia.rpc.* にまとめる。この文書は concrete な params、input、output、error surface を固定するための transport contract であり、intent contract は [../architecture/projections.md](../architecture/projections.md) に残す。archive 側 procedure はこの文書に含めない。

## 共通ルール

- query は GET + Lexicon params、procedure は POST + application/json input / output に固定する
- list query は `limit` と `cursor` を共通で受ける。`limit` の既定値は 50、最大は 100 とする
- すべての mutation procedure は `requestId` を必須にし、同じ governing scope 内では resultKind に関係なく idempotent に扱う
- domain-level result は `200 OK + mutationAck` に統一し、malformed request / auth failure / endpoint not found だけを XRPC error にする。Lexicon evolution に従い、unexpected additional field は warning 相当として無視してよい
- reject された mutation は repo record にせず、一次監査源は append-only service log に置く

## 共通 error 名

| error | 用途 |
| --- | --- |
| InvalidRequest | required params の欠落、enum / type / format など既知 field の schema が不正 |
| Unauthorized | 認証が必要 |
| Forbidden | OAuth bundle はあるが呼び出し権限がない |
| NotFound | 参照先 record / projection が存在しない |
| UnsupportedRuleset | manifest または ruleset が未対応 |
| InternalError | service 側障害 |

## mutationAck schema

すべての mutation procedure は次の shared object を output に使う。

| field | type | required | notes |
| --- | --- | --- | --- |
| requestId | app.cerulia.defs#requestId | yes | 呼び出しと service log の相関キー |
| resultKind | app.cerulia.defs#mutationResultKind | yes | accepted / rejected / rebase-needed |
| emittedRecordRefs | array<at-uri> | no | accepted で永続 record を出した場合のみ |
| currentRevision | integer | no | campaign / character-branch など revision ベースの対象 |
| publicationRef | app.cerulia.defs#publicationRef | no | publication chain current head |
| message | string | no | human-readable short explanation |

## query contract

world と house は current product-core XRPC surface では read-only anchor として扱う。campaign がそれらを参照して continuity scope を構成するが、専用の create / update mutation はこの段階では定義しない。

### app.cerulia.rpc.getCharacterHome

- auth: `app.cerulia.authCoreReader`
- params: `ownerDid` optional。未指定時は caller を既定にする
- output:
  - `ownerDid`
  - `primaryBranch`
  - `branches`
  - `recentSessions`
  - `recentConversions`
  - `publications`
  - `linkedCampaigns`
  - `recentAdvancementRefs` optional
- errors: `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.listCharacterBranches

- auth: `app.cerulia.authCoreReader`
- params: `limit` optional, `cursor` optional
- output: `items` は caller owner の branch summary row。displayName / rulesetNsid / latestSessionSummary / currentPublicationRef のような workbench 向け最小 context を含めてよい
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`

### app.cerulia.rpc.getCharacterBranchView

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required
- output:
  - `branch`
  - `recentSessions`
  - `recentConversions`
  - `publications`
  - `campaign` optional
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.getCampaignView

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `campaignRef` required、`mode` optional(owner / public)
- output:
  - `mode`
  - `campaign`
  - `ruleProvenance` optional
  - `publishedArtifacts`
  - `recentSessions` optional
  - `activeBranches` optional
  - `maintainerDids` optional
  - `archivedCounts` optional
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`
- note: `mode = public` では、対象 campaign に active な public publication current head が 1 件も無い場合は `NotFound` で fail-closed にする

### app.cerulia.rpc.listCampaigns

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `mode` optional(owner / public), `limit`, `cursor`
- output: `items` は campaign summary row。public mode では active な public campaign shell を持つ campaign だけを返し、`currentPublicationRef` と `publishedArtifactCount` を含めてよい
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`

### app.cerulia.rpc.listCharacterEpisodes

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required, `limit` optional, `cursor` optional
- output: `items` は session summary row の配列、`cursor` は continuation token
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`
- note: 後方互換のため NSID を残すが、実質的には session を返す

### app.cerulia.rpc.listReuseGrants

- archived: reuse-grant は廃止。この endpoint は将来削除する

### app.cerulia.rpc.listPublications

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `subjectRef` optional, `subjectKind` optional, `mode` optional(owner / public), `includeRetired` optional boolean, `limit`, `cursor`
- output: `items` は publication summary row。subject が converted branch のときは、`sourceRulesetManifestRef`, `targetRulesetManifestRef` のような最小 derivation hint を含めてよい。public mode では active かつ stable-entry を持つ current head だけを返し、malformed current head は fail-closed で除外してよい。`cursor` は continuation token
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`。public mode で `includeRetired = true` を渡したときも `InvalidRequest` を返す。0 件は空 page として返してよい

### app.cerulia.rpc.listPublicationLibrary

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `subjectRef` optional, `subjectKind` optional, `mode` optional(owner / public), `limit`, `cursor`
- output: `items` は publication summary row。AppView の archive / tombstone 導線向けに append history を含めてよく、public mode では publication として valid な row だけを返す。current head が public でないときは `currentPublicationRef` を省略してよい
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`

### app.cerulia.rpc.getPublicationView

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `publicationRef` required, `mode` optional(owner / public)
- output:
  - `publication`
  - `subjectBranch` optional
  - `campaign` optional
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`

## core procedure contract

### app.cerulia.rpc.createCampaign

- input: `title`, `visibility`, `houseRef?`, `worldRef?`, `rulesetNsid`, `rulesetManifestRef`, `sharedRuleProfileRefs[]?`, `maintainerDids[]?`, `requestId`
- accepted ack: `emittedRecordRefs = [campaignRef]`, `currentRevision = 1`
- fence: requestId uniqueness only

### app.cerulia.rpc.createCharacterBranch

- input: `ownerDid`, `baseSheetRef`, `branchKind`, `branchLabel`, `overridePayloadRef?`, `importedFrom?`, `sourceRevision?`, `syncMode?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision = 1`
- fence: requestId uniqueness only
- note: AppView create flow で選ぶ campaign continuity の intent は `createCharacterBranch` 自体には永続化しない

### app.cerulia.rpc.updateCharacterBranch

- input: `characterBranchRef`, `expectedRevision`, `branchLabel?`, `overridePayloadRef?`, `importedFrom?`, `sourceRevision?`, `syncMode?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision`
- fence: `character-branch.revision` の CAS

### app.cerulia.rpc.retireCharacterBranch

- input: `characterBranchRef`, `expectedRevision`, `requestId`, `reasonCode?`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision`
- fence: `character-branch.revision` の CAS

### app.cerulia.rpc.recordCharacterAdvancement

- input: `characterBranchRef`, `advancementKind`, `deltaPayloadRef`, `sessionRef?`, `effectiveAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterAdvancementRef]`
- fence: branch が active であること

### app.cerulia.rpc.recordCharacterEpisode

- archived: character-episode は session に置き換え。この procedure は将来削除する

### app.cerulia.rpc.createSession

- input: `scenarioRef`, `gmDid`, `participantEntries[]`, `campaignRef?`, `playedAt`, `hoEntries[]?`, `externalArchiveUris[]?`, `outcomeSummary?`, `requestId`
- accepted ack: `emittedRecordRefs = [sessionRef]`
- fence: requestId uniqueness only
- note: GM の repo に作成される

### app.cerulia.rpc.createSessionParticipation

- input: `sessionRef`, `characterBranchRef?`, `requestId`
- accepted ack: `emittedRecordRefs = [sessionParticipationRef]`
- fence: requestId uniqueness only
- note: プレイヤーの repo に作成される

### app.cerulia.rpc.recordCharacterConversion

- input: `sourceSheetRef`, `sourceSheetVersion`, `sourceBranchRef?`, `sourceEpisodeRefs[]?`, `sourceRulesetManifestRef`, `sourceEffectiveRuleProfileRefs[]`, `targetSheetRef`, `targetSheetVersion`, `targetBranchRef`, `targetCampaignRef?`, `targetRulesetManifestRef`, `targetEffectiveRuleProfileRefs[]`, `conversionContractRef`, `conversionContractVersion`, `convertedByDid`, `convertedAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterConversionRef]`
- fence: source / target manifest と sheet snapshot 整合、target branch の baseSheet 整合、convertedByDid = target sheet owner

### app.cerulia.rpc.importCharacterSheet

- input: `ownerDid`, `rulesetNsid`, `displayName`, `portraitRef?`, `publicProfile?`, `stats?`, `externalSheetUri?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterSheetRef]`
- fence: requestId uniqueness only

### app.cerulia.rpc.attachRuleProfile

- input: `campaignRef`, `ruleProfileRef`, `expectedCampaignRevision`, `expectedRulesetManifestRef`, `requestId`
- accepted ack: `emittedRecordRefs = [campaignRef]`, `currentRevision`
- fence: `campaign.revision` と `campaign.rulesetManifestRef` の二段 CAS

### app.cerulia.rpc.retireRuleProfile

- input: `ruleProfileRef`, `scopeKind`, `scopeRef`, `expectedRulesetManifestRef`, `requestId`, `campaignRef?`, `expectedCampaignRevision?`
- accepted ack: `emittedRecordRefs = [newRuleProfileRef]`, `currentRevision?`
- fence: campaign-shared では `campaign.revision` と manifest fence、その他 scope では manifest fence

### app.cerulia.rpc.publishSubject

- input: `subjectRef`, `subjectKind`, `entryUrl`, `preferredSurfaceKind`, `surfaces[]`, `expectedCurrentHeadRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [publicationRef]`, `publicationRef`
- note: active な publication は non-empty `entryUrl` と、少なくとも 1 件の `purposeKind = stable-entry` な active surface を持たなければならない
- fence: current publication head 一致。初回 publish で current head が存在しない場合だけ `expectedCurrentHeadRef` を省略してよい

### app.cerulia.rpc.retirePublication

- input: `publicationRef`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [newPublicationRef]`, `publicationRef = newPublicationRef`
- fence: input `publicationRef` が current head であること

## resultKind の使い分け

- `accepted`: repo record が確定した
- `rejected`: 権限不足、状態違反、target invariant 失敗、policy deny
- `rebase-needed`: CAS / expectedRevision / current head が古い

## permission-set の考え方

permission-set は OAuth scope 用の technical bundle として設計し、role 名を直接表現しない。archive 側 operation は product-core の auth bundle と transport surface に含めない。
