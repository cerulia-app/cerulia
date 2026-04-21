# character-sheet

## 役割

character-branch が current head として参照する、ruleset-bound な sheet snapshot。PL が持ち運べる設定、基本能力、立ち絵などの土台を表す。sheet 作成時には default branch が生成され、その `sheetRef` が新しい sheet を指す。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- sheetSchemaRef（active record では必須: character-sheet-schema への参照。schema-less は legacy/import/recovery の historical record のみ）
- rulesetNsid
- displayName
- portraitBlob
- profileSummary
- stats
- version
- createdAt
- updatedAt

## 更新主体

owner のみ。

## 参照関係

- character-branch が `sheetRef` として current head を参照する
- character-sheet-schema（sheetSchemaRef で参照）
- character-conversion が source / target sheet として参照する

## 設計上の注意

- sheet 作成時に default branch が自動的にペアで生成され、その branch の `sheetRef` は新しい sheet を指す
- 公開 / 非公開の正本は branch.visibility とする。sheet 自体は shared surface の visibility を持たない
- active record では sheetSchemaRef を必須とし、stats は fieldDefs に準拠する構造化 payload として扱う。schema が extensible な group を持つ場合、その追加 field も valid とする。sheetSchemaRef がない場合、stats は自由形式の JSON payloadだが、legacy/import/recovery 用に限る
- sheetSchemaRef がない legacy/import/recovery payload でも、stats は public-safe に限る。historical intake や editor 保存時に non-public-safe な内容は sanitize または reject する
- sheetSchemaRef は character-sheet-schema の特定バージョンを pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- sheetSchemaRef がある場合、`sheetSchemaRef.baseRulesetNsid == rulesetNsid` を満たさなければならない
- sheetSchemaRef を変更する操作は通常編集ではなく、`rebaseCharacterSheet` のような明示 rebase operation で扱う。ruleset 自体の切り替えは rebase ではなく character-conversion が扱う
- version は create 時に 1 で始まり、accepted な updateCharacterSheet / rebaseCharacterSheet ごとに 1 ずつ増やす
- displayName は public-safe なキャラクター名に限る
- `portraitBlob` は owner repo に upload 済みの blob metadata を使う。外部 image URL や他人 repo の blob 参照は入れない
- profileSummary は public-safe なキャラクター紹介の本文であり、別の disclosure / access-control 機構を意味しない
- 一時状態や外部 context の current overlay は入れない
- createBranch は source branch の current resolved state から新しい sheet snapshot を materialize し、新 branch の `sheetRef` に置く
- same branch の ruleset 切り替えでは、character-conversion が新しい target sheet snapshot を作り、その branch の `sheetRef` を target に進める
- ruleset をまたぐ変換 provenance は character-conversion で残す
- AppView と通常 XRPC の create flow は sheetSchemaRef を必須とする
- sheetSchemaRef が無い sheet は AppView の owner workbench で raw JSON fallback view / editor を使ってよい。これは legacy/import/recovery 用の safety valve であり、通常の新規作成導線では使わない
- sheetSchemaRef が無い sheet でも shared detail route 自体は持てるが、public / anonymous には structured stats block を出さない。raw JSON も public record であるため public-safe な内容に限り、shared surface の主要 block にはしない
