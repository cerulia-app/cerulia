# character-sheet-schema

## 役割

キャラクターシートの型定義。system やハウスルールによって決まるフィールド、型、値の範囲を定義する。character-sheet はこの schema を参照してキャラクターを作成する。分散的に公開でき、CoC 版、特定ハウスルール版のような schema を誰でも作れる。

## 置き場所

schema 作者または maintainer の repo。

## 主なフィールド

- baseRulesetNsid
- schemaVersion
- title
- fieldDefs
- supersedesRef
- ownerDid
- maintainerDids
- createdAt

### fieldDefs

フィールド定義のリスト。各 entry は次を持つ。

- fieldId（一意な識別子）
- label（表示名）
- fieldType（integer, string, boolean, enum, etc.）
- valueRange（任意: { min?, max? } や enum の選択肢）
- required（必須かどうか）
- description（任意: フィールドの説明）

## 更新主体

schema の ownerDid、または maintainerDids に含まれる actor。

## 参照関係

- ruleset-manifest（baseRulesetNsid で間接的に関連）
- character-sheet（sheetSchemaRef から参照される）

## 設計上の注意

- character-sheet-schema は immutable pin として扱う。更新するときは新しい record を作り supersedesRef で繋ぐ。既存 record を上書きしない
- character-sheet は特定バージョンの schema を sheetSchemaRef で pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- fieldDefs は schema 作者の意図する完全な定義を含む。ただし core schema に universal DSL を押し込まない
- rules provenance 層に属する record であり、character data を混ぜない
- maintainerDids は schema record のみを更新できる。character 系 record の write authority には影響しない
- baseRulesetNsid で、どのシステム向けの schema かを識別する。ハウスルール版は同じ baseRulesetNsid で別の schema record を作ってよい
