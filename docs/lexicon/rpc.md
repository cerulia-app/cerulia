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
  - `recentEpisodes`
  - `recentConversions`
  - `reuseGrants`
  - `publications`
  - `linkedCampaigns`
  - `recentAdvancementRefs` optional
- errors: `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.getCampaignView

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `campaignRef` required、`mode` optional(owner-steward / public)
- output:
  - `mode`
  - `campaign`
  - `ruleProvenance` optional
  - `defaultReusePolicy` optional
  - `publishedArtifacts`
  - `recentContinuity` optional
  - `activeBranches` optional
  - `stewardDids` optional
  - `archivedCounts` optional
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`
- note: `mode = public` では、対象 campaign に active な public publication current head が 1 件も無い場合は `NotFound` で fail-closed にする

### app.cerulia.rpc.listCharacterEpisodes

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required, `limit` optional, `cursor` optional
- output: `items` は episode summary row の配列、`cursor` は continuation token
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.listReuseGrants

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required, `state` optional(active / revoked / expired / all), `limit`, `cursor`
- output: `items` は reuse grant summary row の配列、`cursor` は continuation token
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.listPublications

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい
- params: `subjectRef` optional, `subjectKind` optional, `mode` optional(owner-steward / public), `includeRetired` optional boolean, `limit`, `cursor`
- output: `items` は publication summary row。subject が converted branch または converted episode のときは、`sourceRulesetManifestRef`, `targetRulesetManifestRef`, `grantBacked` のような最小 derivation hint を含めてよい。`cursor` は continuation token
- errors: `InvalidRequest`, `Unauthorized`, `Forbidden`。public mode で `includeRetired = true` を渡したときも `InvalidRequest` を返す。0 件は空 page として返してよい

## core procedure contract

### app.cerulia.rpc.createCampaign

- input: `title`, `visibility`, `houseRef?`, `worldRef?`, `rulesetNsid`, `rulesetManifestRef`, `sharedRuleProfileRefs[]?`, `defaultReusePolicyKind`, `stewardDids[]`, `requestId`
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

- input: `characterBranchRef`, `advancementKind`, `deltaPayloadRef`, `approvedByDid`, `effectiveAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterAdvancementRef]`
- fence: branch が active であること

### app.cerulia.rpc.recordCharacterEpisode

- input: `characterBranchRef`, `campaignRef?`, `scenarioLabel?`, `rulesetManifestRef`, `effectiveRuleProfileRefs[]`, `outcomeSummary`, `advancementRefs[]`, `supersedesRef?`, `recordedByDid`, `requestId`
- accepted ack: `emittedRecordRefs = [characterEpisodeRef]`
- fence: branch / campaign provenance と manifest 整合

### app.cerulia.rpc.recordCharacterConversion

- input: `sourceSheetRef`, `sourceSheetVersion`, `sourceBranchRef?`, `sourceEpisodeRefs[]?`, `sourceRulesetManifestRef`, `sourceEffectiveRuleProfileRefs[]`, `targetSheetRef`, `targetSheetVersion`, `targetBranchRef`, `targetCampaignRef?`, `targetRulesetManifestRef`, `targetEffectiveRuleProfileRefs[]`, `conversionContractRef`, `conversionContractVersion`, `reuseGrantRef?`, `convertedByDid`, `convertedAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterConversionRef]`
- fence: source / target manifest と sheet snapshot 整合、target branch の baseSheet 整合、same-owner local conversion 以外では reuseGrantRef と source boundary authority を検証

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

- input: `subjectRef`, `subjectKind`, `entryUrl`, `preferredSurfaceKind`, `surfaces[]`, `reuseGrantRef?`, `expectedCurrentHeadRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [publicationRef]`, `publicationRef`
- fence: current publication head 一致。初回 publish で current head が存在しない場合だけ `expectedCurrentHeadRef` を省略してよい

### app.cerulia.rpc.retirePublication

- input: `publicationRef`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [newPublicationRef]`, `publicationRef = newPublicationRef`
- fence: input `publicationRef` が current head であること

### app.cerulia.rpc.grantReuse

- input: `characterBranchRef`, `sourceCampaignRef`, `targetKind`, `targetRef?`, `targetDid?`, `reuseMode`, `expiresAt?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [reuseGrantRef]`
- fence: target invariant と branch owner / steward authority。targetKind = public では reuseMode = summary-share に限る

### app.cerulia.rpc.revokeReuse

- input: `reuseGrantRef`, `revokeReasonCode`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [newReuseGrantRef]`
- fence: input grant が current active head であること

## resultKind の使い分け

- `accepted`: repo record が確定した
- `rejected`: 権限不足、状態違反、target invariant 失敗、policy deny
- `rebase-needed`: CAS / expectedRevision / current head が古い

## permission-set の考え方

permission-set は OAuth scope 用の technical bundle として設計し、role 名を直接表現しない。archive 側 operation は product-core の auth bundle と transport surface に含めない。
