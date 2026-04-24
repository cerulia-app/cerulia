# Design System

このファイルは AppView の target MVP に向けた visual / interaction design system を定義する。


## 状態

- target MVP では character detail を shared surface の主役として設計する
- target MVP では player profile も共有面として提供する
- [DESIGN.md](../../DESIGN.md) は exploratory な aesthetic proposal とし、product-specific な判断はこの文書と関連文書で固定する

## Creative North Star

Cerulia の共有画面は、SNS の feed ではなく public character dossier として設計する。
狙うのは「見慣れたプロフィールの読みやすさ」と「TRPG キャラクターシートの信頼感」の両立である。

各画面は、できるだけ早く次の 3 つに答えるべきである。

1. このキャラクターは誰か
2. いま何を見せるべき状態か
3. どんな履歴をたどってきたか

SNS っぽさを借りてよいのは、第一印象の把握しやすさまでである。
feed、social graph、会話の連鎖、常時更新の気配を持ち込まない。

## Product Mindset

### 1. shared root は character detail である

Cerulia の canonical shared surface は character detail である。player profile は同格に近い共有面として提供するが、shared root は移さない。
player profile を使う時も、画面が「卓で使うキャラクター情報」と「プレイヤー自己紹介」を混同しないことを優先する。

### 2. first view で 3 点を同時に伝える

初見で優先するのは、プロフィール、structured stats、立ち絵である。
どれか 1 つだけが強すぎる構成は避ける。

### 3. history は feed ではなく dossier の節である

session 履歴と advancement は重要だが、主役は character そのものである。
履歴は時系列の騒がしい feed ではなく、人物の来歴として整理して見せる。

### 4. owner workbench と public read を混ぜない

owner にだけ必要な編集、保存状態、再試行導線は残すが、public read の視線を壊さない位置に分離する。

### 5. exact pin は backstage に置く

schema の exact pin や互換性管理は canonical contract として残してよいが、通常利用の主語にしない。
ユーザーには schema title、ruleset、入力可能な field を前面に出し、pin や migration は必要時だけ recovery として見せる。

### 5. 画像がなくても成立させる

portrait は強い価値だが、テキストと structured stats だけでも「そのキャラを共有された」と感じられることを正とする。

## Candidate Comparison

実装で迷ったときは、まず次の 4 案を比較基準として思い出す。

| 案 | 強み | 主な問題 | 判定 |
| --- | --- | --- | --- |
| SNS プロフィール直系 | 見慣れていて把握が速い | feed 化しやすく、SNS 機能を再実装しやすい | 不採用 |
| シート優先 | ルール文脈と play-ready 性が強い | 共有リンクの第一印象が硬くなりやすい | 部分採用 |
| ギャラリー優先 | 立ち絵の魅力を強く出せる | 低速回線、schema-less、stats first と相性が悪い | 不採用 |
| プロフィール主導ドシエ | identity、portrait、stats を同時提示しやすい | section 設計を誤ると擬似タブ UI になる | 推奨 |

Cerulia の target MVP では、プロフィール主導ドシエ案を採用する。
これは「プロフィールの分かりやすさを借りるが、character detail の意味を崩さない」ための折衷ではなく、Cerulia に最も自然な shared surface として選ぶ。

## Recommended Layout Model

### Hero

最上部の hero で次を 1 画面内に収める。

- portrait
- character name / branch name
- ruleset と公開状態
- short profile text
- play-ready な主要 stats

hero は banner + avatar + bio だけで終わらせない。
「見た目は profile、情報密度はシート冒頭」という設計にする。

### Section Stack

hero の下は、原則として次の順で縦に積む。

1. 人物像
2. シート詳細
3. 遊んだ記録
4. 成長

必要なら in-page anchor を置いてよいが、section ごとに route や別 page のような心理モデルを作らない。

### History Presentation

session 履歴と advancement は別の意味を持つ。

