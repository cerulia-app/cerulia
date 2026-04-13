# 設計概要

Cerulia は、AT Protocol 上の character history service である。TRPG キャラクターを作り、遊んだ歴史を記録し、他の人に見せる。

## 製品スコープ

Cerulia の product-core は次を扱う。

- character-sheet、character-branch、character-conversion、character-advancement による character lineage
- session、session-participation による session history
- scenario による公開シナリオ台帳
- house、campaign による scope
- ruleset-manifest、rule-profile chain、character-sheet-schema による rules provenance
- publication による公開入口の ledger
- supersedes と retire による append-only correction

Cerulia の product-core は次を扱わない。

- session の run authority（開始、一時停止、権限移譲）
- membership と参加承認
- message、roll、ruling-event のような卓中イベント
- disclosure、secret、handout
- board、realtime、replay
- appeal、governance、audit console
- 越境利用の許可・禁止の裁定

## hard boundary

- character state の write authority は常に owner のみ
- session は post-run の記録であり、run control を持たない
- scenario の spoiler は AT Protocol レベルでは公開。隠蔽は AppView の reader lens で対応
- publication は carrier 同期や session mirror の整合を責務にしない
- 越境利用はシステムで管理しない。コミュニケーションによる

## 固定する順序

1. canonical record と lifecycle semantics を固定する
2. projection contract を固定する
3. transport schema を固定する
4. 実装計画と test gate を固定する
