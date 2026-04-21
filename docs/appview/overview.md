# AppView Overview

Cerulia AppView は、PL がキャラクターを作り、遊んだ記録を残し、共有するための UI である。

## 一文で言うと

AppView は、schema-backed な character authoring、post-run session record、canonical な shared character detail と player profile を、PL-first の境界でまとめる locale-aware な surface である。

## AppView が成立したと言える状態

MVP で最初に成立したと言えるのは、PL がキャラクターを作り、卓のあとに session を継続して記録し、次の卓で同じ character detail を再共有できる状態に加え、必要なら player profile で自己紹介を共有できる状態である。

## 5W1H

| 観点 | 現在の答え |
| --- | --- |
| Why | PL がキャラクター作成、セッション記録、共有を 1 つの UI で継続できるようにするため。MVP の成立条件は、遊んだ後に session record が自然に残り続けること |
| Who | 最優先は、自分のキャラクターを作り育てる PL。次点で、共有リンクを確認する GM / 卓相手。必要に応じて scenario や system 情報を owner として登録する PL も含む。細かなアクセス制御、承認、監査を強く求める運用者は最適化の主対象にしない |
| What | public top、character create、character detail、player profile、session record、sessions workbench を中心に、PL の owner flow と shared read flow を提供する。scenario / campaign / house は scope 内だが主役ではない。shared root は character detail に固定し、player profile は同格に近い共有面として扱う |
| When | 卓の前に共有リンクを確認するとき、卓の最中に read-only で参照するとき、卓の後に session と advancement を記録するとき、SNS や DM のリンクから流入するとき、自宅 PC で腰を据えて編集するとき |
| Where | public surface は `/`、character detail、player profile を中心にログイン不要で開ける。owner flow は sign-in 後の workbench で扱う。shared entrypoint は character detail に残す |
| How | schema-backed create、post-run session record、owner/public separation、controlled repo write only、text-first on slow links、authoritative owner read と stable public direct link、locale-aware な UI chrome と system copy により成立させる |

## AppView がやること

- public top で Cerulia の価値を plain words で説明する
- schema-backed を正本として character を作成・編集する
- exact schema pin は内部の整合契約として保持しつつ、通常利用の UI には前面表示しない
- owner-only workbench で session を post-run record として残す
- character detail を canonical shared surface として表示する
- player profile を共有面として表示する
- player profile の Bluesky 既存項目は fallback 参照し、Cerulia 上書きがある項目だけを優先表示する
- public-safe な session history と advancement を character detail に埋め込む
- scenario、campaign、house を Cerulia の境界の中で読む / 管理する
- locale-aware な UI copy、system message、OGP metadata を返す

## AppView がやらないこと

- 卓中の run control、判定進行、会話、board / replay
- GM 専用モードや GM 管理ツール化
- 細かなアクセス制御や承認フロー
- 厳密なルール監査や自動裁定
- moderation / governance platform 化
- audit log を主役にした責任追跡 UI
- public session 専用 route を shared surface の中心に置くこと
- player profile を canonical shared surface にすること
- Cerulia 内に follow graph や feed を実装すること

## Secondary Later

次は scope 内だが、MVP の canonical flow を固定した後に扱う。

- public profile から公開 character collection への導線強化

これらを追加しても、character detail の direct link を shared root から外さない。

## Hard Non-Functional Boundaries

### 1. Trust and Visibility

- draft は discovery や一覧に混ぜない
- draft の direct link は状態を明示して解決する
- public では accepted になるまで保存済みとして見せない
- transport の内部語は保存結果のまま露出せず、plain words の recovery copy に置き換える
- public から draft に戻した record に stale public detail を残さない
- public record に public-safe でない内容を入れない

### 2. Freshness and Stability

- 作成 / 編集直後に owner が戻る画面は authoritative read を優先する
- public direct link は、visibility が変わっていない限り、数分程度 stale でも安定して開けることを優先する
- public link が開けない状態は trust を壊す失敗として扱う

### 3. Performance and Bandwidth

- warm path の public character detail は 0.3 秒以内を目標にする
- owner list と save 完了表示は 0.5 秒以内を目標にする
- 低速回線では text と structured stats を先に返す
- portrait や大きい asset は遅延読込しても layout shift を増やさない
- 画像がなくても shared surface が成立する

### 4. Localization and Language

- AppView は多言語対応を前提に設計し、UI copy、system message、navigation label、OGP metadata を locale-aware にする
- public surface は locale 指定があればそれを優先し、無ければ browser preference、最後に default locale へ fallback する
- OGP metadata は crawler ごとの揺れを避けるため、explicit locale が無ければ default locale を使う
- owner surface は AppView 側の user setting または local preference で locale を上書きできるように設計し、shared record には保存しない
- user-authored content は自動翻訳を前提にしない。原文のまま扱い、UI chrome だけを翻訳する
- 翻訳欠落時も raw key や broken state を出さず、default locale に fallback する
- 日本語と Latin script の両方で layout が破綻しないことを前提に spacing と line length を決める

### 5. Messaging

- public surface では内部語より plain words を優先する
- `AT Protocol` や record layer の用語を first impression に出しすぎない
- player profile を追加しても、「卓で使うキャラクター情報」と「プレイヤー自己紹介」を混同させない

## Related Documents

- [サービスビジョン](service-vision.md)
- [必要機能一覧](features.md)
- [レイヤー責務と境界](layer-boundaries.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [デザインシステム](design-system.md)
- [AppView テスト計画](test-plan.md)