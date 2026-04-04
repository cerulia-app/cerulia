# コア namespace

ここでは、Cerulia の continuity core に含める record 群を app.cerulia.core.* に分ける前提で整理する。archive 側の session / governance / disclosure / board / replay はこの namespace に含めない。

## 推奨 NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.core.world | record | stable | canon / setting scope |
| app.cerulia.core.house | record | stable | community / policy scope |
| app.cerulia.core.campaign | record | stable | continuity scope |
| app.cerulia.core.rulesetManifest | record | stable | continuity contract の pin |
| app.cerulia.core.ruleProfile | record | stable | world / house / campaign の continuity overlay |
| app.cerulia.core.characterSheet | record | stable | 持ち運べるキャラクター原本 |
| app.cerulia.core.characterBranch | record | stable | durable な派生と ownership boundary |
| app.cerulia.core.characterConversion | record | tid | ruleset をまたぐ変換 provenance ledger |
| app.cerulia.core.characterAdvancement | record | tid | 成長、retrain、retcon の append-only 履歴 |
| app.cerulia.core.characterEpisode | record | tid | branch 中心の continuity summary |
| app.cerulia.core.publication | record | tid | continuity artifact の公開入口 ledger |
| app.cerulia.core.reuseGrant | record | tid | cross-boundary reuse の明示許可 |

## core に入れるもの

- world、house、campaign の continuity scope
- ruleset の executable contract と continuity overlay
- character の所有、分岐、変換 provenance、成長、要約
- publication と retire の正本
- reuse と revoke の正本
- append-only correction と provenance

## core に入れないもの

- session と run authority
- membership と dispute workflow
- board、message、roll、replay
- secret、reveal、redaction の disclosure workflow
- 特定 ruleset 専用の能力値セット

## ruleset 拡張の考え方

core record には、ruleset ごとに変わりにくい continuity provenance だけを置く。

- campaign.rulesetManifestRef は immutable な continuity contract version を pin する
- ruleProfile は world、house、campaign の順で後勝ちに重ねる
- characterEpisode は episode 作成時点の continuity chain を snapshot し、growth fact の正本は characterAdvancement に残す
- publication は campaign、characterBranch、characterEpisode のいずれかを subject として公開してよい
- reuseGrant は default policy では足りない boundary crossing を explicit に説明する
