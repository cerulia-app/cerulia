# redaction-event

## 役割

optional disclosure extension が、run artifact や secret disclosure を既定表示から外す、差し替える、あるいは撤回することを表す record。core publication retire や reuse revoke の代替ではない。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- subjectRef
- redactionMode
- replacementRef
- requestId
- reasonCode
- performedByDid
- createdAt

## 更新主体

session authority。

## 参照関係

- message
- roll
- handout
- token
- character-state
- secret-envelope
- reveal-event

## 設計上の注意

- hard delete ではなく、既定表示から隠す方向を基本にする。
- publication の終了は core の retire で扱い、redaction-event は disclosure / run artifact の表示制御に限定する。
- replacementRef を持たせると、修正版messageや修正版rollへの差し替えができる。
- requestId は redactRecord と service log を相関づける共通 field とする。
- 監査画面と通常画面で redaction の扱いを分けられるようにする。
- subjectRef は handout、message、roll、token、character-state、secret-envelope のような秘匿を持つ subject 全般を受けられるようにする。
- redaction は既定表示を外すための仕組みであり、過去の秘匿まで失効させたい場合は revoke、rotate、再暗号化を別に行う。publication や reuse の future-only 停止は別 workflow で扱う。
- reveal-event と同じ subject を指すため、field 名も subjectRef に揃える。