- session は public-safe な play record の要約
- advancement は owner が確定した恒久変化
- public に埋め込む session は accepted かつ public の record だけに限る

両者を 1 本の SNS 風 timeline に雑に混ぜない。

## Visual Direction

### Tone

- light base。白を canvas として、blue primary と gray neutral でコントラストを作る
- Bluesky ライクなクリーンさ × モバイルファースト
- UI 自体は静かに保ち、portrait と text が主役になる余白を確保する

### Color Use

- base は白 (`#FFFFFF`) および Gray 100 (`#F3F4F6`)
- primary action は Blue 600 (`#2563EB`)
- section 区切りは Gray 100 の背景変化か 1px の Gray 200 divider で作る
- semantic color は状態の明示にのみ使う（Success / Warning / Error / Info）
- draft、schema 更新必須、rejected は CTA と別の意味として色を分離する

### Typography

- フォントは **Noto Sans JP** 一本で統一する（日本語・Latin 両対応）
- display serif は使わない。見出しも Noto Sans JP の weight 変化で役割差を出す

| スタイル | サイズ / 行高 | Weight | 用途 |
|---|---|---|---|
| Display | 28 / 36 | 700 | LP ヒーロー見出し |
| H1 | 22 / 28 | 700 | ページタイトル |
| H2 | 18 / 24 | 700 | セクション見出し |
| H3 | 16 / 22 | 600 | カード見出し |
| Body | 14 / 20 | 400 | 本文 |
| Body Small | 12 / 16 | 400 | 補足テキスト |
| Caption | 11 / 14 | 400 | キャプション・注釈 |

### Composition

- mobile first。デスクトップは同じ意味順を 2 カラムに展開する
- キャラクター詳細: モバイルは縦積み 1 カラム、デスクトップは左: キャラ情報 / 右: セッション履歴の 2 カラム
- hero は portrait + name + meta + short text の密なまとまりとして上部に配置する
- card を並べるより、大きな section 面を積み重ねる

### Motion

- hover や reveal は section の読書体験を支える程度に留める
- feed 的な頻繁な micro-interaction や attention grabbing motion は避ける

## Color Palette

### Primary

| トークン | 値 | 用途 |
|---|---|---|
| Blue 600 | `#2563EB` | primary action（ボタン、リンク、アクティブ状態） |
| Blue 500 | `#60A5FA` | hover / secondary emphasis |
| Blue 400 | `#93C5FD` | disabled state / subtle accent |
| Blue 300 | `#BFDBFE` | background tint |
| Blue 200 | `#BFDBFE` | 最淡 tint |

### Neutral

| トークン | 値 | 用途 |
|---|---|---|
| Gray 900 | `#111827` | 主テキスト |
| Gray 700 | `#374151` | 副テキスト |
| Gray 500 | `#6B7280` | placeholder / caption |
| Gray 300 | `#D1D5DB` | border / divider |
| Gray 100 | `#F3F4F6` | section 背景 |
| White | `#FFFFFF` | page canvas |

### Semantic

| トークン | 値 | 用途 |
|---|---|---|
| Success | `#10B981` | 完了・有効 |
| Warning | `#F59E0B` | 注意・下書き |
| Error | `#EF4444` | エラー・ロスト |
| Info | `#3B82F6` | 情報・進行中 |

## Spacing

8px 基準のスケールを使う。

| 値 | px |
|---|---|
| 0 | 0 |
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 6 | 24 |
| 8 | 32 |
| 10 | 40 |
| 12 | 48 |
| 16 | 64 |

## Radius

| 値 | px | 用途例 |
|---|---|---|
| sm | 4 | input、tag |
| md | 8 | card |
| lg | 12 | modal |
| xl | 16 | large card |
| 2xl | 24 | button（pill 寄り） |

## Elevation

背景色の重ね合わせで深度を表現する。影は原則使わない。

