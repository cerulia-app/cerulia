# MVP の実装順

MVP は character history service を先に完成させ、その時点で製品ロードマップを閉じる。session の run authority、governance、disclosure、board、replay は product roadmap に含めない。

## フェーズ 0: core invariants

- scope と provenance の境界を固定する
- house / campaign の役割を固定する
- ruleset-manifest と rule-profile chain の優先順を固定する
- character-advancement を growth fact とし、session を遊んだ記録とする
- publication の append-only モデルと retire の規則を決める
- character home、campaign view、publication summary の projection contract を transport schema より先に固定する
- archive を product source set から除外する

## フェーズ 1: continuity core

- character-sheet
- character-branch
- character-advancement
- campaign
- house
- world
- ruleset-manifest
- rule-profile

ここでは lineage、scope、rules provenance の正本を作る。

## フェーズ 2: session history と公開

- session
- session-participation
- scenario
- character-sheet-schema
- character-conversion
- publication
- import / export の最小 contract
- character home
- campaign view

ここでは「いつ誰とどのシナリオを遊んだか」と「何を公開するか」の正本を作る。

## フェーズ 3: auditability と correction

- supersedes / retire の folding 規則
- publication summary view
- scenario catalog
- 監査用 projection

ここでは「あとからどう説明できるか」を固める。

## 初期にやらないこと

- product に session authority を入れること
- product に broad な appeal machine を入れること
- product に disclosure、board、realtime、replay を入れること
- product を session-centric に戻すこと
- archive を将来フェーズとして読み替えること

MVP で重要なのは、character history service がそれ単体で product として成立することである。
