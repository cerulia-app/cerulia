# AT Protocol Boundary Layers

## 目的

この文書は、Cerulia を AT Protocol 境界の観点からレビューするときに使う layer model と principle set を固定する。

- [layers.md](./layers.md) は Cerulia product-core の layer を定義する文書である
- この文書は protocol-facing boundary の layer を定義する文書である
- `AT Protocol Boundary Review` agent は、この文書を前提に spec issue と app policy を分けて扱う

## top-level layer の判定基準

次の 3 条件をすべて満たすものだけを top-level layer と呼ぶ。

1. 別の一次質問に答えている
2. 別の正本 spec 群を持つ
3. 別の主体が別のタイミングで検証する

この条件を満たさないものは sublayer であり、top-level layer に昇格させない。

## top-level layer 一覧

| layer | 中心の問い | 主な正本 spec |
| --- | --- | --- |
| identity | 誰か | DID, Handle |
| authority | 誰が何を決められるか | Account, Permission, OAuth, Lexicon authority |
| reference | 何を指しているか | AT URI, strong reference, Data Model |
| data | どんな値と bytes が protocol 上 valid か | Data Model, Blob |
| repository | public truth をどこにどう置くか | Repository |
| schema | その data / endpoint が何を意味するか | Lexicon |
| access and transport | どう要求し、どう証明し、どう運ぶか | XRPC, OAuth, Permission |
| synchronization | truth をどう配り、どう追いつくか | Sync, Event Stream |
| view and aggregation | public truth からどう read model を作るか | ATP, Account, Sync |

## top-level にしないもの

- blob / media: data layer の sublayer
- hosting status: authority layer の sublayer
- event stream wire format: synchronization layer の sublayer
- strong reference: reference layer の sublayer

これらは重要だが、新しい一次質問を作らないため top-level にはしない。

## 1. Identity Layer

### なぜ別 layer か

- What: actor identity と current identity metadata を扱う
- Why: write 権限や参照形式より前に、まず「誰か」を固定する必要がある
- Who: client、PDS、relay、AppView、reviewer
- Where: DID document、handle resolution
- When: auth 前、署名検証前、repo lookup 前
- How: DID resolution と handle の双方向検証で成立する

### 原則

1. DID を主、handle を従にする
2. handle は双方向に検証してから有効とみなす
3. 現在の鍵と service location は DID document から取る

### なぜこの 3 つか

- What: permanence、alias validity、current routing/key resolution の 3 つを分けて扱う最小集合だから
- Why: 1 を落とすと主体が不安定になり、2 を落とすと alias 偽装が通り、3 を落とすと stale key / stale host を掴む
- Who: identity を使うすべての layer の前提になる
- Where: DID spec と Handle spec がこの 3 点に分かれている
- When: login、signature verify、PDS discovery の全てで同時に必要になる
- How: actor root、alias check、current document parse の 3 手順で完結する

## 2. Authority Layer

### なぜ別 layer か

- What: control、ownership、permission、hosting status を扱う
- Why: identity だけでは write、proxy、redistribute、namespace governance を決められない
- Who: PDS、Authorization Server、namespace owner、downstream service
- Where: account status、permission scopes、NSID authority、repo ownership
- When: write 時、proxy 時、redistribution 時、schema resolution 時
- How: resource ごとに authority root を確認する

### 原則

1. authority は resource ごとに分かれる
2. authority はその resource の root で証明する
3. authority は時間で変わるので再確認する

### なぜこの 3 つか

- What: scope、proof source、freshness の 3 つを分ける最小集合だから
- Why: 1 を落とすと権限が雑になり、2 を落とすと誰を信じるか曖昧になり、3 を落とすと migration や失効に追随できない
- Who: write/read/distribution の判定主体が依存する
- Where: Account、Permission、OAuth identity auth、Lexicon authority に対応する
- When: any mutation、service proxy、hosting-status respect、schema trust 時に必要になる
- How: resource type を見て、正しい authority root を引き、現在値を確認する

## 3. Reference Layer

### なぜ別 layer か

