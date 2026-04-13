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
- ruleset-manifest
- rule-profile
- character-sheet-schema

### 2. projection は全 record から自動生成する

PL による手動の curate は不要。visibility: public の record を自動的に一覧に含める。visibility: draft の record は一覧から除外するが、直接リンクではアクセスできる。

### 3. reader mode

- owner mode: 自分の全 record（draft 含む）を見る
- public mode: visibility: public な record だけを見る

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

- owner mode: 全 record（draft 含む）
- public mode: visibility: public な branch と session のみ

## Campaign View

### 目的

長期卓（campaign）に紐づくセッション一覧を見る shared view。

### canonical inputs

- campaign
- house（houseRef があれば）
- campaign の rulesetNsid で絞った session
- campaign.sharedRuleProfileRefs

### blocks

- campaign identity（title、ルールシステム名）
- セッション一覧
- ルール overlay summary

### reader mode

- owner / maintainer mode: 全セッション
- public mode: visibility: public な campaign のみ

## Scenario Catalog

### 目的

シナリオの検索・一覧。

### canonical inputs

- scenario
- ruleset-manifest（sheetSchemaRefs の chain 用）

### blocks

- シナリオ一覧（rulesetNsid でフィルタ可能）
- シナリオ詳細（summary、spoiler の折りたたみ）
- 「このシナリオからキャラクターを作る」への導線（scenario → manifest → schema chain）

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
- 関連セッション一覧
