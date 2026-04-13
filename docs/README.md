# Cerulia 設計文書

この docs tree の正本は、Cerulia を owner-centric な character history service として定義する。扱うのは character lineage、session history、scenario catalog、campaign / house scope、rules provenance、character-sheet-schema、publication、append-only correction である。session の run authority、membership、disclosure、board、replay は製品スコープ外である。

## 読み順

1. [設計概要](architecture/overview.md)
2. [設計哲学](architecture/philosophy.md)
3. [主要判断と代替案](architecture/decisions.md)
4. [レイヤー構成](architecture/layers.md)
5. [projection contract](architecture/projections.md)
6. [MVP の実装順](architecture/mvp.md)
7. [Go サーバー実装計画](architecture/implementation-plan.md)
8. [システムテスト計画](architecture/test-plan.md)
9. [AppView 層 UI 設計](appview/README.md)
10. [GCP Cloud Run + Neon + R2 ホスティング / 運用方針](architecture/hosting-gcp-neon-r2.md)

## Core Records

- scope: [campaign](records/campaign.md), [house](records/house.md), [world](records/world.md)
- lineage: [character-sheet](records/character-sheet.md), [character-branch](records/character-branch.md), [character-conversion](records/character-conversion.md), [character-advancement](records/character-advancement.md)
- session: [session](records/session.md), [session-participation](records/session-participation.md), [scenario](records/scenario.md)
- rules: [ruleset-manifest](records/ruleset-manifest.md), [rule-profile](records/rule-profile.md), [character-sheet-schema](records/character-sheet-schema.md)
- publication: [publication](records/publication.md)

## Core Lexicon

- [共通定義](lexicon/defs.md)
- [コア namespace](lexicon/core.md)
- [auth namespace](lexicon/auth.md)
- [XRPC と transport schema](lexicon/rpc.md)

## Out-of-Product-Scope Archive

製品スコープ外の検討履歴は [archive/out-of-product-scope/README.md](archive/out-of-product-scope/README.md) に隔離する。archive は backlog でも将来ロードマップでもなく、現在の product-core contract や implementation plan の入力にしてはならない。

## 現時点の結論

- Cerulia の製品スコープは owner-centric な character history service に固定する。
- キャラクター状態の変更は owner のみ。GM も他のプレイヤーも他人のキャラ record を書き換えない。
- session は post-run の記録であり、run control を持たない。
- 越境利用はシステムで管理しない。コミュニケーションによる。
- publication の正本は publication ledger にあり、carrier の整合は製品責務に含めない。
- scenario の spoiler は AT Protocol レベルでは公開。隠蔽は AppView で対応する。
