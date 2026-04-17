# rule-profile

## 役割

base ruleset の上に重ねるハウスルール overlay record。house や campaign が独自のルール調整を持つときに使う。

## 置き場所

scope に応じて置き場所を分ける。

- house shared の profile は house owner の repo
- campaign shared の profile は campaign owner の repo

## 主なフィールド

- baseRulesetNsid
- profileTitle
- scopeKind（house-shared / campaign-shared）
- scopeRef
- rulesPatchUri
- ownerDid
- createdAt
- updatedAt

## 更新主体

ownerDid。

## 参照関係

- house
- campaign

## 設計上の注意

- rule-profile は rules provenance の public-only record とする。visibility: draft/public lifecycle には参加させない
- rule-profile は mutable current-head record として扱う。schema のような versioned pin にはしない
- rule-profile に archived / retired の別 status axis は持たせない。無効化や置換は scope 側の参照から外すことで表現する
- public shared surface は raw rule-profile を直接読まず、campaign / house projection に畳み込まれた overlay summary を使う
- overlay summary は raw rule-profile の `profileTitle`、`scopeKind`、`rulesPatchUri` から導出し、別の summary field は持たない
- scopeKind は house-shared、campaign-shared の閉じた値
- scopeRef は、その profile がどの scope に属するかを指す
- profileTitle は public-safe な overlay 名に限る
- overlay 順序の live 解決は campaign.sharedRuleProfileRefs に materialize された順序だけを見る。house-shared は campaign 作成時の seed source にとどまる
- rulesPatchUri はルール差分の本文やドキュメントを指す external URI
- rulesPatchUri は public-safe で永続参照可能な URI だけを使う。owner-only 文書へのリンクは入れない
- ownerDid は rule-profile record 自体の更新主体を表す
