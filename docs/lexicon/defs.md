# 共通定義

このディレクトリでは、仮の namespace として app.cerulia.* を使う。shared scalar、enum、object は dedicated な app.cerulia.defs へ寄せ、record / query / procedure の owner doc から ref する。

## 実装固定ルール

- app.cerulia.defs は *.defs lexicon として扱い、main definition は置かない。
- top-level named defs にできない union はここで variant object だけを定義し、実際の field site では inline union を使う。
- ref 型は Lexicon 上は at-uri string として定義し、どの collection を指すかは semantic invariant で固定する。
- record 内の `*Id` field は record-local stable identifier として使ってよく、cross-record reference、AppView route、XRPC、projection では対応する `*Ref` at-uri を使う。現時点では `campaignId <-> campaignRef` と `sessionId <-> sessionRef` を 1:1 対応として扱う。
- 新規 field の追加は optional のみとし、既存 field の rename や type change は行わない。

## scalar / ref defs

次の shared defs はすべて named definition として実装する。Lexicon type は string で、format は表のとおり固定する。

| def | format | semantic invariant |
| --- | --- | --- |
| campaignRef | at-uri | app.cerulia.core.campaign record を指す |
| sourceCampaignRef | at-uri | reuse-grant の source boundary に使う campaign を指す |
| houseRef | at-uri | app.cerulia.core.house record を指す |
| worldRef | at-uri | app.cerulia.core.world record を指す |
| rulesetManifestRef | at-uri | app.cerulia.core.rulesetManifest record を指す |
| ruleProfileRef | at-uri | app.cerulia.core.ruleProfile record を指す |
| characterSheetRef | at-uri | app.cerulia.core.characterSheet record を指す |
| characterBranchRef | at-uri | app.cerulia.core.characterBranch record を指す |
| characterAdvancementRef | at-uri | app.cerulia.core.characterAdvancement record を指す |
| characterEpisodeRef | at-uri | app.cerulia.core.characterEpisode record を指す |
| characterConversionRef | at-uri | app.cerulia.core.characterConversion record を指す |
| publicationRef | at-uri | app.cerulia.core.publication record を指す |
| reuseGrantRef | at-uri | app.cerulia.core.reuseGrant record を指す |
| assetRef | at-uri | app.cerulia.secret.asset record を指す |
| subjectRef | at-uri | publication / disclosure / audit の対象 record を指す |
| scopeRef | at-uri | world / house / campaign の continuity scope record を指す |
| targetRef | at-uri | reuse-grant の record-backed target を指す |
| sourceRunRef | at-uri | app.cerulia.run.session record を指す |
| sessionRef | at-uri | app.cerulia.run.session record を指す |
| authorityRef | at-uri | app.cerulia.run.sessionAuthority record を指す |
| membershipRef | at-uri | app.cerulia.run.membership record を指す |
| sessionPublicationRef | at-uri | app.cerulia.run.sessionPublication record を指す |
| characterInstanceRef | at-uri | app.cerulia.run.characterInstance record を指す |
| characterStateRef | at-uri | app.cerulia.run.characterState record を指す |
| audienceRef | at-uri | app.cerulia.secret.audience record を指す |
| gmAudienceRef | at-uri | app.cerulia.secret.audience record を指す。session-authority.gmAudienceRef 用の alias |
| controllerAudienceRef | at-uri | app.cerulia.secret.audience record を指す。character-instance.controllerAudienceRef 用の alias |
| audienceGrantRef | at-uri | app.cerulia.secret.audienceGrant record を指す |
| handoutRef | at-uri | app.cerulia.secret.handout record を指す |
| secretEnvelopeRef | at-uri | app.cerulia.secret.secretEnvelope record を指す |
| privateStateEnvelopeRef | at-uri | app.cerulia.secret.secretEnvelope record を指す。character-state.privateStateEnvelopeRef 用の alias |
| revealEventRef | at-uri | app.cerulia.secret.revealEvent record を指す |
| redactionEventRef | at-uri | app.cerulia.secret.redactionEvent record を指す |
| messageRef | at-uri | app.cerulia.run.message record を指す |
| rollRef | at-uri | app.cerulia.run.roll record を指す |
| sceneRef | at-uri | app.cerulia.board.scene record を指す |
| tokenRef | at-uri | app.cerulia.board.token record を指す |
| boardOpRef | at-uri | app.cerulia.board.boardOp record を指す |
| boardSnapshotRef | at-uri | app.cerulia.board.boardSnapshot record を指す |
| appealCaseRef | at-uri | app.cerulia.run.appealCase record を指す |
| appealReviewEntryRef | at-uri | app.cerulia.run.appealReviewEntry record を指す |
| detailEnvelopeRef | at-uri | app.cerulia.run.auditDetailEnvelope record を指す |
| rulingEventRef | at-uri | app.cerulia.run.rulingEvent record を指す |
| targetDid | did | actor target の reuse-grant に使う DID |
| did | did | actor 識別子 |
| rulesetNsid | nsid | ruleset namespace の根 NSID |
| datetime | datetime | すべて UTC 前提 |
| requestId | string | governing scope 内で再送防止と mutation lifecycle の相関に使う一意な文字列 |
| cursor | string | list / export query の continuation token |

