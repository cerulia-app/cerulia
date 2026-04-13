# MVP の実装順

MVP は PL がキャラクターを作り、セッション経験を記録し、共有できる状態を先に完成させる。

## 優先度

**キャラクター作成 > セッション記録 > 共有**

## フェーズ 1: キャラクター作成

- character-sheet + character-branch のペア作成
- character-sheet-schema（CoC 7版の schema を最初のサンプルとする）
- ruleset-manifest（rulesetNsid + sheetSchemaRefs の最小構成）
- scenario → manifest → schema の chain で作成画面にナビゲート
- ダイスロール（AppView クライアント側）
- CCFolia clipboard 形式でのエクスポート
- visibility: draft / public の切り替え

ここでは「キャラクターを作れる」体験を完成させる。

## フェーズ 2: セッション記録

- session（PL が自分で書く post-run record）
- scenario（シナリオ台帳への登録）
- character-advancement（セッション後の成長記録）
- campaign（長期卓のオプション）
- house（コミュニティ anchor のオプション）
- rule-profile（ハウスルール overlay のオプション）

ここでは「遊んだ記録を残せる」体験を完成させる。

## フェーズ 3: 共有と閲覧

- character home projection
- campaign view projection
- scenario catalog projection
- house activity projection
- 共有リンクの生成と表示
- public mode での閲覧

ここでは「他の人に見せる」体験を完成させる。

## 初期にやらないこと

- session authority（開始、一時停止、権限移譲）
- membership や参加承認
- 卓中イベント（message、roll、ruling-event）
- disclosure、board、realtime、replay
- appeal、governance
- アクセス制限
- character-conversion（ruleset 跨ぎ変換は後回し）

MVP で重要なのは、PL がキャラクターを作り、遊んだ記録を残し、他の人に見せられることである。
