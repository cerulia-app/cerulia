# 主要判断と代替案

この設計で重要なのは、continuity core と optional extension を混ぜないことです。ここでは core 側の採用判断だけを固定します。

## 1. product root を何にするか

候補:

- session を product root にする
- campaign を唯一の root にする
- character と campaign の continuity ledger を root にする
- すべてを event stream に押し込む

採用:

character と campaign の continuity ledger を root にする。

理由:

新方向の価値は run そのものではなく、キャラクターと継続線の由来、共有、訂正、公開にある。session は optional extension に落とした方が core が素直になる。

## 2. core の継続スコープをどう持つか

候補:

- campaign だけにする
- world / house / campaign を strict tree にする
- world / house / campaign を continuity scope として並べる
- session まで含めて全部 core にする

採用:

world / house / campaign を continuity scope として並べる。

理由:

world は canon、house は policy、campaign は continuity で責務が違う。session を core に入れると run-centric に戻ってしまう。

## 3. キャラクターを何層で表すか

候補:

- sheet だけにする
- sheet と branch にする
- sheet、branch、advancement、episode にする
- sheet、branch、advancement、instance、state、episode を全部 core にする

採用:

sheet、branch、advancement、episode を core にする。

理由:

ownership、分岐、成長、要約の 4 層があれば continuity core は成立する。instance と state は run 拡張の責務なので core から外す。

## 4. publication をどう持つか

候補:

- session-publication をそのまま core にする
- campaign だけに公開入口を持たせる
- branch だけに公開入口を持たせる
- subject-scoped な generic publication ledger を core にする

採用:

subject-scoped な generic publication ledger を core にする。

理由:

公開したい対象は campaign、branch、episode など複数あり得る。session-publication を中心にすると extension 依存が core に漏れる。

## 5. correction / revocation をどう持つか

候補:

- in-place update を許す
- delete を正規経路にする
- supersedes と retire と revoke を append-only に分ける
- appeal case をすべての訂正の中心にする

採用:

supersedes と retire と revoke を append-only に分ける。

理由:

内容の訂正、公開入口の終了、将来権利の停止は別物であり、一つの workflow に押し込むと説明責任が壊れる。

## 6. dispute workflow を core に置くか

候補:

- broad な appeal machine を core に置く
- publication/disclosure 専用の review-case を core に置く
- core には共通 correction 原語だけを残し、争いの workflow は extension に落とす
- off-record 運用だけに任せる

採用:

core には共通 correction 原語だけを残し、争いの workflow は extension に落とす。

理由:

新方向の core は disputed moderation machine ではない。必要なら governance extension が review-case を持てばよい。

## 7. rules provenance をどこまで core に入れるか

候補:

- ruleset-manifest だけ
- campaign rule chain だけ
- world / house / campaign の continuity overlay を core にし、session override は extension にする
- session override と temporary ruling まで core に入れる

採用:

world / house / campaign の continuity overlay を core にし、session override は extension にする。

理由:

continuity core が説明したいのは rules provenance であって run-time ruling ではない。

## 8. live play をどう扱うか

候補:

- core に残す
- MVP では薄く残す
- optional extension に分離する
- 完全に捨てる

採用:

optional extension に分離する。

理由:

今の product thesis に対して live play は必須ではないが、将来の拡張余地は残しておきたい。

## 9. projection contract をいつ固定するか

候補:

- full DTO と transport schema まで今すぐ固定する
- surface 名だけ決めて payload は実装に委ねる
- ledger semantics だけ固定し、projection は後回しにする
- projection の intent contract を先に固定し、field schema は後で concretize する

採用:

projection の intent contract を先に固定し、field schema は後で concretize する。

理由:

character home、campaign view、publication summary は既に product surface として前面に出ている。ここを未固定のまま schema/API を先に固めると、最初の実装都合が read model の正本になってしまう。一方で full DTO まで今すぐ固定すると、まだ揺れてよい field shape まで早く閉じすぎる。したがって、purpose、canonical input、required block、optional block、reader mode、除外境界だけを先に固定するのが最も安全である。

## 10. public read をどこまで core projection に持つか

候補:

