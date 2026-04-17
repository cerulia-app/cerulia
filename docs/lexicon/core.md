# コア namespace

Cerulia の product-core に含める record 群を app.cerulia.core.* に整理する。

## NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.core.house | record | any: lower-case slug | コミュニティの anchor |
| app.cerulia.core.campaign | record | any: lower-case slug | 長期卓のセッションシリーズ |
| app.cerulia.core.ruleProfile | record | any: lower-case opaque token | house / campaign のハウスルール overlay |
| app.cerulia.core.characterSheetSchema | record | any: lower-case opaque token | キャラクターシートの型定義 |
| app.cerulia.core.characterSheet | record | any: lower-case opaque token | キャラクター原本 |
| app.cerulia.core.characterBranch | record | any: lower-case opaque token | campaign 別分岐 |
| app.cerulia.core.characterConversion | record | tid | ruleset をまたぐ変換 provenance |
| app.cerulia.core.characterAdvancement | record | tid | 成長・変更の履歴 |
| app.cerulia.core.session | record | tid | PL のセッション経験記録 |
| app.cerulia.core.playerProfile | record | literal:self | PL 自己紹介プロフィール |
| app.cerulia.core.scenario | record | any: lower-case slug | シナリオの公開台帳 |

## core に入れるもの

- house、campaign の scope
- ruleset ごとの schema と overlay
- character-sheet-schema による型定義
- character の所有、分岐、変換 provenance、成長
- session による PL 自身のセッション経験記録
- player-profile による PL 自己紹介と卓前共有
- scenario の公開台帳

## core に入れないもの

- session の run authority
- membership と参加承認
- board、message、roll、replay
- disclosure、secret、handout
- 越境利用の裁定
- アクセス制限

## ruleset 拡張の考え方

- house default ruleProfile は campaign 作成時の seed source とし、live な effective overlay は campaign.sharedRuleProfileRefs だけで解決する
- character-sheet-schema で sheet の型を定義し、sheet は sheetSchemaRef で pin する
- character-sheet-schema は rulesetNsid ごとに並び、generic create flow は明示選択で使う

## record-key 固定方針

- `literal:self` を使うのは singleton record である player-profile だけとする
- `tid` を使う collection は log と provenance を表し、create 時刻に近い loose ordering を得るために使う
- `any` を使う stable collection は、AT Protocol の record-key baseline に従う lower-case ASCII key に固定する
- `house`、`campaign`、`scenario` は owner が意味を持って選べる slug key を使い、作成後に変更しない
- `ruleProfile`、`characterSheetSchema`、`characterSheet`、`characterBranch` は API が生成する opaque key を使い、表示名や title の変更で rkey を変えない
- slug key は create 時に API が title から deterministic に生成し、同一 collection 内で衝突した場合は `-2`, `-3` のような suffix を付けて一意化する
- houseId と campaignId は rkey の別名として扱う。cross-record identity は常に `*Ref` at-uri を使い、houseId / campaignId を参照キーに使わない
