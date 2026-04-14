# scenario

## 役割

コミュニティ管理の公開台帳エントリ。どのシナリオが存在し、どのシステム向けかを記録する。市販シナリオも自作シナリオも同じ record で扱う。誰でも登録でき、ownerDid は登録者を表す（必ずしもシナリオの作者ではない）。

## 置き場所

登録者が control する repo。共同管理する場合も 1 つの登録 repo を正本とし、maintainer はその repo の shared-maintained record を更新する。

## 主なフィールド

- title
- rulesetNsid（任意: どのシステム向けか）
- recommendedSheetSchemaRef（任意: create flow を deterministic にしたい場合の推奨 schema。ある場合は rulesetNsid 必須）
- sourceCitationUri（任意: 登録元や出典を示す公開 URI）
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
- sourceCitationUri は登録者とは別に、販売ページ、配布ページ、原作告知などの provenance を示す公開 URI に使う
- sourceCitationUri は軽量 provenance であり、author 名や版情報の完全な構造化台帳ではない
- summary は spoiler-safe な公開要約として扱う。AppView はこれを初期表示する
- spoilerRef は advisory spoiler を指す任意の参照。AppView は常に展開前 warning を出す。ただしこれは AppView の UI 約束であり、protocol-level の隠蔽ではない
- signed-in viewer が自分の session に同じ scenarioRef を持つ場合だけ、warning copy を「通過済み向け」の文面に切り替えてよい。それ以外は generic spoiler warning を出す
- rulesetNsid でどのシステム向けかを示す。省略可能だが、推奨する
- recommendedSheetSchemaRef がある場合、それが scenario から create flow へ進むときの canonical schema pin になる
- recommendedSheetSchemaRef がある場合、その schema の baseRulesetNsid は scenario.rulesetNsid と一致しなければならない
- recommendedSheetSchemaRef が無い scenario は browse 用として扱う。AppView は deterministic な schema 解決や「このシナリオから作る」導線を出さない
- maintainerDids は scenario record のみを更新できる。character 系 record の write authority には影響しない
