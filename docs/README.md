# Cerulia 設計文書

Cerulia は TRPG プレイヤー向けのキャラクター管理・セッション記録・共有サービスである。PL がキャラクターを作り、遊んだ記録を残し、他の人に見せることができる。

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

- scope: [campaign](records/campaign.md), [house](records/house.md)
- lineage: [character-sheet](records/character-sheet.md), [character-branch](records/character-branch.md), [character-conversion](records/character-conversion.md), [character-advancement](records/character-advancement.md)
- session: [session](records/session.md), [scenario](records/scenario.md)
- rules: [ruleset-manifest](records/ruleset-manifest.md), [rule-profile](records/rule-profile.md), [character-sheet-schema](records/character-sheet-schema.md)

## Core Lexicon

- [共通定義](lexicon/defs.md)
- [コア namespace](lexicon/core.md)
- [auth namespace](lexicon/auth.md)
- [XRPC と transport schema](lexicon/rpc.md)

## 現時点の結論

- Cerulia は PL の個人アプリとして設計する。GM 専用の機能は作らない
- 全 record は原則公開。visibility: draft / public で AppView が表示を制御する
- キャラクター状態の変更は owner のみ。他人の record は書き換えない
- 他人の DID を自分の record に書かない
- session は post-run の記録であり、run control を持たない。
- 越境利用はシステムで管理しない。コミュニケーションによる。
- publication の正本は publication ledger にあり、carrier の整合は製品責務に含めない。
- scenario の spoiler は AT Protocol レベルでは公開。隠蔽は AppView で対応する。
