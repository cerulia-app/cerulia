# トップページ

## 一文で言うと

トップページは、Cerulia の価値を「作る・記録する・共有する」で最短理解させ、キャラクター詳細共有へつながる公開入口である。

## 役割

- 初見ユーザーが 10 秒以内に「何のサービスか」を理解できるようにする
- 正準フロー（作成 -> 記録 -> 再共有）の入口を示す
- 共有の主ルートが character detail であることを明示する
- player profile は自己紹介共有面であり、character detail とは役割が違うことを示す
- サインイン導線を過不足なく置き、未実装機能を示唆しない

## トップページの5W1H

| 観点 | 現在の答え |
| --- | --- |
| Why | PL が「どこで何ができるか」を即理解し、作成・記録・共有の継続利用へ入るため |
| Who | 主対象は複数システムを遊ぶ PL。副対象は共有リンク受け手の GM / 卓相手 |
| What | 価値訴求、正準フローの説明、character detail と player profile の使い分け、サインイン導線 |
| When | 初回訪問時、共有リンク閲覧後の回遊時、久しぶりの再訪時 |
| Where | 公開ルート `/`。character detail 共有への主導線は `/characters/[branch]`、自己紹介共有導線は `/players/[did]` |
| How | 平易な文言、視覚的ヒーロー領域、最小限 CTA、モバイル/デスクトップ両立、ロケール対応文言で成立させる |

## 固定事項（この時点で凍結）

この節の項目は、MVP の公開入口実装完了までは変更しない。

### 言語運用ルール

- 説明語は日本語を優先し、読み手の理解速度を上げる
- 英語は次の2用途に限定する
- 実装参照と突合する契約語
- 既存 route、asset key、DOM ID の識別子
- 契約語を本文に出すときは、意味がぶれないよう日本語の説明文脈で使う

### 固定キーワード

- 価値訴求語: 作る、記録する、共有する
- 契約語（共有主ルート）: character detail
- 契約語（自己紹介共有面）: player profile
- 契約語（体験順序）: canonical flow
- 契約語（入口面）: public top

置換禁止ルール:
- character detail を character page や sheet page に言い換えない
- player profile を player home や account page に言い換えない
- canonical flow を順序を曖昧にする語へ置き換えない

### 固定CTAラベル

- primary: サインインして作成を始める
- secondary: 公開キャラクター詳細の例を見る
- tertiary: 公開プレイヤープロフィールの例を見る

ラベルはロケールで翻訳してよいが、意味順（作成 -> キャラクター詳細例 -> プロフィール例）は変えない。

### 固定セクションID順

DOM 順序の固定値を次とする。

1. top-hero
2. top-value-pillars
3. top-flow-preview
4. top-surface-split
5. top-primary-cta
6. top-trust-copy

top-flow-preview を top-value-pillars より上に置かない。

### 固定レイアウトグリッド

- コンテンツ最大幅: 1200px
- デスクトップ境界: 1024px 以上
- タブレット境界: 768px 以上 1023px 以下
- モバイル境界: 767px 以下
- ヒーロー領域レイアウト:
- デスクトップ: 7:5（文言:画像）
- タブレット: 1:1 の2段
- モバイル: 縦積み（文言 -> 画像）

## 情報設計

上から次の順で配置する。

1. ヒーロー領域
2. 価値ピラー（作る・記録する・共有する）
3. フロープレビュー（canonical flow）
4. サーフェス比較（character detail と player profile の使い分け）
5. 主要CTA
6. 信頼補助コピー

トップページをセッション一覧の入口や技術説明ページとしては使わない。

## 画像設計

### 画像の基本原則

- 画像は装飾ではなく、理解速度を上げる情報要素として置く
- 最初の主語は常に character detail にする
- セッション進行 UI 風の絵は置かない（Cerulia のスコープ誤認を避ける）
- 画像が読めなくても文言だけで意味が通る構成にする

### どの画像をどこに置くか

| 配置 | 画像の内容 | 役割 | 置く理由 |
| --- | --- | --- | --- |
| ヒーロー右側（デスクトップ）/ ヒーロー下（モバイル） | character detail のモック（立ち絵、名前、主要ステータス、public-safe な session summary が同時に見える） | Cerulia の主成果物を1画面で伝える | 共有主ルートは character detail であり、最初に見せるべき対象だから |
| 価値ピラー各カード | 3枚の小画像: 作成フォーム断片、セッション記録カード、共有リンク付き詳細断片 | 作る・記録する・共有するの具体像を言葉と一致させる | 抽象コピーだけだと機能の境界が曖昧になりやすいため |
| フロープレビュー背景上 | 4ステップ図（見る -> 作る -> 記録 -> 再共有） | canonical flow の順序固定 | MVP 優先度（作成 > 記録 > 共有）の意図を初見で誤読させないため |
| サーフェス比較セクション | 2面比較画像（character detail と player profile） | 共有面の使い分け説明 | profile が shared root だと誤認されるのを防ぐため |

