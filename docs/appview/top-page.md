# トップページ設計

## `/` (public top)

匿名で見えるランディングページ。

### First viewport

1. **1 行の約束**: 「TRPG のキャラクターを作って、遊んだ記録を残して、見せよう」
2. **1 つの具体例**: 公開されているキャラクターの立ち絵とセッション履歴カード
3. **2 つの CTA**: 「始める」（sign-in）と「キャラクターを見る」（public profile へ）

### 状態ごとの扱い

- 公開キャラクターがない場合: デモ用のサンプルキャラクターを表示
- sign-in 済みの場合: `/home` にリダイレクト

## `/home` (signed-in home)

sign-in 後の canonical landing。

### 構成

1. **キャラクター一覧**: 最近更新した branch のサムネイル
2. **最近のセッション**: 直近のセッション記録
3. **CTA**: 「キャラクターを作る」「セッションを記録する」
# トップページ設計

Cerulia のトップページは 2 つある。anonymous が開く `/` と、sign-in 後の既定入口である `/home` である。両者は別の役割を持つが、どちらも Character Continuity Workbench へ接続する同じ product concept を共有する。

## `/` の役割

`/` は Character Continuity Workbench への public entry shell であり、次の 3 点だけを最初の 1 画面で伝える。

- Cerulia は「作る、続ける、持ち運ぶ、見せる」をつなぐ Character Continuity Workbench を返すこと
- 何が公開中の版で、何が履歴なのかを分けて読めること
- sign-in と publication library の 2 つの入口があること

`/` に置かないものは次のとおりである。

- session membership roster
- private な continuity detail
- governance detail や運用 queue
- retired history の深い列挙

## `/home` の役割

`/home` は signed-in user の Character Continuity Workbench である。既定では次の 4 block を持つ。

| block | 役割 | 典型データ |
| --- | --- | --- |
| continue zone | いま触っていた continuity に戻る | recent branch、recent campaign、recent publication |
| create zone | new / import / branch / convert を始める | create lane card |
| publish zone | いまの版を公開する、退役済みを説明する | publication preview、recent publication |
| continuity context | campaign と reuse の共有文脈を読む | linked campaign、reuse summary |

`/home` は global lobby ではない。session 一覧や operator console を主役にしてはならない。

## public top の first viewport

first viewport は次の順で構成する。

1. 1 つの約束
2. 1 つの具体例
3. 2 つの CTA

具体例は「別 campaign に持ち出したキャラクターでも、いまの版と引き継ぎ元を同じ場所で読める」のような continuity value に寄せる。内部語で始めない。

## `/home` の構図

signed-in home は desktop では 3 カラム、mobile では 1 カラムを基本にする。

- 左: continue zone
- 中央: create zone と publish zone
- 右: campaign context と recent publication

重要なのは、create zone を continue zone の近くに置き、Cerulia が「続きから入る service」であると同時に「次の継続を始める service」でもあると分かる構図にすることである。

## 状態ごとの扱い

| 状態 | `/` を開いたとき | `/home` を開いたとき |
| --- | --- | --- |
| anonymous | public top を表示する | sign-in を促すか `/` へ戻す |
| signed-in owner | public lens のまま閲覧できる | Character Continuity Workbench を表示する |

signed-in user が明示的に `/` を開いた場合も、public top を壊さない。`/` を owner console に変えない。

## deep-link と top-page の関係

publication link や campaign link から直接入ってきた利用者には、対象 page を優先して開く。その後の global nav では `/home` へ戻れるようにし、deep-link の存在が product root を書き換えないようにする。

## 採らない構成

- session 一覧だけで始まる global lobby
- governance detail を top page の常設要素にすること
- public top を giant index や glossary にすること
- `/home` を archive 履歴の棚卸し画面にすること
