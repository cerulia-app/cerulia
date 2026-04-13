# レイヤー責務と境界

## AppView が各層から読むもの

| 層 | 読む record | 用途 |
| --- | --- | --- |
| character | character-sheet, character-branch | キャラクター表示・編集 |
| advancement | character-advancement | 成長履歴 |
| session | session | セッション履歴 |
| scenario | scenario | シナリオ一覧・詳細 |
| schema | character-sheet-schema | フォーム生成 |
| scope | campaign, house | 長期卓・コミュニティ表示 |
| rules | ruleset-manifest, rule-profile | ルール表示・overlay |

## 境界原則

1. **owner write only**: AppView mutation は常に caller の repo にだけ書く。他人の record には触らない
2. **visibility respect**: draft record は owner にだけ表示する
3. **no session runtime**: セッション進行の機能を AppView に持たない
4. **schema validation at AppView**: stats の型検証は AppView が行う。core は自由形式 JSON を受け入れる
5. **export at AppView**: CCFolia など外部形式へのエクスポートは AppView の責務
