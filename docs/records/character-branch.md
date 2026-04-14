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
- sheet 作成時に生成される default branch は `branchKind = main` を使う
- `branchKind = main` が canonical lineage root を表す。`campaign-fork` と `local-override` は branch の用途ラベルであり、branchRef を跨いだ自動優先順位は持たない
- same baseSheetRef から複数 branch を作ることで、同じキャラの複数 campaign 分岐を表現できる
- baseSheetRef は branch owner 自身の sheet を指さなければならない
- 共有 surface の公開 / 非公開の正本は branch.visibility とする。sheet 側の metadata では代替しない
- branchRef 自体は安定 object として扱う。branch metadata の更新で branchRef を差し替えない
- ruleset をまたぐ変換で生じた target branch は durable subject であり、変換 provenance は character-conversion で残す
- character の canonical 解決順は、base sheet、branch override、active な advancement sequence の順とする
- revision は作成時に 1 から始め、branchLabel、overridePayloadRef の accepted metadata update ごとに 1 ずつ増やす
- campaign-less な local branch は正当な first state である（単発卓が多数派）。campaign への結びつきは session.campaignRef で表現される
- visibility: draft の branch は Cerulia AppView では一覧から隠すが、direct link では draft 状態を明示して表示する
- retired branch の direct link は read-only historical detail として表示する。draft なら draft 状態も併記する
- retiredAt が設定された branch は read-only historical detail に入り、updateCharacterBranch / retireCharacterBranch を受け付けない
