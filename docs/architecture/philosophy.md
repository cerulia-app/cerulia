# 設計哲学

## 一文で言うと

Cerulia の core は live play system ではなく、character と campaign の continuity ledger である。

## 何を AT Protocol に任せるか

AT Protocol に向いているのは、次の責務である。

- 誰がどのキャラクター、継続線、ルール由来、公開、撤回、再利用許可に関わったかの識別
- character lineage、campaign continuity、publication、reuse boundary のような durable record
- append-only な correction、revocation、supersession の追跡
- Lexicon を通じた schema 共有
- client や projection を差し替えられる可搬性

Cerulia の product-core は、AT Protocol と相性のよい durable continuity だけを扱う。実時間の会話、盤面同期、秘匿の鍵ライフサイクル、進行権限や異議申立ては product の責務に入れない。

## core の輪郭

Cerulia の core は次の 6 要素で閉じる。

- character lineage
- campaign continuity
- rules provenance
- publication
- reuse boundary
- append-only correction と履歴説明可能性

scope 外の検討は [archive/out-of-product-scope/README.md](../archive/out-of-product-scope/README.md) に保存するが、product の将来計画としては扱わない。

## 共有スコープの考え方

core の continuity scope は world、house、campaign である。

| scope | 役割 | 必須性 | 典型的な責務 |
| --- | --- | --- | --- |
| world | canon / setting | 任意 | lore provenance、seed rule default |
| house | community / policy | 任意 | default reuse policy、shared library |
| campaign | continuity | 推奨 | shared rule chain、継続線、共有方針 |

campaign は continuity shell であり、session lobby ではない。shared rule chain、reuse policy、publication context を束ねる anchor ではあるが、参加承認、進行 state、操作権限、通信を担わない。

## 最初に守るべき原則

### 1. canonical root を run artifact にしない

continuity core の正本は character lineage と campaign に置く。外部の文脈や carrier があっても、それを canonical root に戻さない。

### 2. rules lineage と character lineage を混ぜない

rules は ruleset-manifest と rule-profile chain の問題であり、character は sheet、branch、conversion、advancement、episode の問題である。両者を分けないと provenance が壊れる。

### 3. publication と reuse を first-class にする

公開、退役、越境 reuse は副作用ではなく product の主価値である。publish、retire、revoke は append-only に追えるようにする。

### 4. correction は delete ではなく supersede で扱う

誤成長、誤公開、方針変更を後から説明できるように、authoritative fact は消さずに supersedes、retire、revoke で更新する。

### 5. carrier は root ではない

外向け URL や public surface は導線であり、正本は publication ledger にある。carrier 同期や mirror freshness は product-core の意味論に含めない。

## 非目標

この設計では、次を product の目標にしない。

- 実時間の会話や盤面を on-platform で回すこと
- session authority や lease/recovery を core に入れること
- label だけで秘匿や再利用境界を表現すること
- 争いの workflow を product の中心に置くこと
- 全 TRPG システムを一つの巨大汎用 schema に押し込むこと

最初に狙うべきなのは、AT Protocol-native な continuity ledger を product として閉じることである。
