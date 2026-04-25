# コア namespace

Cerulia の product-core に含める record 群を app.cerulia.dev.core.* に整理する。

`app.cerulia.core.*` の bare namespace は互換 alias として受け入れるが、文書上の canonical source-of-truth は `app.cerulia.dev.core.*` に固定する。

## NSID 一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.dev.core.house | record | any: lower-case slug | コミュニティの anchor |
| app.cerulia.dev.core.campaign | record | any: lower-case slug | 長期卓のセッションシリーズ |
| app.cerulia.dev.core.ruleProfile | record | any: lower-case opaque token | house / campaign のハウスルール overlay |
| app.cerulia.dev.core.characterSheetSchema | record | any: lower-case opaque token | キャラクターシートの型定義 |
| app.cerulia.dev.core.characterSheet | record | any: lower-case opaque token | branch が現在参照する sheet snapshot |
| app.cerulia.dev.core.characterBranch | record | any: lower-case opaque token | stable な継続線と shared root |
| app.cerulia.dev.core.characterConversion | record | tid | branch 上の ruleset 切り替え provenance |
| app.cerulia.dev.core.characterAdvancement | record | tid | 成長・変更の履歴 |
| app.cerulia.dev.core.session | record | tid | PL のセッション経験記録 |
| app.cerulia.dev.core.playerProfile | record | literal:self | PL 自己紹介プロフィール |
| app.cerulia.dev.core.scenario | record | any: lower-case slug | シナリオの公開台帳 |

## core に入れるもの

- house、campaign の scope
- ruleset ごとの schema と overlay
- character-sheet-schema による型定義
- character の current snapshot、継続線、分岐、ruleset 切り替え provenance、成長
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
- character-sheet-schema で sheet の型を定義し、sheet は sheetSchemaPin（`{ uri, cid }`）で exact pin する
- character-sheet-schema は rulesetNsid ごとに並び、generic create flow は明示選択で使う

## record-key 固定方針

- `literal:self` を使うのは singleton record である player-profile だけとする
- `tid` を使う collection は log と provenance を表し、create 時刻に近い loose ordering を得るために使う
- `any` を使う stable collection は、AT Protocol の record-key baseline に従う lower-case ASCII key に固定する
- `house`、`campaign`、`scenario` は owner が意味を持って選べる slug key を使い、作成後に変更しない
- `ruleProfile`、`characterSheetSchema`、`characterSheet`、`characterBranch` は API が生成する opaque key を使い、表示名や title の変更で rkey を変えない
- slug key は create 時に API が title から deterministic に生成し、同一 collection 内で衝突した場合は `-2`, `-3` のような suffix を付けて一意化する
- houseId と campaignId は rkey の別名として扱う。cross-record identity は常に `*Ref` at-uri を使い、houseId / campaignId を参照キーに使わない
