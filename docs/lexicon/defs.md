# 共通定義

shared scalar、enum、object は app.cerulia.defs に集約する。

## 実装固定ルール

- ref 型は Lexicon 上は at-uri string として定義し、どの collection を指すかは semantic invariant で固定する
- core の `*Ref` は canonical DID authority の normalized at-uri だけを受け入れる
- record 内の `*Id` field は record-local stable identifier。cross-record reference では `*Ref` at-uri を使う
- blob 型の override field は `*Blob` 命名を使い、`*Ref`（at-uri）と区別する
- public 共有面に出る外部 URI は credential-free な公開 URI に限る。embedded credential、署名付き query、one-time token を含む URI は受け入れない
- payload carrier が record 本体に閉じる場合、public-safe な object を inline field として持つ。payload 専用 record を増やさない
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
| playerProfileRef | at-uri | app.cerulia.core.playerProfile record を指す |
| scenarioRef | at-uri | app.cerulia.core.scenario record を指す |
| characterSheetSchemaRef | at-uri | app.cerulia.core.characterSheetSchema record を指す |
| scopeRef | at-uri | house / campaign の scope record を指す |
| documentUri | uri | credential-free な公開外部 URI を指す |
| did | did | actor 識別子 |
| rulesetNsid | nsid | ruleset namespace の根 NSID |
| datetime | datetime | すべて UTC 前提 |
| cursor | string | list query の continuation token |

## object defs

| def | format | semantic invariant |
| --- | --- | --- |
| portraitBlob | blob | caller が自分の repo から参照する public-safe portrait 用 blob |
| branchOverridePayload | object | sheet fieldId / group key に沿った public-safe overlay payload |
| advancementDeltaPayload | object | advancement で追加または変更された public-safe payload |
| previousValuesSnapshot | object | 上書き前の public-safe 値 snapshot |

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

- campaign、house、scenario は `any` 型の lower-case slug key を使う
- character-sheet、character-branch、character-sheet-schema、rule-profile は `any` 型の lower-case opaque key を使う
- character-advancement、character-conversion、session は tid

- `any` 型 key でも current-head alias は作らない。record-key は immutable で、更新は同一 record の内容だけを変える
- slug key は `a-z0-9._:-~` の lower-case subset を使い、title や表示名の更新で rkey を変えない
- opaque key も同じ lower-case subset を使い、API が生成する。caller は key の意味を前提にしない
