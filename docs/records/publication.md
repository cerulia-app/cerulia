# publication

## 役割

campaign、character-branch、session のような artifact を、どの公開 surface に、どの状態で公開しているかを表す durable record。公開、差し替え、退役を append-only に追跡する。

## 置き場所

subject の owner の repo。

## 主なフィールド

- subjectRef
- subjectKind
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

subject の owner。

## 参照関係

- campaign
- character-branch
- session

## 設計上の注意

- publication は generic ledger であり、特定の external context に限定しない
- `surfaces` は `surfaceKind`、`purposeKind`、`surfaceUri`、`status` を持つ ordered list として扱ってよい
- active な publication は `entryUrl` を必須にする
- 同じ publication row の `surfaces` では、同一 `surfaceKind` の active surface は高々 1 件に固定する
- `preferredSurfaceKind` は active な surface だけを指してよい
- active な publication は、少なくとも 1 件の `purposeKind = stable-entry` な active surface を持たなければならない
- `status` は active / retired の閉じた値にする
- publish の更新や carrier の差し替えは既存 record を直接編集せず、`supersedesRef` 付きの新しい publication を積んで扱う
- supersedesRef を使う場合、参照先は同じ subjectRef と subjectKind を指す publication に限る
- 同じ subjectRef と subjectKind について、supersedes chain の最新 record を current head とみなす
- 同じ subjectRef と subjectKind に対して新しい publication を追加するとき、既存の current head があれば supersedesRef でそれを指さなければならない
- publishSubject の `expectedCurrentHeadRef` は initial publish で current head が存在しない場合だけ省略してよい
- current head が retired のときは retiredAt を埋め、`surfaces` に active な要素を残してはならない
- retire は公開入口を将来向けに止めることである
- retired または superseded な publicationRef の direct link は、AppView 上では current head への CTA と状態説明を持つ explanatory tombstone に解決する
- owner-steward 向けの既定 list は active current head だけを返し、retired current head は includeRetired 相当の明示 opt-in で archived summary として列挙する
- canonical source of truth は publication ledger であり、外向け post / thread / profile / app card は差し替え可能な carrier として扱う
- character-conversion 自体は publication subject にせず、変換後の branch または episode を公開対象にする
- 変換済み branch または episode を公開するとき、publication summary は raw conversion ledger を露出せずに必要最小限の derivation hint を返してよい
- subjectKind は campaign / character-branch / session の閉じた値にする
