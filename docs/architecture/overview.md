# 設計概要

Cerulia は、AT Protocol 上の PL 個人向けサービスである。TRPG キャラクターを作り、セッション履歴を記録し、共有する。

## 製品スコープ

Cerulia の product-core は次を扱う。

- character-sheet + character-branch（常にペアで作成）による character 管理
- character-advancement による成長・変更履歴
- character-conversion による ruleset をまたぐ変換 provenance
- session による PL 自身のセッション経験記録
- scenario による公開シナリオ台帳
- house、campaign による scope
- ruleset-manifest、rule-profile chain、character-sheet-schema による rules provenance
- visibility: draft|public による AppView レベルの表示制御

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
- 全 record は原則公開。visibility flag は AppView の表示制御であり、AT Protocol レベルの秘匿ではない
- 他人の DID や characterBranchRef を自分の record に書かない。リンクは各自が自分の record を通じて行う
- Cerulia は記録と共有に絞った薄いアプリケーション。セッション中は read-only
- 越境利用はシステムで管理しない

## 固定する順序

1. canonical record と lifecycle semantics を固定する
2. projection contract を固定する
3. transport schema を固定する
4. 実装計画と test gate を固定する
