# AppView テスト計画

## 実行コマンド

- `bun run check`
- `bun run lint`
- `bun run build`
- `bun run test`

`bun run test` は target route / component の検証を順次追加して gate に含める。

## target MVP gates

### route / surface

- `/` が public top として価値説明、共有キャラクターへの入口、サインイン導線を持つこと
- `/characters` と `/characters/new` で owner flow が成立すること
- `/characters/[branch]` が canonical shared detail として direct link で解決すること
- `/players/[did]` が public profile と public character collection を含む shared surface として direct link で解決すること
- `/profile` で owner が player profile を編集できること
- `/profile` の初回保存が self record を作り、再保存が同じ player-profile を更新すること
- `/sessions` が owner-only workbench として inline detail / edit を持つこと
- `/scenarios` が scenario catalog として browse できること
- `/scenarios/[scenario]` が scenario detail として public に解決し、owner には編集導線を出すこと
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
- schema 取得不能または破損時に create / edit が `閲覧のみ` へフォールバックし、編集導線を閉じること
- archived campaign で archive 以外の更新導線を閉じること
- submit 後の `pending` と保存結果が区別され、schema 更新必須の状態が internal label ではなく plain words で表示されること
- Bluesky 既存項目に Cerulia 上書きが無いとき、player profile で fallback 値を表示すること
- TRPG 固有項目が未入力でも player profile が成立すること
- `使用ツール`、`好みのシナリオ`、`プレイスタイル`、`地雷・苦手`、`できること・スキル` が自由記述 string 配列として round-trip すること
- public shared route が raw payload、owner-only linkage、credential-bearing URI を露出しないこと
- follow / timeline 導線を Cerulia UI に持ち込まないこと

### shared UX

- character detail の first view でプロフィール、structured stats、立ち絵が確認できること
- public history に save state、raw change payload、低レベル identifier が出ないこと
- character detail の advancement summary が date、changeKind、changeSummary、linkedSession だけを表示すること
- character detail の conversion provenance が sourceRuleset、targetRuleset、convertedAt 以外を公開しないこと
- player profile が public character collection の link-only summary を表示し、owner-only field を含まないこと
- player profile が fallback と上書きの合成結果だけを見せ、raw Bluesky payload を UI に出さないこと
- scenario detail が summary と source citation を安定表示すること
- campaign detail の rule overlay が `適用ルール` の表示語で安定表示されること

### performance rehearsal

- timing / bandwidth 依存の項目は、browser harness が入るまでは release gate ではなく rehearsal として扱う
- warm path の public character detail が 0.3 秒以内を目標に測定できること
- warm path の owner list と save 完了表示が 0.5 秒以内を目標に測定できること
- public direct link が短時間 stale でも継続して開けることを rehearsal で確認すること
- 遅延注入や低速回線シミュレーション下で、pending 表示、text-first 表示、stale direct link が崩れないことをブラウザレベルで確認すること
- 画像遅延時でも portrait プレースホルダーにより大きな layout shift が起きないことを確認すること
- 画像遅延時でも portrait プレースホルダーが 3:4 比率を維持し、代替テキストを失わないことを確認すること

### localization

- public top と character detail の UI chrome が locale 切り替えに追従すること
- system message が locale 切り替えに追従し、raw key を出さないこと
- navigation label が locale 切り替えに追従し、default locale fallback で欠落表示しないこと
- owner locale override が AppView 側 preference にだけ永続化され、shared record に保存されないこと
- locale 指定が無い場合に browser preference から妥当な locale が選ばれること
- OGP metadata は explicit locale が無い場合 default locale で安定して返ること
- translation 欠落時に default locale へ fallback し、raw key を出さないこと
- user-authored content が勝手に翻訳・改変されないこと
- 日本語と Latin script の長さ差でも mobile / desktop レイアウトが崩れないこと
