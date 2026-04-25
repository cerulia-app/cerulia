# projection contract

## 目的

この文書は projection の intent contract を固定する。transport schema と concrete response field 名は [../lexicon/rpc.md](../lexicon/rpc.md) に置き、ここでは目的、canonical inputs、blocks、および表示方針に集中する。

## 共通規則

### 1. core projection は core record だけを正本として読む

projection は次の core record だけを canonical input とする。

- character-sheet
- character-branch
- character-conversion
- character-advancement
- session
- scenario
- campaign
- house
- rule-profile
- character-sheet-schema
- player-profile

### 2. projection は seed 済み repo と ingest 済み repo から自動生成する

PL による item 単位の curate は不要。現行 bootstrap では `CERULIA_PROJECTION_REPOS` で seed された repo と、internal ingest で remember された repo を自動的に再投影する。visibility: public の record を一覧に含め、visibility: draft の record は一覧や発見導線からは除外し、direct link では draft 状態を明示して表示する。

### 3. reader mode

- owner mode: 自分の全 record（draft 含む）を見る
- public mode: visibility: public な record だけを見る

### 4. draft の表示契約

- draft は AppView 上の non-indexed state とする
- anonymous / public mode でも direct ref が与えられた detail route は draft record を draft 状態つきで解決してよい
- draft record を参照する public record があっても、projection は draft 側の内容を public block に畳み込まない

### 5. public summary shape

- public / anonymous mode の direct-link detail は、canonical record の raw shape をそのまま返さない
- public block に含めるのは shared UX に必要な summary field だけとし、owner-only linkage、raw payload、internal state を含めない
- public response から除外する field は fixture と contract test で不在を証明する

### 6. missing reference semantics

- projection / direct-read surface は route root record の欠落と、non-root linked record の欠落を区別する
- route root（`characterBranchRef`、`campaignRef`、`houseRef`、`scenarioRef`、`did` など）自体が解決できない場合だけ `NotFound` にする
- root が残っている場合、linked schema、scenario、rule-profile、house、campaign などの欠落は、その block または summary row だけを縮退させ、surface 全体を失敗させない
- 縮退時に使ってよい値は、root record 自体に保存されている値か、残存している canonical record から導出できる値だけに限る。未保存の補助情報を合成で復元しない
- owner mode は missing reference を repair-needed state として見せてよい。public / anonymous mode は affected block の省略、browse-only への縮退、link row の除外などの public-safe な縮退だけを行う

## Character Home

### 目的

PL が自分のキャラクター一覧・詳細を確認する既定 home。

### canonical inputs

- PL が持つ character-sheet / character-branch
- 各 branch の advancement chain
- 各 branch に紐づく session
- character-conversion

### blocks

- キャラクター一覧（branch 単位）
- 選択したキャラクターの詳細（stats、立ち絵、プロフィール）
- セッション履歴一覧
- 成長履歴
- 変換 provenance（あれば）

### reader mode

- owner mode のみ。character home は private workbench であり、public / anonymous に公開しない

character home の branch list は branch-rooted とする。current head sheet が欠落しても branch row 自体は保持し、owner workbench は broken-head repair state に入ってよい。

`recentSessions` は session root を優先し、linked scenario が欠落しても row 自体は残す。stored scenarioLabel が無い場合は scenario label block だけを省略してよい。

## Character Shared Detail

### 目的

共有リンクで開く canonical character detail。public / anonymous reader に branch line 単位の公開情報だけを見せる。

### canonical inputs

- character-branch
- branch の current head である character-sheet
- branch に紐づく session
- branch に紐づく character-advancement
- character-conversion

### blocks

- branch identity（displayName、branchLabel、rulesetNsid）
- 立ち絵、stats、profileSummary
- public-safe なセッション履歴（scenarioLabel / scenario summary、playedAt、role、outcomeSummary、hoLabel、hoSummary、externalArchiveUris のみ）
- public-safe な advancement summary（advancementKind、effectiveAt、紐づく session summary）
- public-safe な conversion summary（sourceRulesetNsid、targetRulesetNsid、convertedAt）

canonical shared root は character detail のままとし、その主語は branch line で解決する。同じ branch 上の conversion epoch を跨いでも route root は変えない。別 root が必要な parallel line は branch fork で表現する。

sheetSchemaPin が無い branch では、public / anonymous 向けの structured stats block を省略する。raw JSON fallback は hidden payload として扱わず、shared detail の主要 block には出さない。
sheetSchemaPin が指す schema record 自体は detail route の root ではない。live read が `sheetSchemaPin.cid` と一致しない場合や schema record が欠落した場合も detail route は解決を維持し、verified cache で exact pin を復元できなければ structured stats block だけを省略する。
conversion provenance の canonical replay には source / target の sheet exact pin を使う。public-safe summary は pin を必須表示しない。

### reader mode

- owner mode: 全 block を見る
- public / anonymous mode: public-safe subset を見る。draft の場合も detail route は解決するが、surface 先頭で draft state を明示する。presentation を単純に保つため、note、deltaPayload、previousValues、characterBranchRef は shared detail に畳み込まない。非公開専用 annotation は定義しない

public / anonymous mode の `recentSessionSummaries` は visibility: public の session だけを含み、draft child session は返さない。