- What: record や blob をどう指すかを扱う
- Why: authority と data validity が正しくても、参照先の意味が曖昧なら replay と provenance が壊れる
- Who: record designer、API designer、consumer
- Where: AT URI、CID、strong reference
- When: cross-record link、query parameter、hydrated view 設計時
- How: subject identity と content identity を分けて表現する

### 原則

1. durable subject は DID authority の AT URI で指す
2. exact version が必要なときだけ URI に CID を足す
3. subject identity と content identity を混同しない

### なぜこの 3 つか

- What: subject、version、semantic split を分ける最小集合だから
- Why: 1 を落とすと handle drift に弱くなり、2 を落とすと exact replay ができず、3 を落とすと「同じ対象」と「同じ bytes」が混ざる
- Who: provenance と interaction semantics を設計する側が依存する
- Where: AT URI spec と Data Model の CID rules に対応する
- When: live ref と version pin を選ぶ瞬間に必要になる
- How: live ref なら AT URI、version pin なら strong reference を使う

## 4. Data Layer

### なぜ別 layer か

- What: abstract data type、encoding、CID format、blob object を扱う
- Why: schema meaning の前に、protocol として valid な値と bytes がある
- Who: parser、serializer、validator、storage engine
- Where: DRISL-CBOR、JSON representation、blob metadata
- When: parse、serialize、hash、upload、validate 時
- How: data model invariant を先に当てる

### 原則

1. hash と signature の正本は DRISL-CBOR に置く
2. cid-link、bytes、blob、`$type` は protocol-defined typed object として扱う
3. data-model validity は lexicon validity より先にある

### なぜこの 3 つか

- What: canonical bytes、typed compound value、validation order を分ける最小集合だから
- Why: 1 を落とすと hash が揺れ、2 を落とすと link/blob を慣習的な文字列に落として壊し、3 を落とすと schema 未知の data を不必要に reject する
- Who: low-level implementation と interop test が依存する
- Where: Data Model と Blob spec の責務分割に対応する
- When: data ingest と round-trip の時点で必要になる
- How: data model を満たした後に lexicon 制約を当てる

## 5. Repository Layer

### なぜ別 layer か

- What: account repo、commit、MST、rev、CAR を扱う
- Why: valid data object があるだけでは account-level public truth にならない
- Who: PDS、mirror、verifier、migration tool
- Where: per-account repository
- When: create、update、delete、export、import、diff 時
- How: signed commit と deterministic tree で state を固定する

### 原則

1. public record の正本は account repo に置く
2. repo state は signed commit と deterministic MST で表す
3. mutation は rev が進む commit chain として扱う

### なぜこの 3 つか

- What: truth location、state authentication、temporal progression を分ける最小集合だから
- Why: 1 を落とすと canonical storage が消え、2 を落とすと self-certifying でなくなり、3 を落とすと update chain を追えない
- Who: repo host と downstream verifier が依存する
- Where: Repository spec の path / commit / MST / diff に対応する
- When: any repo mutation と sync verification の両方で必要になる
- How: path to CID mapping を tree に置き、commit に署名し、rev を logical clock として進める

## 6. Schema Layer

### なぜ別 layer か

- What: record、query、procedure、subscription、permission-set の意味を扱う
- Why: data model は shape を与えるが、app meaning や endpoint kind は与えない
- Who: schema author、SDK、validator、app developer
- Where: Lexicon file と NSID namespace
- When: design 時、publish 時、validation 時、evolution 時
- How: namespace authority の下で schema を公開し、互換性ルールで進化させる

### 原則

1. app meaning は Lexicon で宣言する
2. primary type を混ぜない
3. evolution は additive を基本にし、破壊変更は新名に逃がす

### なぜこの 3 つか

- What: meaning declaration、kind separation、time evolution を分ける最小集合だから
- Why: 1 を落とすと shared meaning が消え、2 を落とすと transport semantics が崩れ、3 を落とすと distributed data を壊す
- Who: producer と consumer の両方が依存する
- Where: Lexicon spec の primary type、validation、evolution、authority sections に対応する
- When: schema 設計と長期保守の両方で必要になる
- How: NSID authority の下で lexicon を公開し、optional add を基本に進化させる

