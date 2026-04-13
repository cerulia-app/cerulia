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
# UI/UX 要件

## 基本要件

- 認可済み利用者の first screen は `/home` であり、character-first にする
- いまの版 / current edition を既定表示にする。superseded、retired、revoked は archive / tombstone 導線へ分離する
- public top、character studio、campaign workspace、publication library の 4 surface で product を理解できるようにする
- 製品 route tree に `/sessions/*` を置かない
- public campaign shell は continuity summary に留め、参加導線や admission gate を暗示しない

## lens と境界

- primary nav と page copy の組み合わせで現在の reader lens を誤認させない。少なくとも public と owner を区別する
- ボタンや panel が無効なときは、理由を permission 不足、publication 未公開、stale revision、required input 不足のどれかに落として説明する
- public surface では unpublished continuity、raw archived chain、private な provenance detail を漏らさない
- owner surface でも archive と current surface を同じ card grammar に混ぜない
- campaign shell では rule provenance と public summary を mode ごとに切り分ける

## mutation feedback

- accepted は current edition や publication row が更新されたことを短く示す
- rejected は何が満たされなかったかを visible text で説明する
- rebase-needed は差分再読込と再実行の導線を出す
- destructive action では publish、retire、revoke を同じ toggle にまとめない

## publication と archive の grammar

- publication は continuity artifact の公開として書く
- retire は公開入口の終了として書く
- archive は現在像から分離された履歴として書く
- public detail と explanatory tombstone は見出しと tone を分ける
- superseded direct link と retired direct link は無言の 404 や opaque redirect にしない

## レイアウト

- `/home`、`/characters`、`/campaigns`、`/publications/:publicationRef` は desktop と mobile の両方で意味を保つ
- create lane は new / import / branch / convert の順に card stack で見せる
- public top は hero、value lane、publication shelf、CTA の順で組み、巨大 index を first viewport に置かない
- publication detail の archive notice は通常 detail より軽い密度で表現する

## accessibility

- keyboard-only で hero CTA、create lane、current edition card、publication row に到達できること
- current edition、superseded、retired、pending change が text で判別できること
- reader lens、status、visibility は色だけに依存せず text と copy で区別できること

## local state と保存

AppView shell が local state として持ってよいのは次に限る。

- create flow の draft
- publication preview の temporary state
- filter や fold の UI 状態
- recent branch / campaign / publication

authoritative fact は backend の projection と mutationAck を正本にする。accepted 前の draft を continuity fact と誤認させてはならない。

## terminology guardrails

- 公開と後公開を同義にしない
- publication、retire、archive を同義にしない
- public campaign shell では「閲覧用の公開概要」であることを短い注記で明示する
- carrier は外向け導線であり、正本は publication ledger にあると説明する
