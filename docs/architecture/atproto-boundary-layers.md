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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| DID を主、handle を従にする | actor の durable key は DID を使う。例えば `app.bsky.graph.follow` は `subject` に handle ではなく DID を入れる |
| handle は双方向に検証してから有効とみなす | handle が壊れても account continuity は DID 側で保ち、表示上は `handle.invalid` に落とせるようにしている |
| 現在の鍵と service location は DID document から取る | Bluesky の Entryway / SDK は login 後に DID document を使って actual PDS にルーティングする |

### Bluesky を 5W1H で見る

- What: Bluesky は「人に見せる名前」と「機械が信じる主体」を分け、後者を DID に固定している
- Why: handle 変更や handle 破損があっても、投稿・フォロー・署名検証・PDS ルーティングを壊さないため
- Who: Bluesky client、Entryway、PDS、AppView、relay が同じ actor root を共有する
- Where: DID document、profile view、follow record、login routing に現れる
- When: login、profile hydrate、follow graph 解決、署名検証のたびに使う
- How: UI は handle を出し、storage と routing は DID を使い、broken handle は invalid 表示に degrade させる

### Bluesky の例

- `app.bsky.graph.follow` record は `subject` に DID を保存する。follow 先を handle 文字列では持たない
- profile view は `did` と `handle` を併記する。主体は DID、表示名は handle という分担で衝突しない
- Bluesky PDS 群は user-facing には `bsky.social` を見せても、実際の request routing は DID document 上の PDS host に従う

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| authority は resource ごとに分かれる | repo write は user PDS、authenticated `app.bsky.*` read は AppView、full-network firehose は relay、session 管理は Entryway/PDS が担う |
| authority はその resource の root で証明する | proxied `app.bsky.*` request では PDS が `rpc` permission を確認してから AppView に流す |
| authority は時間で変わるので再確認する | handle / hosting status / session routing は固定値ではなく、identity event、account event、session refresh に追随する |

### Bluesky を 5W1H で見る

- What: Bluesky は「どの service が何について authoritative か」を分散したまま運用している
- Why: repo truth、read aggregation、session orchestration、network redistribution を 1 service に混ぜないため
- Who: Entryway、PDS、AppView、relay、client がそれぞれ別の authority を持つ
- Where: `bsky.social`、actual PDS host、`api.bsky.app`、`bsky.network` などの service に分かれて現れる
- When: write、authenticated read、session refresh、redistribution の都度判定される
- How: request 種別ごとに authority root を選び、PDS proxy や event propagation でつなぐ

### Bluesky の例

- post / follow / like / repost の作成は user の PDS に対する repo write であり、AppView に直接書かない
- `app.bsky.actor.getProfiles` のような authenticated read は PDS 側で `rpc` permission を確認し、AppView に proxy する
- relay は account / identity / commit event を downstream に流すが、repo write authority 自体を持たない

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| durable subject は DID authority の AT URI で指す | post thread や likes/reposts lookup は AT URI を主キーとして使う |
| exact version が必要なときだけ URI に CID を足す | like、repost、reply、pinned post、starter pack 参照は strong reference を使う |
| subject identity と content identity を混同しない | hydrated `PostView` は `uri` と `cid` を別 field で返し、view 側でも両方を保持する |

### Bluesky を 5W1H で見る

- What: Bluesky は actor 参照、record 参照、record-version 参照を別々に表現している
- Why: social graph は durable subject を見たい一方、reply / repost / like の provenance は exact version まで固定したいから
- Who: record schema author、AppView、client SDK、query endpoint 実装が使う
- Where: `app.bsky.graph.follow.subject`、`com.atproto.repo.strongRef`、`getLikes` / `getRepostedBy` / `getQuotes` の `cid` filter に現れる
- When: record write、hydration、interaction lookup、thread reconstruction の時点で使い分ける
- How: actor 関係は DID、record lookup は AT URI、version-sensitive relation は strong reference にする

### Bluesky の例

