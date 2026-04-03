# board-snapshot

## 役割

あるrevision時点の盤面全体像を保存するcheckpoint。再接続時や履歴再生の開始点になる。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- sceneRef
- snapshotRevision
- fromOpSeq
- tokenStates
- layerState
- generatedAt

## 更新主体

session authority。projection service が snapshot 候補を生成しても、永続 record として書き込むのは authority が行う。

## 参照関係

- scene
- token
- board-op

## 設計上の注意

- snapshot は authority が持つ checkpoint であり、高速復元のための補助recordとして永続化してよい。
- board-op だけでも復元できる前提を維持する。
- 一定件数ごと、あるいは一定時間ごとに生成すると扱いやすい。
- snapshotRevision は、その snapshot に取り込まれた最後の opSeq に一致させる。
- fromOpSeq は、直前 checkpoint 以後にこの snapshot へ畳み込んだ最初の opSeq を指す。
- snapshotRevision と fromOpSeq は (sessionRef, sceneRef) ごとの revision 空間で解釈する。
- 同じ (sessionRef, sceneRef, snapshotRevision) に対して canonical な snapshot は 1 つに固定する。
- 再生成が必要なら、authority は既存 checkpoint を置き換えて canonical snapshot を更新する。複数候補の比較で選ばない。