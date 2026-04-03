# Migrations

このディレクトリは ledger kernel と projection schema の SQL migration を置く場所です。

初期環境ではまだ schema を固定していないため、runner は入れていません。phase 0 の最初の永続化テーブルを定義する段階で、Go から再現可能な migration runner をここへ接続します。
