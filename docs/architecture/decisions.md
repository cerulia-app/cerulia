# 主要判断と代替案

この設計で重要なのは、character history service のスコープから外れたものを混ぜないことである。ここでは product-core 側の採用判断だけを固定する。

## 1. product root を何にするか

候補:

- session を product root にする
- campaign を唯一の root にする
- character の作成・履歴・公開を root にする
- すべてを event stream に押し込む

採用:

character の作成・履歴・公開を root にする。

理由:

Cerulia の価値は、キャラクターを作り、遊んだ歴史を記録し、他の人に見せることにある。session を root にすると run-centric に戻る。

## 2. core の scope をどう持つか

候補:

- campaign だけにする
- world / house / campaign を strict tree にする
- house / campaign を scope として並べる
- session まで含めて全部 core にする

採用:

house / campaign を scope として並べる。

理由:

house はコミュニティ、campaign はセッションシリーズで責務が違う。参加管理を持たせない。

## 3. キャラクターを何層で表すか

候補:

- sheet だけにする
- sheet と branch にする
- sheet、branch、advancement にする
- sheet、branch、advancement、instance、state を全部 core にする

採用:

sheet、branch、advancement にする。session は別 record として分離する。

理由:

ownership、分岐、成長の 3 層があれば character lineage は成立する。遊んだ記録は session record として別に持ち、character record を直接変更しない。

## 4. publication をどう持つか

候補:

- session-publication をそのまま core にする
- campaign だけに公開入口を持たせる
- branch だけに公開入口を持たせる
- subject-scoped な generic publication ledger を core にする

採用:

subject-scoped な generic publication ledger を core にする。

理由:

公開したい対象は campaign、branch、episode など複数あり得る。外部 carrier や mirror を中心にすると、製品スコープ外の都合が core に漏れる。

## 5. correction / revocation をどう持つか

候補:

- in-place update を許す
- delete を正規経路にする
- supersedes と retire と revoke を append-only に分ける
- dispute case をすべての訂正の中心にする

採用:

supersedes と retire と revoke を append-only に分ける。

理由:

内容の訂正、公開入口の終了、将来権利の停止は別物であり、一つの workflow に押し込むと説明責任が壊れる。

## 6. dispute workflow を core に置くか

候補:

- broad な appeal machine を core に置く
- publication 専用の review-case を core に置く
- core には共通 correction 原語だけを残し、争いの workflow は product scope 外へ出す
- off-record 運用だけに任せる

採用:

core には共通 correction 原語だけを残し、争いの workflow は product scope 外へ出す。

理由:

Cerulia の product-core は disputed moderation machine ではない。必要なら archive から再設計するが、現行 product の前提にはしない。

## 7. rules provenance をどこまで core に入れるか

候補:

- ruleset-manifest だけ
- campaign rule chain だけ
- world / house / campaign の continuity overlay を core にする
- temporary ruling まで core に入れる

採用:

world / house / campaign の continuity overlay を core にする。

理由:

continuity core が説明したいのは rules provenance であって run-time ruling ではない。

## 8. live play と governance をどう扱うか

候補:

- product に残す
- MVP では薄く残す
- out-of-product-scope archive に分離する
- 完全に削除する

採用:

out-of-product-scope archive に分離する。

理由:

現行の product thesis に対して live play と governance は必須ではない。一方で完全削除は検討資産を失う。archive 分離だけが product 正本の誤読を避けつつ履歴を残せる。

## 9. projection contract をいつ固定するか

候補:

- full DTO と transport schema まで今すぐ固定する
- surface 名だけ決めて payload は実装に委ねる
- ledger semantics だけ固定し、projection は後回しにする
- projection の intent contract を先に固定し、field schema は後で concretize する

採用:

projection の intent contract を先に固定し、field schema は後で concretize する。

理由:

character home、campaign view、publication summary は既に product surface の中心である。ここを未固定のまま schema/API を先に固めると、実装都合が read model の正本になる。

## 10. public read をどこまで core projection に持つか

候補:

- character home と campaign view を private にし、public は publication summary だけにする
- character home は private のまま、campaign view は public index shell を持ち、publication summary も public にする
- campaign.visibility を gate にして public campaign view を広く返す
- public projection を別 endpoint / 別 surface に完全分離する

採用:

character home は private のまま、campaign view は public index shell を持ち、publication summary も public にする。

理由:

discoverability を残しつつ、公開境界の正本を publication current head に寄せられる。campaign view の public mode は full public dossier ではなく、公開済み publication の索引 shell に縮める。

## 11. ruleset をまたぐ変換をどう表すか

候補:

- importedFrom だけで済ませる
- character-branch に convertedFrom を足して畳み込む
- character-episode の subtype として持たせる
- source / target contract と結果 branch を結ぶ専用 record を足す

採用:

source / target contract と結果 branch を結ぶ専用の character-conversion record を core に足す。

