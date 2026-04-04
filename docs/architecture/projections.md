# projection contract

## 目的

この文書は、character home、campaign view、publication summary の projection intent contract を固定するためのものである。transport schema と concrete response field 名の正本は [../lexicon/rpc.md](../lexicon/rpc.md) に置き、ここでは目的、canonical inputs、required blocks、optional blocks、除外境界、reader mode に集中する。

## この段階で固定するもの

- 各 surface の目的
- canonical input records
- current head と lifecycle folding の規則
- required blocks と optional blocks
- reader mode と認可境界
- product-core と archive の読取境界

## 共通規則

### 1. core projection は core ledger だけを正本として読む

character home、campaign view、publication summary は次の core record だけを canonical input とする。

- character-sheet
- character-branch
- character-conversion
- character-advancement
- character-episode
- campaign
- world
- house
- ruleset-manifest
- rule-profile
- publication
- reuse-grant

archive 側 record や外部 carrier state は core projection の canonical input にしない。

### 2. current head だけを既定表示に使う

- publication は subject ごとの current head だけを既定表示に使う
- superseded record は履歴であり、default surface には出さない
- retired record は default surface には出さず、必要なら archived view でだけ扱う
- revoke は future right の停止であり、既存 publication row を自動削除したことにしない

### 3. external context は canonical row に混ぜない

外部の runtime や carrier が存在しても、character home、campaign view、publication summary の canonical row はそれらで増減させない。必要なら product 外の導線や補助 summary として別 surface に分ける。

### 4. required block と optional block を分ける

required block は implementation 間で必ず返る要約単位であり、optional block は欠けても contract 違反にしない補助情報である。

### 5. reader mode を明示する

- owner / steward mode: 認可済みの continuity reader が見る
- public mode: public な publication current head に裏づけられた情報だけを見る

reader mode は projection の read lens であり、OAuth bundle そのものではない。

## Character Home

### 目的

character home は、owner または認可された steward が、自分の continuity 資産を最初に確認するための既定 home である。

### canonical inputs

- owner が持つ character-branch current set
- 各 branch の character-sheet / branch override / advancement chain
- 各 branch を targetBranchRef とする recent character-conversion current heads
- 各 branch に紐づく recent character-episode current heads
- 各 branch または episode に紐づく publication current heads
- 各 branch の active / revoked / expired reuse-grant summary

### required blocks

- primary branch summary
- branch chooser summary
- recent episode summary
- reuse boundary summary
- publication summary rows

### optional blocks

- imported provenance summary
- conversion provenance summary
- recent advancement summary
- linked campaign summary

### 除外するもの

- external runtime state
- external carrier state
- raw service log
- archive record 由来の workflow detail

### reader mode

- 既定は owner / steward mode
- public mode の character home は定義しない

## Campaign View

### 目的

campaign view は、campaign を continuity scope として読むための shared view である。shared rule chain、reuse policy、published continuity artifact を確認する面として扱う。public mode では、active な public publication current head を索引する shell / index として振る舞う。

### canonical inputs

- campaign
- world / house seed provenance
- campaign.sharedRuleProfileRefs
- campaign.defaultReusePolicyKind
- campaign に属する recent character-episode current heads
- campaign 自体または campaign 配下 artifact の publication current heads

### block matrix

| block | owner / steward | public |
| --- | --- | --- |
| campaign identity summary | required | required |
| rule provenance summary | required | excluded |
| default reuse policy summary | required | excluded |
| published artifact summary | required | required |
| recent continuity summary | required | excluded |
| active branch summary | optional | excluded |
| steward summary | optional | excluded |
| archived continuity counts | optional | excluded |

### 除外するもの

- admission や participation state
- external runtime workflow
- archive 側 moderation / disclosure / replay detail

### reader mode

- owner / steward mode では campaign 配下の非 public continuity summary を返してよい
- public mode では、少なくとも 1 件の active な public publication current head に裏づけられた campaign identity shell と published artifact summary だけを返す

## Publication Summary

### 目的

publication summary は publication current head を読むための reusable projection primitive である。standalone query と、character home / campaign view に埋め込まれる summary row の両方で同じ意味を持つ。

### canonical inputs

- publication current head
- publication が指す subject の最小 summary
- subject が converted branch または converted episode の場合は、その current character-conversion の最小 summary
- reuseGrantRef がある場合は、その active / revoked / expired summary

### required blocks

- subject identity
- publication status
- entry summary
- preferred surface summary
- publishedAt / retiredAt summary

### optional blocks

- active surfaces summary
- reuse / derivation provenance note
- publishedByDid summary

### 除外するもの

- external carrier adapter state
- raw supersedes chain
- raw service log
- archive 側 disclosure 状態

### reader mode

- public mode では active な public current head だけを返し、anonymous read を許してよい
- public mode の derivation hint は、公開された subject から読める最小 summary に限る
- owner / steward mode でも既定は active current head だけを返し、retired current head は explicit な includeRetired opt-in で archived summary として返してよい

## concretization の現在地

- query / procedure の concrete schema は [../lexicon/rpc.md](../lexicon/rpc.md) で固定する
- auth bundle と transport surface の対応は [../lexicon/auth.md](../lexicon/auth.md) と [../lexicon/rpc.md](../lexicon/rpc.md) で揃える
- 今後の差分は pagination / filtering の詳細化と summary field の調整に限る
