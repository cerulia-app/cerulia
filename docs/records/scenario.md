# scenario

## 役割

シナリオの公開台帳エントリ。どのシナリオが存在し、どのシステム向けかを記録する。存在自体は公開であり、ネタバレの秘匿は AT Protocol レベルでは行わない。

## 置き場所

シナリオ作者または maintainer の repo。

## 主なフィールド

- title
- rulesetManifestRef
- summary
- spoilerRef
- ownerDid
- maintainerDids
- createdAt
- updatedAt

## 更新主体

scenario の ownerDid、または maintainerDids に含まれる actor。

## 参照関係

- ruleset-manifest
- session（session.scenarioRef から逆参照される）

## 設計上の注意

- scenario は AT Protocol 上の public record であり、第三者クライアントからも全フィールドが読める。ネタバレ秘匿を保証しない
- summary は spoiler-safe な公開要約として扱う。AppView はこれを初期表示する
- spoilerRef は詳細やネタバレ本文を指す任意の参照。AppView は折りたたんで表示し、未通過者への warning を出す。ただしこれは AppView の UI 約束であり、protocol-level の隠蔽ではない
- rulesetManifestRef でどのシステム向けかを示す。省略可能だが、推奨する
- maintainerDids は scenario record のみを更新できる。character 系 record の write authority には影響しない
- scenario record は削除しない。不要な場合は後継 record で supersede するか、session からの参照を外す