## 7. Access and Transport Layer

### なぜ別 layer か

- What: HTTP semantics、OAuth session、permission scope、service proxying を扱う
- Why: authority そのものと、その authority を request 上でどう提示するかは別問題だから
- Who: client、Resource Server、Authorization Server、proxied service
- Where: XRPC endpoint、token flow、headers、scope string
- When: request を送るたび、token を発行・更新するたび
- How: endpoint kind、token proof、scope attenuation を組み合わせる

### 原則

1. query / procedure / subscription の transport semantics を守る
2. OAuth は session と client を証明し、Permission は resource access を絞る
3. transport-level auth は business role や canonical truth を決めない

### なぜこの 3 つか

- What: invocation semantics、proof and grant、boundary discipline を分ける最小集合だから
- Why: 1 を落とすと GET/POST/stream の意味が崩れ、2 を落とすと誰がどこまで触れるか曖昧になり、3 を落とすと app role を protocol role と誤認する
- Who: client 実装と server 実装が直接依存する
- Where: XRPC、OAuth、Permission の各 spec に対応する
- When: request path と auth flow の両方で必要になる
- How: transport semantics を守りつつ、proof は OAuth/DPoP、grant は permission resource で扱う

## 8. Synchronization Layer

### なぜ別 layer か

- What: repo export、firehose、cursor、seq、resync を扱う
- Why: repository が canonical truth でも、その distribution と recovery は別の問題だから
- Who: relay、AppView、indexer、mirror
- Where: `subscribeRepos`、repo CAR export
- When: bootstrap 時、live ingest 時、fault recovery 時
- How: batch transfer と stream transfer を組み合わせ、chain verification で整合を取る

### 原則

1. sync は batch export と live stream の二本立てで考える
2. consumer は payload を受けるだけでなく chain を検証する
3. desync は例外ではなく回復状態として扱う

### なぜこの 3 つか

- What: transfer mode、integrity check、recovery model を分ける最小集合だから
- Why: 1 を落とすと bootstrap か realtime のどちらかが欠け、2 を落とすと upstream を盲信し、3 を落とすと broken chain に計画的に対処できない
- Who: downstream service 全般が依存する
- Where: Sync と Event Stream spec の責務分割に対応する
- When: backfill、steady-state ingest、resync incident 時に必要になる
- How: commit event を検証し、破綻時は full repo fetch に戻す

## 9. View and Aggregation Layer

### なぜ別 layer か

- What: hydrated view、index、count、ranking、policy overlay、discovery read model を扱う
- Why: canonical record と user-facing read model は同じではない
- Who: AppView、search service、reader、ranking service
- Where: derived store、public-facing APIs
- When: read path、indexing、presentation、moderation overlay 時
- How: upstream public truth を派生し、surface に必要な enrichment を加える

### 原則

1. view は derived であり canonical truth を作り直さない
2. view は hydration、index、count、ranking、policy overlay を足してよい
3. view は upstream identity、account state、repo truth に拘束される

### なぜこの 3 つか

- What: truth boundary、allowed enrichment、dependency boundary を分ける最小集合だから
- Why: 1 を落とすと AppView が truth 化し、2 を落とすと AppView の役割が消え、3 を落とすと downstream が勝手に protocol truth を上書きする
- Who: AppView と projection service が依存する
- Where: ATP architecture と Account / Sync の downstream expectation に対応する
- When: any derived read model を設計・運用するときに必要になる
- How: public records から read model を作り、local policy を加えつつ canonical source を越権しない

## 実務上の使い方

レビューや設計議論では、まず対象がどの問いに属するかを 1 つ選ぶ。

- 誰か: identity
- 誰が決められるか: authority
- 何を指すか: reference
- どんな値が valid か: data
- public truth をどこに置くか: repository
- 何を意味するか: schema
- どう要求し証明するか: access and transport
- どう配るか: synchronization
- どう見せるか: view and aggregation

1 つに落ちない場合は、問題が複数 layer をまたいでいる。そこで初めて複合問題として扱う。