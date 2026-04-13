# character-branch

## 役割

character-sheet から派生した campaign/local な durable branch を表す record。同じキャラクターを複数の campaign で使い分けるときの分岐点になる。sheet 作成時に default branch が自動生成される。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- baseSheetRef
- branchKind
- branchLabel
- overridePayloadRef
- visibility（draft / public）
- revision
- createdAt
- updatedAt
- retiredAt

## 更新主体

branch owner のみ。

## 参照関係

- character-sheet
- character-advancement
- session（session.characterBranchRef から参照される）

## 設計上の注意

- sheet 作成時に default branch が自動生成される。branch なしの character は存在しない
- same baseSheetRef から複数 branch を作ることで、同じキャラの複数 campaign 分岐を表現できる
- branchRef 自体は安定 object として扱う。branch metadata の更新で branchRef を差し替えない
- ruleset をまたぐ変換で生じた target branch は durable subject であり、変換 provenance は character-conversion で残す
- character の canonical 解決順は、base sheet、branch override、active な advancement sequence の順とする
- revision は作成時に 1 から始め、branchLabel、overridePayloadRef の accepted metadata update ごとに 1 ずつ増やす
- campaign-less な local branch は正当な first state である（単発卓が多数派）。campaign への結びつきは session.campaignRef で表現される
- retired branch の direct link は AppView 上では read-only historical detail として表示する
