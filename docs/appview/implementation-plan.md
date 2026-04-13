# SvelteKit ベース AppView 実装計画

## 技術スタック

- SvelteKit（SSR + CSR）
- TypeScript
- Tailwind CSS

## 実装順

### Phase 1: キャラクター作成

- rulesetNsid 選択 UI
- schema-driven フォーム生成（fieldDefs → 動的フィールド）
- ダイスロール UI（クライアント側）
- 立ち絵アップロード
- CCFolia clipboard エクスポート
- visibility toggle

### Phase 2: セッション記録

- session 記録フォーム
- scenario 選択 / 登録
- advancement 記録
- キャラクター詳細にセッション履歴を表示

### Phase 3: 共有と閲覧

- public profile view
- 共有リンク生成
- OGP meta タグ
- scenario catalog

### Phase 4: オプション

- campaign view
- house view
- character-conversion UI

## 破綻防止ルール

- session runtime を AppView に入れない
- 他人の record を mutation する UI を作らない
- AT Protocol の用語を UI に出さない