## enum defs

次の shared defs は named string definition として実装し、enum は表の closed value set に固定する。

| def | values |
| --- | --- |
| visibility | public / unlisted / private |
| continuityScopeKind | world / house / campaign |
| ruleProfileScopeKind | world-shared / house-shared / campaign-shared |
| ruleProfileStatus | provisional / active / retired |
| branchKind | campaign-fork / imported-fork / local-override |
| conversionAuthorityKind | same-owner / campaign-steward / grant-backed |
| syncMode | snapshot / manual-rebase / pinned-upstream |
| advancementKind | milestone / xp-spend / retrain / respec / correction / import-sync |
| publicationSubjectKind | campaign / character-branch / character-episode |
| publicationSurfaceKind | post / thread / profile / app-card |
| publicationPurposeKind | discovery / stable-entry / archive-link |
| publicationStatus | active / retired |
| surfaceStatus | active / retired |
| projectionSurfaceKind | character-home / campaign-view / publication-summary |
| reusePolicyKind | same-campaign-default / explicit-cross-campaign / explicit-cross-scope / public-library |
| reuseTargetKind | campaign / house / world / actor / public |
| reuseMode | fork-only / fork-and-advance / summary-share / full-share |
| sessionState | planning / open / active / paused / ended / archived |
| authorityHealthKind | healthy / lease-expired / controller-missing / transfer-in-progress / blocked-appeal |
| membershipRole | gm / player / viewer / spectator |
| membershipStatus | invited / joined / left / removed / banned |
| audienceKind | role-based / explicit / derived |
| grantStatus | pending / active / revoked |
| mutationResultKind | accepted / rejected / rebase-needed / manual-review |
| tokenFacetKind | public-facet / secret-facet-envelope / controller-dids / visibility-mode |
| selectorPolicyKind | role-members / explicit-members / derived-membership |
| transferPhase | stable / preparing / rotating-grants / finalizing |
| transferPolicyKind | majority-controllers / unanimous-controllers / recovery-fallback-majority |
| appealTargetKind | ruling-event / membership |
| appealRequestedOutcomeKind | supersede-ruling / restore-membership / reconsider-membership |
| appealStatus | controller-review / recovery-review / accepted / denied / withdrawn |
| appealResolutionKind | accepted / denied / withdrawn |
| appealBlockedReason | quorum-impossible / deadline-expired |
| appealNextResolverKind | controller-review / blocked / recovery-review / none |
| appealReviewPhaseKind | controller-review / recovery-review |
| appealReviewDecisionKind | approve / deny / abstain / withdraw |
| sourceType | player-character / npc / preset / proxy |
| redactionMode | hide / retract / replace |
| revealMode | broaden-audience / publish-publicly |

## shared object defs

surface descriptor は core publication と session-backed carrier の両方で再利用する shared object に固定する。

