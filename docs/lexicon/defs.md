# 共通定義

このディレクトリでは、仮の namespace として app.cerulia.* を使う。shared scalar、enum、object は dedicated な app.cerulia.defs へ寄せ、record / query / procedure の owner doc から ref する。

## 実装固定ルール

- app.cerulia.defs は `*.defs` lexicon として扱い、main definition は置かない
- ref 型は Lexicon 上は at-uri string として定義し、どの collection を指すかは semantic invariant で固定する
- core の `*Ref` は canonical DID authority の normalized at-uri だけを受け入れる。handle authority の at-uri は user-facing display には使えても、record reference としては受け入れない
- record 内の `*Id` field は record-local stable identifier として使ってよく、cross-record reference、AppView route、XRPC、projection では対応する `*Ref` at-uri を使う
- 新規 field の追加は optional のみとし、既存 field の rename や type change は行わない

## scalar / ref defs

| def | format | semantic invariant |
| --- | --- | --- |
| campaignRef | at-uri | app.cerulia.core.campaign record を指す |
| houseRef | at-uri | app.cerulia.core.house record を指す |
| worldRef | at-uri | app.cerulia.core.world record を指す |
| rulesetManifestRef | at-uri | app.cerulia.core.rulesetManifest record を指す |
| ruleProfileRef | at-uri | app.cerulia.core.ruleProfile record を指す |
| characterSheetRef | at-uri | app.cerulia.core.characterSheet record を指す |
| characterBranchRef | at-uri | app.cerulia.core.characterBranch record を指す |
| characterAdvancementRef | at-uri | app.cerulia.core.characterAdvancement record を指す |
| characterConversionRef | at-uri | app.cerulia.core.characterConversion record を指す |
| sessionRef | at-uri | app.cerulia.core.session record を指す |
| sessionParticipationRef | at-uri | app.cerulia.core.sessionParticipation record を指す |
| scenarioRef | at-uri | app.cerulia.core.scenario record を指す |
| characterSheetSchemaRef | at-uri | app.cerulia.core.characterSheetSchema record を指す |
| publicationRef | at-uri | app.cerulia.core.publication record を指す |
| subjectRef | at-uri | publication の対象 record を指す |
| scopeRef | at-uri | world / house / campaign の scope record を指す |
| did | did | actor 識別子 |
| rulesetNsid | nsid | ruleset namespace の根 NSID |
| datetime | datetime | すべて UTC 前提 |
| requestId | string | governing scope 内で再送防止と mutation lifecycle の相関に使う一意な文字列 |
| cursor | string | list query の continuation token |

## enum defs

| def | values |
| --- | --- |
| visibility | public / unlisted / private |
| continuityScopeKind | world / house / campaign |
| ruleProfileScopeKind | world-shared / house-shared / campaign-shared |
| ruleProfileStatus | provisional / active / retired |
| branchKind | campaign-fork / imported-fork / local-override |
| conversionAuthorityKind | same-owner |
| syncMode | snapshot / manual-rebase / pinned-upstream |
| advancementKind | milestone / xp-spend / retrain / respec / correction / import-sync |
| publicationSubjectKind | campaign / character-branch / session |
| publicationSurfaceKind | post / thread / profile / app-card |
| publicationPurposeKind | discovery / stable-entry / history-link |
| publicationStatus | active / retired |
| surfaceStatus | active / retired |
| projectionSurfaceKind | character-home / campaign-view / publication-summary / scenario-catalog / house-activity |
| mutationResultKind | accepted / rejected / rebase-needed |

## shared object defs

surface descriptor は publication で再利用する shared object に固定する。

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

## visibility の責務分離

| field | 役割 | してはならないこと |
| --- | --- | --- |
| campaign.visibility | campaign shell と publication 既定値の表示メタデータ | public shell の最終 gate を単独で決めること |

## record-key の基本方針

- campaign、house、world、character-sheet、character-branch、scenario、character-sheet-schema のような安定オブジェクトは stable key を使う
- publication、character-advancement、character-conversion、session、session-participation のような append-only ledger は tid を使う

core は抽象化しすぎず、しかし archive 固有の都合を押し込まないことが重要である。
