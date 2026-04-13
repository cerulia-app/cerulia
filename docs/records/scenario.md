# scenario

## 役割

シナリオの公開台帳エントリ。どのシナリオが存在し、どのシステム向けかを記録する。市販シナリオも自作シナリオも同じ record で扱う。誰でも登録でき、ownerDid は登録者を表す（必ずしもシナリオの作者ではない）。

## 置き場所

登録者の repo。

## 主なフィールド

- title
- rulesetNsid（任意: どのシステム向けか）
- summary（任意: ネタバレなしの公開要約）
- spoilerRef（任意: ネタバレありの詳細への参照）
- ownerDid
- maintainerDids
- createdAt
- updatedAt

## 更新主体

scenario の ownerDid、または maintainerDids に含まれる actor。

## 参照関係

- session（session.scenarioRef から参照される）

## 設計上の注意

- scenario は AT Protocol 上の public record であり、第三者クライアントからも全フィールドが読める。ネタバレ秘匿を保証しない
- ownerDid は登録者であり、シナリオの作者（著者）とは限らない。市販シナリオを誰かが登録することも想定
- summary は spoiler-safe な公開要約として扱う。AppView はこれを初期表示する
- spoilerRef は詳細やネタバレ本文を指す任意の参照。AppView は折りたたんで表示し、未通過者への warning を出す。ただしこれは AppView の UI 約束であり、protocol-level の隠蔽ではない
- rulesetNsid でどのシステム向けかを示す。省略可能だが、推奨する
- maintainerDids は scenario record のみを更新できる。character 系 record の write authority には影響しない
