# 必要機能一覧

AppView の機能は、内部 surface の列挙ではなく、「ユーザーが何を達成できるか」で整理する。public top の約束は「作る、続ける、持ち運ぶ、見せるを一つにつなぐ Character Continuity Workbench」であり、sign-in 後の最初の具体価値は character creation convenience だが、その中身は continuity workflow 全体である。

## Primary Product Modules

| module | 約束する価値 | 主な利用者 | 主画面 | 読み取り正本 | 書き込み正本 |
| --- | --- | --- | --- | --- | --- |
| character studio | new sheet、import、branch、convert を迷わず始められる | branch owner、steward | signed-in home、characters、character detail | getCharacterHome | importCharacterSheet、createCharacterBranch、recordCharacterConversion |
| character continuity workbench | いまの版、recent episode、reuse、publication をひと目で読める | branch owner、steward | signed-in home、character detail | getCharacterHome | recordCharacterAdvancement、recordCharacterEpisode、publishSubject、retirePublication |
| campaign workspace | shared rule chain と共有継続を理解しやすい | campaign steward、shared continuity reader | campaigns、campaign detail | getCampaignView | createCampaign、attachRuleProfile、retireRuleProfile |
| publication library | 公開中の版を読み、何を見せているかを管理できる | owner、steward、public reader | publications、publication detail | listPublications | publishSubject、retirePublication |

public top は独立した第 5 module ではなく、1 つの約束、1 つの具体例、2 つの CTA から始まる Character Continuity Workbench の public entry shell として扱う。

## Character Studio の具体的 lane

character creation convenience を front に出すため、create flow は最初から次の lane に分ける。

| lane | 主な利用者 | 入力の起点 | 期待する結果 |
| --- | --- | --- | --- |
| new sheet | 新規利用者 | displayName、ruleset、基本 profile | owner の最初の character continuity |
| import | 既存シート持ち込み利用者 | externalSheetUri、imported snapshot、sourceRevision | provenance 付き branch |
| branch | 継続キャラ利用者 | baseSheetRef、branch label、campaign / local 用途 | campaign / local durable branch |
| convert | ruleset 越境利用者 | source branch、target ruleset、conversion note | conversion provenance 付き target branch |

create flow の最後では、次の 3 点を review する。

- campaign へ接続するか
- reuse 境界をどうするか
- publication を今すぐ作るか、後で作るか

campaign は optional に留め、最初から mandatory parent tree にしない。ここで選ぶ campaign は continuity scope intent であり、branch 自体に campaignRef を書き込むことを意味しない。

## AppView Shell が自前で持つべき機能

| 機能 | 置く場所 | 理由 |
| --- | --- | --- |
| mode badge | 全 surface 共通 | public と owner-steward の lens を混ぜないため |
| permission explanation | button disabled state、error panel | 403 や InvalidRequest を単なる失敗表示で終わらせないため |
| recent items | signed-in home | branch、campaign、publication への復帰を速くするため |
| create flow draft state | create zone、character studio | multi-step draft を accepted 前の local state として扱うため |
| publication preview | character detail、publication library | いまの版として見える前の見え方を確認するため |
| mutation status banner | form | accepted / rejected / rebase-needed を説明するため |
| archive split | character detail、publication detail | いまの版と履歴を混ぜないため |
| local layout state | filter、timeline fold | presentation convenience を record 化しないため |

## Surface ごとの最低要件

### 1. Character Studio / Detail

- primary branch と create lane を同じ screen grammar で扱う
- create lane の card copy で personal continuity と campaign continuity の違いを短く説明する
- recent episode、recent conversion、publication row、reuse grant を並列に読める
- imported provenance と conversion provenance は public summary より濃く表示してよい
- create flow は accepted 前の draft と accepted 後の continuity fact を明確に分ける
- retired branch の direct link は active branch detail と同じ主導線に混ぜず、read-only historical detail または explanatory tombstone として開く

### 2. Campaign Workspace

- campaign identity と published artifact を同じ surface で読める
- owner-steward mode では rule provenance と default reuse policy を読める
- public mode では campaign shell と public publication だけを出し、read-only shell であることを明示する
- participation や runtime を campaign workspace の canonical input にしない

### 3. Publication Library

- subject ごとのいまの版を既定表示にする
- publication と retire を別導線にする
- 公開中の版と archived chain を 1 面に混ぜない
- carrier の差し替え可能性を短い説明で示す
- retired または superseded な direct link は、いまの版への CTA を持つ explanatory tombstone / preflight に必ず解決する

### 4. Public Entry for the Workbench

- public reader が sign-in しなくても Cerulia の価値を理解できる
- public top は publication library と campaign / publication deep-link へ入る Character Continuity Workbench の entry shell として扱う
- first viewport は 1 つの約束、1 つの具体例、2 つの CTA だけで成立させる
- 最初の 1 画面で current head や publication のような内部語を始めない
- 見えているのが公開中の版だけであることを説明する
- campaign shell は閲覧用の公開概要であり、参加受付や admission gate ではないことを短く説明する
