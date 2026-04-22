# 実装計画

この計画は `protocol`、`api`、`projection` の 3 単位を前提に、Cerulia backend を TypeScript で起こす順序を定義する。

## docs-first implementation note

`docs` 配下が canonical source of truth であり、`protocol/src/lexicon/*` と `api/src/*` はこの文書で固定した branch-centered lineage contract に同期している。以後の変更では docs / protocol / runtime の 3 点を同時に更新し、再び drift を作らない。

## 原則

- canonical truth の write/read authority は `api` に置く
- `projection` は derived read model と discovery に限定する
- `protocol` は generated artifact と thin wrapper に限定する
- `projection` が無い状態でも `appview + api` で canonical flow を成立させる

## API read と redaction の契約

`api` は read mode を `owner` と `public` に分け、同じ record でも mode ごとに返却 shape を固定する。

- `owner` mode: owner workbench 向け。編集に必要な full payload を返す
- `public` mode: direct-link 共有向け。public-safe summary shape のみ返す

`api` が mode を決めるときの permission bundle は次の判定軸に閉じる。

- `actorDid`（呼び出し主体）
- `ownerDid`（record owner）
- `isOwner`（owner 判定）
- `visibility`（record visibility）
- `callerProof`（OAuth token と DID 解決で結びつく caller 証明）

判定結果は次の contract に閉じる。

- owner かつ record が存在する場合は `owner` mode を返す
- owner 以外は `public` mode だけを返す
- public に許可できない record は非公開状態として返し、private payload は返さない

caller と owner の拘束条件は次で固定する。

- mutation は caller-owned repo にだけ許可する
- same-owner 制約を持つ record（character-conversion など）は `callerDid == ownerDid` を必須とする
- third-party repo への write proxy は許可しない

mutation result の返却条件は次で固定する。

- `accepted`: validation と ownership 制約を満たし、base rev が最新
- `rejected`: validation / ownership / policy のいずれかに違反
- `rebase-needed`: validation と ownership は満たすが base rev が古い

AppView preflight はこの contract を上書きしない。最終判定は常に `api` authoritative validation と read policy が担う。

## API authoritative semantic validation の固定

`api` は Lexicon の型検証だけで accept/reject を決めない。cross-record reference、schema pin、caller-owned invariant、public URI policy は共通の semantic validation layer で判定する。

この layer の責務は次に固定する。

- `protocol`: NSID、AT URI、blob、datetime などの構文検証だけを担う
- `appview`: UX のための advisory preflight だけを担う
- `api`: record 実体の解決、owner 判定、active schema 解決、public policy 判定を行い、mutationAck を確定する

`api` が authoritative に判定する invariant は少なくとも次を含む。

| invariant family | what | where |
| --- | --- | --- |
| schema link consistency | `sheetSchemaRef.baseRulesetNsid == rulesetNsid`、`targetSheetSchemaRef.baseRulesetNsid == targetRulesetNsid`、`recommendedSheetSchemaRef.baseRulesetNsid == scenario.rulesetNsid` | createCharacterSheet、rebaseCharacterSheet、recordCharacterConversion、createScenario、updateScenario |
| schema payload conformance | `stats` が active schema の `fieldDefs` / `fieldId` / group key に沿うこと。extensible で許可された追加 field だけを受け入れること | createCharacterSheet、updateCharacterSheet、rebaseCharacterSheet、recordCharacterConversion |
| caller-owned blob | `portraitBlob`、`avatarOverrideBlob`、`bannerOverrideBlob` が caller repo で upload された blob metadata であること | createCharacterSheet、updateCharacterSheet、updatePlayerProfile |
| caller-owned scope reference | `scopeRef`、`houseRef`、`campaignRef`、`sourceBranchRef`、`characterBranchRef` などが caller が control する record を指すこと | createRuleProfile、createSession、updateSession、createCharacterBranch、recordCharacterConversion |
| ruleset overlay consistency | `sharedRuleProfileRefs[*].baseRulesetNsid == campaign.rulesetNsid`、default rule profile seed 後の live source が campaign 側に閉じること | createCampaign、updateCampaign |
| public URI policy | public surface に出る URI が credential-free であること | session、scenario、house、rule-profile、player-profile |
| terminal mutation policy | retired / archived state に対する更新制約を守ること | updateCharacterBranch、retireCharacterBranch、updateCampaign |

## missing reference degradation と repair の固定

`api` と `projection` は route root の欠落と linked record の欠落を区別する。

- route root missing: `NotFound` を返す
- linked record missing: owning root を維持したまま degraded read を返す

canonical case は次に固定する。

