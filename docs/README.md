# Cerulia: AT ProtocolベースTRPG継続台帳の設計メモ

このリポジトリは、AT Protocol 上で TRPG の continuity ledger を設計するための文書置き場です。Cerulia の core は live play システムではなく、キャラクターの継続性、campaign continuity、rules provenance、reuse boundary、publication、revocation、auditability を durable に残す台帳です。Bluesky の social/public 面は引き続き Bluesky 側に残し、Cerulia は continuity artifact を公開・継承・訂正できる AT Protocol-native な record graph を主軸にします。公開ドメインは cerulia.app に統一します。

## 読み順

### Core

1. [設計概要](docs/architecture/overview.md)
2. [設計哲学](docs/architecture/philosophy.md)
3. [主要判断と代替案](docs/architecture/decisions.md)
4. [レイヤー構成](docs/architecture/layers.md)
5. [projection contract](docs/architecture/projections.md)
6. [MVPの実装順](docs/architecture/mvp.md)

### AppView / UX

7. [AppView層UI設計](docs/appview/README.md)

### Deployment / Operations

8. [GCP Cloud Run + Neon + R2 ホスティング / 運用方針](docs/architecture/hosting-gcp-neon-r2.md)

### Optional Extensions

9. [実プレイ拡張](docs/architecture/actual-play.md)
10. [実行権威拡張](docs/architecture/authority.md)
11. [秘匿と公開境界の拡張](docs/architecture/secrets.md)
12. [TRPGのエッジケース](docs/architecture/edge-cases.md)

## レコード定義

### Continuity Core

- scope: [campaign](docs/records/campaign.md), [house](docs/records/house.md), [world](docs/records/world.md)
- lineage: [character-sheet](docs/records/character-sheet.md), [character-branch](docs/records/character-branch.md), [character-conversion](docs/records/character-conversion.md), [character-advancement](docs/records/character-advancement.md), [character-episode](docs/records/character-episode.md)
- provenance and sharing: [ruleset-manifest](docs/records/ruleset-manifest.md), [rule-profile](docs/records/rule-profile.md), [publication](docs/records/publication.md), [reuse-grant](docs/records/reuse-grant.md)

### Optional Run / Governance Extensions

- run and authority: [session](docs/records/session.md), [session-authority](docs/records/session-authority.md), [session-publication](docs/records/session-publication.md), [membership](docs/records/membership.md)
- run events: [character-instance](docs/records/character-instance.md), [character-state](docs/records/character-state.md), [message](docs/records/message.md), [roll](docs/records/roll.md), [ruling-event](docs/records/ruling-event.md)
- disputes and disclosure: [appeal-case](docs/records/appeal-case.md), [appeal-review-entry](docs/records/appeal-review-entry.md), [audience](docs/records/audience.md), [audience-grant](docs/records/audience-grant.md), [secret-envelope](docs/records/secret-envelope.md), [reveal-event](docs/records/reveal-event.md), [redaction-event](docs/records/redaction-event.md), [audit-detail-envelope](docs/records/audit-detail-envelope.md)
- board: [scene](docs/records/scene.md), [token](docs/records/token.md), [board-op](docs/records/board-op.md), [board-snapshot](docs/records/board-snapshot.md), [asset](docs/records/asset.md), [handout](docs/records/handout.md)

## Lexicon案

- [共通定義](docs/lexicon/defs.md)
- [コア namespace](docs/lexicon/core.md)
- [run extension namespace](docs/lexicon/run.md)
- [XRPC と permission-set](docs/lexicon/rpc.md)
- [auth namespace](docs/lexicon/auth.md)
- [盤面 namespace](docs/lexicon/board.md)
- [秘匿 namespace](docs/lexicon/secret.md)

## 現時点の結論

- Core は AT Protocol-native な continuity ledger として設計し、session や runtime authority を canonical root にしない。
- 主役は [character-sheet](docs/records/character-sheet.md)、[character-branch](docs/records/character-branch.md)、[character-conversion](docs/records/character-conversion.md)、[character-advancement](docs/records/character-advancement.md)、[character-episode](docs/records/character-episode.md)、[campaign](docs/records/campaign.md) である。
- publication は session 固有の入口ではなく、[campaign](docs/records/campaign.md)、[character-branch](docs/records/character-branch.md)、[character-episode](docs/records/character-episode.md) を対象にする [publication](docs/records/publication.md) を core の正本にする。session-backed な公開導線は [session-publication](docs/records/session-publication.md) の adapter で扱う。
- reuse は [reuse-grant](docs/records/reuse-grant.md) で明示し、revocation は append-only に扱う。
- ruleset をまたぐ変換は [character-conversion](docs/records/character-conversion.md) で provenance を残し、durable な reuse / publication の subject は変換 record ではなく変換後の branch または episode に置く。
- correction は record の削除ではなく supersedes と retire で扱う。
- schema/API を deeper に固定する前に、[character home](docs/architecture/projections.md#character-home)、[campaign view](docs/architecture/projections.md#campaign-view)、[publication summary](docs/architecture/projections.md#publication-summary) の projection contract を intent-contract-first で固定する。
- `session`, `session-authority`, `appeal`, `reveal/redaction`, `message/roll`, `board` は optional extension であり、core の価値提案に必須ではない。