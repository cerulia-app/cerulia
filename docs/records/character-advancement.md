# character-advancement

## 役割

character-branch に対する成長・変更の履歴を記録する record。current ruleset epoch の branch line 上で、セッションごとにキャラクターへ何が起きたかを追える。

## 置き場所

PL の個人 repo（character-branch と同じ repo）。

## 主なフィールド

- characterBranchRef
- advancementKind（xp-spend / milestone / retrain / respec / correction）
- deltaPayload
- sessionRef（任意: どのセッションでの変更か）
- previousValues（任意: 変更前の値の snapshot）
- effectiveAt
- createdAt
- note

## 更新主体

branch owner のみ。

## 参照関係

- character-branch
- session（sessionRef で任意に参照）

## 設計上の注意

- キャラクターの状態変更はセッション単位で履歴を残す。sessionRef で「どのセッションで何が変わったか」を追える
- previousValues に変更前の値を保持する。変更履歴を遡れるようにする
- sessionRef は任意。セッション外のキャラクター変更（初期設定の修正等）もリンクなしで記録できる
- `deltaPayload` は record に inline で持つ public-safe な change payload とする。private な correction memo、spoiler、owner-only 情報は入れない。AppView は profile-specific な preflight hint を出してよいが、record の書き込み可否と core invariant の判定は API が正本とする
- ruleset の切り替えは character-conversion が扱う。advancement は branch 内の ruleset 切り替え primitive ではない
- 現在の branch 解決結果は、branch の `sheetRef` と、その branch に対する latest conversion より後の active な advancement sequence から投影する
- accepted な conversion では、convertedAt 以前の advancement は target sheet snapshot に折り畳まれた履歴として扱う。historical record は残るが、current state の再計算では latest conversion 以後のものだけを active sequence に含める
- current head を materialize する conversion は `convertedAt` を current epoch に対して canonical ordering で前進させなければならない。active advancement より前に backdate した conversion は branch 解決を壊すため reject する
- active な advancement sequence の canonical ordering は effectiveAt 昇順とし、同時刻なら record-key の tid 順で解決する
- `previousValues` は `retrain`、`respec`、`correction` のように既存値を書き換える advancement では必須とする。append-only な `milestone` と `xp-spend` では省略してよい。ここに入れる snapshot も public-safe に限る
- note は public-safe な補足に限る。AppView の shared surface は読みやすさのため note、deltaPayload、previousValues を既定では表示しなくてよいが、いずれも public record であり owner-only payload ではない