embedded session summary は session root を優先し、linked scenario が欠落しても summary row 自体は落とさない。stored scenarioLabel が無い場合は scenario label field だけを省略してよい。

public mode の output は `branchSummary`、`sheetSummary`、`recentSessionSummaries`、`advancementSummaries`、`conversionSummaries` の summary shape に固定する。`deltaPayload`、`previousValues`、raw change payload、owner-only linkage は返さない。

`getCharacterBranchView` を canonical shared-surface contract とする。owner mode は authenticated reader、public / anonymous mode は auth bundle なしの public lens で解決する。

## Player Profile

### 目的

卓前の自己紹介と public character detail への導線を返す shared surface。

### canonical inputs

- player-profile
- ownerDid が持つ public character-branch

Bluesky の `app.bsky.actor.profile` は fallback hydration の display-only adjunct として読んでよいが、Cerulia core truth の正本には含めない。fallback で読んだ website は Cerulia 側と同じ credential-free 公開 URI 条件を満たす場合だけ composed summary に含める。

### blocks

- profile identity（displayName、description、avatar、banner、website、pronouns の composed summary）
- TRPG 固有プロフィール
- public character detail への導線（`characterBranchRef`、`displayName`、`branchLabel`、`rulesetNsid` だけを持つ link-only summary row）

### reader mode

- owner mode: Cerulia override と Bluesky fallback の両方を見比べられる
- public / anonymous mode: composed profile summary と public branch link だけを見る。fallback 由来の field も public-safe / credential-free 条件を満たすものだけを返す

`publicBranches` は branch-rooted link row とする。公開 branch の current head sheet が解決できない row は除外してよく、profile view 全体は失敗させない。

player profile は shared surface だが shared root ではない。`getPlayerProfileView` を canonical contract とし、public / anonymous mode では summary shape に閉じる。

## Campaign View

### 目的

長期卓（campaign）に紐づくセッション一覧を見る shared view。

### canonical inputs

- campaign
- house（houseRef があれば。identity 表示用）
- campaign の rulesetNsid で絞った session
- campaign.sharedRuleProfileRefs

house.defaultRuleProfileRefs は campaign 作成時の seed-only default。閲覧時の effective overlay の唯一の正本は campaign.sharedRuleProfileRefs とする。

### blocks

- campaign identity（title、ルールシステム名）
- セッション一覧（public-safe summary only）
- ルール overlay summary

### reader mode

- owner mode: 全セッション
- public mode: list surface では visibility: public な campaign のみ返す。detail route は draft でも draft state を明示して解決してよい。draft child session は返さない

draft house を参照する campaign でも、public mode は house identity block を返さない。

campaign route は campaign root を優先する。linked house または individual `sharedRuleProfileRefs` が欠落しても campaign view 自体は維持し、affected house block または rule overlay row だけを省略する。

embedded session summary は session root を優先し、linked scenario が欠落しても session row 自体は残す。stored scenarioLabel が無い場合は label field だけを省略してよい。

`getCampaignView` は owner mode では authenticated reader、public / anonymous mode では auth bundle なしの public lens で解決する。

public mode の output は `campaignSummary`、`sessionSummaries`、`ruleOverlaySummary` に固定する。raw rule-profile payload や owner-only linkage は返さない。embedded `sessionSummaries` は軽量 summary に留め、`externalArchiveUris` は持ち込まない。

## Scenario Catalog

### 目的

シナリオの検索・一覧。

### canonical inputs

- scenario
- character-sheet-schema（scenario.recommendedSheetSchemaPin がある場合だけ direct に参照する）

### blocks

- シナリオ一覧（rulesetNsid でフィルタ可能）
- シナリオ詳細（summary、sourceCitationUri）
- 「このシナリオからキャラクターを作る」への導線

scenario に recommendedSheetSchemaPin があるときだけ `scenario -> character-sheet-schema` を canonical create chain とする。recommendedSheetSchemaPin が無い scenario は browse-only とし、AppView は scenario 起点の create CTA を出さない。

recommendedSheetSchemaPin の解決に失敗した scenario も readable な browse-only entry として残す。create CTA は出さず、schema 解決に依存する導線だけを止める。

## House Activity

### 目的

house に紐づくセッション・キャラクターの逆引き。

### canonical inputs

- house
- campaign（houseRef が一致するもの）
- session（campaignRef 経由で間接参照）

### blocks

- house identity（title、canonSummary、externalCommunityUri）
- 関連 campaign 一覧
- 関連セッション一覧（public-safe summary only）

public mode では list surface に visibility: public な campaign / session だけを返し、draft child は畳み込まない。house detail route 自体は draft でも draft state を明示して解決してよく、この direct-link detail では house identity を返してよい。埋め込み public projection では draft house identity を返さない。

house route は house root を優先する。linked campaign / session が欠落した場合は surviving public items だけを返し、欠落 item のために route 全体を失敗させない。

public session は embedded-only とし、standalone public session detail route は持たない。

`getHouseView` は owner mode では authenticated reader、public / anonymous mode では auth bundle なしの public lens で解決する。

public mode の output は `houseSummary`、`campaignSummaries`、`sessionSummaries` に固定する。draft house identity を public campaign 埋め込みから返さない。embedded `sessionSummaries` は軽量 summary に留め、`externalArchiveUris` は持ち込まない。
