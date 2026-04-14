# 共通定義

shared scalar、enum、object は app.cerulia.defs に集約する。

## 実装固定ルール

- ref 型は Lexicon 上は at-uri string として定義し、どの collection を指すかは semantic invariant で固定する
- core の `*Ref` は canonical DID authority の normalized at-uri だけを受け入れる
- record 内の `*Id` field は record-local stable identifier。cross-record reference では `*Ref` at-uri を使う
- 新規 field の追加は optional のみとし、既存 field の rename や type change は行わない

## scalar / ref defs

| def | format | semantic invariant |
| --- | --- | --- |
| campaignRef | at-uri | app.cerulia.core.campaign record を指す |
| houseRef | at-uri | app.cerulia.core.house record を指す |
| ruleProfileRef | at-uri | app.cerulia.core.ruleProfile record を指す |
| characterSheetRef | at-uri | app.cerulia.core.characterSheet record を指す |
| characterBranchRef | at-uri | app.cerulia.core.characterBranch record を指す |
| characterAdvancementRef | at-uri | app.cerulia.core.characterAdvancement record を指す |
| characterConversionRef | at-uri | app.cerulia.core.characterConversion record を指す |
| sessionRef | at-uri | app.cerulia.core.session record を指す |
| scenarioRef | at-uri | app.cerulia.core.scenario record を指す |
| characterSheetSchemaRef | at-uri | app.cerulia.core.characterSheetSchema record を指す |
| scopeRef | at-uri | house / campaign の scope record を指す |
| documentUri | uri | 外部ドキュメントや blob の URI を指す |
| did | did | actor 識別子 |
| rulesetNsid | nsid | ruleset namespace の根 NSID |
| datetime | datetime | すべて UTC 前提 |
| cursor | string | list query の continuation token |

## enum defs

| def | values |
| --- | --- |
| visibility | draft / public |
| ruleProfileScopeKind | house-shared / campaign-shared |
| branchKind | main / campaign-fork / local-override |
| advancementKind | milestone / xp-spend / retrain / respec / correction |
| sessionRole | pl / gm |
| projectionSurfaceKind | character-home / campaign-view / scenario-catalog / house-activity |
| mutationResultKind | accepted / rejected / rebase-needed |

`rebase-needed` は schema pin の更新や version fence で、現行の入力が古いか互換変換を要するときに返す。

## record-key の基本方針

- campaign、house、character-sheet、character-branch、scenario、character-sheet-schema、rule-profile は stable key
- character-advancement、character-conversion、session は tid

character-sheet-schema の stable key は mutable current-head alias を意味しない。versioned pin を指す。
