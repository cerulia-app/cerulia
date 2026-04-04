# scene

## 役割

盤面の土台を表すrecord。マップ、レイヤー、グリッド、カメラ初期値のような比較的安定した定義を持つ。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- sceneId
- title
- backgroundAssetRefs
- gridConfig
- layerConfig
- visibility
- initialCamera
- createdAt

## 更新主体

session authority。

## 参照関係

- token
- board-op
- board-snapshot
- asset

## 設計上の注意

- token座標の現在値は持たない。
- visibility はscene単位の表示制御であり、秘匿本文の復号権とは別。
- asset参照だけを持ち、本体メディアはassetに寄せる。
- scene.visibility は session.visibility の内側で適用する投影 gate であり、session 側が閉じている投影面を広げない。
- scene.visibility は stable な既定値とし、実卓中の切り替えは board-op の setSceneVisibility で表し、現在 view に投影する。