# レイヤー責務と境界

AppView は Cerulia の projection を見やすく束ねる層であり、正本を持つ層ではない。UI 上で「いまの版 / current edition」と呼ぶ情報も、正本としては backend の current head 解決に従う。AppView は character creation を速く感じさせてよいが、その convenience は accepted 前の draft や guided flow に留まり、authoritative fact を勝手に確定したことにはしてはならない。

## どこから何を読むか

| 層 | 役割 | AppView での見え方 | してはならないこと |
| --- | --- | --- | --- |
| core continuity / projection | character home、campaign view、publication summary の current head と continuity write 結果 | character studio、Character Continuity Workbench、campaign summary、publication row | local state や archive を canonical input に混ぜること |
| publication ledger | 公開入口の current head、retire 状態、surface summary | publication detail、public top、campaign shell | carrier を source of truth にすること |
| archive / history | superseded、retired、revoke された履歴 | explanatory tombstone、archive split | current surface と同じ grammar で混ぜること |
| local draft state | create flow の未確定入力、publication preview の一時状態 | draft badge、review step、local undo | accepted 前の draft を continuity fact と見せること |

## どの操作をどこに載せるか

| 操作 | AppView surface | 正本 | UI 上の注意 |
| --- | --- | --- | --- |
| 新しい branch を始める | character studio | core mutation | create lane と review step を分ける |
| branch / episode を publish する | character detail、publication library | publication ledger | publish と retire を別語彙にする |
| publication を retire する | publication detail | publication ledger | current detail と tombstone を分ける |
| campaign shell を public で読む | campaign workspace | getCampaignView(public) | participation を暗示しない |
| retired / superseded link を開く | publication detail | publication current head + archive explanation | explanatory tombstone を返す |

## 境界原則

### 1. AppView は current edition を受け取るだけで、自分で決めない

current edition の解決は backend の current head folding に従う。UI はその結果を current edition として表示する。

### 2. public と owner の lens を混ぜない

public surface では公開中の版だけを返し、owner surface では continuity の内部詳細を返してよい。両者を同じ row で曖昧にしない。

### 3. archive は current surface の外に置く

superseded、retired、revoke は説明責任に必要だが、既定面に混ぜると continuity の現在像がぼやける。AppView は current surface と archive surface を構造で分ける。

### 4. create flow の convenience は authority ではない

draft、preview、lane selection は UI convenience であり、accepted されるまで continuity fact ではない。

### 5. publication と carrier を混同しない

外向け導線は carrier であり、正本は publication ledger にある。AppView copy でもこの区別を崩さない。
