# character-sheet-schema

## 役割

キャラクターシートの型定義。system やハウスルールによって決まるフィールド、型、値の範囲を定義する。character-sheet はこの schema を参照してキャラクターを作成する。分散的に公開でき、CoC 版、特定ハウスルール版のような schema を誰でも作れる。

## 置き場所

schema 作者の repo。

record-key は API が生成する lower-case opaque token とする。schema の version pin は `schemaVersion` field で表し、rkey を current-head alias に使わない。

## 主なフィールド

- baseRulesetNsid
- schemaVersion
- title（public-safe な表示名）
- authoring（任意: 作成支援メタデータ）
- fieldDefs
- ownerDid
- createdAt

### authoring

schema-backed character 作成のための **任意の authoring metadata**。character ledger の durable truth ではなく、AppView の作成導線で「どの値をどの生成ルールで埋めてよいか」を宣言する。

- `authoring.creationRules`: schema 全体の creation recipe。単一 field に閉じない cross-field の作成ルール（能力値の一括生成、順序、依存関係）を表現できる。

#### creationRules の検証規則（authoritative）

`authoring.creationRules` を解釈する実装は、次の条件を **invalid として reject** しなければならない。

- `ruleId` の重複がある
- `dependsOnRuleIds` が未知の `ruleId` を参照している
- `dependsOnRuleIds` による依存関係に cycle（循環依存）がある

#### kind と payload の最小整合規則

`creationRule.kind` と payload の関係は、次の最小条件だけを固定する。

- `kind = "dice"` のとき `dice` は必須（`dice.expression` を含む）

#### targetFieldIds の参照整合規則（authoritative）

`creationRule.targetFieldIds` は、同一 schema の `fieldDefs` に宣言されている `fieldId`（再帰構造の下位 field を含む）を参照しなければならない。未定義の `fieldId` を含む `targetFieldIds` は invalid として reject する。

### fieldDefs

フィールド定義のリスト。再帰的な構造（グループ、配列）を許す。

各 entry は次を持つ。

- fieldId（一意な識別子）
- label（表示名。public-safe に限る）
- fieldType（integer, string, boolean, enum, group, array）
- children（任意: group / array の場合の子フィールド定義）
- itemDef（任意: array の場合の要素定義）
- valueRange（任意: { min?, max? } や enum の選択肢）
- required（必須かどうか）
- description（任意: フィールドの説明。public-safe な説明に限る）
- extensible（任意: group で追加 field を許可するか）
- additionalFieldDef（任意: extensible な group に追加される field の型テンプレート）

### 再帰構造の方針

fieldDefs はグループ（section）と配列（list of objects）を許す。これにより「能力値」セクション内に STR, DEX... を置いたり、技能リストを配列で表現できる。ただし core schema に universal DSL を押し込まない。extensible な group は未定義 field を受け入れてよく、追加 field は additionalFieldDef に従って validate する。

再帰構造の規範は次に固定する。

- container depth は root から最大 3 層までとする
- array の itemDef は scalar または group に限る。array of array は許可しない
- extensible を付けられるのは group field だけとする
- additionalFieldDef は 1 つの追加 child field shape を表し、自身を extensible にしてはならない

## 発行主体

schema の ownerDid が、新しい schema record version を発行できる。

## 参照関係

- character-sheet（sheetSchemaPin から exact pin 参照される）

## 設計上の注意

- character-sheet-schema は immutable pin として扱う。更新するときは新しい record を作る。既存 record を上書きしない
- character-sheet は特定バージョンの schema を sheetSchemaPin で pin する。schema が更新されても、sheet は自分で rebase するまで古い定義で valid のまま動く
- character-sheet.stats は sheetSchemaPin がある場合 fieldDefs に準拠する構造化 payload として扱う。AppView は preflight validation を行い、API は authoritative validation を再実行する
- API は exact pin を live repo read で検証し、必要に応じて verified pin cache を使って再解決してよい。ただし canonical truth は常に schema owner の repo にある
- AppView の schema picker に出す短い説明は、追加の author text field を持たず、baseRulesetNsid、fieldDefs の構造、extensible 有無などの metadata から導出してよい
- extensible な group では、schema に未列挙の追加 field も valid とする。CoC 汎用 schema の追加技能のようなケースをここで受け止める
- extensible でない位置の未定義 field は invalid とする。authoritative validation はこれを reject する
- rules provenance 層に属する record であり、character data を混ぜない
- baseRulesetNsid で、どのシステム向けの schema かを識別する。ハウスルール版は同じ baseRulesetNsid で別の schema record を作ってよい
