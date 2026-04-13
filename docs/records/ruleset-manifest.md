# ruleset-manifest

## 役割

ルールシステムの定義。どのシステムで、どのキャラクターシート型が使えるかを記録する。PL が直接操作することは少なく、schema との chain を提供する将来の拡張ポイント。

## 置き場所

ruleset maintainer の repo。

## 主なフィールド

- rulesetNsid
- title
- sheetSchemaRefs（この ruleset で使える character-sheet-schema への参照リスト）
- publishedAt

## 更新主体

ruleset maintainer。

## 参照関係

- character-sheet-schema（sheetSchemaRefs で参照）
- campaign（campaign.rulesetNsid で間接参照）
- scenario（scenario.rulesetNsid で間接参照）

## 設計上の注意

- MVP では PL は rulesetNsid（文字列識別子）を選ぶだけで十分。manifest は相互運用が必要になった段階で本格活用する
- sheetSchemaRefs は scenario → manifest → schema の chain を実現する。PL が scenario からキャラクター作成画面に遷移するとき、適切な schema を提示できる
- rulesetNsid は文字列の安定識別子（例: "coc-7th", "dnd-5e"）
- manifest は immutable pin として扱う。contract を変える変更は新しい record で行う
