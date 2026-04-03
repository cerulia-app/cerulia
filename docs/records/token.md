# token

## 役割

盤面上のオブジェクトの識別子。キャラクターに紐づくコマにも、マーカーやオブジェクトにも使える。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- tokenId
- sceneRef
- characterInstanceRef
- publicFacet
- secretFacetEnvelopeRef
- controllerDids
- visibilityMode
- createdAt

## 更新主体

session authority。

## 参照関係

- scene
- character-instance
- board-op
- secret-envelope

## 設計上の注意

- publicFacet と secretFacet を分けると、伏せtokenの部分公開がやりやすい。
- publicFacet の最小 object shape は `label?`、`assetRef?`、`badgeText?`、`sizeHint?` の 4 field に固定する。いずれも optional だが、空 object を許す場合でも field 名はこの集合に閉じる。
- 座標の現在値をtoken本体に持たせるより、board-op と snapshot から投影する方が履歴と整合しやすい。
- characterに紐づかないトークンもあるため、characterInstanceRef は任意でよい。
- visibilityMode は投影上の表示制御であり、secretFacet の復号可否は audience-grant で別に決める。
- token の個別 visibility でも session.visibility を広げることはできない。