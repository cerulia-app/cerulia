# MVPの実装順

MVP は continuity core を先に完成させ、run/gov/live-play は optional extension に回す。

## フェーズ0: core invariants

- continuity core と extension の境界を固定する
- world / house / campaign の役割を固定する
- ruleset-manifest と continuity rule-profile chain の優先順を固定する
- character-advancement を growth fact、character-episode を continuity summary とする
- publication の append-only モデルと retire の規則を決める
- reuse-grant の default / explicit / revoke の規則を決める
- character home、campaign view、publication summary の projection contract を transport schema より先に固定する
- core query が読む canonical input と reader bundle を固定する

この段階で core の用語、invariant、projection の intent contract を固める。

## フェーズ1: continuity core

- character-sheet
- character-branch
- character-advancement
- campaign
- house
- world
- ruleset-manifest
- rule-profile

ここでは lineage、scope、rules provenance の正本を作る。

## フェーズ2: sharing と公開

- character-conversion
- character-episode
- publication
- reuse-grant
- import / export の最小 contract
- character home
- campaign view

ここでは「何を持ち運び、何を共有し、何を公開するか」の正本を作る。

## フェーズ3: audit と correction

- supersedes / retire の projection 規則
- publication summary view
- reuse revoke summary view
- continuity artifact の監査用 projection

ここでは「あとからどう説明できるか」を固める。

## Optional Extension A: Structured Run

- session
- character-instance
- character-state
- thin run shell

## Optional Extension B: Run Governance

- session-authority
- membership
- review / dispute workflow
- session-publication adapter

## Optional Extension C: Disclosure / Secrets

- audience
- audience-grant
- secret-envelope
- reveal-event
- redaction-event

## Optional Extension D: Live Play

- message
- roll
- ruling-event
- scene と token
- board-op と board-snapshot
- realtime 配信

## 初期にやらないこと

- core に session authority を入れること
- core に broad な appeal machine を入れること
- core に board / realtime を入れること
- core を session-centric に戻すこと

MVP で重要なのは、continuity ledger が extension なしで成立することです。