# トップページ設計

## 入口の分離

トップページは 1 枚で万能にせず、次の 2 面に分ける。

- public top: 匿名または未連携利用者向けの公開入口。route は `/`。
- signed-in home: 認可済み利用者向けの workbench。route は `/home`。

この分離により、public top は service の意味を伝える面、signed-in home は作業へ戻る面として役割を分けられる。認証直後の canonical landing は `/home` とする。ただし、認可済み利用者が明示的に `/` を開くことは許し、public top を public lens のまま閲覧できるようにする。

## Public Top

### 目的

public top は、Cerulia を「作る、続ける、持ち運ぶ、見せるを一つにつなぐ continuity service」として理解させる public entry shell である。ここでやることは、用語の説明ではなく、サービスの約束と始め方を短く伝えることに限る。

canonical な public 一覧面は `/publications` とし、public top はその前段で価値と具体例を示す導入面に留める。

### First Viewport

first viewport は次の 3 要素だけで成立させる。

- 1 つの約束: 作る、続ける、持ち運ぶ、見せるを一つの流れにする。
- 1 つの具体例: 新しく始める場合も、持ち込んで続ける場合も、いまの版と引き継ぎ元が見通せる。
- 2 つの CTA: `サインインしてホームで始める` と `公開中のキャラクターを見る`

この画面では glossary を始めない。current head、publication、carrier のような内部語は first viewport に出さない。

### Hero CTA

| CTA | 意図 | 遷移先 |
| --- | --- | --- |
| サインインしてホームで始める | create / import / continue の作業面へ送る | `/home` へ sign-in / connect |
| 公開中のキャラクターを見る | public continuity discovery を始める | `/publications` |

認可済み利用者が `/` を開いた場合でも current lens は public badge で固定し、create / continue の主作業は `/home` に戻す。

### 必須ブロック

| block | 内容 | ルール |
| --- | --- | --- |
| hero stage | 1 つの約束、1 つの具体例、2 つの CTA | 最初の 1 画面では一般語だけで成立させる |
| value lane | 「作る」「続ける」「持ち運ぶ」「見せる」を 4 枚の短文 card で示す | 1 枚につき 1 動詞だけを扱う |
| featured editions | 公開中の版を 2 から 4 件だけ見せる | 詳細な一覧や比較は `/publications` へ送る |
| short continuity note | 「いまの版」「引き継ぎ元」「公開中の版」の違いを短く示す | 1 block で新しい概念は 1 つまで |
| final sign-in CTA | owner-steward mode の作業面へ送る | 新しい説明を追加しない |

### 置かないもの

- carrier explainer のような補助概念の単独 block
- private campaign dossier
- session membership roster
- unrevealed handout や private replay への示唆
- governance detail や retired history
- multi-step character creation wizard

## Signed-In Home

### 目的

signed-in home は、認可済み利用者が続きを見るだけでなく、新しいキャラクターを始める、既存のキャラクターを取り込む、別の卓へ持っていく準備をするための personal workbench である。ここでは service value first ではなく、character continuity first に切り替える。

### 情報構造

| zone | 役割 | 主な情報源 |
| --- | --- | --- |
| continue zone | いま触るべき character continuity へ戻る | getCharacterHome |
| create zone | new sheet、import、branch、convert の 4 導線を置く | AppView shell、core writer |
| publish zone | いまの版、公開状態、reuse 境界を確認する | getCharacterHome、listPublications、listReuseGrants |
| campaign context | 最近触れた campaign や steward 対象への入口 | getCharacterHome.linkedCampaigns、AppView recents |
| session rail | 既知の session への復帰導線と authority health の compact status | invitation / recents / deep links |
| action queue | rebase-needed、manual-review、招待応答などの alert を返す | mutationAck、service log、governance inbox |

### Create Zone

create zone は最初から次の 4 lane を分ける。

| lane | 何を始めるか | 結果 |
| --- | --- | --- |
| new sheet | brand new な character-sheet から始める | owner の新規 continuity |
| import | 既存 sheet や外部シートを取り込む | 引き継ぎ元付きの初期 branch |
| branch | 既存の版から別の卓向けの線を作る | continuity の分岐 |
| convert | ruleset をまたぐ target branch を作る | 変換元付きの branch |

campaign への接続、reuse 境界、publication は create zone の最後に review する。campaign を最初から必須 parent にしない。

### 重要な規則

- session rail は secondary 扱いとし、home の先頭を session cards で埋めない。
- linked campaign が無い利用者でも home は成立するように、character continuity を最上段に置く。
- current edition、公開状態、reuse 境界は create zone の近くに置き、作成と継続が切れて見えないようにする。
- action queue は権限に応じて粒度を変え、operator work は governance console 側へ寄せる。
- authority health が `healthy` 以外の session は compact status のまま埋もれさせず、warning rail と next actor / governance jump link へ昇格させる。

## 入口状態マトリクス

| 状態 | `/` を開いたとき | session deep-link を開いたとき |
| --- | --- | --- |
| anonymous | public top を表示する | access preflight を表示し、読める public replay があれば先に示し、必要なら sign-in を促す |
| signed-in, non-participant | public top をそのまま見てもよい。通常の app 起動では `/home` に着地する | access preflight を表示し、join 可能なら join / invite 導線を出す |
| invited, not joined | `/home` を基本にしつつ、招待応答を action queue に出す | access preflight から join 導線を最優先で出す |
| joined participant | `/home` を基本にしつつ、必要に応じて session rail へ戻れる | session view を直接開く |
| removed / banned with appeal-only access | `/home` からは通常参加面を出さない | access preflight から appeal route だけを出す |
| governance operator | `/home` の operator queue から対象 session の governance へ入る | participant でなければ governance console への導線を出す |

access preflight は route の存在を隠さず、今どの lens で見ていて、次に何ができるかだけを返す薄い state とする。session shell の代用品にしてはならない。

## Deep-Link との関係

session link、publication link、campaign link から直接入ってきた利用者には、対象 page を優先して開く。その後の global nav では `/home` へ戻れるようにし、deep-link の existence が product root を書き換えないようにする。deep-link が create zone の主導線を奪ってはならない。

## 初期実装で優先する導線

1. `/` で service value と公開中の版を読む
2. `/home` で create / import / continue の 3 導線を最上段に出す
3. `/characters/:branchRef` で continuity detail と publish / reuse を扱う
4. `/campaigns/:campaignRef` で shared continuity を読む
5. `/sessions/:sessionRef` へ deep-link で戻る

## 後回しにするもの

- session 一覧だけで始まる global lobby
- recommendation 主体の public discovery
- social feed 的な activity stream をトップ面の正本にすること
- governance detail を top page の常設要素にすること