# 設計概要

Cerulia は、AT Protocol 上の character continuity service である。製品として扱うのは、character lineage、campaign continuity、rules provenance、publication、reuse boundary、append-only correction と履歴説明可能性だけである。

## 製品スコープ

Cerulia の product-core は次を扱う。

- character-sheet、character-branch、character-conversion、character-advancement、character-episode による character lineage
- world、house、campaign による continuity scope
- ruleset-manifest と rule-profile chain による rules provenance
- publication による公開入口の ledger
- reuse-grant による越境利用の明示
- supersedes、retire、revoke による append-only correction

Cerulia の product-core は次を扱わない。

- session lifecycle
- membership と run authority
- message、roll、ruling-event のような卓中イベント
- disclosure、secret、handout
- board、realtime、replay
- appeal、governance、audit console

これらは [archive/out-of-product-scope/README.md](../archive/out-of-product-scope/README.md) に隔離された検討履歴であり、現行 product の責務ではない。

## hard boundary

この再編で固定する境界は次のとおりである。

- product-core record は run stack record を必須参照にしない
- product-core lexicon は archive 側 namespace や shared defs を import しない
- publication は carrier 同期や session mirror の整合を責務にしない
- projection contract は product-core canonical input だけで閉じる
- contract 生成、validation、テスト gate は archive tree を走査しない

## 固定する順序

1. canonical record と lifecycle semantics を固定する
2. projection contract を固定する
3. transport schema を固定する
4. 実装計画と test gate を固定する

この順序により、run/session 系の都合で core の意味論が後から汚染されるのを防ぐ。

## 現在の焦点

現行 repo の整理対象は、文書と実装の双方で product-core を core-only に閉じることである。特に、publication、lexicon、public HTTP surface、authz、mutationAck から run/session 固有概念を外し、clean-slate で最初からこのスコープを採った実装と同じ形へ寄せる。
