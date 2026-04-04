# サービスビジョン

Cerulia は、TRPG のキャラクターを「作るところ」で終わらせず、「続ける」「持ち運ぶ」「見せる」まで一つの流れにする continuity service である。AppView はその価値を Character Continuity Workbench として見せる。ユーザーは新しい character-sheet を始めるときも、既存 sheet を取り込むときも、別 campaign へ branch するときも、ruleset をまたいで変換するときも、いまの版、由来、公開状態を同じ場所で扱える。

## 採用する product thesis

AppView の訴求は 2 段で扱う。public top では「作る、続ける、持ち運ぶ、見せるを一つにつなぐ Character Continuity Workbench」という約束を先に出し、sign-in 後の最初の具体価値は「キャラクターを便利に作成できる」に置く。ただし Cerulia が front に出す convenience は、単なる新規入力の速さではなく、continuity workflow 全体を指す。

| verb | Cerulia での意味 | 含めない読み方 |
| --- | --- | --- |
| 作る | new sheet の開始、既存 sheet の import、branch の初期化 | ルール計算をすべて肩代わりする万能 builder |
| 続ける | advancement、episode、いまの版の更新 | 外部 runtime の即時状態を product に混ぜること |
| 持ち運ぶ | branch、conversion、reuse、campaign 接続 | provenance のないコピー配布 |
| 見せる | 公開中の版を作り、公開面を選ぶ | notification や communication channel |

## なぜこの訴求を採るか

- 公開入口で最も理解しやすいのは、作る、続ける、持ち運ぶ、見せるを一つにつなぐことだからである
- sign-in 後の最初の具体価値としては、character creation convenience が依然として強い
- character-first な体験は、Cerulia の continuity-first と矛盾しない
- generic な character builder に見せると、Cerulia の本来価値である continuity、publication、reuse が埋もれる。そのため「作成」を continuity workflow として定義し直す

## ユーザー価値

| 対象 | 最初に感じる価値 | 継続利用で感じる価値 |
| --- | --- | --- |
| 継続キャラを持つプレイヤー | 既存 sheet をすぐ取り込み、今のキャラを始められる | branch、conversion、publication を迷わず扱える |
| 新しく始めるプレイヤー | キャラクターの最初の形を素早く作り、後から直せる | campaign をまたいでも履歴といまの版を失わない |
| campaign steward | 共有継続へつなぐ character を揃えやすい | shared rule chain、公開方針、reuse 境界を保ったまま continuity を読める |
| 公開閲覧者 | 公開中の版を読みやすい | どれが最新で、何が退役済みかを判断できる |

## Jobs / Outcomes

AppView は、ユーザーが次の状態に到達できるように設計する。

- 新しいキャラクターを始めるまでの迷いが少ない
- 既存のキャラクターを別 campaign や別 ruleset に持ち出しやすい
- 何がいまの版で、何が superseded / retired かをすぐ判断できる
- 公開できるものと private のままにすべきものを混同しない
- 自分の continuity と、共有 campaign の continuity を別物として理解できる

## 採用しないサービス像

| 読み方 | 採らない理由 |
| --- | --- |
| オンラインセッションツール | session、board、replay は製品スコープ外である |
| 汎用 SNS | public surface は公開中の版の index であり、social feed ではない |
| GM 向け管理コンソール | governance と authority は製品スコープ外である |
| 万能 character builder SaaS | Cerulia の価値は continuity、publication、reuse を含む durable graph にある |

## Service Language

AppView の public copy と IA は、次の動詞を中心に組み立てる。

- 作る
- 続ける
- 持ち運ぶ
- 見せる
- 引き継ぐ

逆に、次の語を front copy の中心には置かない。

- governance
- operator
- authority transfer
- audit export
- realtime transport

## Messaging Guardrails

- public top では Character Continuity Workbench の約束を front に出し、作成の便利さは sign-in 後の home で具体化する
- public は viewer lens を意味し、active な公開中の版を read-only で読む範囲に限る
- character は主役にしてよいが、campaign と publication を従属物として消さない
- publication、retire、archive を同じ「公開設定」にまとめない
- campaign は session lobby ではなく、shared continuity workspace として書く
- carrier は外向け導線であり、正本は publication ledger にあることを短い文で補足する
