# 必要機能一覧

このファイルは AppView の target MVP feature spec を定義する。

## キャラクター作成

- ルールシステム選択（rulesetNsid）
- schema 一覧取得と明示選択
- AppView は schema title と ruleset 文脈で選ばせ、sheetSchemaRef や exact version pin を primary UI に出さない

scenario に recommendedSheetSchemaRef がある場合だけ `scenario -> character-sheet-schema` を canonical chain とする。無い場合、その scenario は browse-only とし、scenario 起点の create CTA は出さない。
- フィールド入力（schema の fieldDefs に基づく動的フォーム）
- extensible な schema group への追加 field 入力
- ダイスロール（クライアント側）
- 立ち絵設定（portraitRef）
- CCFolia clipboard 形式でのエクスポート
- visibility: draft / public の切り替え
- submit 後の保存状態表示。canonical result は `accepted` / `rejected` / `rebase-needed` に対応するが、UI copy は plain words で出す

## キャラクター管理

- キャラクター一覧（branch 単位）
- キャラクター詳細表示（stats、立ち絵、プロフィール、公開セッション履歴）。conversion provenance は post-MVP の optional 表示として扱う。schema-less の場合は structured stats を公開しない
- character detail の first view でプロフィール、structured stats、立ち絵を優先表示する
- キャラクター編集
- schema 更新時の recovery 導線。advanced owner maintenance として扱い、通常の編集主導線には置かない
- branch 作成（main から local / campaign 分岐）
- branch の retire

## プレイヤープロフィール

- player profile 表示（public + owner）
- player profile 編集（owner）
- Bluesky 既存項目の fallback 参照（displayName、description、avatar、banner、website、pronouns）
- Cerulia 上書き値がある項目は Bluesky 値より優先
- TRPG 固有項目はすべて任意入力とする
- 主な役割（PL --- 両方 --- GM の割合）
- プレイ形式（`text` / `semi-text` / `voice` / `offline` の closed multi-select。自由入力は受け付けない）
- 使用ツール（複数選択 + その他）
- 所持ルールブック・サプリメント（自由記述）
- プレイ可能時間帯（自由記述）
- 好みのシナリオ（複数選択 + その他）
- プレイスタイル（複数選択 + その他）
- 地雷・苦手（複数選択 + その他）
- できること・スキル（複数選択 + その他）
- `使用ツール`、`好みのシナリオ`、`プレイスタイル`、`地雷・苦手`、`できること・スキル` は Lexicon では自由記述 string 配列として保存し、AppView の選択肢は入力補助として扱う
- session 実績が 10 件以上たまった時に、record role 比率から `主な役割` を自動適用するか確認できる

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
- submit 後の保存状態表示。transport の内部語をそのまま主表示にしない

## シナリオ

- シナリオの検索・一覧（rulesetNsid でフィルタ）
- シナリオの登録
- シナリオ詳細（summary + source citation）
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
- rejected と schema 更新必須の状態は pending と区別して、再試行や recovery の導線を明示する

## 共有

- キャラクターの public view（canonical shared surface）
- プレイヤーの public profile view（shared surface）
- 共有リンクの生成
- SNS での OGP 表示
- public shared surface の root は character detail とする
- public に埋め込む session history の項目は scenario、date、record role、result、external archive link のような public-safe summary に限る
- save state、private identifier、raw change payload、non-summary field は public history に含めない
- player profile を追加しても canonical shared root は character detail のままにする
- player profile は character detail と同格に近い共有面として扱う
- follow / timeline / 通知のような SNS 機能は Cerulia で実装しない
- キャラクター作成やシナリオ通過の Bluesky 投稿は任意機能として扱う
- direct link の安定性を優先し、visibility が引き続き public である限りは public detail に数分程度の stale を許容してよい
- public から draft への visibility 変更時は stale cache を使わず、最新 visibility で再解決する
- 低速回線ではプロフィールとステータスを先に表示し、立ち絵は後から読み込む
- 低速回線でも layout shift を増やさないよう、portrait 領域には先にプレースホルダーを確保する

## 多言語対応

- UI copy、system message、navigation label、OGP metadata を locale-aware に管理する
- public surface は locale 指定、browser preference、default locale の順で解決する
- OGP metadata は explicit locale が無い場合 default locale で安定して返す
- owner surface は AppView 側の user setting または local preference による locale 上書きを許容する前提で設計し、shared record には保存しない
- user-authored content の自動翻訳は primary target にしない
- 翻訳欠落時は default locale に fallback し、raw key や空表示を出さない
- 日本語と Latin script の両方でレイアウトが破綻しないことを前提にする
