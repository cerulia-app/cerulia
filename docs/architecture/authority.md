# 実行権威拡張

## 基本方針

session authority は optional run extension が shared mutation を確定したいときだけ使う。Cerulia core の continuity ledger は、この record が無くても成立する。

## 何のために使うか

- structured run の開始と終了
- membership の承認と状態遷移
- session-backed carrier の publish / retire
- run-time state の確定
- optional dispute workflow の control plane

## core との境界

- branch ownership
- campaign continuity
- core publication ledger
- reuse-grant

これらは session authority が最終正本を持たない。

## authority を置く理由

共同 GM、運用責任の分離、live mutation の確定順を扱いたいときには authority record が有効である。ただしそれは live extension の都合であり、continuity core の要件ではない。

## 権限モデル

extension を採る場合でも、OAuth scope、session role、secret disclosure grant は分けて扱う。GM role を OAuth scope に直結させない。

## 推奨する運用ルール

- controller list は shared mutation の確定責任だけを表す
- lease と transfer は live extension の都合にだけ使う
- recovery controller は break-glass 経路に限定する
- lease 失効や controller 不在は recovery controller に live-play authority を与えない。live mutation の再開は transferAuthority または controller 承認の close / reopen を経る
- recovery controller が使える break-glass は transfer 関連 field の narrow update に限り、accepted transfer 自体を gameplay resume と解釈してはならない
- core publication や branch ownership は session authority で直接更新しない

## 書き込みの標準フロー

1. 利用者が extension XRPC に要求を送る。
2. service が OAuth token と session role を検証する。
3. authority が run-time mutation を確定する。
4. 必要な output だけを core の publication / episode / advancement へ戻す。

この拡張は core の provenance を補強してよいが、core root を奪ってはならない。