# レイヤー構成

## 全体像

Cerulia は continuity core を主役にし、その上に必要な extension を後付けする。

### Continuity Core

| レイヤー | 役割 | 主に使う要素 | 典型的なデータ |
| --- | --- | --- | --- |
| アイデンティティ層 | 誰が誰かを確定する | DID、handle、OAuth | 利用者識別、署名主体 |
| continuity scope 層 | 継続性と provenance の anchor | world、house、campaign | 共有方針、seed rule、continuity boundary |
| rules provenance 層 | どの契約で continuity を解釈するか | ruleset-manifest、rule-profile | ruleset pin、continuity overlay |
| character ledger 層 | キャラクターの durable な継続線 | character-sheet、character-branch、character-conversion、character-advancement、character-episode | 所有、分岐、変換 provenance、成長、要約 |
| publication / reuse 層 | 公開、退役、越境共有を追う | publication、reuse-grant | public entry、retire、reuse boundary |
| projection 層 | continuity artifact を見やすく返す | AppView、集約キャッシュ | character home、campaign view、publication summary |

projection 層の contract は [projection contract](projections.md) で固定し、transport schema より先に決める。

### Optional Extensions

| 拡張 | 役割 | 主に使う要素 |
| --- | --- | --- |
| structured run | 一時的な run artifact を持つ | session、character-instance、character-state |
| run authority | shared mutation の確定主体を置く | session-authority、membership |
| live-play events | message、roll、ruling、replay を持つ | message、roll、ruling-event |
| disclosure | secret payload と公開境界を扱う | audience、audience-grant、secret-envelope、reveal-event、redaction-event |
| board / realtime | 盤面と高頻度同期 | scene、token、board-op、board-snapshot |
| disputes | contested run moderation を扱う | appeal-case、appeal-review-entry |

## 一番重要な境界

### 1. continuity core は session なしで成立しなければならない

campaign と character lineage と publication が揃っていれば、session が無くても product の主価値は成立する。

### 2. publication の正本を carrier にしない

Bluesky の post や profile は公開の carrier であり、正本は core の publication ledger に持つ。

### 3. rules provenance と run override を分ける

core は world / house / campaign の continuity overlay を扱い、session override や temporary ruling は extension へ閉じる。

### 4. correction と revocation を混ぜない

supersedes は内容の訂正、retire は公開入口の終了、revoke は将来の権利停止である。これらを一つの field や procedure に混ぜない。

### 5. extension は core を参照しても core を再定義しない

session extension は branch ownership、campaign continuity、publication の正本を書き換えず、必要な summary や carrier 情報だけを足す。

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
- rule schema 参照

### optional run authority repo

- session
- session-authority
- membership
- session-publication
- run event と secret/disclosure artifact

### projection / cache

- character home
- campaign view
- publication summary
- optional run shell

## 実装上の基本フロー

1. クライアントが OAuth で認証される。
2. core projection は character home と campaign view を返す。
3. 共有したい continuity artifact があるときは publication を追加する。
4. 継続線をまたぐ共有を許可したいときは reuse-grant を追加する。
5. ruleset をまたぐ変換を確定したいときは、source / target contract を pin した character-conversion を target branch に紐づけて積む。
6. 成長や訂正は character-advancement に、要約は character-episode に積む。
7. live play が必要な場合だけ extension が session と authority を立ち上げる。

この分離を守ると、core の価値を保ったまま optional extension を追加できる。