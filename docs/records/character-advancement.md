# character-advancement

## 役割

character-branch に対する成長・変更の履歴を記録する record。セッションごとにキャラクターに何が起きたかを追える。

## 置き場所

PL の個人 repo（character-branch と同じ repo）。

## 主なフィールド

- characterBranchRef
- advancementKind（xp-spend / milestone / retrain / respec / correction）
- deltaPayloadRef
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
- deltaPayloadRef は自由形式の JSON payload。schema validation は AppView に任せる
- 現在の branch 解決結果は、base sheet、branch override、active な advancement sequence から投影する
- active な advancement sequence の canonical ordering は effectiveAt 昇順とし、同時刻なら record-key の tid 順で解決する
- previousValues は既存値を書き換える advancement では必須とする。append-only な narrative milestone だけ省略してよい
- note は public-safe な補足に限る。AppView の public shared surface は note、deltaPayloadRef、previousValues を返さない
