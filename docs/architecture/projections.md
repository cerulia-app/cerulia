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

### 2. projection は全 record から自動生成する

PL による手動の curate は不要。visibility: public の record を自動的に一覧に含める。visibility: draft の record は一覧や発見導線からは除外し、direct link では draft 状態を明示して表示する。

### 3. reader mode

- owner mode: 自分の全 record（draft 含む）を見る
- public mode: visibility: public な record だけを見る

### 4. draft の表示契約

- draft は AppView 上の non-indexed state とする
- anonymous / public mode でも direct ref が与えられた detail route は draft record を draft 状態つきで解決してよい
- draft record を参照する public record があっても、projection は draft 側の内容を public block に畳み込まない

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

## Character Shared Detail

### 目的

共有リンクで開く canonical shared surface。public / anonymous reader に branch 単位の公開情報だけを見せる。

### canonical inputs

- character-branch
- character-sheet
- branch に紐づく session
- branch に紐づく character-advancement
- character-conversion

### blocks

- branch identity（displayName、branchLabel、rulesetNsid）
- 立ち絵、stats、profileSummary
- public-safe なセッション履歴（scenarioLabel / scenario summary、playedAt、role、outcomeSummary、hoLabel、hoSummary、externalArchiveUris のみ）
- public-safe な advancement summary（advancementKind、effectiveAt、紐づく session summary）
- public-safe な conversion summary（sourceRulesetNsid、targetRulesetNsid、convertedAt）

sheetSchemaRef が無い branch では、public / anonymous 向けの structured stats block を省略する。raw JSON fallback は hidden payload として扱わず、shared detail の主要 block には出さない。
conversion provenance の canonical replay には source / target の sheet version pin を使う。public-safe summary は version を必須表示しない。

### reader mode

- owner mode: 全 block を見る
- public / anonymous mode: public-safe subset を見る。draft の場合も detail route は解決するが、surface 先頭で draft state を明示する。presentation を単純に保つため、note、deltaPayloadRef、previousValues、characterBranchRef は shared detail に畳み込まない。非公開専用 annotation は定義しない

`getCharacterBranchView` を canonical shared-surface contract とする。owner mode は authenticated reader、public / anonymous mode は auth bundle なしの public lens で解決する。

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

`getCampaignView` は owner mode では authenticated reader、public / anonymous mode では auth bundle なしの public lens で解決する。

## Scenario Catalog

### 目的

シナリオの検索・一覧。

### canonical inputs

- scenario
- character-sheet-schema（scenario.recommendedSheetSchemaRef がある場合だけ direct に参照する）

### blocks

- シナリオ一覧（rulesetNsid でフィルタ可能）
- シナリオ詳細（summary、sourceCitationUri）
- 「このシナリオからキャラクターを作る」への導線

scenario に recommendedSheetSchemaRef があるときだけ `scenario -> character-sheet-schema` を canonical create chain とする。recommendedSheetSchemaRef が無い scenario は browse-only とし、AppView は scenario 起点の create CTA を出さない。

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

public session は embedded-only とし、standalone public session detail route は持たない。

`getHouseView` は owner mode では authenticated reader、public / anonymous mode では auth bundle なしの public lens で解決する。
