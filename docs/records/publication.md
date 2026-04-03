# publication

## 役割

campaign、character-branch、character-episode のような continuity artifact を、どの公開 surface に、どの状態で公開しているかを表す durable record。公開、差し替え、退役を append-only に追跡する。

## 置き場所

subject の owner または steward の repo。

- campaign の公開は campaign steward repo
- branch / episode の公開は branch owner repo が基本
- extension が session-backed carrier を使う場合でも、canonical source of truth はこの record に置く

## 主なフィールド

- subjectRef
- subjectKind
- reuseGrantRef
- entryUrl
- preferredSurfaceKind
- surfaces
- status
- supersedesRef
- publishedByDid
- publishedAt
- retiredAt
- requestId
- note

## 更新主体

subject の owner、またはその continuity artifact を管理する steward。

## 参照関係

- campaign
- character-branch
- character-episode

## 設計上の注意

- publication は generic ledger であり、session 固有の入口に限定しない。
- reuseGrantRef は optional だが、cross-boundary reuse や public summary-share のように explicit grant に支えられた公開では必須にする。
- `surfaces` は `surfaceKind`、`purposeKind`、`surfaceUri`、`status` を持つ ordered list として扱ってよい。
- 同じ publication row の `surfaces` では、同一 `surfaceKind` の active surface は高々 1 件に固定する。
- `preferredSurfaceKind` は active な surface だけを指してよい。
- `preferredSurfaceKind` は、その時点で唯一の active surface を持つ `surfaceKind` だけを指してよい。
- `status` は active / retired の閉じた値にする。
- publish の更新や carrier の差し替えは既存 record を直接編集せず、`supersedesRef` 付きの新しい publication を積んで扱う。
- supersedesRef を使う場合、参照先は同じ subjectRef と subjectKind を指す publication に限る。
- 同じ subjectRef と subjectKind について、supersedes chain の最新 record を current head とみなす。superseded 済み record は履歴として残るが active head ではない。current head の status が retired のとき、その publication chain 全体を retired と解釈する。
- 同じ subjectRef と subjectKind に対して新しい publication を追加するとき、既存の current head があれば supersedesRef でそれを指さなければならない。current head を supersede しない独立 root を並立させてはならない。
- publishSubject の `expectedCurrentHeadRef` は initial publish で current head が存在しない場合だけ省略してよい。既存 current head がある subject で fence を省略してはならない。
- current head が retired のときは retiredAt を埋め、`surfaces` に active な要素を残してはならない。
- retire は公開入口を将来向けに止めることであり、reuse-grant の revoke や payload の redaction とは別物である。
- retired または superseded な publicationRef の direct link は、AppView 上では current head への CTA と状態説明を持つ explanatory tombstone / preflight に解決する。無言の 404 や opaque redirect を canonical な挙動にしない。
- owner-steward 向けの既定 list は active current head だけを返し、retired current head は includeRetired 相当の明示 opt-in で archived summary として列挙する。raw supersedes chain 全体を通常 list に混ぜない。
- canonical source of truth は publication ledger であり、Bluesky の post / thread / profile / app card は差し替え可能な carrier として扱う。
- active な session-publication mirror がある publication current head を supersede または retire するときは、mirror 側の rewrite / retire も同じ requestId / service-log chain で確定しなければならない。core head と carrier head を別タイミングで食い違わせない。
- character-conversion 自体は publication subject にせず、変換後の branch または episode を公開対象にする。
- 変換済み branch または episode を公開するとき、publication summary は raw conversion ledger を露出せずに、必要最小限の derivation hint を返してよい。
- subjectKind は campaign / character-branch / character-episode の閉じた値にする。optional extension の session-backed carrier は session-publication が mirror し、core publication の subject にしない。