- character home と campaign view を private にし、public は publication summary だけにする
- character home は private のまま、campaign view は public index shell を持ち、publication summary も public にする
- campaign.visibility を gate にして public campaign view を広く返す
- public projection を別 endpoint / 別 surface に完全分離する

採用:

character home は private のまま、campaign view は public index shell を持ち、publication summary も public にする。

理由:

discoverability を残しつつ、公開境界の正本は publication current head に寄せられる。campaign view の public mode は full public continuity dossier ではなく、公開済み publication の索引 shell に縮めることで、campaign 内部の continuity と公開面を混同しにくくなる。reader mode は auth bundle ではなく read lens として扱い、anonymous read は public current head に裏づく block だけに限定する。

## 11. ruleset をまたぐ変換をどう表すか

候補:

- externalSheetUri や importedFrom だけで import provenance として済ませる
- character-branch に convertedFrom 系 field を足して branch 自体へ畳み込む
- character-episode の subtype として変換 provenance を持たせる
- source / target contract と結果 branch を結ぶ専用の character-conversion record を core に足す
- import-sync advancement として変換を表す

採用:

source / target contract と結果 branch を結ぶ専用の character-conversion record を core に足す。

理由:

ruleset 跨ぎ変換は live run でも growth fact でもなく、append-only な continuity provenance である。branch や episode に押し込むと、それぞれの責務である durable subject と summary / link を曖昧にしやすい。専用 record に分けることで、変換後の branch を durable subject に保ちつつ、opaque importer magic ではない説明可能な provenance を残せる。

## 12. 変換 contract をどこに pin するか

候補:

- core に universal な変換 DSL を作る
- ruleset-manifest に source -> target の変換行列を直接持たせる
- dedicated な conversion-manifest record を別 collection として導入する
- character-conversion に sourceRulesetManifestRef / targetRulesetManifestRef と neutral な conversionContractRef / conversionContractVersion を持たせる
- human-readable note だけで説明する

採用:

character-conversion に sourceRulesetManifestRef / targetRulesetManifestRef と neutral な conversionContractRef / conversionContractVersion を持たせる。

理由:

Cerulia core は universal DSL を押し込まない方針であり、ruleset-manifest も単一 ruleset の contract pin に集中している。source / target manifest と中立な contract metadata だけを固定すれば、どの ruleset contract で source と target を解釈したかを durable に追える一方で、変換アルゴリズムの shape までは core に閉じ込めずに済む。

## 13. 変換の consent をどう扱うか

候補:

- convert 専用の grant record を新設する
- same-owner のみ許し、cross-boundary 変換は常に禁止する
- same-owner 変換はそのまま許し、cross-boundary または delegated conversion は既存の reuse-grant に寄せる
- public publication があるなら暗黙に変換も許す
- campaign steward または house steward の承認を常に必須にする

採用:

same-owner 変換はそのまま許し、cross-boundary または delegated conversion は既存の reuse-grant に寄せる。

理由:

Cerulia にはすでに branch 越境の consent ledger として reuse-grant があり、ここに新しい grant primitive を足す必要はない。変換 record は provenance を残すものであって permission を創設するものではないので、explicit consent が要るケースでは reuse-grant を参照するだけに留めるのが最小で堅い。

campaign-less な local conversion は許してよいが、その branch を後から cross-boundary reuse や delegated conversion に使いたい場合は、reuse-grant の source boundary 規則に従って source campaign を明示した branch か fork を先に作る。

## 14. 変換をどの projection に出すか

候補:

- 専用 projection は作らず raw record lookup に任せる
- character home に optional な conversion provenance summary block だけを足す
- character home に詳細 summary を足し、publication summary には薄い provenance hint だけを足す
- conversion history 専用の新 surface を増やす
- recent episode summary に暗黙的に折り込む

採用:

character home に詳細 summary を足し、publication summary には薄い provenance hint だけを足す。

理由:

変換は owner / steward が character home で詳しく追えるべきだが、変換後の branch が公開されたときは public surface 側にも最小限の provenance hint が必要になる。character home に詳細 summary を置きつつ、publication summary には source / target contract と grant-backed かどうかだけを薄く返せば、新しい projection surface を増やさずに公開説明責任を補える。