# character-instance

## 役割

optional run extension で、ある character-sheet を特定 run の中でどう使うかを表す record。所有と利用を分ける層であり、NPC、プリセット、共有操作の受け皿になる。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- baseSheetRef
- characterBranchRef
- instanceLabel
- sourceType
- controllerDids
- controllerAudienceRef
- defaultTokenRef
- createdAt
- retiredAt

## 更新主体

session authority。core はこの record を前提にしない。

## 参照関係

- character-sheet
- character-branch
- character-state
- token

## 設計上の注意

- baseSheetRef は任意にして、即席NPCやセッション専用エンティティも表せるようにする。
- characterBranchRef は任意にし、存在する場合はその branch の durable override と成長履歴を使う。
- sourceType は説明用の分類であり、provenance の正本にはしない。既存 record に由来する instance では、baseSheetRef または characterBranchRef のどちらかで起点を示す。どちらでも表せない即席エンティティだけを npc として扱う。
- baseSheetRef と characterBranchRef の両方が存在する場合、characterBranchRef が指す branch の base sheet は baseSheetRef と一致しなければならない。
- controllerDids が実際の操作権を決める正本であり、controllerAudienceRef は secret projection や一時共有の補助に使う。controllerAudienceRef は controllerDids を広げてはならない。
- 同じ baseSheetRef から複数の characterBranchRef を使うことで、同一キャラの複数campaign分岐を表せる。
- 同一sheetから複数instanceを作れる前提にする。