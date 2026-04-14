# UI/UX 要件

## 基本要件

- sign-in 後の first screen は `/home`
- public surface は匿名で見える
- route tree に session runtime 用の route を置かない
- 4 surface（home、characters、scenarios、sessions記録）で product を理解できるようにする

## visibility と境界

- visibility: draft は一覧や発見導線からは隠す。direct link では draft 状態を明示して表示する
- visibility: public は誰にでも見える
- 他人の draft も direct link では表示しうるが、公開一覧には出さない

## mutation feedback

- accepted は最新状態が反映されたことを short toast で示す
- rejected は理由を「権限不足」「必須入力不足」「整合しない入力」のどれかに落として説明する
- rebase-needed は「更新前提が古い」または「schema pin 更新に追加操作が必要」として別扱いにする

mutationAck は UI 表示とは別に stable な `reasonCode` と `correlationId` を持ち、support と log correlation に使えるようにする。
support 詳細では `reasonCode` と `correlationId` をそのまま表示する。

## レイアウト

- `/home`、`/characters`、`/scenarios` は desktop と mobile の両方で意味を保つ
- `/sessions` は shell-level の first-class surface とする
- create flow は rulesetNsid 選択 → schema 選択 → schema フィールド入力 + ダイスロール → 確認 → 作成のステップ
- character detail は stats、立ち絵、セッション履歴、conversion provenance を 1 画面で見せる
- scenario の spoiler は折りたたんで表示し、展開前に warning を出す
- spoiler warning は常に出す。signed-in viewer が自分の session に同じ scenarioRef を持つ場合だけ copy を「通過済み向け」に変えてよい
- spoiler handling は presentation-only であり、record 自体の読取可否を変えない
- session detail / edit は MVP では `/sessions` 一覧内で完結させ、専用 route を持たない

- schema-less sheet は owner-only の raw JSON fallback flow を持つ。legacy/import/recovery 用であり、通常の新規作成導線では使わない
- extensible な schema group では追加 field を入力できる

## Accessibility

- WCAG 2.1 AA を目指す
- keyboard-only で home CTA、create flow、character detail に到達できること
- color contrast は AA compliance

## Local state

- 作成中のキャラクターの一時状態
- dice roll の結果
- recently opened branch / campaign IDs（client-only state。record truth ではない）

## 用語ルール

- 「キャラクター」はキャラクターシート + 現在の branch を指す
- 「セッション」は遊んだ記録を指す（セッション進行ではない）
- 「シナリオ」は遊んだシナリオの台帳エントリを指す
- AT Protocol の用語を UI に出さない
