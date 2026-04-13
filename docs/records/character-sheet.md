# character-sheet

## 役割

キャラクター原本。PL が持ち運べる設定、基本能力、立ち絵などの土台を表す。sheet 作成時に常に default branch がペアで生成される。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- sheetSchemaRef（任意: character-sheet-schema への参照）
- rulesetNsid
- displayName
- portraitRef
- publicProfile
- stats
- visibility（draft / public）
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
- sheetSchemaRef がある場合、stats は fieldDefs に準拠する構造化 payload として扱う。sheetSchemaRef がない場合、stats は自由形式の JSON payload
- sheetSchemaRef は character-sheet-schema の特定バージョンを pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- 一時状態や外部 context の current overlay は入れない
- visibility: draft の sheet は AppView の一覧から除外されるが、AT Protocol 上は公開されている
- ruleset をまたぐ変換 provenance は character-conversion で残す
