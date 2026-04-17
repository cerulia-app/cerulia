# 設計概要

Cerulia は、AT Protocol 上の PL 個人向けサービスである。TRPG キャラクターを作り、セッション履歴を記録し、共有する。

## 5W1H の圧縮

- Why: 分散型で相互運用できる character / session 記録基盤を作り、AT Protocol の周辺エコシステムに寄与する
- Who: 複数システムを遊び、多くの PC を持ち、卓ごとに別サービスへ分散して困っている PL
- What: character 作成、post-run session 記録、character detail 共有
- When: 作成は卓前、記録は卓後、共有は卓前後の連絡と SNS
- Where: AT Protocol 上の personal repo と Cerulia AppView。共有入口は character detail
- How: schema-backed authoring、personal character / session record の owner-only write、owner-centered な optional scope / rules record、public-safe record、AppView の表示制御

## 製品スコープ

Cerulia の product-core は次を扱う。

- character-sheet + character-branch（常にペアで作成）による character 管理
- character-advancement による成長・変更履歴
- character-conversion による ruleset をまたぐ変換 provenance
- session による PL 自身のセッション経験記録
- scenario による公開シナリオ台帳
- house、campaign による scope
- rule-profile chain、character-sheet-schema による rules provenance
- visibility: draft|public による AppView レベルの表示制御（draft は一覧から隠すが、direct link では draft 状態を明示して表示する）

active な character 作成は schema-backed を正本とする。schema-less sheet は legacy/import/recovery の safety valve としてだけ残す。
rules provenance record である rule-profile と character-sheet-schema は public-only とし、draft/public lifecycle に乗せない。

Cerulia の product-core は次を扱わない。

- session の run authority（開始、一時停止、権限移譲）
- membership と参加承認
- message、roll、ruling-event のような卓中イベント
- disclosure、secret、handout
- board、realtime、replay
- appeal、governance、audit console
- 越境利用の許可・禁止の裁定
- アクセス制限（全 record は AT Protocol 上で原則公開）

## hard boundary

- character state の write authority は常に owner のみ
- session は PL が自分で書く post-run の記録。run control を持たない
- 全 record は原則公開。visibility flag は AppView の表示制御であり、AT Protocol レベルの秘匿ではない。record に入れる内容は public-safe に限る
- 他人の DID や characterBranchRef を自分の record に書かない。リンクは各自が自分の record を通じて行う
- character-conversion は same-owner の provenance に限定する
- Cerulia は記録と共有に絞った薄いアプリケーション。セッション中は read-only
- 越境利用はシステムで管理しない

## 判断の 3 区分

| 区分 | 意味 | 現時点の例 |
| --- | --- | --- |
| product non-goal | product-core の対象にしない | run authority、membership / 参加承認、卓中イベント、disclosure / secret / handout、board / realtime / replay、appeal / governance、アクセス制限、standalone public session page、cross-owner conversion |
| post-MVP core-later | scope 内だが MVP 後に送る | same-owner の character-conversion |
| secondary later | 共有 surface の追加候補 | プレイヤー単位の public character collection |

## 固定する順序

1. canonical record と lifecycle semantics を固定する
2. projection contract を固定する
3. transport schema を固定する
4. 実装計画と test gate を固定する
