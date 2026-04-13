# UI/UX 要件

## 基本要件

- sign-in 後の first screen は `/home`
- public surface は匿名で見える
- route tree に `/sessions/*`（セッション進行画面）を置かない
- 4 surface（home、characters、scenarios、sessions記録）で product を理解できるようにする

## visibility と境界

- visibility: draft は owner にだけ見える。一覧にも出ない
- visibility: public は誰にでも見える
- 他人の draft は一切表示しない

## mutation feedback

- accepted は最新状態が反映されたことを short toast で示す
- rejected は理由を「権限不足」「必須入力不足」のどちらかに落として説明する

## レイアウト

- `/home`、`/characters`、`/scenarios` は desktop と mobile の両方で意味を保つ
- create flow は rulesetNsid 選択 → schema フィールド入力 → 確認のステップ
- character detail は stats、立ち絵、セッション履歴を 1 画面で見せる
- scenario の spoiler は折りたたんで表示し、展開前に warning を出す

## Accessibility

- WCAG 2.1 AA を目指す
- keyboard-only で home CTA、create flow、character detail に到達できること
- color contrast は AA compliance

## Local state

- 作成中のキャラクターの一時状態
- dice roll の結果
- recent branch / campaign

## 用語ルール

- 「キャラクター」はキャラクターシート + 現在の branch を指す
- 「セッション」は遊んだ記録を指す（セッション進行ではない）
- 「シナリオ」は遊んだシナリオの台帳エントリを指す
- AT Protocol の用語を UI に出さない
