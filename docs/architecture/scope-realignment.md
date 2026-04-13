# スコープ再編の採用記録

## 文書の位置づけ

この文書は、2026-04-04 に採用した Cerulia のスコープ再編を記録するためのものです。proposal ではなく、現在の product-core boundary を説明する採用記録として扱います。

## 採用した結論

Cerulia の製品スコープを character history service に固定する。

ここでいう character history service は次だけを扱う。

- character lineage
- session history
- campaign / house scope
- scenario catalog
- rules provenance
- character-sheet-schema
- publication
- append-only correction と履歴説明可能性

次は製品スコープに含めない。

- session の run authority
- membership と参加承認
- message / roll / ruling-event のような卓中イベント
- disclosure / secrets / handout
- board / realtime
- replay
- appeal / governance / audit console

これらは将来計画ではなく、[archive/out-of-product-scope/README.md](../archive/out-of-product-scope/README.md) に隔離した検討履歴として保持する。

## hard boundary

再編後の product-core には次の hard rule を入れる。

- product-core record は run stack record を必須参照にしない
- product-core lexicon は archive 側 namespace や shared defs を import しない
- product-core の publication は carrier 同期や mirror の整合を責務にしない
- product-core の projection は archive 側 record を canonical input にしない
- contract 生成、validation、test gate、implementation plan は archive tree を source set に含めない

この hard boundary を満たさない案は、「optional extension を別 tree に置いただけ」であり、今回の目的には届かない。

## なぜ campaign は残すのか

campaign は session の言い換えではない。campaign はセッションのシリーズであり、複数の character lineage と session history を共有文脈で束ねる anchor である。

campaign が担うのは次である。

- shared rule chain の基準
- reuse policy の基準
- publication の共有文脈
- 複数キャラクターの継続をまとめて読むための continuity scope

campaign が担わないのは次である。

- 参加承認
- 進行中の state 管理
- 誰が今操作権を持つかの管理
- チャット、盤面、replay の配信

つまり campaign は shared continuity workspace であり、session lobby ではない。

## 文書と実装への反映方針

### Product Scope の正本

正本として残すのは次である。

- `README.md`
- `docs/architecture` の core-only 文書
- `docs/appview` の core-only 文書
- `docs/records` の continuity core record
- `docs/lexicon` の continuity core / auth 定義

### Out-of-Product-Scope Archive

既存の session / governance / board / replay / disclosure 関連文書は `docs/archive/out-of-product-scope/` へ移し、product docs からは archive としてだけ参照する。

### implementation consequences

- public HTTP surface から run/session/gov/disclosure endpoint を外す
- contract catalog と authz から archive 側 operation を外す
- core record と mutationAck から run 固有 field を外す
- clean-slate review を高頻度で回し、scope 外の名残を許さない

## 採用基準

この再編は、少なくとも次を満たすときに完了とみなす。

- README を読んだだけで Cerulia が character history service だと分かる
- AppView の route tree に `/sessions/*` が存在しない
- 製品 roadmap に session / governance / replay / board の phase が存在しない
- records / lexicon の正本 tree に session stack が混ざらない
- campaign が scope であり、session の代用品ではないことが全体で一貫する
- product-core record と lexicon が run stack への規範的依存を持たない

## 付属ルール

### campaign の説明ルール

- campaign はセッションのシリーズであり、session 管理面ではない
- campaign の maintainerDids は campaign record のみを更新でき、character 系 record の write authority には影響しない

### publication の説明ルール

- publication は exposure ledger であり、communication channel ではない
- notification、chat、replay 配信、参加募集を publication の責務にしない

### archive の参照ルール

- product docs は archive を正本として参照しない
- product docs で archive を指す場合は、「製品スコープ外の検討履歴」という注記を伴う
