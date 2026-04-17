# AppView テスト計画

## current runtime

2026-04-14 のリセットにより、旧 mounted / final-gate 前提のテスト計画は current ではありません。

## 現在の最小検証

- `npm run check`
- `npm run lint`
- `npm run build`

現在の workspace には `npm run test` の実行口はあるが、target route / component を検証する test file はまだ揃っていない。placeholder smoke を復帰させるまでは、`npm run test` を current release gate とみなさない。

## target MVP gates

### route / surface

- `/` が public top として価値説明、共有キャラクターへの入口、サインイン導線を持つこと
- `/characters` と `/characters/new` で owner flow が成立すること
- `/characters/[branch]` が canonical shared detail として direct link で解決すること
- `/players/[did]` が public profile として direct link で解決すること
- `/profile` で owner が player profile を編集できること
- `/sessions` が owner-only workbench として inline detail / edit を持つこと
- `/scenarios` が scenario catalog として browse できること
- `/scenarios/[scenario]` が scenario detail として public に解決すること
- `/campaigns/[campaign]` が campaign detail として public に解決すること
- `/houses/[house]` が house detail として public に解決すること

### boundary

- public session 専用 route を持たないこと
- player profile route を持っても、canonical shared surface が character detail に固定されること
- draft の character / session / campaign / house は一覧や discovery から隠れること
- draft の direct link は draft state を明示して解決すること
- public から draft への visibility 変更後に stale public detail を返さないこと
- rule-profile と character-sheet-schema に visibility toggle を出さないこと
- scenario に recommendedSheetSchemaRef が無い場合、scenario 起点の create CTA を出さないこと
- archived campaign で archive 以外の更新導線を閉じること
- submit 後の `pending` と保存結果が区別され、schema 更新必須の状態が internal label ではなく plain words で表示されること
- Bluesky 既存項目に Cerulia 上書きが無いとき、player profile で fallback 値を表示すること
- TRPG 固有項目が未入力でも player profile が成立すること
- `使用ツール`、`好みのシナリオ`、`プレイスタイル`、`地雷・苦手`、`できること・スキル` が自由記述 string 配列として round-trip すること
- follow / timeline 導線を Cerulia UI に持ち込まないこと

### shared UX

- character detail の first view でプロフィール、structured stats、立ち絵が確認できること
- public history に save state、raw change payload、低レベル identifier が出ないこと
- scenario detail が summary と source citation を安定表示すること

### performance rehearsal

- timing / bandwidth 依存の項目は、browser harness が入るまでは release gate ではなく rehearsal として扱う
- warm path の public character detail が 0.3 秒以内を目標に測定できること
- warm path の owner list と save 完了表示が 0.5 秒以内を目標に測定できること
- public direct link が短時間 stale でも継続して開けることを rehearsal で確認すること
- 遅延注入や低速回線シミュレーション下で、pending 表示、text-first 表示、stale direct link が崩れないことをブラウザレベルで確認すること
- 画像遅延時でも portrait プレースホルダーにより大きな layout shift が起きないことを確認すること

### localization

- public top と character detail の UI chrome が locale 切り替えに追従すること
- locale 指定が無い場合に browser preference から妥当な locale が選ばれること
- OGP metadata は explicit locale が無い場合 default locale で安定して返ること
- translation 欠落時に default locale へ fallback し、raw key を出さないこと
- user-authored content が勝手に翻訳・改変されないこと
- 日本語と Latin script の長さ差でも mobile / desktop レイアウトが崩れないこと
