# SvelteKit ベース AppView 実装計画

## 技術スタック

- SvelteKit（SSR + CSR）
- TypeScript
- native CSS / component-scoped CSS

## 実装順

### Phase 1: キャラクター作成

- rulesetNsid 選択 UI
- schema-driven フォーム生成（fieldDefs → 動的フィールド）
- schema-less sheet の raw JSON fallback view / editor
- extensible な schema group に対する追加 field 入力
- rulesetNsid を選んだ後に `listCharacterSheetSchemas` から explicit schema selection UI を出す generic create flow
- scenario.recommendedSheetSchemaRef がある場合の deterministic schema 解決
- ダイスロール UI（クライアント側）
- 立ち絵アップロード
- CCFolia clipboard エクスポート
- visibility toggle

### Phase 2: セッション記録

- Sessions 一覧
- Sessions inline detail / edit
- session 記録フォーム
- scenario 選択 / 登録
- advancement 記録
- キャラクター詳細にセッション履歴を表示

### Phase 3: 共有と閲覧

- public character detail view
- 共有リンク生成
- OGP meta タグ
- scenario catalog

### Phase 4: オプション

- campaign view
- house activity view
- shared-maintained record edit surfaces
- house view
- character-conversion UI

## 破綻防止ルール

- session runtime を AppView に入れない
- 他人の record を mutation する UI を作らない
- AT Protocol の用語を UI に出さない
- draft record を一覧から隠し、direct route では draft 状態付きで解決する
- public shared surface を character detail に固定する
