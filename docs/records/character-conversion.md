# character-conversion

## 役割

ruleset をまたぐキャラクター変換の provenance を残す record。ある source sheet / branch を、どの target sheet / branch に変換したかを記録する。

## 置き場所

PL の個人 repo（target sheet owner の repo）。

## 主なフィールド

- sourceSheetRef
- sourceBranchRef
- sourceRulesetNsid
- targetSheetRef
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
- sourceRulesetNsid と targetRulesetNsid でどのシステム間の変換かを記録する
- same-owner conversion は制限なく行える。cross-boundary の変換はコミュニケーションによる
- convertedAt は変換が行われた日時を記録する
- conversionContractRef は変換ガイド、マニュアル、ツール等への参照として自由に使える