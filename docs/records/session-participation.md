# session-participation

## 役割

プレイヤーが自分の repo に書く、セッションへの参加記録。GM の session record への自己リンクとして機能する。任意の opt-in record であり、作成しなくてもセッションの事実は GM の record に残る。

## 置き場所

参加プレイヤーの個人 repo。

## 主なフィールド

- sessionRef
- characterBranchRef
- createdAt

## 更新主体

参加プレイヤー本人のみ。

## 参照関係

- session（GM の repo にある record）
- character-branch

## 設計上の注意

- session-participation は自己アサーションであり、GM の session record の参加者リストを上書きしない
- AppView は session.participantEntries と session-participation を merge して参加者一覧を表示する。merge precedence は GM の記録が正本であり、session-participation は「本人確認済み」の補足情報として扱う
- sessionRef が指す session record が GM によって削除された場合、この record は dangling reference になる。AppView は tombstone として扱う
- プレイヤーが後から Cerulia を始めた場合、過去の session の sessionRef を指す session-participation を遡って作れる
- characterBranchRef は任意。キャラクターを使わず GM だけをした場合や、branch を持たない段階でも participation を書ける