| レベル | 用途 |
|---|---|
| 0 | page canvas（White） |
| 1 | card / section 背景（Gray 100） |
| 2 | nested card / highlight（White on Gray 100） |
| 3 | modal / dropdown（White + shadow） |

## Components

### Button

| バリアント | 見た目 | 用途 |
|---|---|---|
| Primary | Blue 600 背景 / White テキスト | 主要アクション |
| Secondary | White 背景 / Gray 300 border / Gray 900 テキスト | 副次アクション |
| Tertiary | 背景なし / Blue 600 テキスト | 低優先アクション |
| Disabled | Gray 300 背景 / Gray 500 テキスト | 非活性 |

### Avatar

| サイズ | px | 用途 |
|---|---|---|
| XS | 24 | inline 表示 |
| S | 32 | list item |
| M | 40 | card |
| L | 64 | hero |
| XL | 96 | プロフィールヘッダー |

### Badge

play 状態やキャラクター種別を示す小ラベル。

| バッジ | 意味 |
|---|---|
| PL | プレイヤーキャラクター |
| GM | GM キャラクター |
| 完了 | セッション完了 |
| 進行中 | セッション進行中 |
| ロスト | キャラクターロスト |
| 下書き | 非公開・編集中 |

Neutral バッジ（メタ情報）: 20代前半、探索者、公開、非公開 など

### Tag / Chip

ルールシステムや属性を示す。クリック不可の情報ラベルとして使う。

例: CoC、第6版、現代日本、クローズド

### Blur（ネタバレ保護）

セッションノートや HO など、未プレイ者への配慮が必要なコンテンツに適用する。

- **未解除**: テキストをぼかして「タップして表示」を重ねる
- **解除後**: ぼかし解除、「閉じる」ボタンを表示
- public 表示でのみ有効。owner view では常に解除済みとして扱う

### Tabs / Segmented Control

- Tabs: キャラクター詳細の「ステータス」「セッション」切り替えに使う
- Segmented Control: 同等の選択肢を並べる小さいセレクター（例: ステータス / セッション）

### Input

| 種別 | 用途 |
|---|---|
| Text | 単行テキスト入力 |
| Select | ドロップダウン選択 |
| Textarea | 複数行テキスト |

### Iconography

24 種以上のアイコンを定義する。カテゴリー別の主なものを示す。

- ナビ: ホーム、検索、通知、メニュー、共有、編集
- 操作: 戻る、カレンダー、人物、リンク、外部リンク、コピー
- システム: システム、セッション、プレイヤー、キャンペーン、ハウス、シナリオ
- 状態: 展開、折りたたみ、ロック、公開、下書き、その他

## Shared Surface Rules

1. shared root としての public direct link の意味は character detail に固定する（player profile の direct link 提供とは矛盾しない）
2. first view で profile、portrait、主要 stats を同時に読む
3. public-safe な session と advancement は detail の内部で完結させる
4. draft は隠さず明示するが、発見導線には混ぜない
5. text と stats を先に読み込める構成を守る
6. 他人の DID や参加関係を public の見せ場にしない
7. owner action は補助 UI として載せ、read order を壊さない
8. player profile を提供しても、shared root を character detail から動かさない

## Decision Framework

実装中に迷ったら、いきなりコンポーネントを増やさず次の順で決める。

1. 今回の論点が identity、sheet、history のどこに属するかを切り分ける
2. 強調順だけを変えた 3 案以上を 5 分で並べる
3. 次の invariant を満たさない案を先に捨てる

- character detail 1 画面で共有が完結する
- first view に profile、portrait、stats が入る
- public session route を欲しがらない
- player profile があっても follow graph を欲しがらない
- 他人の graph を見せたくならない
- 画像なしでも成立する

4. 残った案のうち、最も plain words で説明しやすいものを採る

## Related Documents

- [共有画面ワイヤーフレーム](character-detail-wireframes.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [遷移構造](navigation.md)
- [サービスビジョン](service-vision.md)
