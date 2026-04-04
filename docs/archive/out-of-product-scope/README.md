# Out-of-Product-Scope Archive

この tree は、Cerulia の現在の製品スコープから外した検討履歴を保存するための archive です。ここに置く文書は、現行 product の正本でも、将来のロードマップでも、実装必須項目でもありません。

## 位置づけ

- product の正本は `docs/architecture`、`docs/appview`、`docs/records`、`docs/lexicon` の core-only 文書です。
- この archive は、以前の session / governance / disclosure / board / replay 検討を失わずに残すための履歴置き場です。
- product docs、contract generation、validation、test gate、implementation plan は archive を規範入力にしてはなりません。

## 内容

- `architecture/`: 製品スコープ外へ出した設計文書
- `records/`: 製品スコープ外へ出した record 定義
- `lexicon/`: 製品スコープ外へ出した namespace 定義

## 使い方

archive は historical reference としてだけ扱う。ここに書かれた概念を product-core へ戻す場合は、archive を参照して既成事実化するのではなく、現行の Cerulia philosophy と hard boundary から再設計する。
