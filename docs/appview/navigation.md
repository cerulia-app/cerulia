# 遷移構造

## route 方針

route は、public では service value first、sign-in 後は character continuity first を守るため、public-entry / home / characters / campaigns / publications / session-context の 6 層に分ける。session は top-level route を持ってよいが、product root にはしない。

## Global Navigation

| 状態 | primary nav | 補助導線 |
| --- | --- | --- |
| anonymous | Cerulia (`/`)、Publications、Sign in | publication detail、campaign shell |
| signed-in owner-steward | Home、Characters、Campaigns、Publications、Cerulia (`/`) | recents、search、session rail |
| participant | Home、Characters、Campaigns、Publications | session local nav |
| governance | Home、Characters、Campaigns、Publications | governance local nav、audit |

anonymous 状態では `/` を discovery 専用の Explore として押し出さず、brand link か Cerulia 入口として扱う。sign-in 後は Characters を session より先に置く。理由は、Cerulia の既定価値が session 参加ではなく、character continuity を続けることだからである。

## 推奨 route tree

```text
/
/home
/characters
/characters/new
/characters/import
/characters/:branchRef
/campaigns
/campaigns/:campaignRef
/publications
/publications/:publicationRef
/sessions/:sessionRef
/sessions/:sessionRef/appeals
/sessions/:sessionRef/board/:sceneRef
/sessions/:sessionRef/handouts
/sessions/:sessionRef/replay
/sessions/:sessionRef/governance
/sessions/:sessionRef/audit
```

## route ごとの意味

| route | 役割 | 既定の reader lens |
| --- | --- | --- |
| `/` | public top。1 つの約束、1 つの具体例、2 つの CTA で始める public entry shell | public |
| `/home` | signed-in top。continue / create / publish の workbench | owner-steward |
| `/characters` | character hub。現在の continuity 一覧と create lane 入口 | owner-steward |
| `/characters/new` | brand new sheet から始める flow | owner-steward |
| `/characters/import` | import / branch / convert の起点 | owner-steward |
| `/characters/:branchRef` | character continuity detail。current edition、origin line、archive を読む面 | owner-steward |
| `/campaigns` | campaign hub。shared continuity への入口 | owner-steward または public |
| `/campaigns/:campaignRef` | shared continuity workspace。public では read-only shell | owner-steward または public |
| `/publications` | public / owner-steward の publication library。公開中の版を読む canonical list surface | public または owner-steward |
| `/publications/:publicationRef` | 公開中の版の detail、認可済み詳細、または retired / superseded link 用 explanatory tombstone | public または owner-steward |
| `/sessions/:sessionRef` | access preflight または structured run shell | access-preflight または participant |
| `/sessions/:sessionRef/appeals` | appeal-only access と appeal history | appeal-originator または resolver |
| `/sessions/:sessionRef/board/:sceneRef` | operator board workspace または participant read-only board | board-operator または participant-board-read |
| `/sessions/:sessionRef/handouts` | disclosure / handout surface | participant または spectator-safe |
| `/sessions/:sessionRef/replay` | public または participant replay | public / participant / spectator-safe |
| `/sessions/:sessionRef/governance` | membership / authority / appeal operator surface | governance / resolver |
| `/sessions/:sessionRef/audit` | raw-ish audit summary と export 入口 | audit |

## 遷移の優先順位

### 1. 初見利用者の流れ

`/` -> sign-in -> `/home` -> `/characters/new` または `/characters/import` -> `/characters/:branchRef`

最初に体験させるのは session join ではなく、サービスの約束を読んだ後に continuity を始める導線である。

### 2. returning owner / steward の流れ

`/home` -> `/characters/:branchRef` -> publication / reuse action -> `/campaigns/:campaignRef` -> 必要なら session deep-link

continuity の更新と公開を先に置き、session は現在進行中の run があるときだけ開く。

### 3. public reader の流れ

`/` -> `/publications` -> `/publications/:publicationRef` -> sign-in -> `/home`

public reader は public top で Cerulia の約束を読み、公開中の版からサービスを知る。sign-in 後も同じ publication を読み続けられるが、許可がある場合だけ owner-steward detail を追加表示する。public campaign shell は閲覧用の公開概要に留め、参加や admission は sign-in 後の home と session / invite flow へ送る。

### 4. participant の流れ

`/home` または deep-link -> `/sessions/:sessionRef` -> board / handouts / replay -> `/home`

