# Cerulia 設計文書

この docs tree の正本は、Cerulia を character continuity service として定義する。扱うのは character lineage、campaign continuity、rules provenance、publication、reuse boundary、append-only correction だけである。session lifecycle、membership、run authority、disclosure、board、replay、appeal、audit surface は製品スコープ外であり、正本には含めない。

## 読み順

1. [設計概要](architecture/overview.md)
2. [設計哲学](architecture/philosophy.md)
3. [スコープ再編の採用記録](architecture/scope-realignment.md)
4. [主要判断と代替案](architecture/decisions.md)
5. [レイヤー構成](architecture/layers.md)
6. [projection contract](architecture/projections.md)
7. [MVP の実装順](architecture/mvp.md)
8. [Go サーバー実装計画](architecture/implementation-plan.md)
9. [システムテスト計画](architecture/test-plan.md)
10. [AppView 層 UI 設計](appview/README.md)
11. [GCP Cloud Run + Neon + R2 ホスティング / 運用方針](architecture/hosting-gcp-neon-r2.md)

## Continuity Core Records

- scope: [campaign](records/campaign.md), [house](records/house.md), [world](records/world.md)
- lineage: [character-sheet](records/character-sheet.md), [character-branch](records/character-branch.md), [character-conversion](records/character-conversion.md), [character-advancement](records/character-advancement.md), [character-episode](records/character-episode.md)
- provenance and sharing: [ruleset-manifest](records/ruleset-manifest.md), [rule-profile](records/rule-profile.md), [publication](records/publication.md), [reuse-grant](records/reuse-grant.md)

## Continuity Core Lexicon

- [共通定義](lexicon/defs.md)
- [コア namespace](lexicon/core.md)
- [auth namespace](lexicon/auth.md)
- [XRPC と transport schema](lexicon/rpc.md)

## Out-of-Product-Scope Archive

製品スコープ外の検討履歴は [archive/out-of-product-scope/README.md](archive/out-of-product-scope/README.md) に隔離する。archive は backlog でも将来ロードマップでもなく、現在の product-core contract や implementation plan の入力にしてはならない。

## 現時点の結論

- Cerulia の製品スコープは character continuity service に固定する。
- campaign は continuity scope であり、session lobby や参加管理面ではない。
- publication の正本は publication ledger にあり、carrier や mirror の整合は製品責務に含めない。
- product-core record と lexicon は run stack への規範的依存を持たない。
- contract 生成、validation、テスト gate は product-core source set だけを対象にし、archive を走査しない。