- `app.bsky.graph.follow` は actor を DID で参照する。record AT URI ではない
- `app.bsky.feed.like` と `app.bsky.feed.repost` は `subject = { uri, cid }` を使い、対象 record の specific version を固定する
- `app.bsky.feed.getRepostedBy` は `uri` 必須、`cid` 任意で、same subject の中でも特定版だけに絞り込める

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| hash と signature の正本は DRISL-CBOR に置く | repo commit、firehose、CAR export は binary canonical form を使い、developer-facing JSON は派生に留める |
| cid-link、bytes、blob、`$type` は protocol-defined typed object として扱う | profile の `avatar` / `banner` は `BlobRef`、`pinnedPost` は strong reference を使う |
| data-model validity は lexicon validity より先にある | blob は generic upload で一度受け、record 参照時に app-specific 制約をかける 2 段階にしている |

### Bluesky を 5W1H で見る

- What: Bluesky は canonical binary と developer-facing JSON を明確に分けている
- Why: hash / signature / sync integrity を壊さずに、client 開発は JSON で扱いやすくするため
- Who: PDS、relay、AppView、SDK、client がそれぞれ別の representation を使う
- Where: repo commit / firehose / CAR / blob upload / app API response に現れる
- When: upload、write、sync、hydrate の各段階で representation が切り替わる
- How: canonical path は CBOR/CAR、client path は JSON object、blob は upload 後に typed metadata として record に差し込む

### Bluesky の例

- `com.atproto.repo.uploadBlob` で blob metadata を返し、その後 profile record や post embed から参照する
- `app.bsky.actor.profile.avatar` と `banner` は ad hoc URL 文字列ではなく blob object を使う
- firehose は CBOR/CAR を流し、Jetstream はその上に載る簡易 JSON stream として提供される

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| public record の正本は account repo に置く | profile、post、follow、like、repost などの Bluesky core social objects は user repo に入る |
| repo state は signed commit と deterministic MST で表す | Bluesky PDS は atproto repo をそのまま host し、relay / AppView はそれを downstream で処理する |
| mutation は rev が進む commit chain として扱う | create / update / delete は repo operation として発生し、firehose commit event で downstream に流れる |

### Bluesky を 5W1H で見る

- What: Bluesky は social app でありながら、truth の単位を centralized table ではなく account repo に置く
- Why: account portability と downstream verification を保つため
- Who: user PDS、relay、AppView、バックフィル service が依存する
- Where: `com.atproto.repo.*` API、repo export、firehose commit に現れる
- When: post、profile update、follow、delete のたびに repo state が変わる
- How: repo API で record mutation を起こし、signed commit と diff で network に伝える

### Bluesky の例

- `AppBskyGraphFollowRecord.create` は内部で `com.atproto.repo.createRecord` を呼ぶ
- `app.bsky.feed.post.get` や `app.bsky.graph.follow.get` は `uri`、`cid`、`value` を返し、record-level truth を repo から読む
- follow / like / repost の削除は AppView の flag 更新ではなく `com.atproto.repo.deleteRecord` で起こる

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| app meaning は Lexicon で宣言する | Bluesky social graph と feed semantics は `app.bsky.*` Lexicon 群に置く |
| primary type を混ぜない | `app.bsky.graph.follow` は record、`app.bsky.graph.getFollows` は query、`com.atproto.sync.subscribeRepos` は subscription と分ける |
| evolution は additive を基本にし、破壊変更は新名に逃がす | deprecated field を残しつつ新 field を追加する運用を多用する |

### Bluesky を 5W1H で見る

- What: Bluesky は app meaning を `app.bsky` namespace に集約し、それを SDK と service 実装の共通 contract にしている
- Why: Bluesky 以外の client や service も同じ social objects を読めるようにするため
- Who: Bluesky schema maintainer、SDK generator、AppView、third-party client が共有する
- Where: generated types、lexicon records、endpoint NSID、permission set 設計に現れる
- When: new feature 追加時や schema 改訂時に効く
- How: new record / query / view field を optional に足し、deprecated field はしばらく維持する

### Bluesky の例

- `app.bsky.graph.follow` と `app.bsky.graph.getFollows` は同じ概念圏でも record と query を混ぜない
- `app.bsky.graph.getSuggestedFollowsByActor` は `recId` を deprecated のまま残し、`recIdStr` を追加している
- `app.bsky.actor.profile` は optional な `joinedViaStarterPack` や `pinnedPost` を足しても既存 profile record を壊さない

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| query / procedure / subscription の transport semantics を守る | public / authenticated read は query、repo mutation は procedure、firehose は subscription で分ける |
| OAuth は session と client を証明し、Permission は resource access を絞る | Bluesky-hosted account では Entryway / PDS が session を扱い、proxied `app.bsky.*` request は `rpc` permission で絞る |
| transport-level auth は business role や canonical truth を決めない | same post を public API でも authed API でも読めるが、authed path では `viewer` state のような追加文脈だけを返す |