participant は session に直接戻ることがあるが、その場合でも global escape hatch として `/home` を持つ。

### 5. operator の流れ

`/sessions/:sessionRef` -> `/sessions/:sessionRef/governance` -> `/sessions/:sessionRef/audit`

governance と audit は participant 操作面と route を分ける。

## navigation の原則

### public top を glossary や discovery dump にしない

`/` は public entry shell であり、1 つの約束、1 つの具体例、2 つの CTA から始める。最初の 1 画面で内部語の説明や過剰な比較一覧を始めない。

### signed-in では Characters を service root にする

signed-in 後の既定導線は Home と Characters を中心に組み、campaign や session はその周囲に置く。これにより continuity-first と session-secondary を両立する。

### nav label と CTA は平易な語を優先する

public surface では、可能なら「公開中の版」「いまの版」「引き継ぎ元」を先に使い、publication、current head、carrier などの語は補助説明に下げる。CTA と nav label は実際の遷移先や役割をそのまま表す。

### public campaign shell を参加入口にしない

public campaign shell は read-only shell であり、participation gate や join surface として扱わない。公開面の primary CTA は公開中の版を読むことと sign-in に限る。

active な public publication current head が 1 件も無い campaign では、public shell を空で返さず fail-closed にする。`/campaigns/:campaignRef` の public route は neutral shell や existence hint ではなく not-found 相当へ落とす。

### session は top-level route を持つが global root にはしない

session は optional extension なので、URL では独立してよいが、primary nav の先頭や app 起動直後の強制遷移先にはしない。

### hidden route を作らない

secret disclosure や governance detail は認可が必要でも、route 自体は明示的に存在してよい。その代わり、未認可時は「存在しない」のではなく「この lens では見えない」と説明する。

session deep-link では最初に access preflight を解決し、participant shell、public replay、appeal-only access、sign-in / join wall のどれを返すかを決める。

### history 導線を current surface から分離する

publication の retired chain、appeal の review history、service log export は、現在の continuity surface から一段深い audit route に逃がす。

### public は viewer lens として扱う

public は active な public current edition を read-only で読む lens を意味し、参加可否や admission を意味しない。public campaign shell と public publication detail はこの viewer lens の一部として説明する。

## publication deep-link の既定分岐

publication deep-link は現行の公開中の版かどうかに応じて次の surface を返す。

| deep-link 状態 | 返す surface |
| --- | --- |
| active current edition | `/publications/:publicationRef` の通常 detail |
| superseded された direct link | explanatory tombstone / preflight と current edition への CTA |
| retired された direct link | explanatory tombstone / preflight と関連する公開中の版または campaign shell への CTA |
| current successor が public でない | retire / supersede の説明だけを返す neutral tombstone |

## access preflight の既定分岐

access preflight の canonical source は `getSessionAccessPreflight` とし、下表の decisionKind と recommendedRoute をそのまま UI に反映する。

| deep-link 状態 | 返す surface |
| --- | --- |
| public replay / carrier だけ閲覧可能 | `/sessions/:sessionRef/replay` への public 導線を中心にした preflight |
| sign-in すれば判断可能 | sign-in CTA を中心にした preflight |
| invited だが未参加 | join 導線を中心にした preflight |
| joined participant | `/sessions/:sessionRef` の session shell |
| removed / banned だが appeal-only access あり | `/sessions/:sessionRef/appeals` への preflight |
| governance operator だが participant ではない | `/sessions/:sessionRef/governance` への operator 導線 |
| retired carrier deep-link | 退役説明と公開中の版 / replay への誘導を返す preflight |
| いずれの導線もない | no-access explanation |

generic な session deep-link の precedence は `participant-shell -> governance-console -> appeal-only -> join -> public-replay -> sign-in -> no-access` に固定する。`retired-carrier` は retired carrier deep-link を解決している場合だけの source-link override とし、この precedence の前に評価してよい。

spectator は独立 transport mode ではなく、membership.role = spectator に対する read-only UI label とする。canonical route は `/sessions/:sessionRef/replay` と `/sessions/:sessionRef/handouts` であり、backend transport は participant read endpoint を role-based filtering 付きで使う。

## モバイル時の扱い

- `/home`、`/characters`、publication detail、campaign workspace は 1 カラム優先で成立させる。
- create lane は card stack で見せ、new / import / branch / convert の順に並べる。
- session view は overview を先に見せ、board は別 route として切り出す。
- participant の mobile board は quick read 優先にし、operator board editing は desktop 優先とする。