# サービスビジョン

## 訴求

Cerulia は TRPG プレイヤーのためのキャラクター管理サービスである。

- **作る**: 遊ぶルールが変わっても、同じ場所でキャラクターを作れる
- **記録する**: 遊んだセッションの履歴がキャラクターに蓄積される
- **共有する**: キャラクターリンクを卓向けに、プレイヤープロフィールリンクを自己紹介向けに使い分けられる

共有の主ルートは character detail とする。standalone な public session page は作らない。player profile は character detail と並ぶ共有面として扱うが、shared root は character detail に固定する。

## 最初に届ける相手

最初に届ける相手は、CoC 以外も含めて複数システムを遊び、多くの PC を持ち、卓ごとに別のキャラシサービスへ散らばっている PL である。

このユーザーにとっての最初の価値は次の 2 つである。

1. どのシステムでもキャラクターを作れる
2. 遊んだ履歴が残る

## なぜこの訴求を採るか

- 既存の TRPG ツールはキャラシ作成、共有、経歴記録がバラバラで相互運用できない
- 「いあきゃら」のような CoC 特化ツールはあるが全システム横断はない
- セッション経験のアーカイブを横断的に残すサービスがない

## ユーザー価値

| ユーザー | 価値 |
| --- | --- |
| PL | 遊ぶルールが変わっても同じ場所でキャラを作れる。遊んだ記録が残る。卓で使う外部ツールに持っていける |
| GM / 卓相手 | character detail で卓に必要な情報を、player profile で事前の相性確認をすぐ把握できる |
| 閲覧者 | 他人のキャラクターや遊んだ履歴を見て楽しめる |

## Player Profile 方針

- player profile の Bluesky 既存項目（displayName、description、avatar、banner、website、pronouns）は、Cerulia 側の明示上書きが無い場合は Bluesky 値を参照する
- Cerulia 固有の TRPG 項目は任意入力とし、初回連携時の入力必須項目にしない
- `主な役割` は手動指定を基本にし、十分な session 実績（目安 10 件以上）が溜まった時に、Cerulia 上の role 比率を自動適用するか提案できるようにする
- `使用ツール`、`好みのシナリオ`、`プレイスタイル`、`地雷・苦手`、`できること・スキル` は Lexicon では自由記述 string 配列として保持し、AppView は入力補助の選択肢を提供する
- SNS 的という要件は layout のことを指し、follow graph や feed は Bluesky 側に委ねる
- キャラクター作成やシナリオ通過の Bluesky 投稿は任意連携として扱う

## 採用しないサービス像

- session-centric な live play tool（CCFolia の領域）
- GM 管理ツール
- moderation / governance platform
- アクセス制限付きの会員制サービス

## Messaging Guardrails

- 「キャラクターを作る」「遊んだ記録を残す」「共有する」を軸にする
- AT Protocol を前面に出さない（開発者向けの文脈でのみ言及）
- 「分散型」は技術者向けの補足。一般ユーザーには「データが自分のもの」と伝える
- public / owner の UI copy は多言語対応可能な構造で持ち、translation が無い場合も意味の通る fallback copy を返す
- 既存サービスとの優劣比較をしない
- 公開面の第一印象は character detail に寄せ、session 一覧や技術説明を入口にしない
- 初回連携での情報入力を強制しない。空でも開始できることを優先する
- Cerulia が SNS 機能を再実装するような copy や導線を置かない
