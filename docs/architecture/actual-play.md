# 実プレイ拡張

## 目的

この文書は、Cerulia の continuity core の上に optional な live-play module をどう載せるかを整理する。core 単体で product が成立することを前提にし、ここで扱うのは structured run を採る場合だけの拡張である。

## 何が extension か

- session
- session-authority
- membership
- character-instance
- character-state
- message / roll / ruling-event
- scene / token / board-op / board-snapshot
- session-publication adapter

## extension の原則

### 1. run artifact は core root ではない

session は optional な run envelope であり、campaign や character lineage の正本を置き換えない。

### 2. run summary は core へ戻す

extension が structured run を持つ場合も、durable な持ち帰りは character-advancement と character-episode に戻す。

### 3. public entry の正本は core publication に残す

session-publication は session-backed carrier の adapter であり、canonical source of truth は core の publication ledger に置く。

### 4. run-time override は core rule chain を汚染しない

session local override や temporary ruling は extension の provenance として扱い、campaign shared profile を黙って書き換えない。

## extension が追加するもの

### structured run

- session を薄い run envelope として持つ
- character-instance と character-state で run-time overlay を表す

### live event

- message と roll を append-only log として持つ
- 必要なら ruling-event を加える

### board / realtime

- board-op と board-snapshot を durable board log に使う
- drag、cursor、presence は揮発層に逃がす

### replay

- replay は extension の集約 view として返す
- continuity core の publication と episode を参照してもよいが、正本を差し替えない

## extension を採る前提

- continuity core が先に成立していること
- publication / reuse / correction の core semantics が先に固定されていること
- run 由来の output を core へ戻す write path が決まっていること