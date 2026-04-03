# レイヤー責務と境界

## AppView が守るべき前提

AppView は Cerulia の projection を見やすく束ねる層であり、正本を持つ層ではない。UI 上で「いまの版 / current edition」と呼ぶ情報も、正本としては backend の current head 解決に従う。AppView は character creation を速く感じさせてよいが、その convenience は accepted 前の draft や guided flow に留まり、authoritative fact を勝手に確定したことにはしてはならない。UI が便利だからという理由で authority や secret boundary を吸収し始めると、Cerulia の設計全体が session-centric に崩れる。

## レイヤー別の責務

| layer | 何を authoritative に持つか | AppView が受け取るもの | AppView がしてはいけないこと |
| --- | --- | --- | --- |
| identity / auth | DID、OAuth bundle、caller identity | sign-in 状態、利用可能 endpoint、認可エラー | OAuth bundle から GM / PL role を推論すること |
| core continuity / projection | character home、campaign view、publication summary の current head と continuity write 結果 | character studio、signed-in home workbench、campaign summary、publication row。UI では current edition / いまの版として読む | session state や secret を canonical input に混ぜること |
| session authority / governance | controller、lease、membership、state transition、appeal | session shell、participant-safe status、governance console 用 read model | branch ownership や core publication を authority で直接更新したことにすること |
| secret / disclosure | audience、grant、secret-envelope、reveal、redaction | 可視な handout、reveal 状態、redaction 状態 | AppView summary に平文秘匿を混ぜること |
| board durable state | scene、token、board-op、board-snapshot | 確定済み盤面、participant-safe board summary、revision、snapshot hint | drag 途中の座標や cursor を durable history に見せること |
| realtime ephemeral | cursor、presence、drag preview、typing hint | 一時的な存在表示、未確定プレビュー | 未確定状態を authoritative board state と誤認させること |
| AppView shell state | 開いているタブ、並び順、フィルタ、最近見た項目、画面分割、create flow draft、continuity scope intent | 利便性のための presentation state | repo record に残すべき provenance と混同すること |
| external carrier | Bluesky post、thread、profile、app card | 外向け導線、stable fallback | carrier を publication の正本扱いすること |

## 操作ごとの責務分担

| 操作 | 主画面 | authoritative layer | UI 上の扱い |
| --- | --- | --- | --- |
| character continuity を始める | signed-in home、characters、character detail | core continuity / projection | new、import、branch、convert を lane で分け、accepted 前は draft として扱う |
| character home を開く | signed-in home、character detail | core continuity / projection | current edition を既定表示にし、retired は別導線に分ける |
| campaign を読む | campaign workspace | core continuity / projection | owner-steward と public の差を mode badge で明示する |
| branch / episode を publish する | character detail、campaign workspace | core publication | publish は continuity artifact の公開であり、session 公開と別語彙にする |
| publication を retire する | publication management | core publication | retire は公開入口の終了として扱い、reveal や redaction と混ぜない |
| session deep-link を解決する | access preflight、session view | publication / carrier read、membership / appeal。AppView shell は target surface の orchestration に限る | 未認可で session shell を開いたことにせず、access preflight で target surface を解決すること |
| session に参加する | session run shell | membership / authority | 招待、参加、離脱、追放は session governance として表現する |
| authority を移譲する | governance console | session-authority | 進行中 transfer と completion witness を明確に見せる |
| handout を reveal / redact する | disclosure panel | secret / disclosure | publication と別の操作として文言も導線も分ける |
| token を確定移動する | operator board workspace | board durable state | revision CAS と rebase-needed を UI で扱う |
| token をドラッグ中に動かす | board workspace | realtime ephemeral | 確定前の ghost として見せ、履歴には入れない |
| appeal を起票・追跡する | appeal access、governance console | appeal query / mutation、authority | 通常参加権と appeal-only access を同一扱いすること |
| membership を remove / ban する | governance console | governance / authority | appeal-only access と通常参加権を分けて説明する |
| replay を public で読む | publication detail、replay | replay projection | unrevealed secret と private audience 情報を返さない |

## AppView の基本規則

### 1. 最上位の入口は character continuity に置く

認可済み利用者の既定入口は signed-in home とし、そこから character studio / detail と campaign workspace に入る。session は重要だが product root ではないため、既定の primary nav に置かない。

### 2. route guard は便宜であり、権限の正本ではない

UI 上でボタンを隠すことはできるが、実際の可否は XRPC と projection が決める。403 や InvalidRequest が返った場合、UI は「なぜできないか」を layer 名つきで説明する必要がある。

session deep-link では特にこの原則が重要である。AppView はまず access preflight を解決し、participant shell、public replay、sign-in / join wall、appeal-only access のどれを出すかを切り替える。

access preflight の canonical decision source は session access preflight query とし、クライアント内の ad-hoc 条件分岐で target surface を決めない。

### 3. visibility の理由を言語化する

見えている理由は public publication、owner / steward read、session participant、audience grant のどれかに落ちる。見えない理由も同じ粒度で説明する。単なる lock icon だけでは不十分である。

### 4. AppView は backend の current head を current edition として既定表示し、履歴 view を分ける

superseded、retired、revoked は監査と説明責任に必要だが、既定面に混ぜると continuity の現在像がぼやける。AppView は backend の current head 解決を UI では current edition として受け取り、既定面と audit 面の切り分けを UI 構造で守る。

### 5. create flow の draft は AppView の責務として明示的に持つ

途中入力、import preview、publication preview、campaign continuity へ接続したいという intent のような convenience state は AppView が持ってよい。ただし、それは continuity provenance として説明してはならない。accepted される前の draft を current edition のように見せてはならない。

### 6. governance read は participant read と分ける

session view で見せる authority 情報は participant-safe な summary に留め、controller list、recovery controller、appeal review detail、service log 導線は governance console 側の read model へ逃がす。AppView は participant shell を governance console の代用品にしてはならない。