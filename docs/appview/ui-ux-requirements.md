# UI/UX 要件

## current runtime

2026-04-14 のリセット時点で、現行 AppView は最小 skeleton です。
旧 `/home`、`/characters`、`/sessions` などを前提にした UI/UX 要件は current ではありません。

## 現在の最小要件

- `/` で reset 状態が明確に伝わること
- desktop と mobile の両方でレイアウトが破綻しないこと
- 最新の方針文書へ進むための参照先が分かること
- 再実装前の段階で、存在しない機能を UI が示唆しないこと

## target MVP interaction model

### public entry

- `/` は「どのシステムでもキャラクターを作れる」「遊んだ記録が残る」「共有できる」を plain words で伝える
- public entry で AT Protocol や内部語を前面に出しすぎない
- canonical shared surface は character detail とし、session 一覧や技術説明を public entry の主役にしない

### character detail

- first view でプロフィール、structured stats、立ち絵を優先表示する
- public-safe な session 履歴と advancement は character detail の中に埋め込んで見せる
- public session 専用 route は作らない
- draft の direct link は解決し、draft state を明確に表示する

### create / edit / record

- 通常の create は schema-backed を前提にし、scenario 起点の create CTA は recommendedSheetSchemaRef がある場合だけ出す
- submit 後は `pending` / `accepted` / `rejected` / `rebase-needed` を視覚的に区別する
- `pending` は AppView の local state であり、accepted と同じ見え方にしない
- `/sessions` は owner-only workbench とし、一覧、inline detail、再編集で閉じる
- session は完走後の記録として扱い、進行中の卓や未完走の状態を管理しない

### spoiler / draft / trust

- scenario detail は summary を既定表示にし、spoiler は warning 付きの折りたたみで開く
- 見せたくないものの第一対象は編集中の character であり、draft を一覧や発見導線に混ぜない
- public campaign や public house でも draft な参照先 identity を不用意に露出しない

### responsiveness and bandwidth

- desktop と mobile の両方で継続利用に耐えること
- 低速回線ではテキストと structured stats を先に返し、portrait や大きい asset は後から読み込む
- portrait や大きい asset の遅延読込でも layout shift が大きくならないよう、表示枠やプレースホルダーを先に確保する
- warm path の public character detail は 0.3 秒以内、owner list と save 完了表示は 0.5 秒以内を目標にする

### public link stability

- public direct link は、visibility が変わっていない限り、多少 stale でも安定して開けることを優先する
- public から draft への visibility 変更時は、最新 visibility を引き直して stale public 表示を残さない
- owner workbench と save 後の確認導線は authoritative な最新状態を優先する
