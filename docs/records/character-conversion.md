# character-conversion

## 役割

ruleset をまたぐキャラクター変換の provenance を残す record。ある source sheet / branch を、どの target sheet / branch に変換したかを記録する。

## 置き場所

PL の個人 repo（target sheet owner の repo）。

## 主なフィールド

- sourceSheetRef
- sourceSheetVersion
- sourceBranchRef
- sourceRulesetNsid
- targetSheetRef
- targetSheetVersion
- targetBranchRef
- targetRulesetNsid
- conversionContractRef（任意: 変換に使った contract やガイドへの参照）
- convertedAt
- note

## 更新主体

target sheet owner のみ。

## 参照関係

- character-sheet
- character-branch

## 設計上の注意

- character-conversion は変換 provenance の記録であり、変換後の target branch が durable subject
- sourceBranchRef は必須。sheet + branch が常にペアで存在するため、変換元の canonical identity は source branch まで固定する
- sourceSheetVersion と targetSheetVersion で、どの sheet revision を変換したかを pin する
- sourceRulesetNsid と targetRulesetNsid でどのシステム間の変換かを記録する
- same-owner conversion だけを product-core で扱う。cross-owner conversion は consent primitive を持たないため product scope 外とする
- source / target の sheet と branch はすべて conversion owner と一致しなければならない
- convertedAt は変換が行われた日時を記録する
- conversionContractRef は変換ガイド、マニュアル、ツール等への参照として自由に使える
- note は public-safe な補足に限る。AppView の public shared surface は note を既定では返さなくてよいが、これは秘匿ではなく表示上の簡略化である