理由:

ruleset 跨ぎ変換は live run でも growth fact でもなく、append-only な continuity provenance である。専用 record に分けることで、変換後の branch を durable subject に保てる。

## 12. 変換 contract をどこに pin するか

候補:

- universal な変換 DSL を作る
- ruleset-manifest に source -> target の行列を持たせる
- dedicated な conversion-manifest を導入する
- character-conversion に source / target manifest と neutral な contract metadata を持たせる

採用:

character-conversion に sourceRulesetManifestRef / targetRulesetManifestRef と neutral な conversionContractRef / conversionContractVersion を持たせる。

理由:

Cerulia core は universal DSL を押し込まない方がよい。source / target manifest と中立な contract metadata だけを固定すれば、説明可能な provenance を残せる。

## 13. 変換の consent をどう扱うか

候補:

- convert 専用の grant record を新設する
- same-owner のみ許し、cross-boundary 変換は常に禁止する
- same-owner 変換はそのまま許し、cross-boundary はコミュニケーションに委ねる
- public publication があれば暗黙に変換も許す

採用:

same-owner 変換はそのまま許し、cross-boundary はコミュニケーションに委ねる。

理由:

越境利用の許可・禁止をシステムで裁定しないという哲学に沿う。reuse-grant は廃止し、記録は owner action だけを正本とする。

## 14. 変換をどの projection に出すか

候補:

- 専用 projection は作らず raw record lookup に任せる
- character home に optional な conversion summary だけを足す
- character home に詳細 summary を足し、publication summary には薄い provenance hint だけを足す
- conversion history 専用の新 surface を増やす

採用:

character home に詳細 summary を足し、publication summary には薄い provenance hint だけを足す。

理由:

変換は owner が character home で詳しく追えるべきだが、変換後の branch が公開されたときは public surface 側にも最小限の provenance hint が必要になる。

## 15. reuse-grant を廃止するか

候補:

- 越境利用の明示許可を reuse-grant で残す
- reuse-grant を「越境事実の provenance record」に意味を変えて残す
- reuse-grant を完全に廃止し、越境利用はコミュニケーションに委ねる

採用:

reuse-grant を完全に廃止し、越境利用はコミュニケーションに委ねる。

理由:

TRPG はコミュニケーションで成り立つべきであり、持ち出し許可をシステムが裁定するのは過剰である。owner action だけが正本であり、誰が許可したかの canonical explanation は意図的に持たない。

## 16. steward を廃止するか

候補:

- steward 概念をそのまま残す
- steward を ownerDid / maintainerDids に置き換える
- scope owner だけにして multi-actor 管理を捨てる

採用:

steward を ownerDid / maintainerDids に置き換える。

理由:

maintainerDids は scope record（campaign / house / scenario）のみを更新できる。character 系 record の write authority は常に ownerDid のみである。他人のキャラクター状態に触れる権限を誰にも与えない。

## 17. session を core に戻すか

候補:

- session は out-of-product-scope のままにする
- session を post-run summary として core に戻す
- session を run lifecycle 付きで core に戻す

採用:

session を post-run summary として core に戻す。character-episode は session に置き換える。

理由:

Cerulia の価値の中心は「誰とどのシナリオを遊んだか」を追えることであり、それは core に属する。ただし run control（開始、一時停止、権限移譲）は持たない。GM が session record を書き、プレイヤーは任意で session-participation を自分の repo に書く。

## 18. 他のプレイヤーが Cerulia を使っていなくても成り立つか

候補:

- 参加者全員が Cerulia アカウントを持つことを前提にする
- GM だけで記録でき、非ユーザーは名前で残す
- 両方をサポートし、後からリンクできる

採用:

GM だけで記録でき、非ユーザーは名前で残す。プレイヤーが後から Cerulia を始めたら、過去の session に session-participation で遡ってリンクできる。

理由:

AT Protocol の採用はグラデーションであるべきで、全員が使うことを前提にしない。使えば使うほど価値が高まる仕組みとする。

## 19. scenario を core に入れるか

候補:

- scenario は外部サービスに任せる
- scenario label だけ session に持たせる
- scenario を core record として新設する

採用:

scenario を core record として新設する。

理由:

どのシナリオを経験したかはキャラクター履歴の本質である。scenario は公開台帳として機能し、session が参照する。ネタバレは AT Protocol レベルで秘匿せず、AppView で隠す。

## 20. character-sheet-schema を新設するか

候補:

- sheet の型定義は持たず、自由入力に任せる
- ruleset-manifest に型定義を埋め込む
- 別 record として character-sheet-schema を新設する

採用:

別 record として character-sheet-schema を新設する。

理由:

分散型として最も活かしたい部分である。system とハウスルールによってキャラクターの型が決まり、その型に合わせてキャラクターを作れるようにする。rules provenance 層に置き、character data と混ぜない。immutable pin として扱う。
