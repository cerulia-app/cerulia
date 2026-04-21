# character-branch

## 役割

character の stable な継続線と shared root を表す record。既定では 1 本の branch がまっすぐ続き、別の継続線を持ちたいときだけ明示的に branch を増やす。sheet 作成時に default branch が自動生成される。

## 置き場所

PL の個人 repo。

## 主なフィールド

- ownerDid
- sheetRef
- forkedFromBranchRef（任意: どの branch から明示的に分岐したか）
- branchKind
- branchLabel
- visibility（draft / public）
- revision
- createdAt
- updatedAt
- retiredAt

## 更新主体

branch owner のみ。

## 参照関係

- character-sheet
- character-conversion
- character-advancement
- session（session.characterBranchRef から参照される）

## 設計上の注意

- sheet 作成時に default branch が自動生成される。Cerulia の通常形はこの 1 本の継続線であり、branch の複数本運用は例外的な分岐として扱う
- sheet 作成時に生成される default branch は `branchKind = main` を使う
- `branchKind = main` が既定の継続線を表す。`campaign-fork` と `local-override` は branch の用途ラベルであり、branchRef を跨いだ自動優先順位は持たない。`local-override` は historical な enum 名だが、branch-level field override payload を意味しない
- createBranch は source branch の current resolved state を新しい sheet snapshot に materialize し、その snapshot を指す新 branch を作る。分岐関係は `forkedFromBranchRef` で残す
- createBranch の materialization write は source state の不変を証明する safety fence を伴う。AT Protocol backend が repo-scope compare-and-swap しか提供しない場合、source branch と無関係な同 owner repo write でも保守的に `rebase-needed` へ倒してよい
- `sheetRef` は branch の current head sheet を指す。same branch の ruleset 切り替えでは character-conversion が新しい target sheet を作り、accepted 時にこの ref を target へ進める
- branchLabel は public-safe な表示名に限る
- 共有 surface の公開 / 非公開の正本は branch.visibility とする。sheet 側の metadata では代替しない
- branchRef 自体は安定 object として扱う。branch metadata の更新で branchRef を差し替えない
- branch 自体は ruleset 切り替えの primitive ではない。ruleset の切り替え地点は character-conversion が担い、branch は分岐の有無だけを表す
- character の現在状態は、branch の `sheetRef` と、その branch に対する latest conversion より後の active な advancement sequence から解決する。accepted な conversion は `convertedAt` を current epoch より後へ単調に進めることで、この解決規則と branch head を一致させる
- revision は作成時に 1 から始め、branchLabel、visibility の accepted metadata update と、accepted な conversion による `sheetRef` 置換ごとに 1 ずつ増やす
- campaign-less な local branch は正当な first state である（単発卓が多数派）。campaign への結びつきは session.campaignRef で表現される
- visibility: draft の branch は Cerulia AppView では一覧から隠すが、direct link では draft 状態を明示して表示する
- retired branch の direct link は read-only historical detail として表示する。draft なら draft 状態も併記する
- retiredAt が設定された branch は read-only historical detail に入り、updateCharacterBranch / retireCharacterBranch を受け付けない
- runtime は current branch-centered shape だけを読取対象にする。legacy branch shape の compatibility reader や自動 migration は同梱しない
