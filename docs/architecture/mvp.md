# MVP の実装順

MVP は、複数システムを遊び、多くの PC を持つ PL が、キャラクターを作り、セッション経験を記録し、同じリンクで共有できる状態を先に完成させる。

## まず成立させる価値

- どのシステムでもキャラクターを作れる
- 遊んだ履歴が残る

## canonical flow

1. 他人から共有された character detail を見て価値を理解する
2. アカウントを紐づけて自分の character を作る
3. セッション後に session と character-advancement を記録する
4. 次の卓で同じ character を再び共有する

## 優先度

**キャラクター作成 > セッション記録 > 共有**

## コアと補助

| 領域 | 扱い | 役割 |
| --- | --- | --- |
| character 作成 | core | 価値の入口。最優先で end-to-end に完成させる |
| session 記録 | core | キャラクターの経歴を残す canonical record |
| share | core | character detail を卓や SNS に渡す canonical surface |
| scenario catalog | support | browse と記録補助。create を deterministic にする補助導線 |
| campaign | support | 長期卓向けの secondary scope |
| house | support | コミュニティ anchor。secondary scope |
| rule-profile | support | rules overlay の補助機能 |

## フェーズ 1: キャラクター作成

- character-sheet + character-branch のペア作成
- character-sheet-schema（CoC 7版の schema を最初のサンプルとする）
- rulesetNsid ごとの schema 選択
- recommendedSheetSchemaRef を持つ scenario だけが character-sheet-schema の direct chain で作成画面にナビゲートする
- ダイスロール（AppView クライアント側）
- CCFolia clipboard 形式でのエクスポート
- visibility: draft / public の切り替え

ここでは「キャラクターを作れる」体験を完成させる。共有前に GM が必要とするプロフィール、ステータス、立ち絵を character detail で安定して見せられる状態まで含める。

## フェーズ 2: セッション記録

- session（PL が自分で書く post-run record）
- scenario（シナリオ台帳への登録）
- character-advancement（セッション後の成長記録）
- campaign（長期卓のオプション）
- house（コミュニティ anchor のオプション）
- rule-profile（ハウスルール overlay のオプション）

ここでは「遊んだ記録を残せる」体験を完成させる。session は完走記録に限定し、恒久的な変化と外部アーカイブへのリンクを残す。HP / MP のような一時状態は primary target にしない。

## フェーズ 3: 共有と閲覧

- character home projection
- campaign view projection
- scenario catalog projection
- house activity projection
- 共有リンクの生成と表示
- public mode での閲覧

ここでは「他の人に見せる」体験を完成させる。public shared surface の root は character detail とする。standalone な public session 個別 route は置かない。プレイヤー単位の public character collection は secondary surface とし、post-MVP に回す。

## 非機能ガードレール

- **整合性と保存 UX**: canonical mutation の result は `accepted` / `rejected` / `rebase-needed` に固定する。AppView は submit 後に local な `pending` 状態を見せてよいが、accepted 前の内容を確定保存済みとして扱わない
- **共有リンクの安定性**: public character detail は数分程度の stale を許容しても direct link を安定して解決することを優先する。owner workbench は authoritative read を優先する
- **速度目標**: warm path の public character detail は 0.3 秒以内、owner list と save 完了表示は 0.5 秒以内を目標にする
- **対応環境**: PC ブラウザ、スマホブラウザ、低速回線を最初から外さない
- **低速回線最適化**: shared detail はプロフィールとステータスを先に出し、立ち絵は後から読み込めばよい
- **運用**: 初期は単純な self-host 構成を優先しつつ、client / projection の差し替えや将来移行を阻害しない
- **障害許容**: データ損失は数分以内、停止は数時間以内を目安にし、初期 observability の最低ラインは構造化ログとする

## product としてやらないこと

- session authority（開始、一時停止、権限移譲）
- membership や参加承認
- 卓中イベント（message、roll、ruling-event）
- disclosure、board、realtime、replay
- appeal、governance
- アクセス制限
- standalone な public session 個別ページ
- cross-owner の character-conversion

## post-MVP に回すもの

- same-owner の character-conversion（ruleset 跨ぎ変換 provenance）
- プレイヤー単位の public character collection

MVP で重要なのは、PL がキャラクターを作り、遊んだ記録を残し、他の人に見せられることである。
