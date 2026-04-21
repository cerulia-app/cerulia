# character-conversion

## 役割

ruleset をまたぐキャラクター変換の provenance と successor edge を残す record。1 本の character-branch 上で、どの source sheet からどの target sheet へ ruleset を切り替えたかを記録する。

## 置き場所

PL の個人 repo（target branch owner の repo）。

## 主なフィールド

- characterBranchRef
- sourceSheetRef
- sourceSheetVersion
- sourceRulesetNsid
- targetSheetRef
- targetSheetVersion
- targetRulesetNsid
- conversionContractRef（任意: 変換に使った contract やガイドへの参照）
- convertedAt
- note

## 更新主体

target branch owner のみ。

## 参照関係

- character-branch
- character-sheet

## 設計上の注意

- character-conversion は branch の ruleset 切り替え地点を表す same-owner の successor edge である。branch 自体を増やす record ではない
- accepted な conversion は source sheet に対して automatic conversion を適用した新しい target sheet snapshot を作り、branch の `sheetRef` を target sheet へ進める
- sourceSheetVersion と targetSheetVersion で、どの sheet revision を変換したかを pin する
- sourceRulesetNsid と targetRulesetNsid でどのシステム間の変換かを記録する
- sourceRulesetNsid と targetRulesetNsid は必ず異ならなければならない
- same-owner conversion だけを product-core で扱う。cross-owner conversion は consent primitive を持たないため product scope 外とする
- `characterBranchRef` と source / target の sheet はすべて conversion owner と一致しなければならない
- branch を分けたい場合は、先に createBranch で fork を作り、その forked branch に対して conversion を行う。conversion 単体では分岐を作らない
- convertedAt は変換が行われた日時を記録する
- conversion history の canonical ordering は convertedAt 昇順とし、同時刻なら record-key の tid 順で解決する
- accepted な conversion の `convertedAt` は、current branch head を構成している latest conversion と current epoch の active advancements に対して canonical ordering で後ろに来なければならない。backdated conversion で current head を巻き戻さない
- same-timestamp の accepted conversion を許可する場合、server は新しい conversion record の tid がその時刻の tie-break floor より lexicographically 後ろになることを保証しなければならない。process-local な単調性だけを acceptance 根拠にしてはならない
- conversion の materialization write は source state の不変を証明する safety fence を伴う。AT Protocol backend が repo-scope compare-and-swap しか提供しない場合、source branch と無関係な同 owner repo write でも保守的に `rebase-needed` へ倒してよい
- conversion は自動変換の provenance であり、round-trip 可能性や可逆性を保証しない。target sheet が意図とずれた場合は owner が通常の sheet update で手動修正してよい。required field を自動変換で満たせない場合は conversion 自体を reject してよい
- conversionContractRef は変換ガイド、マニュアル、ツール等への public-safe 参照として使える。owner-only 文書や private workspace 参照は入れない
- note は public-safe な補足に限る。AppView の public shared surface は note を既定では返さなくてよいが、これは秘匿ではなく表示上の簡略化である
- conversion record 自体は immutable な provenance log として扱う。誤りがあっても既存 record を書き換えて履歴を取り消さず、新しい branch 操作や sheet update で後続状態を正す