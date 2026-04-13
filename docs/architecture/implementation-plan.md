# Go サーバー実装計画

## 目的

Cerulia の設計文書を Go サーバー実装へ落とすための実行計画。PL がキャラクターを作り、セッション経験を記録し、共有できるサービスを構築する。

## 前提となる設計判断

- [設計概要](overview.md)
- [設計哲学](philosophy.md)
- [主要判断](decisions.md)
- [レイヤー構成](layers.md)
- [projection contract](projections.md)
- [MVP の実装順](mvp.md)

## 実装の基本方針

### 1. modular monolith で始める

初期実装は 1 つの Go サービスを基本にする。ただし Bluesky のように個別ホスティングできるアーキテクチャを前提にし、将来の process 分割に備える。

### 2. contract-first で進める

core lexicon と core record 定義を JSON Lexicon と Go 型へ materialize することを最初にやる。

### 3. PL 体験の順に閉じる

キャラクター作成 → セッション記録 → 共有の順に実装する。

## Go 構成

```text
cmd/
  api/
internal/
  authz/
  contract/
  core/
    command/
    model/
    projection/
    scope/
  ledger/
  platform/
    config/
    database/
    httpserver/
    logging/
  store/
```

## 実装順序

### Phase 1: 基盤とキャラクター作成

- contract materialization（core lexicon → Go 型、validator、contract artifact）
- platform foundation（config、logging、migration、CI）
- auth gateway（DID 解決、OAuth）
- character-sheet + character-branch ペア作成
- character-sheet-schema
- ruleset-manifest（rulesetNsid + sheetSchemaRefs の最小構成）
- visibility: draft / public

### Phase 2: セッション記録

- session（PL が自分で書くセッション経験）
- scenario（シナリオ台帳）
- character-advancement（成長記録）
- campaign（長期卓オプション）
- house（コミュニティ anchor オプション）
- rule-profile（ハウスルール overlay）

### Phase 3: 共有と閲覧

- character home projection
- campaign view projection
- scenario catalog projection
- house activity projection
- core XRPC endpoints
- public mode / owner mode の reader lens

### Phase 4: hardening

- scenario test
- projection rebuild test
- migration rehearsal

## 破綻防止ルール

- session authority を core に入れない
- 他人の DID を record に書く API を作らない
- アクセス制限を AT Protocol レベルで実装しない
- 既存サービスのスコープ（セッション進行等）をカバーしない
