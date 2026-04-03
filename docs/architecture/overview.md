# 設計概要

## 現在の整理

Cerulia は、AT Protocol 上の continuity ledger を core にし、その上へ必要な extension を積む。

- core: character lineage、cross-ruleset conversion provenance、campaign continuity、rules provenance、publication、reuse、auditability
- projection: character home、campaign view、publication summary
- optional extension: session、session authority、live play、board、secret disclosure、dispute workflow

optional extension が session-backed carrier を持つ場合でも、carrier read plane は core projection family に混ぜない。session-publication は publication current head を mirror する adapter として扱い、public top や replay への導線を補助する dedicated carrier plane に留める。

## 何を先に固定するか

具体的な schema や API payload を深く固める前に、次を先に固定する。

1. canonical record と lifecycle semantics
2. projection contract
3. read/write bundle と surface boundary

この順にしておくと、最初の実装が incidental な DTO shape を正本化してしまうのを防げる。

## projection contract の位置づけ

projection intent contract の正本は [projections.md](projections.md) に置き、concrete な query / procedure schema は [../lexicon/rpc.md](../lexicon/rpc.md) に置く。

- [character home](projections.md#character-home): owner / steward 向けの continuity home
- [campaign view](projections.md#campaign-view): continuity scope の shared view
- [publication summary](projections.md#publication-summary): publication current head の summary primitive

## concretization の順序

1. core invariant を fix する
2. projection contract を fix する
3. query schema と reader auth を concretize する
4. mutation schema を concretize する
5. optional extension を具体化する

この repo の現在フェーズは 3 と 4 の固定を終え、optional extension の残差や implementation detail を詰める段階である。