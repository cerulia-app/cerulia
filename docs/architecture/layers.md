# レイヤー構成

## 全体像

Cerulia の product-core は character history service を中心に閉じる。layer は次の 6 層で足りる。

| レイヤー | 役割 | 主に使う要素 | 典型的なデータ |
| --- | --- | --- | --- |
| アイデンティティ層 | 誰が誰かを確定する | DID、handle、OAuth | actor 識別、署名主体 |
| scope 層 | セッションやキャラクターの文脈 | house、campaign | コミュニティ方針、セッションシリーズ |
| rules provenance 層 | どのルールで遊んでいるか | ruleset-manifest、rule-profile、character-sheet-schema | system 定義、ハウスルール、シート型 |
| character ledger 層 | キャラクターの durable な継続線 | character-sheet、character-branch、character-conversion、character-advancement | 所有、分岐、変換 provenance、成長 |
| session history 層 | 遊んだ記録 | session、session-participation、scenario | いつ誰とどのシナリオを遊んだか |
| publication 層 | 公開と退役を追う | publication | public entry、retire |

## projection 層

上記の canonical record から read model を導出する。

- character home
- campaign view
- publication summary
- scenario catalog
- house activity（session の逆引き）

## 一番重要な境界

### 1. キャラクター状態の変更は owner のみ

character-sheet、character-branch、character-advancement の write authority は常に owner だけに閉じる。session や campaign の管理者がこれらを書き換えることはない。

### 2. session は記録であり、run control ではない

session は終わったプレイの記録であり、開始中、参加承認中、権限移譲中のような lifecycle を持たない。

### 3. publication の正本を carrier にしない

外向け post、thread、app card、URL は導線であり、正本は publication ledger に持つ。carrier 更新の都合で core publication の意味を変えない。

### 4. rules provenance と character data を分ける

character-sheet-schema は rules provenance 層に置く。character-sheet には sheetSchemaRef で参照するだけにし、型定義を sheet 本体に埋め込まない。

### 5. correction と retire を混ぜない

supersedes は内容の訂正、retire は公開入口の終了である。これらを一つの workflow に押し込まない。

## どこに何を置くか

### 個人 repo（character owner）

- character-sheet
- character-branch
- character-conversion
- character-advancement
- session-participation
- branch owner 起点の publication

### GM / 主催者 repo

- session

### scope owner repo

- campaign
- house

### scenario / ruleset maintainer repo

- scenario
- ruleset-manifest
- rule-profile
- character-sheet-schema

### projection / cache

- character home
- campaign view
- publication summary
- scenario catalog
- house activity

## 実装上の基本フロー

1. クライアントが OAuth で認証される。
2. product-core projection は character home と campaign view を返す。
3. GM がセッション後に session record を作る。参加者を名前または characterBranchRef で記録する。
4. プレイヤーが任意で session-participation を自分の repo に書き、session にリンクする。
5. キャラクターの成長は owner が character-advancement に書く。sessionRef で任意にリンクする。
6. continuity artifact を公開したいときは publication を追加する。
