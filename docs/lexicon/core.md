# コア namespace

Cerulia の product-core に含める record 群を app.cerulia.core.* に整理する。

## NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.core.house | record | stable | コミュニティの anchor |
| app.cerulia.core.campaign | record | stable | 長期卓のセッションシリーズ |
| app.cerulia.core.rulesetManifest | record | stable | ルールシステムの定義 |
| app.cerulia.core.ruleProfile | record | stable | house / campaign のハウスルール overlay |
| app.cerulia.core.characterSheetSchema | record | stable | キャラクターシートの型定義 |
| app.cerulia.core.characterSheet | record | stable | キャラクター原本 |
| app.cerulia.core.characterBranch | record | stable | campaign 別分岐 |
| app.cerulia.core.characterConversion | record | tid | ruleset をまたぐ変換 provenance |
| app.cerulia.core.characterAdvancement | record | tid | 成長・変更の履歴 |
| app.cerulia.core.session | record | tid | PL のセッション経験記録 |
| app.cerulia.core.scenario | record | stable | シナリオの公開台帳 |

## core に入れるもの

- house、campaign の scope
- ruleset の contract と overlay
- character-sheet-schema による型定義
- character の所有、分岐、変換 provenance、成長
- session による PL 自身のセッション経験記録
- scenario の公開台帳

## core に入れないもの

- session の run authority
- membership と参加承認
- board、message、roll、replay
- disclosure、secret、handout
- 越境利用の裁定
- アクセス制限

## ruleset 拡張の考え方

- ruleProfile は house、campaign の順で後勝ちに重ねる（2 層）
- character-sheet-schema で sheet の型を定義し、sheet は sheetSchemaRef で pin する
- ruleset-manifest は rulesetNsid + sheetSchemaRefs の chain を提供する
