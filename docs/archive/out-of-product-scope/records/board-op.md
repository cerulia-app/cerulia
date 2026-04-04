# board-op

## 役割

盤面に対する確定済み操作のログ。移動、表示切替、追加、削除、描画確定など、意味のある操作だけを残す。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- sceneRef
- actorDid
- opSeq
- expectedRevision
- requestId
- operation
- createdAt

## 更新主体

session authority。利用者はXRPCに対して操作要求を出す。

## 参照関係

- scene
- token
- ruling-event
- board-snapshot

## 設計上の注意

- ドラッグ途中やカーソル位置のような一時状態は含めない。
- operation は closed union として拡張可能にするが、MVP では moveToken、createToken、removeToken、updateTokenFacet、setSceneVisibility、drawCommittedStroke、clearLayer の閉じた集合から始める。
- operation の discriminator は variant の $type に寄せ、payload field を別に持たない。
- expectedRevision を持つことで、同時操作の競合を検知しやすい。
- expectedRevision は、要求者が最後に見ていた確定済み盤面 revision を指す。
- expectedRevision が現在の確定済み revision と一致しない要求は reject し、board-op record を新規には書かない。
- requestId は accepted された applyBoardOp と service log を相関づける共通 field とし、submitAction から盤面操作が出力された場合は ruling-event とも相関づける。opSeq や revision とは役割を混ぜない。
- 受理された board-op の opSeq は、その操作を取り込んだ後の確定済み盤面 revision として扱う。
- revision は (sessionRef, sceneRef) ごとに独立して増えるものとし、scene をまたいで共有しない。
- opSeq は authority が受理時にのみ割り当てる単調増加値であり、reject された要求では消費しない。
- 確定済み board-op は不変とし、後からの修正は補正用の新しい board-op を積んで表す。
- stale な applyBoardOp を reject するときは、現在の revision と最新 snapshot 参照を返して rebase を促す。