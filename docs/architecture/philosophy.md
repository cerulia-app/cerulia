# 設計哲学

## 一文で言うと

Cerulia は、TRPG キャラクターを作り、遊んだ歴史を記録し、他の人に見せるための owner-centric な character history service である。

## なぜ作るのか

AT Protocol の発展に寄与したい。企業ではなくコミュニティによるオープンな仕組みが人間のコミュニティという単位を抽象化しに来たと考えていて、システムとコミュニティの境界がより曖昧になっていくことを願っている。TRPG は分散型システムと相性が良い。ある程度のルールや型が存在し、強い個人最適化が必要で、それを相互運用できる必要があるという特性がマッチする。このプロダクトをオープンソースで公開することで、AT Protocol が目指す世界に貢献したい。

## 何を AT Protocol に任せるか

AT Protocol に向いているのは、次の責務である。

- 誰がどのキャラクター、セッション履歴、ルール由来、公開に関わったかの識別
- character lineage、session history、campaign、publication のような durable record
- append-only な correction と supersession の追跡
- Lexicon を通じた schema 共有と相互運用
- client や projection を差し替えられる可搬性

Cerulia の product-core は、AT Protocol と相性のよい durable な記録だけを扱う。実時間の会話、盤面同期、ダメージ処理、進行権限は product の責務に入れない。

## core の輪郭

Cerulia の core は次の要素で閉じる。

- character lineage（作成、分岐、成長、変換）
- session history（どのシナリオを誰と遊んだかの記録）
- campaign と house（セッションを束ねるシリーズとコミュニティ）
- scenario catalog（シナリオの公開台帳）
- rules provenance（システムとハウスルールの由来）
- character-sheet-schema（キャラクターシートの型定義）
- publication（公開入口の ledger）
- append-only correction と履歴説明可能性

## 共有スコープの考え方

| scope | 役割 | 必須性 | 典型的な責務 |
| --- | --- | --- | --- |
| house | community / policy | 任意 | コミュニティの方針、ハウスルール |
| campaign | series | 任意 | 複数セッションを束ねるシリーズ |

campaign はセッションのシリーズであり、run authority や参加承認を担わない。house はコミュニティの単位であり、参加管理や通信の責務を持たない。

## 最初に守るべき原則

### 1. キャラクター状態の変更は owner のみ

自分のキャラクターの成長や訂正を確定できるのは owner だけである。GM も他のプレイヤーも、他人のキャラクター record を書き換えない。

### 2. 実プレイに介入しない

セッション中の出来事は GM の裁量とプレイヤー間のコミュニケーションで成り立つ。ダメージ処理や判定をシステムが処理すべきではない。Cerulia は記録に徹する。

### 3. 他のプレイヤーが Cerulia を使っていなくても成り立つ

GM だけでセッションを記録でき、参加者を名前で残せる。プレイヤーが後から Cerulia を始めたら、過去のセッションに遡ってリンクできる。

### 4. rules lineage と character lineage を混ぜない

rules は ruleset-manifest と rule-profile chain の問題であり、character は sheet、branch、advancement、session の問題である。両者を分けないと provenance が壊れる。

### 5. publication を first-class にする

公開と退役は副作用ではなく product の主価値である。publish と retire は append-only に追えるようにする。

### 6. correction は delete ではなく supersede で扱う

誤記録、誤公開、方針変更を後から説明できるように、authoritative fact は消さずに supersedes と retire で更新する。

### 7. carrier は root ではない

外向け URL や public surface は導線であり、正本は publication ledger にある。

### 8. 越境利用はシステムで管理しない

キャラクターを別の campaign や house に持ち出してよいかは、プレイヤーと GM のコミュニケーションで決める。システムが許可や禁止を記録する必要はない。

## 非目標

この設計では、次を product の目標にしない。

- 実時間の会話や盤面を on-platform で回すこと
- session の run authority や lease/recovery を core に入れること
- 越境利用の許可・禁止をシステムで裁定すること
- 争いの workflow を product の中心に置くこと
- 全 TRPG システムを一つの巨大汎用 schema に押し込むこと
- AT Protocol レベルでのネタバレ秘匿（AppView の reader lens で対応する）

最初に狙うべきなのは、AT Protocol-native な character history service を product として閉じることである。
