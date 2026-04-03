# character-sheet

## 役割

キャラクター原本。個人が持ち運べる設定、基本能力、立ち絵などの土台を表す。

## 置き場所

基本は所有者の個人repo。NPCライブラリや共有テンプレートはauthority repoや専用library repoに置いてもよい。

## 主なフィールド

- ownerDid
- rulesetNsid
- displayName
- portraitRef
- publicProfile
- stats
- externalSheetUri
- version
- updatedAt

## 更新主体

原則としてowner。

## 参照関係

- character-instance が baseSheetRef として参照する
- token が見た目の初期値に使うことがある

## 設計上の注意

- セッション依存の減少HPや現在位置は入れない。
- ruleset差分が大きい部分は ruleset namespace 側に逃がせる余地を残す。
- externalSheetUri は import 元の provenance を示す field とし、外部元を live canonical source とみなさない。
- ruleset をまたぐ正式な変換 provenance は externalSheetUri だけで済ませず、target branch に紐づく character-conversion に残す。
- imported base に対する campaign/local な durable override や分岐成長は character-branch で扱う。
- 持ち主と利用卓を分けるため、sessionへの逆参照を必須にしない。