- `characterBranch` root + missing `character-sheet-schema`: sheet identity と public-safe summary は返し、structured stats block だけを省略する。schema-backed mutation は repair 完了まで止める
- `session` root + missing `scenario`: session row / summary は維持し、stored scenarioLabel があれば使う。stored scenarioLabel が無ければ label field だけを省略する
- `campaign` root + missing `rule-profile` / `house`: campaign view は維持し、missing overlay row または house block だけを省略する
- `house` root + missing child `campaign` / `session`: surviving linked item だけを返す
- `scenario` root + missing recommended schema: readable な browse-only entry として返し、create chain だけを止める

repair 責務は次に固定する。

- owner-facing flow は missing reference により durable root が消えたように見せず、repair-needed state を優先して出す
- schema / scope / overlay に依存する mutation は internal error ではなく repair-oriented な reject または dedicated recovery flow に倒す
- current head `character-sheet` が失われた branch は broken-head condition として扱い、owner workbench 側に dedicated repair flow を用意する

この表にある条件は個別 procedure の補足説明ではなく、`api` phase で最初に実装する共通判定面として扱う。新しい mutation を追加するときは、この family のどれに属するかを先に決め、Lexicon の型だけで吸収しようとしない。

public mode の redaction 粒度は record ごとの matrix で固定する。

- character detail: public-safe summary（profile、structured stats、portrait 参照、公開 session summary）だけ返す
- player profile: Cerulia override と Bluesky fallback を合成した表示 shape を返す。credential-bearing URI は返さない
- session / campaign / house 一覧: discovery 用 summary だけ返す
- scenario detail: summary と source citation だけ返す。owner-private memo は返さない
- rule-profile / character-sheet-schema: public-only の canonical field だけ返す。visibility 派生 field は返さない
- owner workbench route: `owner` mode で full payload を返すが、public route は同一 endpoint でも `public` mode summary に固定する

`credential-free` URI は、認証ヘッダ、cookie、署名付き query を必要としない公開 URI を指す。

## OAuth 戦略の固定

Cerulia の実装パターンは Authorization Code + PKCE に固定する。

- `api` は confidential OAuth client として動作し、OAuth session、refresh token、DPoP key、binding secret を operational store に保持する
- `appview` は `api` の browser frontend として動作し、browser 側に atproto token を保持しない
- `api` は browser session に束ねた OAuth session の DID と session grant を照合して callerProof を確定する
- repo write/read は `api` が保持する caller session を使って caller の PDS に対して実行する
- refresh と再認証は caller の PDS / authorization server の current authority に追随する

この戦略は `api` フェーズ開始前に変更しない。別案比較は実装後ではなく設計段階でのみ行う。

## フェーズ 1: protocol package を固定する

root monorepo で固定済みの `docs/records`、`docs/lexicon`、`docs/architecture` を入力にして、workspace package として `protocol` を固める。

実装範囲:

- generated TypeScript types
- codec / parser / decoder
- official SDK thin wrapper
- shared error surface の最小定義

完了条件:

- `api` と `projection` が workspace package として `protocol` にだけ依存して型共有できる
- `protocol` 自体は DB、HTTP server、Workers binding を持たない

## フェーズ 2: api を起こす

`api` は owner write と direct read の authoritative boundary として先に作る。

実装範囲:

- OAuth
- repo write/read
- authoritative validation
- semantic validation layer（schema link、fieldDefs 準拠、caller-owned ref/blob、public URI policy、terminal-state policy）
- owner workbench 向け read
- public / anonymous の direct-ref detail read
- SQLite schema と migration
- Bun entrypoint
- Workers entrypoint

完了条件:

- character create / edit / session record の canonical flow が `appview + api` だけで成立する
- `projection` が未実装でも direct-link 共有 detail が壊れない
- Workers entrypoint が placeholder ではなく canonical API handler に配線される

## フェーズ 3: appview を api に接続する

AppView 接続の hardening と UX 改善を行う。phase 2 の時点で最小 canonical flow は接続済みであることを前提にする。

実装範囲:

- character create / edit
- schema-backed form
- draft / public 切り替え
- session record create
- direct-link detail

完了条件:

- MVP の core flow が `appview + api` の最小構成で end-to-end に通る

## フェーズ 4: projection を追加する

`projection` は catalog、discovery、公開一覧系 surface のために後置きで追加する。

実装範囲:

- event ingestion
- replay / refold
- scenario catalog
- campaign view
- house activity
- search / reverse index
- SQLite derived store

完了条件:

- `projection` を有効にすると一覧・検索・discoverability が増える
- `projection` を止めても canonical flow は維持される

## フェーズ 5: self-host と Workers 配布を固める

実装範囲:

- Bun self-host 用の最小構成
- Workers 用 adapter と binding
- SQLite file-backed と D1 の差分吸収
- 運用 runbook

完了条件:

- `appview + api` の最小構成を self-host できる
- `projection` を追加した拡張構成も別途デプロイできる
