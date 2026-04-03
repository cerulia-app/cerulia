# 設計哲学

## 一文で言うと

Cerulia の core は live play system ではなく、character と campaign の continuity ledger である。

## 何を AT Protocol に任せるか

AT Protocol に向いているのは、次のような責務です。

- 誰がどのキャラクター、継続線、ルール由来、公開、撤回、再利用許可に関わったかの識別
- character lineage、campaign continuity、publication、reuse boundary のような durable record
- append-only な correction、revocation、supersession の追跡
- Lexicon を通じたスキーマ共有
- クライアントや projection を差し替えられる可搬性

今回の core では、AT Protocol だけで綺麗に処理しにくいものをそもそも必須要件にしません。実時間の会話、盤面同期、即興的な裁定テンポ、秘匿の鍵ライフサイクルは optional extension に落とします。

## Core と Extension

Cerulia はまず core と extension を分けて考えます。

- Core: character、campaign、rules provenance、publication、reuse、auditability
- Optional extension: structured run、run authority、live play event、secret disclosure、board、replay、dispute workflow

extension は core record を参照してよいですが、core の canonical root や publication の正本を置き換えてはなりません。

## Bluesky との境界

Cerulia は Bluesky の social substrate を置き換えません。

- Bluesky 側: profile、follow、notification、公開会話、discovery
- Cerulia core: continuity artifact の durable record
- Cerulia extension: run adapter、optional public carrier、optional secret/disclosure workflow

Bluesky の social truth を authority repo に mirror して正本化しません。公開面は carrier に過ぎず、正本は Cerulia 側の continuity record にあります。

## 共有スコープの考え方

core の continuity scope は world、house、campaign です。

| scope | 役割 | 必須性 | 典型的な責務 |
| --- | --- | --- | --- |
| world | canon / setting | 任意 | lore provenance、seed rule default |
| house | community / policy | 任意 | default reuse policy、shared library |
| campaign | continuity | 推奨 | shared rule chain、継続線、共有方針 |

session は core scope ではなく、必要なら optional extension が作る run artifact です。

## 最初に守るべき原則

### 1. canonical root を session にしない

continuity core の正本は character lineage と campaign に置く。run や live authority は必要なときだけ extension が扱う。

### 2. rules lineage と character lineage を混ぜない

rules は ruleset-manifest と continuity scope の rule-profile chain の問題であり、character は sheet、branch、advancement、episode の問題である。両者を分けて持たないと provenance が壊れる。

### 3. publication と reuse を first-class にする

公開、退役、越境 reuse は side effect ではなく product の主価値である。publish / retire / revoke は append-only に追えるようにする。

### 4. correction は delete ではなく supersede で扱う

誤成長、誤公開、方針変更を後から説明できるように、authoritative fact は消さずに supersedes と retire で更新する。

### 5. optional extension は core を汚染しない

live play、secret disclosure、run authority を採る場合も、それらは session や secret record の側に閉じる。branch ownership、campaign continuity、publication の正本を extension 側へ寄せない。

### 6. Bluesky は carrier であって root ではない

公開投稿、プロフィール、app card は外向け carrier として使ってよいが、公開の正本は core の publication ledger に持つ。

## 非目標

この設計では、次を core の最初の目標にしません。

- 実時間の会話や盤面を on-platform で完全に回すこと
- session authority や lease/recovery を core に入れること
- label だけで秘匿や再利用境界を表現すること
- 全 TRPG システムを一つの巨大汎用 schema に押し込むこと

最初に狙うべきなのは、AT Protocol-native な continuity ledger を先に完成させることです。