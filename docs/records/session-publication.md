# session-publication

## 役割

optional run extension が、session-backed な public carrier をどう出すかを表す adapter record。canonical source of truth は core の publication であり、この record は session 固有の carrier 構成を補助する。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- publicationRef
- entryUrl
- replayUrl
- preferredSurfaceKind
- surfaces
- supersedesRef
- requestId
- publishedByDid
- publishedAt
- updatedByDid
- updatedAt
- retiredAt
- retireReasonCode

## 更新主体

session authority。publish / retire は extension governance 扱いで確定する。

## 参照関係

- session
- publication

## 設計上の注意

この record は publication の第 2 正本ではない。独自に持つ意味は、session authority が governance する carrier 構成と、その更新履歴だけである。

- session-publication が独自に持つもの: sessionRef ごとの carrier chain、entryUrl / replayUrl、surface の preferred 選択、carrier retireReasonCode、published / updated attribution
- session-publication が独自に持たないもの: subject identity、公開 subject の canonical current head、derivation / reuse の意味、公開可否の最終正本

- surfaces は surfaceKind、purposeKind、surfaceUri、status を持つ配列として扱ってよい。
- MVP では sessionRef ごとに canonical な session-publication chain は 1 本だけ持つ。複数の外向け導線は 1 row の surfaces 配列で表す。
- session-backed run を外部共有するときは、少なくとも discovery 用 surface と stable fallback surface の 2 種を持つ方がよい。
- preferred rule は、discovery には Bluesky の post または thread、stable fallback には profile または app card を使うことである。
- surfaces 配列の各要素は個別の status を持ち、必要なら surface ごとの retiredAt を持ってよい。
- 同じ surfaceKind について active な surface は高々 1 件に制約してよい。preferredSurfaceKind はその active surface を指す。
- top-level の retiredAt は publication record 全体の retired timestamp とし、active な surface が 1 つでも残る間は埋めない。
- publish / retire / preferred surface の切り替えや linked publicationRef の更新は既存 record を直接編集せず、supersedesRef 付きの新しい session-publication を積んで扱う。
- supersedesRef を使う場合、参照先は同じ sessionRef を指す session-publication current head に限る。
- sessionRef ごとに supersedes chain の最新 row を current head とみなし、current head が retired のときその session の carrier chain 全体を retired と解釈する。
- publishSessionLink の `expectedSessionPublicationHeadRef` は initial mirror で adapter head が存在しない場合だけ省略してよい。既存 current head がある session で fence を省略してはならない。
- updatedByDid は publish / retire / preferred surface の切り替えを最後に確定した actor を指す。
- replayUrl は AppView の replay route へ移動するための derived alias であり、surfaces 配列の distinct `surfaceKind` を増やすものではない。
- publicationRef が指す core publication が public entry の source of truth であり、session-publication はその carrier adapter として扱う。
- active な session-publication current head は、必ず mirrored publication の current head を `publicationRef` として指さなければならない。古い publication head を指したまま active で残してはならない。
- active な carrier row だけは public lens で列挙してよいが、retired carrier や運用詳細は governance read に寄せる。
- governance list でも既定は active current head だけを返し、retired current head は includeRetired 相当の明示 opt-in で archived summary として列挙する。raw supersedes chain 全体は audit 導線に逃がす。
- retireReasonCode は carrier row の退役理由を public preflight や governance summary で短く説明するために使ってよい。
- retired または superseded な carrier direct link は、public replay や current publication への CTA を返す explanatory preflight / tombstone に解決する。旧 carrier を current head のように見せ続けてはならない。
- publishSessionLink は既存の core publication を mirror するためにだけ使い、canonical publication を新規作成してはならない。
- publicationRef が retired になった場合、session-publication は active surface を残してはならない。archive 用 carrier を残す場合でも、それは retired surface としてだけ保持する。
- publicationRef が superseded された場合も、session-publication は古い publicationRef を指したまま active で残ってはならない。linked publication の更新と adapter の更新は同じ requestId / service-log chain で追えるようにする。
- accepted な core publication supersede / retire と stale な active carrier を別々に残してはならない。linked publication の更新が成功した時点で adapter rewrite / retire も同じ transaction か同じ service-log chain の completion まで完了している必要がある。
- session を public actor / feed にしない。公開導線は Bluesky の既存 surface を使って説明する。