# scenario

## 役割

owner-centered な公開台帳エントリ。どのシナリオが存在し、どのシステム向けかを記録する。市販シナリオも自作シナリオも同じ record で扱う。誰でも登録でき、ownerDid は登録者を表す（必ずしもシナリオの作者ではない）。

## 置き場所

登録者が control する repo。複数人での共同管理は前提にしない。

record-key は lower-case slug とし、登録時に固定する。title 更新で rkey を変えない。slug は API が title から生成し、同一 collection で衝突した場合は suffix で一意化する。

## 主なフィールド

- title
- rulesetNsid（任意: どのシステム向けか）
- recommendedSheetSchemaPin（任意: create flow を deterministic にしたい場合の推奨 schema exact pin。shape は `{ uri, cid }`。ある場合は rulesetNsid 必須）
- sourceCitationUri（任意: 登録元や出典を示す公開 URI）
- summary（任意: ネタバレなしの公開要約）
- ownerDid
- createdAt
- updatedAt

## 更新主体

scenario の ownerDid。

## 参照関係

- session（session.scenarioRef から参照される）

## 設計上の注意

- scenario は AT Protocol 上の public record であり、第三者クライアントからも全フィールドが読める。ネタバレ秘匿を保証しない
- ownerDid は登録者であり、シナリオの作者（著者）とは限らない。市販シナリオを誰かが登録することも想定
- title は public-safe な公開タイトルに限る
- sourceCitationUri は登録者とは別に、販売ページ、配布ページ、原作告知などの provenance を示す公開 URI に使う
- sourceCitationUri は credential-free な公開 URI に限る。購入者専用 URL や期限付き URL は product-core に入れない
- sourceCitationUri は軽量 provenance であり、author 名や版情報の完全な構造化台帳ではない
- summary は spoiler-safe な公開要約として扱う。AppView はこれを初期表示する
- summary は public-safe な公開要約だけを扱う。ネタバレ本文や spoiler payload は product-core に入れない
- rulesetNsid でどのシステム向けかを示す。省略可能だが、推奨する
- recommendedSheetSchemaPin がある場合、それが scenario から create flow へ進むときの canonical schema pin になる。scenario owner が推薦先を変えるときは scenario record 自体を更新して新しい pin を指す
- recommendedSheetSchemaPin がある場合、その schema の baseRulesetNsid は scenario.rulesetNsid と一致しなければならない
- recommendedSheetSchemaPin が無い scenario は browse 用として扱う。AppView は deterministic な schema 解決や「このシナリオから作る」導線を出さない
