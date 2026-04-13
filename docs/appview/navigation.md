# 遷移構造

## route 方針

route は、public では Character Continuity Workbench の約束を先に示し、sign-in 後は character continuity first を守るため、public-entry / home / characters / campaigns / publications の 5 層に分ける。product route tree に `/sessions/*` は持たない。

## Global Navigation

| 状態 | primary nav | 補助導線 |
| --- | --- | --- |
| anonymous | Cerulia (`/`)、Publications、Sign in | publication detail、campaign shell |
| signed-in owner | Home、Characters、Campaigns、Publications、Cerulia (`/`) | recents、search |

anonymous 状態では `/` を discovery dump として押し出さず、brand link か Cerulia 入口として扱う。sign-in 後は `/home` を canonical landing とし、Characters は最初の実作業 hub として扱う。

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
```

## route ごとの意味

| route | 役割 | 既定の reader lens |
| --- | --- | --- |
| `/` | public top。Character Continuity Workbench の約束を 1 つの具体例と 2 つの CTA で始める public entry shell | public |
| `/home` | signed-in top。Character Continuity Workbench の continue / create / publish を返す面 | owner |
| `/characters` | character hub。現在の continuity 一覧と create lane 入口 | owner |
| `/characters/new` | brand new sheet から始める flow | owner |
| `/characters/import` | import / branch / convert の起点 | owner |
| `/characters/:branchRef` | character continuity detail。current edition、origin line、archive を読む面 | owner |
| `/campaigns` | campaign hub。shared continuity への入口 | owner または public |
| `/campaigns/:campaignRef` | shared continuity workspace。public では read-only shell | owner または public |
| `/publications` | public / owner の publication library。公開中の版を読む canonical list surface | public または owner |
| `/publications/:publicationRef` | 公開中の版の detail、認可済み詳細、または retired / superseded link 用 explanatory tombstone | public または owner |

## 遷移の優先順位

### 1. 初見利用者の流れ

`/` -> sign-in -> `/home` -> `/characters/new` または `/characters/import` -> `/characters/:branchRef`

最初に体験させるのは continuity を始める導線である。

### 2. returning owner の流れ

`/home` -> `/characters/:branchRef` -> publication action -> `/campaigns/:campaignRef`

continuity の更新と公開を先に置く。

### 3. public reader の流れ

`/` -> `/publications` -> `/publications/:publicationRef` -> `/campaigns/:campaignRef` -> sign-in -> `/home`

public reader は public top で Cerulia の約束を読み、公開中の版からサービスを知る。public campaign shell は閲覧用の公開概要に留め、参加や admission は暗示しない。

## navigation の原則

### public top を glossary や discovery dump にしない

`/` は Character Continuity Workbench への public entry shell であり、1 つの約束、1 つの具体例、2 つの CTA から始める。

### signed-in では `/home` を canonical landing にする

signed-in 後の既定導線は `/home` と Characters を中心に組み、campaign と publication はその周囲に置く。Home は continue / create / publish の landing、Characters は continuity を直接触る hub として分ける。

### nav label と CTA は平易な語を優先する

public surface では、可能なら「公開中の版」「いまの版」「引き継ぎ元」を先に使い、publication や current head などの語は補助説明に下げる。

### public campaign shell を参加入口にしない

public campaign shell は read-only shell であり、participation gate や join surface として扱わない。active な public publication current head が 1 件も無い campaign では、public shell を返さず `NotFound` で fail-closed にする。

### history 導線を current surface から分離する

publication の retired chain や continuity の古い版は、現在の continuity surface から一段深い archive / tombstone 導線へ逃がす。

## publication deep-link の既定分岐

| deep-link 状態 | 返す surface |
| --- | --- |
| active current edition | `/publications/:publicationRef` の通常 detail |
| superseded された direct link | explanatory tombstone と current edition への CTA |
| retired された direct link | explanatory tombstone と関連する公開中の版または campaign shell への CTA |
| current successor が public でない | retire / supersede の説明だけを返す neutral tombstone |

## モバイル時の扱い

- `/home`、`/characters`、publication detail、campaign workspace は 1 カラム優先で成立させる
- create lane は card stack で見せ、new / import / branch / convert の順に並べる
- publication detail の explanatory tombstone は通常 detail と別 grammar にする
