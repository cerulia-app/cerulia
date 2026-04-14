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
- ownerDid
- maintainerDids
- createdAt

### fieldDefs

フィールド定義のリスト。再帰的な構造（グループ、配列）を許す。

各 entry は次を持つ。

- fieldId（一意な識別子）
- label（表示名）
- fieldType（integer, string, boolean, enum, group, array）
- children（任意: group / array の場合の子フィールド定義）
- itemDef（任意: array の場合の要素定義）
- valueRange（任意: { min?, max? } や enum の選択肢）
- required（必須かどうか）
- description（任意: フィールドの説明）
- extensible（任意: group で追加 field を許可するか）
- additionalFieldDef（任意: extensible な group に追加される field の型テンプレート）

### 再帰構造の方針

fieldDefs はグループ（section）と配列（list of objects）を許す。これにより「能力値」セクション内に STR, DEX... を置いたり、技能リストを配列で表現できる。ただし core schema に universal DSL を押し込まない。extensible な group は未定義 field を受け入れてよく、追加 field は additionalFieldDef に従って validate する。deep nesting の上限や具体的な型名は将来の実装で詰める。

## 発行主体

schema の ownerDid、または maintainerDids に含まれる actorが、新しい schema record version を発行できる。

## 参照関係

- character-sheet（sheetSchemaRef から参照される）

## 設計上の注意

- character-sheet-schema は immutable pin として扱う。更新するときは新しい record を作る。既存 record を上書きしない
- character-sheet は特定バージョンの schema を sheetSchemaRef で pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- character-sheet.stats は sheetSchemaRef がある場合 fieldDefs に準拠する構造化 payload として扱う。AppView は preflight validation を行い、API は authoritative validation を再実行する
- extensible な group では、schema に未列挙の追加 field も valid とする。CoC 汎用 schema の追加技能のようなケースをここで受け止める
- extensible でない位置の未定義 field は invalid とする。authoritative validation はこれを reject する
- rules provenance 層に属する record であり、character data を混ぜない
- maintainerDids は schema record のみを更新できる。character 系 record の write authority には影響しない
- baseRulesetNsid で、どのシステム向けの schema かを識別する。ハウスルール版は同じ baseRulesetNsid で別の schema record を作ってよい
