# 必要機能一覧

## キャラクター作成

- ルールシステム選択（rulesetNsid）
- schema 一覧取得と明示選択

scenario に recommendedSheetSchemaRef がある場合だけ `scenario -> character-sheet-schema` を canonical chain とする。無い場合、その scenario は browse-only とし、scenario 起点の create CTA は出さない。
- フィールド入力（schema の fieldDefs に基づく動的フォーム）
- extensible な schema group への追加 field 入力
- ダイスロール（クライアント側）
- 立ち絵設定（portraitRef）
- CCFolia clipboard 形式でのエクスポート
- visibility: draft / public の切り替え

## キャラクター管理

- キャラクター一覧（branch 単位）
- キャラクター詳細表示（stats、立ち絵、プロフィール、公開セッション履歴、conversion provenance）。schema-less の場合は structured stats を公開しない
- キャラクター編集
- schema rebase（sheetSchemaRef の明示更新）
- branch 作成（main から local / campaign 分岐）
- branch の retire

## セッション記録

- セッション経験の記録（シナリオ、キャラクター、日付、record role、結果）
- `pl` / `gm` は記録上の role selection であり、GM 専用モードを意味しない
- role=gm の場合は character 選択を省略できる
- 成長記録（character-advancement）
- セッション履歴一覧
- Sessions 一覧画面
- Sessions 一覧内の inline detail / edit

## シナリオ

- シナリオの検索・一覧（rulesetNsid でフィルタ）
- シナリオの登録
- シナリオ詳細（summary + spoiler 折りたたみ）
- recommendedSheetSchemaRef を持つシナリオからだけ character 作成へのナビゲーション

## 長期卓（campaign）

- campaign 作成
- campaign に紐づくセッション一覧
- rule overlay の表示

## コミュニティ（house）

- house 作成
- house 詳細（canonSummary、externalCommunityUri）
- house に紐づく campaign 一覧
- house に紐づく activity summary

## 共有

- キャラクターの public view（canonical shared surface）
- 共有リンクの生成
- SNS での OGP 表示
