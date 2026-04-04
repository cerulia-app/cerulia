# character-state

## 役割

optional run extension で、session 内で変わるキャラクター状態を表す record。資源、状態異常、現在 scene、initiative のような進行依存値を持つ。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- characterInstanceRef
- publicResources
- publicStatuses
- privateStateEnvelopeRef
- sceneRef
- initiative
- requestId
- revision
- updatedByDid
- updatedAt

## 更新主体

session authority。PL や GM は extension XRPC で変更要求を出す。

## 参照関係

- character-instance
- secret-envelope
- ruling-event
- scene

## 設計上の注意

- 公開状態と秘匿状態を分ける。秘匿値は privateStateEnvelopeRef で逃がせるようにする。
- board-op と違い、こちらは現在値の正本として扱ってよい。
- character の解決順は、base sheet、character-branch の durable override、active な advancement sequence、character-state の run-time 現在値の順とする。
- requestId は updateCharacterState で現在の character-state 版を確定した直近要求と service log を相関づける。rules-resolved な変更なら、同じ requestId の ruling-event とも相関できるようにする。
- revision を持たせると、同時更新時の競合検出がしやすい。
- ここでの revision は character-state record 自体の compare-and-swap 用であり、board-op の opSeq や board-snapshot の snapshotRevision とは別物として扱う。