### Bluesky を 5W1H で見る

- What: Bluesky は write、authenticated read、public read、stream を別 transport path に分けている
- Why: repo write を PDS に固定しつつ、rich read と caching は AppView 側で最適化したいから
- Who: client、Entryway、PDS、AppView、relay が request type ごとに役割分担する
- Where: `bsky.social`、actual PDS host、`api.bsky.app`、`public.api.bsky.app`、`bsky.network` に現れる
- When: login、profile read、timeline read、post write、firehose consume のたびに変わる
- How: client は request 種別ごとに適切な host と auth path を選び、PDS proxy は必要な `rpc` permission だけを確認する

### Bluesky の例

- `app.bsky.actor.getProfiles` は authenticated read として PDS proxy を通り、`rpc` permission を確認したうえで AppView に流れる
- `app.bsky.feed.getPosts` や `getPostThread` の public read は `public.api.bsky.app` に直接打てる
- post / follow / like / repost の create/delete は `com.atproto.repo.createRecord` / `deleteRecord` に落ちる

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| sync は batch export と live stream の二本立てで考える | full-network consume は relay firehose、recovery / backfill は repo export を併用する |
| consumer は payload を受けるだけでなく chain を検証する | Bluesky は firehose provider を複数持ち、`prevData` を含む endpoint を使い分ける必要を案内している |
| desync は例外ではなく回復状態として扱う | simple consumer には Jetstream を、strict consumer には full firehose + resync を勧める |

### Bluesky を 5W1H で見る

- What: Bluesky は full firehose、relay、Jetstream、repo export を用途別に使い分けている
- Why: search、feed generator、bot、labeler で required fidelity が違うから
- Who: PDS、relay、Jetstream server、feed generator、labeler、indexer が関与する
- Where: `com.atproto.sync.subscribeRepos`、`bsky.network`、regional relay、Jetstream endpoint に現れる
- When: bootstrap、steady-state stream、recovery、lightweight consumption で選択が変わる
- How: strict consumer は signed commit stream を追い、lighter consumer は derived JSON stream を使う

### Bluesky の例

- `bsky.network` や regional relay に対して `com.atproto.sync.subscribeRepos` を購読し、full-network update を受ける
- `wantedCollections=app.bsky.feed.post` の Jetstream を使えば、post だけの簡易 JSON stream を読める
- chain が壊れた strict consumer は repo export を取り直して再同期する。Jetstream 単独では canonical recovery path にならない

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

### Bluesky の選択

| 原則 | Bluesky の選択 |
| --- | --- |
| view は derived であり canonical truth を作り直さない | `PostView` や `ProfileViewDetailed` は repo record を内包しつつ count、label、viewer state を足す |
| view は hydration、index、count、ranking、policy overlay を足してよい | AppView pipeline は skeleton、hydration、rules、presentation を分けて viewer-aware surface を作る |
| view は upstream identity、account state、repo truth に拘束される | blocked / notFound / takedown / no-hosted を別 variant として返し、record truth を黙って捏造しない |

### Bluesky を 5W1H で見る

- What: Bluesky は AppView を「record を見せるサービス」ではなく「record を元に読める surface を作るサービス」として使っている
- Why: social app には counts、ranking、viewer relation、moderation overlay が必要だが、それを repo truth に混ぜたくないから
- Who: AppView、hydrator、ranking source、labeler、client が関与する
- Where: `api.bsky.app` の feed / actor / graph endpoint と internal view builder に現れる
- When: timeline、thread、profile、suggestion、notification を読むときに毎回働く
- How: raw record を hydrate し、viewer relation や labels を足し、必要なら blocked / notFound variant に変換して返す

### Bluesky の例

- `PostView` は `uri`、`cid`、`record` を保持したまま、`likeCount`、`repostCount`、`viewer`、`labels` を足す
- `ProfileViewDetailed` は profile record を元に `followersCount`、`followsCount`、`associated.chat`、`associated.activitySubscription` などを加える
- `getRepostedBy` は repost record の subject を使って actor profile view を hydrate するが、元 post 自体の canonical truth は repo record から離れない

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