# レイヤー構成

## 全体像

Cerulia の product-core は continuity ledger を中心に閉じる。layer は次の 6 層で足りる。

| レイヤー | 役割 | 主に使う要素 | 典型的なデータ |
| --- | --- | --- | --- |
| アイデンティティ層 | 誰が誰かを確定する | DID、handle、OAuth | actor 識別、署名主体 |
| continuity scope 層 | 継続性と provenance の anchor | world、house、campaign | 共有方針、seed rule、continuity boundary |
| rules provenance 層 | どの契約で continuity を解釈するか | ruleset-manifest、rule-profile | ruleset pin、continuity overlay |
| character ledger 層 | キャラクターの durable な継続線 | character-sheet、character-branch、character-conversion、character-advancement、character-episode | 所有、分岐、変換 provenance、成長、要約 |
| publication / reuse 層 | 公開、退役、越境共有を追う | publication、reuse-grant | public entry、retire、reuse boundary |
| projection 層 | continuity artifact を見やすく返す | character home、campaign view、publication summary | AppView 向け read model |

archive 側に保存した session / governance / disclosure / board / replay は、この layer 構成の一部ではない。現行 product の責務にも入らない。

## 一番重要な境界

### 1. continuity core は product 単体で成立しなければならない

campaign と character lineage と publication が揃っていれば、Cerulia の主価値は成立する。外部の runtime、carrier、social surface を前提にしない。

### 2. publication の正本を carrier にしない

外向け post、thread、app card、URL は導線であり、正本は publication ledger に持つ。carrier 更新の都合で core publication の意味を変えない。

### 3. rules provenance と summary を分ける

core は world / house / campaign の continuity overlay を扱い、summary は episode や projection に閉じる。外部の進行事情や temporary ruling を rules provenance に混ぜない。

### 4. correction と revocation を混ぜない

supersedes は内容の訂正、retire は公開入口の終了、revoke は将来の権利停止である。これらを一つの workflow に押し込まない。

### 5. archive は source set に入れない

archive は履歴保存のために repo に残すが、contract 生成、validation、test gate、product 実装計画の入力にしない。

## どこに何を置くか

### 個人 repo

- character-sheet
- character-branch
- character-conversion
- character-advancement
- character-episode
- branch owner 起点の publication
- branch owner 起点の reuse-grant

### continuity steward repo

- world
- house
- campaign
- continuity scope の rule-profile
- campaign publication

### ruleset / library repo

- ruleset-manifest
- rule-profile seed
- rules schema 参照

### projection / cache

- character home
- campaign view
- publication summary

## 実装上の基本フロー

1. クライアントが OAuth で認証される。
2. product-core projection は character home と campaign view を返す。
3. continuity artifact を公開したいときは publication を追加する。
4. 継続線をまたぐ共有を許可したいときは reuse-grant を追加する。
5. ruleset をまたぐ変換を確定したいときは、source / target contract を pin した character-conversion を target branch に紐づけて積む。
6. 成長や訂正は character-advancement に、要約は character-episode に積む。

この分離を守ると、Cerulia は session-centric な product へ戻らずに continuity service として閉じられる。