### 固定画像アセット定義

実装時の命名を固定し、差し替え時もキーを維持する。

| asset key | 配置 | 推奨パス | 比率 | 必須alt |
| --- | --- | --- | --- | --- |
| top.hero.character-dossier | ヒーロー | appview/static/images/top/hero-character-dossier.webp | 16:10（モバイル4:5） | 公開キャラクター詳細の例。立ち絵、主要ステータス、セッション要約を表示 |
| top.pillar.create | 価値ピラー | appview/static/images/top/pillar-create.webp | 4:3 | キャラクター作成フォームの例 |
| top.pillar.record | 価値ピラー | appview/static/images/top/pillar-record.webp | 4:3 | セッション記録カードの例 |
| top.pillar.share | 価値ピラー | appview/static/images/top/pillar-share.webp | 4:3 | 共有可能なキャラクター詳細の例 |
| top.flow.canonical | フロープレビュー | appview/static/images/top/flow-canonical.webp | 21:9 | 見る、作る、記録、再共有の4ステップ |
| top.split.character-detail | サーフェス比較 | appview/static/images/top/split-character-detail.webp | 3:2 | キャラクター詳細共有面の例 |
| top.split.player-profile | サーフェス比較 | appview/static/images/top/split-player-profile.webp | 3:2 | プレイヤープロフィール共有面の例 |

画像フォーマット規定:
- 第一候補: WebP
- 代替: PNG
- 装飾目的の背景画像は導入しない

### 固定画像内容チェックリスト

- top.hero.character-dossier は identity、portrait、主要 stats を同時表示
- top.pillar.record は post-run record の文脈のみを表示
- top.flow.canonical の順序は 見る -> 作る -> 記録 -> 再共有 で固定
- top.split.player-profile に follow/timeline を含めない
- すべての画像から save state、内部 transport 語、private identifier、raw payload を排除

### 画像サイズとレスポンシブ

- ヒーロー主画像
- デスクトップ: 16:10 を基準に表示
- モバイル: 4:5 付近で再構成し、文字可読性を優先
- ピラー小画像
- 共通: 4:3
- サーフェス比較画像
- デスクトップ: 3:2 x 2枚
- モバイル: 縦積みで 4:3 x 2枚

portrait や大きい画像は遅延読込を許容するが、先に表示枠を確保し layout shift を増やさない。
実装時は width/height 属性を必須とし、CLS 対策を標準化する。

### 画像が無い場合の代替

- ヒーローはテキスト + 構造化プレースホルダーで成立させる
- ピラーはアイコン + 1行説明で最低限成立させる
- 画像読込失敗時も CTA と導線は欠落させない

## 文言ガイド

- 主文言は「どのシステムでもキャラクターを作れる」「遊んだ記録が残る」「共有できる」を軸にする
- AT Protocol、record layer、schema pin などの内部語を第一印象に出しすぎない
- 既存サービスとの優劣比較は書かない
- player profile を説明するときは自己紹介共有面であることを明示し、character detail と混同させない

## CTA 設計

- primary CTA: サインインして作成を始める
- secondary CTA: 公開キャラクター詳細の例を見る
- tertiary text link: 公開プレイヤープロフィールの例を見る

CTA は 3 つまでに抑え、未実装 route への誘導を置かない。

CTA のURL固定値:
- primary: sign-in endpoint
- secondary: public の characters/[branch] 実例
- tertiary: public の players/[did] 実例

## 非機能要件

- モバイル/デスクトップで同等の情報到達性を保つ
- public top の初期表示で文言と主要導線を先に出す
- locale 解決は public surface の規約に従う
- OGP は explicit locale が無い場合 default locale を返す

## 境界と非目標

- トップページで run control、membership、governance を示唆しない
- session-centric の live tool の印象を与えない
- feed/follow/通知 など SNS 機能を再実装する導線を置かない

## 受け入れ条件

- 初見ユーザーが Cerulia の主価値を作る・記録する・共有するで説明できる
- character detail が shared root、player profile が自己紹介共有面だと説明できる
- 画像が無くても導線と意味が成立する
- モバイルでもヒーロー直下で primary CTA が視認できる

## 関連

- [AppView Overview](overview.md)
- [サービスビジョン](service-vision.md)
- [AppView Navigation](navigation.md)
- [必要機能一覧](features.md)
- [UI/UX 要件](ui-ux-requirements.md)
