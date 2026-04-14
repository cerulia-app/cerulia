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
| rules | rule-profile | ルール表示・overlay |

## 境界原則

1. **controlled repo write only**: AppView mutation は caller が control する repo にだけ書く。character / session 系は caller の personal repo、campaign / house / scenario / ruleset 系は caller が owner または maintainer として管理する shared-maintained repo に限る
2. **visibility respect**: draft record は一覧や発見導線から隠す。direct link では draft 状態を明示して解決する
3. **no session runtime**: セッション進行の機能を AppView に持たない
4. **schema validation boundary**: AppView の validation は advisory preflight に限る。書き込み可否の唯一の正本は API の authoritative validation とする
5. **export at AppView**: CCFolia など外部形式へのエクスポートは AppView の責務
