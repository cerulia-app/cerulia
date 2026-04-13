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
# コア namespace

ここでは、Cerulia の product-core に含める record 群を app.cerulia.core.* に分ける前提で整理する。

## 推奨 NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.core.world | record | stable | canon / setting scope |
| app.cerulia.core.house | record | stable | コミュニティの単位 |
| app.cerulia.core.campaign | record | stable | セッションのシリーズ |
| app.cerulia.core.rulesetManifest | record | stable | system contract の pin |
| app.cerulia.core.ruleProfile | record | stable | world / house / campaign の rule overlay |
| app.cerulia.core.characterSheetSchema | record | stable | キャラクターシートの型定義 |
| app.cerulia.core.characterSheet | record | stable | 持ち運べるキャラクター原本 |
| app.cerulia.core.characterBranch | record | stable | durable な派生と ownership boundary |
| app.cerulia.core.characterConversion | record | tid | ruleset をまたぐ変換 provenance ledger |
| app.cerulia.core.characterAdvancement | record | tid | 成長、retrain、retcon の append-only 履歴 |
| app.cerulia.core.session | record | tid | セッション記録（GM の repo） |
| app.cerulia.core.sessionParticipation | record | tid | セッション参加の自己リンク（プレイヤーの repo） |
| app.cerulia.core.scenario | record | stable | シナリオの公開台帳 |
| app.cerulia.core.publication | record | tid | 公開入口の ledger |

## core に入れるもの

- house、campaign の scope
- ruleset の contract と overlay
- character-sheet-schema による型定義
- character の所有、分岐、変換 provenance、成長
- session と session-participation による遊んだ記録
- scenario の公開台帳
- publication と retire の正本
- append-only correction と provenance

## core に入れないもの

- session の run authority（開始、一時停止、権限移譲）
- membership と dispute workflow
- board、message、roll、replay
- secret、reveal、redaction の disclosure workflow
- 越境利用の許可・禁止の裁定

## ruleset 拡張の考え方

core record には、ruleset ごとに変わりにくい provenance だけを置く。

- campaign.rulesetManifestRef は immutable な contract version を pin する
- ruleProfile は world、house、campaign の順で後勝ちに重ねる
- character-sheet-schema で sheet の型を定義し、sheet は sheetSchemaRef で pin する
- publication は campaign、characterBranch、session のいずれかを subject として公開してよい
