# character-sheet

## 役割

キャラクター原本。PL が持ち運べる設定、基本能力、立ち絵などの土台を表す。sheet 作成時に常に default branch がペアで生成される。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- sheetSchemaRef（active record では必須: character-sheet-schema への参照。schema-less は legacy/import/recovery の historical record のみ）
- rulesetNsid
- displayName
- portraitRef
- profileSummary
- stats
- version
- createdAt
- updatedAt

## 更新主体

owner のみ。

## 参照関係

- character-branch が baseSheetRef として参照する
- character-sheet-schema（sheetSchemaRef で参照）

## 設計上の注意

- sheet 作成時に default branch が自動的にペアで生成される。branch なしの sheet は存在しない
- 公開 / 非公開の正本は branch.visibility とする。sheet 自体は shared surface の visibility を持たない
- active record では sheetSchemaRef を必須とし、stats は fieldDefs に準拠する構造化 payload として扱う。schema が extensible な group を持つ場合、その追加 field も valid とする。sheetSchemaRef がない場合、stats は自由形式の JSON payloadだが、legacy/import/recovery 用に限る
- sheetSchemaRef は character-sheet-schema の特定バージョンを pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- sheetSchemaRef がある場合、`sheetSchemaRef.baseRulesetNsid == rulesetNsid` を満たさなければならない
- sheetSchemaRef を変更する操作は通常編集ではなく、`rebaseCharacterSheet` のような明示 rebase operation で扱う
- version は create 時に 1 で始まり、accepted な updateCharacterSheet / rebaseCharacterSheet ごとに 1 ずつ増やす
- profileSummary はキャラクター紹介の本文であり、別の disclosure / access-control 機構を意味しない
- 一時状態や外部 context の current overlay は入れない
- ruleset をまたぐ変換 provenance は character-conversion で残す
- AppView と通常 XRPC の create flow は sheetSchemaRef を必須とする
- sheetSchemaRef が無い sheet は AppView の owner workbench で raw JSON fallback view / editor を使ってよい。これは legacy/import/recovery 用の safety valve であり、通常の新規作成導線では使わない
- sheetSchemaRef が無い sheet でも shared detail route 自体は持てるが、public / anonymous には structured stats block を出さない。raw JSON も public record であるため public-safe な内容に限り、shared surface の主要 block にはしない
