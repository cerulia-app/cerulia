# レイヤー構成

## 全体像

Cerulia の product-core は PL 個人向けのキャラクター管理・セッション記録・共有サービスを中心に閉じる。layer は次の 5 層で足りる。

| レイヤー | 役割 | 主に使う要素 | 典型的なデータ |
| --- | --- | --- | --- |
| アイデンティティ層 | 誰が誰かを確定する | DID、handle、OAuth | actor 識別、署名主体 |
| scope 層 | セッションやキャラクターの文脈 | house、campaign | コミュニティ方針、世界観ラベル、セッションシリーズ |
| rules provenance 層 | どのルールで遊んでいるか | rule-profile、character-sheet-schema | system 定義、ハウスルール、シート型 |
| character ledger 層 | キャラクターの durable な継続線 | character-sheet、character-branch、character-conversion、character-advancement | 所有、分岐、変換 provenance、成長 |
| session history 層 | 遊んだ記録 | session、scenario | いつどのシナリオをどのキャラで遊んだか |

## projection 層

上記の canonical record から read model を導出する。

- character home（PL のキャラクター一覧・詳細）
- campaign view（長期卓のセッション一覧）
- scenario catalog（シナリオ検索・一覧）
- house activity（house に紐づくセッション・キャラクターの逆引き）

projection は全 record から自動生成する。PL による手動の curate は不要。

## 一番重要な境界

### 1. PL の個人アプリである

全ての record は PL が自分の repo に書く。GM も PL である。「GM 用の record」と「PL 用の record」の区別はない。

### 2. キャラクター状態の変更は owner のみ

character-sheet、character-branch、character-advancement の write authority は常に owner だけに閉じる。

### 3. session は記録であり、run control ではない

session は遊んだ後の記録であり、開始中、参加承認中、権限移譲中のような lifecycle を持たない。

### 4. 全 record は原則公開

AT Protocol 上の record は原則公開される。visibility: draft は AppView の表示制御であり、AT Protocol レベルの秘匿ではない。Cerulia AppView では draft は一覧や発見導線からは隠すが、direct link では draft 状態を明示して解決する。

### 5. 他人について書かない

他人の DID や characterBranchRef を自分の record に含めない。他のプレイヤーとのリンクは、各自が自分で session 記録を書くことで projection が自動的に成立させる。

### 6. rules provenance と character data を分ける

character-sheet-schema は rules provenance 層に置く。character-sheet には sheetSchemaRef で参照するだけにし、型定義を sheet 本体に埋め込まない。

## どこに何を置くか

### PL の個人 repo

- character-sheet
- character-branch
- character-advancement
- character-conversion
- session

### shared-maintained repo

- campaign
- house

### scenario / schema maintainer repo

- scenario
- rule-profile
- character-sheet-schema

AppView は caller が owner または maintainer として control する shared-maintained repo にだけ書く。caller が control しない third-party repo には書かない。

### projection / cache

- character home
- campaign view
- scenario catalog
- house activity

## 実装上の基本フロー

1. PL が OAuth で認証される。
2. PL がルールシステム（CoC、D&D 等）を選び、キャラクターを作る。sheet + default branch がペアで生成される。
3. PL がセッションを外部（CCFolia 等）で遊ぶ。
4. PL が Cerulia に戻り、session record を自分の repo に書く。どのシナリオをどのキャラで遊んだかを記録する。
5. キャラクターの成長は PL が character-advancement に書く。sessionRef で任意にリンクする。
6. PL のキャラクターや経歴は Bluesky 等で共有リンクを貼って見せる。
