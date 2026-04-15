# 必要機能一覧

このファイルは AppView の target MVP feature spec を定義する。reset 後の current runtime のみを説明する文書ではない。

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
- submit 後の保存状態表示（`pending` / `accepted` / `rejected` / `rebase-needed`）

## キャラクター管理

- キャラクター一覧（branch 単位）
- キャラクター詳細表示（stats、立ち絵、プロフィール、公開セッション履歴、conversion provenance）。schema-less の場合は structured stats を公開しない
- character detail の first view でプロフィール、structured stats、立ち絵を優先表示する
- キャラクター編集
- schema rebase（sheetSchemaRef の明示更新）
- branch 作成（main から local / campaign 分岐）
- branch の retire

## セッション記録

- セッション経験の記録（シナリオ、キャラクター、日付、record role、結果）
- `pl` / `gm` は記録上の role selection であり、GM 専用モードを意味しない
- role=gm の場合は character 選択を省略できる
- session は 1 シナリオ完走 = 1 件の post-run record とする
- 成長記録（character-advancement）。恒久的な変化を残し、HP / MP のような一時状態を primary target にしない
- 配信アーカイブや外部記録へのリンクを残せる
- セッション履歴一覧
- Sessions 一覧画面。owner-only workbench とし、public session 専用 route は作らない
- Sessions 一覧内の inline detail / edit
- submit 後の保存状態表示（`pending` / `accepted` / `rejected` / `rebase-needed`）

## シナリオ

- シナリオの検索・一覧（rulesetNsid でフィルタ）
- シナリオの登録
- シナリオ詳細（summary + spoiler 折りたたみ）
- recommendedSheetSchemaRef を持つシナリオからだけ character 作成へのナビゲーション
- scenario detail では ownerDid を作者として扱わず、登録者と sourceCitationUri を見せる

## 長期卓（campaign）

- campaign 作成
- campaign に紐づくセッション一覧
- rule overlay の表示
- archived campaign は read-only detail とし、archive 以外の更新導線を出さない

## コミュニティ（house）

- house 作成
- house 詳細（canonSummary、externalCommunityUri）
- house に紐づく campaign 一覧
- house に紐づく activity summary

## 表示制御と保存状態

- visibility toggle を出す対象は character-branch、session、campaign、house に限る
- rule-profile と character-sheet-schema は public-only record であり、draft / public toggle の対象にしない
- `pending` は AppView の local UI state であり、mutation transport の canonical result kind ではない
- public surface では accepted になるまで新規更新を確定表示しない
- rejected / rebase-needed は pending と区別して、再試行や rebase の導線を明示する

## 共有

- キャラクターの public view（canonical shared surface）
- 共有リンクの生成
- SNS での OGP 表示
- public shared surface の root は character detail とする
- direct link の安定性を優先し、visibility が引き続き public である限りは public detail に数分程度の stale を許容してよい
- public から draft への visibility 変更時は stale cache を使わず、最新 visibility で再解決する
- 低速回線ではプロフィールとステータスを先に表示し、立ち絵は後から読み込む
- 低速回線でも layout shift を増やさないよう、portrait 領域には先にプレースホルダーを確保する
- プレイヤー単位の public character collection は post-MVP の secondary surface とする