```json
{
	"surfaceDescriptor": {
		"type": "object",
		"required": ["surfaceKind", "purposeKind", "surfaceUri", "status"],
		"properties": {
			"surfaceKind": { "type": "ref", "ref": "app.cerulia.defs#publicationSurfaceKind" },
			"purposeKind": { "type": "ref", "ref": "app.cerulia.defs#publicationPurposeKind" },
			"surfaceUri": { "type": "string", "format": "uri" },
			"status": { "type": "ref", "ref": "app.cerulia.defs#surfaceStatus" },
			"retiredAt": { "type": "ref", "ref": "app.cerulia.defs#datetime" }
		}
	}
}
```

selectorPolicy は top-level named union にせず、variant object を shared defs として定義し、field site で inline closed union を使う。

```json
{
	"selectorPolicyRoleMembers": {
		"type": "object",
		"required": ["kind", "roles"],
		"properties": {
			"kind": { "type": "string", "const": "role-members" },
			"roles": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#membershipRole" },
				"minLength": 1
			},
			"membershipStatuses": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#membershipStatus" }
			}
		}
	},
	"selectorPolicyExplicitMembers": {
		"type": "object",
		"required": ["kind", "actorDids"],
		"properties": {
			"kind": { "type": "string", "const": "explicit-members" },
			"actorDids": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#did" },
				"minLength": 1
			}
		}
	},
	"selectorPolicyDerivedMembership": {
		"type": "object",
		"required": ["kind", "roles", "sessionStates"],
		"properties": {
			"kind": { "type": "string", "const": "derived-membership" },
			"roles": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#membershipRole" },
				"minLength": 1
			},
			"membershipStatuses": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#membershipStatus" },
				"minLength": 1
			},
			"sessionStates": {
				"type": "array",
				"items": { "type": "ref", "ref": "app.cerulia.defs#sessionState" },
				"minLength": 1
			}
		}
	}
}
```

audience.selectorPolicy field site では次の inline union を使う。

```json
{
	"selectorPolicy": {
		"type": "union",
		"closed": true,
		"refs": [
			"app.cerulia.defs#selectorPolicyRoleMembers",
			"app.cerulia.defs#selectorPolicyExplicitMembers",
			"app.cerulia.defs#selectorPolicyDerivedMembership"
		]
	}
}
```

audienceKind と selectorPolicy.kind の canonical mapping は 1:1 で固定する。

- role-based -> role-members
- explicit -> explicit-members
- derived -> derived-membership

## visibility の責務分離

同じ `visibility` 語でも、どの record が持つかで責務を固定する。

| value | 既定の意味 |
| --- | --- |
| public | anonymous の一覧 / discovery と direct-link の両方に使ってよい |
| unlisted | anonymous の direct-link には使ってよいが、既定の一覧 / discovery からは外す |
| private | anonymous public mode では fail-closed とし、認可済み route / role / admission でだけ扱う |

| field | 役割 | してはならないこと |
| --- | --- | --- |
| campaign.visibility | campaign shell と publication 既定値の表示メタデータ | runtime admission や active public campaign shell の最終 gate にしない |
| session.visibility | extension run の admission と session / replay projection の gate | core publication の正本や campaign shell の公開可否を置き換えない |
| scene.visibility | session.visibility の内側で効く board projection gate | session 側が閉じている投影面を広げない |
| handout.currentVisibility | reveal / redaction から導く投影値 | audience-grant や平文復号権の正本にしない |

## record-key の基本方針

- campaign、house、world、character-sheet、character-branch のような安定オブジェクトは stable key を使う。
- publication、character-advancement、character-episode、reuse-grant のような append-only ledger は tid を使う。
- optional extension の session、scene、token、audience などは stable key を使ってよい。
- membership は stable key を使い、current head の一意性は `(sessionRef, actorDid)` で解決する。actorDid 派生 key を canonical にしない。

core は抽象化しすぎず、しかし extension 固有の都合をそのまま押し込まないことが重要である。

audit は projectionSurfaceKind の一部ではなく、governance / audit read model と dedicated endpoint で扱う。