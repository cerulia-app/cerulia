# 共通定義

shared scalar、enum、object は app.cerulia.dev.defs に集約する。

`app.cerulia.defs` の bare namespace は互換 alias として受け入れるが、文書上の canonical source-of-truth は `app.cerulia.dev.defs` に固定する。

## 実装固定ルール

- live root ref 型は Lexicon 上は at-uri string として定義し、どの collection を指すかは semantic invariant で固定する
- exact pin 型は object `{ uri, cid }` として定義する。`uri` は canonical DID authority の normalized at-uri、`cid` は blessed CID string を使う
- core の `*Ref` は canonical DID authority の normalized at-uri だけを受け入れる
- core の `*Pin` は exactRecordPin を使い、`uri` が指す record の current read と `cid` が一致するか、verified cache で同じ `cid` を再解決できる場合だけ resolved とみなす
- record 内の `*Id` field は record-local stable identifier。cross-record reference では `*Ref` at-uri を使う
- blob 型の override field は `*Blob` 命名を使い、`*Ref`（at-uri）と区別する
- public 共有面に出る外部 URI は credential-free な公開 URI に限る。embedded credential、署名付き query、one-time token を含む URI は受け入れない
- payload carrier が record 本体に閉じる場合、public-safe な object を inline field として持つ。payload 専用 record を増やさない
- 新規 field の追加は optional のみとし、既存 field の rename や type change は行わない

## scalar / live root ref defs

| def | format | semantic invariant |
| --- | --- | --- |
| campaignRef | at-uri | app.cerulia.dev.core.campaign record を指す |
| houseRef | at-uri | app.cerulia.dev.core.house record を指す |
| ruleProfileRef | at-uri | app.cerulia.dev.core.ruleProfile record を指す |
| characterSheetRef | at-uri | app.cerulia.dev.core.characterSheet record を指す |
| characterBranchRef | at-uri | app.cerulia.dev.core.characterBranch record を指す |
| characterAdvancementRef | at-uri | app.cerulia.dev.core.characterAdvancement record を指す |
| characterConversionRef | at-uri | app.cerulia.dev.core.characterConversion record を指す |
| sessionRef | at-uri | app.cerulia.dev.core.session record を指す |
| playerProfileRef | at-uri | app.cerulia.dev.core.playerProfile record を指す |
| scenarioRef | at-uri | app.cerulia.dev.core.scenario record を指す |
| characterSheetSchemaRef | at-uri | app.cerulia.dev.core.characterSheetSchema record を指す |
| scopeRef | at-uri | house / campaign の scope record を指す |
| documentUri | uri | credential-free な公開外部 URI を指す |
| did | did | actor 識別子 |
| rulesetNsid | nsid | ruleset namespace の根 NSID |
| datetime | datetime | RFC 3339 形式。UTC（`Z`）またはタイムゾーンオフセット（例: `+09:00`）を受理する |
| cursor | string | list query の continuation token |

## object defs

| def | format | semantic invariant |
| --- | --- | --- |
| exactRecordPin | object | exact version の record pin。shape は `{ uri: at-uri, cid: cid }` |
| portraitBlob | blob | caller が自分の repo から参照する public-safe portrait 用 blob |
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

`local-override` は retained enum name であり、branch-level field override payload を意味しない。Cerulia では branch は divergence primitive として扱う。

`rebase-needed` は schema pin の更新や version fence で、現行の入力が古いか互換変換を要するときに返す。

## record-key の基本方針

- campaign、house、scenario は `any` 型の lower-case slug key を使う
- character-sheet、character-branch、character-sheet-schema、rule-profile は `any` 型の lower-case opaque key を使う
- character-advancement、character-conversion、session は tid

- `any` 型 key でも current-head alias は作らない。record-key は immutable で、更新は同一 record の内容だけを変える
- slug key は `a-z0-9._:-~` の lower-case subset を使い、title や表示名の更新で rkey を変えない
- opaque key も同じ lower-case subset を使い、API が生成する。caller は key の意味を前提にしない
