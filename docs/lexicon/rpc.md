# XRPC と transport schema

XRPC 系は app.cerulia.rpc.* にまとめる。この文書は concrete な params、input、output、error surface を固定するための transport contract であり、intent contract は [projection contract](../architecture/projections.md) に残す。

## 共通ルール

- query は GET + Lexicon params、procedure は POST + application/json input / output に固定する。
- list / export query は `limit` と `cursor` を共通で受ける。`limit` の既定値は 50、最大は 100 とする。
- すべての mutation procedure は `requestId` を必須にし、同じ governing scope 内では resultKind に関係なく idempotent に扱う。
- domain-level result は `200 OK + mutationAck` に統一し、malformed request / auth failure / endpoint not found / pre-flight failure だけを XRPC error にする。
- reject された mutation は repo record にせず、一次監査源は append-only service log に置く。
- `getAuditView` は redacted audit projection、`exportServiceLog` は raw append-only service log rows を返す。両者は別 endpoint とする。
- ruleset manifest 互換は rule-profile record へ埋め込まず、`attachRuleProfile` と `createSessionDraft` で `expectedRulesetManifestRef` を受けて検証する。

## 共通 error 名

Lexicon `errors` で列挙する short name は次を共通語彙にする。

| error | 用途 |
| --- | --- |
| InvalidRequest | params / body schema が不正 |
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
| resultKind | app.cerulia.defs#mutationResultKind | yes | accepted / rejected / rebase-needed / manual-review |
| emittedRecordRefs | array<at-uri> | no | accepted で永続 record を出した場合のみ |
| currentRevision | integer | no | campaign / board / character-state など revision ベースの対象 |
| currentState | app.cerulia.defs#sessionState | no | session state mutation で返す |
| currentVisibility | app.cerulia.defs#visibility | no | session visibility mutation で返す |
| caseRevision | integer | no | appeal-case mutation で返す |
| reviewRevision | integer | no | appeal review mutation で返す |
| snapshotRef | app.cerulia.defs#boardSnapshotRef | no | board の rebase hint |
| publicationRef | app.cerulia.defs#publicationRef | no | publication chain current head |
| sessionPublicationRef | app.cerulia.defs#sessionPublicationRef | no | session carrier current head |
| keyVersion | integer | no | rotateAudienceKey で返す current version |
| updatedGrantRefs | array<app.cerulia.defs#audienceGrantRef> | no | rotateAudienceKey で更新された grant |
| controllerDids | array<app.cerulia.defs#did> | no | transferAuthority の current controller set |
| pendingControllerDids | array<app.cerulia.defs#did> | no | transfer 中の候補 controller |
| leaseHolderDid | app.cerulia.defs#did | no | current lease holder |
| transferPhase | app.cerulia.defs#transferPhase | no | authority transfer の現在 phase |
| transferCompletedAt | app.cerulia.defs#datetime | no | authority handoff と `session-authority.gmAudienceRef` 再配布の両方が完了した witness |
| message | string | no | human-readable short explanation |

## query contract

### app.cerulia.rpc.getCharacterHome

- auth: `app.cerulia.authCoreReader`
- params:

| field | type | required | notes |
| --- | --- | --- | --- |
| ownerDid | app.cerulia.defs#did | no | 未指定時は caller を既定にする |

- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| ownerDid | app.cerulia.defs#did | yes | home の主体 |
| primaryBranch | object | yes | characterBranchRef, baseSheetRef, branchLabel, branchKind, ownerDid, revision |
| branches | array<object> | yes | primaryBranch と同じ summary shape |
| recentEpisodes | array<object> | yes | characterEpisodeRef, characterBranchRef, campaignRef, scenarioLabel, outcomeSummary, createdAt |
| recentConversions | array<object> | no | characterConversionRef, sourceSheetRef, sourceSheetVersion, sourceBranchRef, targetSheetRef, targetSheetVersion, targetBranchRef, sourceRulesetManifestRef, targetRulesetManifestRef, convertedByDid, authorityKind(app.cerulia.defs#conversionAuthorityKind), convertedAt, reuseGrantRef |
| reuseGrants | array<object> | yes | reuseGrantRef, sourceCampaignRef, targetKind, targetRef, targetDid, reuseMode, grantedAt, expiresAt, revokedAt |
| publications | array<object> | yes | publicationRef, subjectRef, subjectKind, entryUrl, preferredSurfaceKind, surfaces, status, publishedAt, retiredAt |
| linkedCampaigns | array<object> | no | campaignRef, title, visibility |
| recentAdvancementRefs | array<at-uri> | no | detail link として返してよい |

- errors: `Unauthorized`, `Forbidden`, `NotFound`

### app.cerulia.rpc.getCampaignView

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい。
- params:

| field | type | required | notes |
| --- | --- | --- | --- |
| campaignRef | app.cerulia.defs#campaignRef | yes | 対象 campaign |
| mode | string | no | owner-steward / public。既定は owner-steward |

- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| mode | string | yes | owner-steward / public |
| campaign | object | yes | public mode は campaignRef, title, visibility, archivedAt の shell だけを返す。shell の可視性は campaign.visibility 単独ではなく、active な public publication current head の有無で決める。owner-steward mode では houseRef?, worldRef?, rulesetNsid, rulesetManifestRef を追加してよい |
| ruleProvenance | object | no | owner-steward mode only。sharedRuleProfileRefs, rulesetManifestRef |
| defaultReusePolicy | app.cerulia.defs#reusePolicyKind | no | owner-steward mode のみ |
| publishedArtifacts | array<object> | yes | publication summary row |
| recentContinuity | array<object> | no | episode summary row |
| activeBranches | array<object> | no | branch summary row。characterBranchRef, baseSheetRef, branchLabel, branchKind, ownerDid, revision を返してよい |
| stewardDids | array<app.cerulia.defs#did> | no | owner-steward mode のみ |
| archivedCounts | object | no | episodes / publications の archived 数 |

- errors: `NotFound`
- note: `mode = public` では、対象 campaign に active な public publication current head が 1 件も無い場合は empty shell や neutral notice を返さず `NotFound` で fail-closed にする。

### app.cerulia.rpc.listCharacterEpisodes

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required, `limit` optional, `cursor` optional
- output: `items` は episode summary row の配列、`cursor` は continuation token
- errors: `NotFound`

### app.cerulia.rpc.listReuseGrants

- auth: `app.cerulia.authCoreReader`
- params: `characterBranchRef` required, `state` optional(active / revoked / expired / all), `limit`, `cursor`
- output: `items` は reuse grant summary row の配列で、少なくとも `reuseGrantRef`, `sourceCampaignRef`, `targetKind`, `targetRef`, `targetDid`, `reuseMode`, `grantedAt`, `expiresAt`, `revokedAt` を返す。`cursor` は continuation token
- errors: `NotFound`

### app.cerulia.rpc.listPublications

- auth: `app.cerulia.authCoreReader`。public mode は anonymous read を許してよい。
- params: `subjectRef` optional, `subjectKind` optional, `mode` optional(owner-steward / public), `includeRetired` optional boolean。`includeRetired` は owner-steward mode 専用で、public mode では指定してはならない。, `limit`, `cursor`
- output: `items` は publication summary row。subject が converted branch または converted episode のときは、`sourceRulesetManifestRef`, `targetRulesetManifestRef`, `grantBacked` のような最小 derivation hint を含めてよい。既定では active current head だけを返し、`includeRetired = true` では retired status を持つ current head row だけを archived summary として追加してよい。raw supersedes chain 全体は返さない。`cursor` は continuation token
- errors: public mode で `includeRetired = true` を渡したときは `InvalidRequest`

### app.cerulia.rpc.getSessionAccessPreflight

- auth: anonymous read を許してよい。authenticated caller は参加状態に応じた追加ヒントを受け取ってよい。
- params: `sessionRef` required
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| sessionRef | app.cerulia.defs#sessionRef | yes | target session |
| decisionKind | string | yes | participant-shell / public-replay / join / sign-in / appeal-only / governance-console / retired-carrier(reserved) / no-access |
| reasonCode | string | yes | なぜその target surface になったかの固定理由コード |
| recommendedRoute | string | yes | AppView が最初に開く route |
| authorityRequestId | app.cerulia.defs#requestId | no | authority snapshot を根拠にした場合 |
| membershipRequestId | app.cerulia.defs#requestId | no | membership current head を根拠にした場合 |
| appealCaseRef | app.cerulia.defs#appealCaseRef | no | appeal-only access の根拠 case |
| sessionPublicationRef | app.cerulia.defs#sessionPublicationRef | no | carrier row に基づく場合 |

- errors: `NotFound`
- note: generic な重複適格時の precedence は `participant-shell -> governance-console -> appeal-only -> join -> public-replay -> sign-in -> no-access` に固定する。`retired-carrier` は carrier-specific deep-link preflight を追加した段階で使う予約値とし、現在の `sessionRef` ベース preflight では到達させない。

### app.cerulia.rpc.getSessionView

- auth: `app.cerulia.authSessionParticipant`
- params: `sessionRef` required
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| session | object | yes | sessionRef, title, visibility, state, campaignRef?, rulesetManifestRef, ruleProfileRefs, scheduledAt?, endedAt?, archivedAt?, stateChangedAt?, stateReasonCode?, visibilityChangedAt?, visibilityReasonCode? |
| authoritySummary | object | yes | participant-safe summary。authorityRef, transferPhase, authorityHealthKind(app.cerulia.defs#authorityHealthKind), leaseState(active / expired / transferring), leaseExpiresAt? |
| memberships | array<object> | yes | actorDid, role, status, statusChangedAt, statusChangedByDid |
| activeSceneRef | app.cerulia.defs#sceneRef | no | board を持つ場合のみ |
| handoutCount | integer | yes | current viewer に見える handout 数 |
| appealCount | integer | yes | current viewer に見える appeal 数 |
| publicationCarriers | array<object> | no | active な session publication summary row だけを返す |

- errors: `NotFound`

### app.cerulia.rpc.getGovernanceView

- auth: `app.cerulia.authGovernanceOperator`
- params: `sessionRef` required
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| session | object | yes | sessionRef, title, visibility, state, campaignRef?, rulesetManifestRef, ruleProfileRefs, scheduledAt?, endedAt?, archivedAt?, stateChangedAt?, stateChangedByDid?, stateReasonCode?, visibilityChangedAt?, visibilityChangedByDid?, visibilityReasonCode? |
| authority | object | yes | authorityRef, controllerDids, recoveryControllerDids, leaseHolderDid, leaseExpiresAt, authorityHealthKind(app.cerulia.defs#authorityHealthKind), transferPhase, transferStartedAt, pendingControllerDids, transferCompletedAt |
| memberships | array<object> | yes | actorDid, role, status, statusChangedAt, statusChangedByDid, statusReasonCode |
| activeSceneRef | app.cerulia.defs#sceneRef | no | board を持つ場合のみ |
| publicationCarriers | array<object> | no | governance mode の session publication summary row |
| pendingAppeals | array<object> | no | resolver-facing appeal summary row |

- errors: `NotFound`

### app.cerulia.rpc.getBoardView

- auth: `mode = participant` は `app.cerulia.authBoardReader`、`mode = operator` は `app.cerulia.authBoardOperator`
- params: `sessionRef` required, `sceneRef` required, `mode` optional(participant / operator)。既定は participant。, `sinceRevision` optional integer
- output: [board namespace](board.md) の board view shape を返す
- errors: `NotFound`

### app.cerulia.rpc.getReplayView

- auth: `mode = public` は anonymous read を許してよい。`mode = participant` は `app.cerulia.authSessionParticipant` に寄せる。`participant` mode は joined player だけでなく、viewer / spectator のような session member の read lens も含み、実際の情報量は membership.role と audience grant でさらに絞る。
- params: `sessionRef` required, `mode` optional(public / participant), `limit` optional, `cursor` optional
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| sessionRef | app.cerulia.defs#sessionRef | yes | replay 対象 |
| mode | string | yes | public / participant |
| items | array<object> | yes | mode=public では kind, recordRef, requestId, createdAt, actorDid, summaryText, subjectRef。mode=participant ではこれに audienceRef を追加してよい |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- redaction rule: `mode = public` では public に公開された replay item だけを返し、latest reveal-event が `revealMode = publish-publicly` の場合でも public-safe summary に限る。handout は title / assetRef、message と roll は summaryText、token は publicFacet summary、character-state は summary block だけを返してよく、audit-only detail、private audienceRef、secretEnvelopeRef、privateStateEnvelopeRef、detailEnvelopeRef への導線は返さない。`mode = participant` では caller が閲覧権を持つ replay item まで含めてよい。

- errors: `NotFound`

### app.cerulia.rpc.getAuditView

- auth: `app.cerulia.authAuditReader`
- params: `sessionRef` required, `targetRef` optional, `requestId` optional, `limit`, `cursor`
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| sessionRef | app.cerulia.defs#sessionRef | yes | audit 対象 |
| items | array<object> | yes | kind, recordRef, requestId, createdAt, summary, detailEnvelopeRef, actorDid |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- errors: `NotFound`

### app.cerulia.rpc.listHandouts

- auth: `app.cerulia.authSessionParticipant`
- params: `sessionRef` required, `limit` optional, `cursor` optional
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| items | array<object> | yes | handoutRef, title, assetRef, audienceRef, secretEnvelopeRef, currentVisibility, orderKey |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- errors: `NotFound`
- note: `audienceRef` と `secretEnvelopeRef` は service-internal な read filtering / trace 用 field として返してよいが、participant 向け AppView copy や summary card にそのまま露出してはならない。
- note: spectator は独立 transport mode を増やさず、この endpoint と `getReplayView(mode = participant)` を role-based read filter 付きで使う。spectator に gameplay write や participant shell の権限を与えたことにしない。

### app.cerulia.rpc.listAppealCases

- auth: participant view は `app.cerulia.authAppealOriginator`、resolver view は `app.cerulia.authAppealResolver`
- params: `sessionRef` required, `view` optional(participant / resolver), `status` optional, `limit`, `cursor`
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| items | array<object> | yes | participant view は appealCaseRef, targetKind, targetRef, requestedOutcomeKind, status, blockedReasonCode?, nextResolverKind(app.cerulia.defs#appealNextResolverKind), openedAt, resolvedAt, handoffSummary, resultSummary。resolver view はこれに reviewOutcomeSummary, controllerReviewDueAt, recoveryAuthorityRequestId を追加してよい |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- errors: `NotFound`

### app.cerulia.rpc.listSessionPublications

- auth: active public carrier row は anonymous read を許してよい。`mode = governance` と retired history は `app.cerulia.authGovernanceOperator` に寄せる。
- params: `sessionRef` required, `mode` optional(public / governance), `includeRetired` optional boolean。`includeRetired` は governance mode 専用で、public mode では指定してはならない。, `limit`, `cursor`
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| items | array<object> | yes | public mode は sessionPublicationRef, publicationRef, entryUrl, replayUrl, preferredSurfaceKind の active summary だけを返す。governance mode では surfaces, retiredAt, retireReasonCode, updatedAt, publishedByDid, updatedByDid を追加してよい。`includeRetired = true` では retired status を持つ current head row だけを追加し、raw supersedes chain 全体は返さない |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- errors: public mode で `includeRetired = true` を渡したときは `InvalidRequest`。`NotFound`

### app.cerulia.rpc.exportServiceLog

- auth: `app.cerulia.authAuditReader`
- params: `sessionRef` required, `requestId` optional, `limit`, `cursor`
- output:

| field | type | required | notes |
| --- | --- | --- | --- |
| items | array<object> | yes | requestId, operationNsid, resultKind, governingRef, actorDid, createdAt, emittedRecordRefs, reasonCode, message |
| cursor | app.cerulia.defs#cursor | no | continuation token |

- errors: `NotFound`

## core procedure contract

### app.cerulia.rpc.createCampaign

- input: `title`, `visibility`, `houseRef?`, `worldRef?`, `rulesetNsid`, `rulesetManifestRef`, `sharedRuleProfileRefs[]?`, `defaultReusePolicyKind`, `stewardDids[]`, `requestId`
- accepted ack: `emittedRecordRefs = [campaignRef]`, `currentRevision = 1`
- fence: requestId uniqueness only

### app.cerulia.rpc.createCharacterBranch

- input: `ownerDid`, `baseSheetRef`, `branchKind`, `branchLabel`, `overridePayloadRef?`, `importedFrom?`, `sourceRevision?`, `syncMode?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision = 1`
- fence: requestId uniqueness only
- note: AppView create flow で選ぶ campaign continuity の intent は `createCharacterBranch` 自体には永続化しない。canonical linkage は run / chapter summary では `recordCharacterEpisode.campaignRef`、ruleset conversion path では `recordCharacterConversion.targetCampaignRef` で materialize する。
- note: branch metadata を更新する将来の procedure は `expectedRevision` を必須にし、branchRef を差し替えない stable-object mutation として扱う。

### app.cerulia.rpc.updateCharacterBranch

- input: `characterBranchRef`, `expectedRevision`, `branchLabel?`, `overridePayloadRef?`, `importedFrom?`, `sourceRevision?`, `syncMode?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision`
- fence: `character-branch.revision` の CAS。一度 retire された branch を通常の metadata update で再活性化してはならない

### app.cerulia.rpc.retireCharacterBranch

- input: `characterBranchRef`, `expectedRevision`, `requestId`, `reasonCode?`
- accepted ack: `emittedRecordRefs = [characterBranchRef]`, `currentRevision`
- fence: `character-branch.revision` の CAS。linked publication や reuse の current state を確認し、必要なら先に retire / revoke を要求してよい

### app.cerulia.rpc.recordCharacterAdvancement

- input: `characterBranchRef`, `sourceRunRef?`, `advancementKind`, `deltaPayloadRef`, `approvedByDid`, `effectiveAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterAdvancementRef]`
- fence: branch が active であること。同じ `characterBranchRef + operationNsid + requestId` は accepted / rejected を問わず idempotent に扱う

### app.cerulia.rpc.recordCharacterEpisode

- input: `characterBranchRef`, `campaignRef?`, `sourceRunRef?`, `scenarioLabel?`, `rulesetManifestRef`, `effectiveRuleProfileRefs[]`, `outcomeSummary`, `advancementRefs[]`, `supersedesRef?`, `recordedByDid`, `requestId`
- accepted ack: `emittedRecordRefs = [characterEpisodeRef]`
- fence: branch / campaign provenance と manifest 整合。同じ `characterBranchRef + operationNsid + requestId` は accepted / rejected を問わず idempotent に扱う

### app.cerulia.rpc.recordCharacterConversion

- input: `sourceSheetRef`, `sourceSheetVersion`, `sourceBranchRef?`, `sourceEpisodeRefs[]?`, `sourceRulesetManifestRef`, `sourceEffectiveRuleProfileRefs[]`, `targetSheetRef`, `targetSheetVersion`, `targetBranchRef`, `targetCampaignRef?`, `targetRulesetManifestRef`, `targetEffectiveRuleProfileRefs[]`, `conversionContractRef`, `conversionContractVersion`, `reuseGrantRef?`, `convertedByDid`, `convertedAt`, `supersedesRef?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [characterConversionRef]`
- fence: source / target manifest と sheet snapshot 整合、target branch の baseSheet 整合、same-owner local conversion 以外では reuseGrantRef と source boundary authority を検証、convertedByDid が target owner でない場合は targetCampaignRef 必須かつ campaign.stewardDids に含まれていなければならない。同じ `targetBranchRef + operationNsid + requestId` は accepted / rejected を問わず idempotent に扱う
- note: conversion path の campaign linkage は `targetCampaignRef` を canonical source にする。episode 側の `campaignRef` は後続 summary として同値を mirror してよいが、より広い campaign linkage を新設してはならない。

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
- fence: current publication head 一致。初回 publish で current head が存在しない場合だけ `expectedCurrentHeadRef` を省略してよい。既存 current head がある subject で省略してはならない。explicit grant に支えられた公開では reuseGrantRef 必須、reuseGrantRef がある場合は published subject boundary と整合しなければならず、public target の grant は summary-share に限る。active な session-publication mirror がある subject を supersede するときは、mirror rewrite も同じ requestId / service-log chain で確定しなければならない

### app.cerulia.rpc.retirePublication

- input: `publicationRef`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [newPublicationRef]`, `publicationRef = newPublicationRef`
- fence: input `publicationRef` が current head であること。active な session-publication mirror がある場合、accepted retire は対応する carrier retire または rewrite を同じ requestId / service-log chain で伴わなければならず、そうでなければ reject または manual-review にする

### app.cerulia.rpc.grantReuse

- input: `characterBranchRef`, `sourceCampaignRef`, `targetKind`, `targetRef?`, `targetDid?`, `reuseMode`, `expiresAt?`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [reuseGrantRef]`
- fence: target invariant と branch owner / steward authority。targetKind = public では reuseMode = summary-share に限る

### app.cerulia.rpc.revokeReuse

- input: `reuseGrantRef`, `revokeReasonCode`, `note?`, `requestId`
- accepted ack: `emittedRecordRefs = [newReuseGrantRef]`
- fence: input grant が current active head であること

## optional extension procedure contract

### session / governance

| endpoint | input | accepted ack | required fence |
| --- | --- | --- | --- |
| app.cerulia.rpc.createSessionDraft | sessionId, campaignRef?, title, visibility, rulesetNsid, rulesetManifestRef, ruleProfileRefs[], controllerDids[], recoveryControllerDids[], transferPolicy, scheduledAt?, expectedRulesetManifestRef, requestId | emittedRecordRefs = [sessionRef, authorityRef, gmAudienceRef], currentState = planning, transferPhase = stable | requestId uniqueness、manifest fence、MVP では recoveryControllerDids 非空 |
| app.cerulia.rpc.openSession | sessionRef, expectedState = planning, requestId, reasonCode? | currentState = open | current state CAS |
| app.cerulia.rpc.startSession | sessionRef, expectedState = open, requestId, reasonCode? | currentState = active | current state CAS |
| app.cerulia.rpc.pauseSession | sessionRef, expectedState = active, requestId, reasonCode? | currentState = paused | current state CAS |
| app.cerulia.rpc.resumeSession | sessionRef, expectedState = paused, requestId, reasonCode? | currentState = active | current state CAS |
| app.cerulia.rpc.setSessionVisibility | sessionRef, expectedVisibility, visibility, requestId, reasonCode? | currentVisibility = visibility | current visibility CAS、state != archived |
| app.cerulia.rpc.closeSession | sessionRef, expectedState, requestId, reasonCode? | currentState = ended | current state CAS、expectedState は open / active / paused |
| app.cerulia.rpc.archiveSession | sessionRef, expectedState = ended, requestId, reasonCode? | currentState = archived | current state CAS |
| app.cerulia.rpc.reopenSession | sessionRef, expectedState = ended, nextState, requestId, reasonCode? | currentState = nextState | current state CAS、nextState は active / paused |
| app.cerulia.rpc.transferAuthority | sessionRef, authorityRef, expectedAuthorityRequestId, expectedTransferPhase, expectedControllerDids[], pendingControllerDids[], transferPolicy?, leaseHolderDid?, requestId, reasonCode? | controllerDids, pendingControllerDids, leaseHolderDid, transferPhase, transferCompletedAt | authority snapshot CAS |

- `transferAuthority` は通常は current controller が確定する。break-glass では recovery controller が transfer 関連 field の更新だけを行ってよいが、その accepted ack 自体は gameplay mutation の再開を意味しない。
- `createSessionDraft` は controllerDids をそのまま actorDids に持つ explicit-members snapshot audience を初期 `gmAudienceRef` として必ず作り、`snapshotSourceRequestId` には生成された session-authority の `requestId` を pin する。
- `transferAuthority` は session state と独立した governance mutation として扱い、planning / open / active / paused / ended / archived のどの state でも実行してよい。accepted path では successor `gmAudienceRef` を explicit-members snapshot として再生成し、future GM-only ciphertext に必要な grant 更新が揃うまで `transferCompletedAt` を出してはならない。

### membership / board / state

| endpoint | input | accepted ack | required fence |
| --- | --- | --- | --- |
| app.cerulia.rpc.inviteSession | sessionRef, actorDid, role, expectedStatus, requestId, note? | emittedRecordRefs = [membershipRef] | current membership status + authority snapshot |
| app.cerulia.rpc.cancelInvitation | sessionRef, actorDid, expectedStatus = invited, requestId, reasonCode, note? | emittedRecordRefs = [membershipRef] | current membership status + authority snapshot |
| app.cerulia.rpc.joinSession | sessionRef, actorDid, expectedStatus = invited, requestId | emittedRecordRefs = [membershipRef] | current membership status |
| app.cerulia.rpc.leaveSession | sessionRef, actorDid, expectedStatus = joined, requestId, reasonCode? | emittedRecordRefs = [membershipRef] | current membership status |
| app.cerulia.rpc.moderateMembership | sessionRef, actorDid, expectedStatus, nextStatus, role?, requestId, reasonCode, note? | emittedRecordRefs = [membershipRef] | current membership status + authority snapshot |
| app.cerulia.rpc.applyBoardOp | sessionRef, sceneRef, expectedRevision, operation, requestId | emittedRecordRefs = [boardOpRef], currentRevision = opSeq, snapshotRef? | board revision CAS |
| app.cerulia.rpc.updateCharacterState | sessionRef, characterInstanceRef, expectedRevision, publicResources, publicStatuses, privateStateEnvelopeRef?, sceneRef?, initiative?, requestId | emittedRecordRefs = [characterStateRef], currentRevision | character-state revision CAS |

### message / roll / action / carrier

| endpoint | input | accepted ack | required fence |
| --- | --- | --- | --- |
| app.cerulia.rpc.sendMessage | sessionRef, channelKind, audienceRef?, bodyText?, secretEnvelopeRef?, replyToRef?, requestId | emittedRecordRefs = [messageRef] | session state + membership / audience consistency |
| app.cerulia.rpc.rollDice | sessionRef, command, normalizedCommand?, targetRef?, audienceRef?, secretEnvelopeRef?, requestId | emittedRecordRefs = [rollRef] | session state + membership / audience consistency |
| app.cerulia.rpc.submitAction | sessionRef, normalizedActionRef?, actionKind, audienceRef?, requestId | emittedRecordRefs, message, requestId | 下流 board / state / message / roll / ruling の fence を継承 |
| app.cerulia.rpc.publishSessionLink | sessionRef, publicationRef, expectedPublicationHeadRef, expectedSessionPublicationHeadRef?, entryUrl, replayUrl?, preferredSurfaceKind, surfaces[], requestId | sessionPublicationRef, publicationRef, emittedRecordRefs = [sessionPublicationRef] | core publication head + adapter head の一致。初回 adapter head が存在しない場合だけ `expectedSessionPublicationHeadRef` を省略してよい |
| app.cerulia.rpc.retireSessionLink | sessionRef, sessionPublicationRef, expectedPublicationHeadRef, requestId | sessionPublicationRef, emittedRecordRefs = [sessionPublicationRef] | current adapter head + current publication head の一致 |

- `publishSessionLink` と `retireSessionLink` は、対応する core publication の supersede / retire と同じ requestId / service-log chain で追跡できなければならない。accepted core mutation と stale carrier を別々に残してはならない。

### appeal / secret

| endpoint | input | accepted ack | required fence |
| --- | --- | --- | --- |
| app.cerulia.rpc.submitAppeal | sessionRef, targetKind, targetRef, targetRequestId, affectedActorDid, requestedOutcomeKind, requestId, note? | emittedRecordRefs = [appealCaseRef], caseRevision = 1, reviewRevision = 0 | target invariant。membership target では targetRequestId 必須。`targetKind = ruling-event` では `requestedOutcomeKind = supersede-ruling` のみ許可し、`targetKind = membership` では MVP では `restore-membership` のみ許可する。`reconsider-membership` は明示的 output contract が入るまで reject する |
| app.cerulia.rpc.withdrawAppeal | appealCaseRef, expectedCaseRevision, expectedReviewRevision, requestId | caseRevision, reviewRevision | current caseRevision + current reviewRevision |
| app.cerulia.rpc.reviewAppeal | appealCaseRef, reviewPhaseKind, reviewDecisionKind, expectedCaseRevision, expectedReviewRevision, supersedesRef?, note?, detailEnvelopeRef?, requestId | emittedRecordRefs = [appealReviewEntryRef], caseRevision, reviewRevision | current caseRevision + current reviewRevision |
| app.cerulia.rpc.escalateAppeal | appealCaseRef, expectedCaseRevision, expectedReviewRevision, requestId, handoffSummary? | caseRevision, reviewRevision, transferPhase? | current caseRevision + current reviewRevision |
| app.cerulia.rpc.resolveAppeal | appealCaseRef, expectedCaseRevision, expectedReviewRevision, decisionKind(accepted / denied), resultSummary, requestId | caseRevision, reviewRevision, emittedRecordRefs, message | current caseRevision + current reviewRevision |
| app.cerulia.rpc.revealSubject | sessionRef, subjectRef, fromAudienceRef, toAudienceRef, revealMode, requestId, note? | emittedRecordRefs = [revealEventRef] | current disclosure state |
| app.cerulia.rpc.redactRecord | sessionRef, subjectRef, redactionMode, replacementRef?, reasonCode, requestId | emittedRecordRefs = [redactionEventRef] | current subject head |
| app.cerulia.rpc.rotateAudienceKey | sessionRef, audienceRef, expectedKeyVersion, requestId, note? | keyVersion, updatedGrantRefs | current audience keyVersion + grant snapshot |

- `resolveAppeal` で `decisionKind = accepted` の場合、membership target では corrective domain record としてちょうど 1 件の `membershipRef` を emit し、ruling-event target では `supersedesRef` 付きのちょうど 1 件の `rulingEventRef` を emit する。`decisionKind = denied` では新しい domain correction record を emit しない。
- `revealSubject` の transport enum は `publish-publicly` を canonical にする。AppView copy で `reveal-publicly` を使ってもよいが、API enum と同義の表示語として扱う。

## resultKind の使い分け

- `accepted`: repo record または service-owned side effect が確定した。
- `rejected`: 権限不足、状態違反、target invariant 失敗、policy deny。
- `rebase-needed`: CAS / expectedRevision / current head が古い。
- `manual-review`: blocked appeal の human routing や recovery controller handoff のように、明示的に人手へ上げる場合だけ使う。

## permission-set の考え方

permission-set は OAuth scope 用の bundle として設計し、GM、PL のような卓内 role を直接表現しない。role 判定や disclosure grant は extension 側の責務として分ける。