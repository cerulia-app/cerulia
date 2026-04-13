# AppView テスト計画

## 対象

- route navigation
- キャラクター作成フロー
- セッション記録フロー
- visibility の表示制御
- public profile の表示

## 必須テスト群

### A. Route and Navigation

| ID | 検証点 |
|---|---|
| A-1 | sign-in 後に `/home` に到達すること |
| A-2 | anonymous で `/` が表示されること |
| A-3 | anonymous で公開キャラクターが見えること |
| A-4 | draft キャラクターが anonymous で見えないこと |

### B. Character Create Flow

| ID | 検証点 |
|---|---|
| B-1 | rulesetNsid 選択 → schema 取得 → フォーム生成が動くこと |
| B-2 | ダイスロールの結果がフォームに反映されること |
| B-3 | 作成完了で sheet + branch がペアで生まれること |

### C. Session Record Flow

| ID | 検証点 |
|---|---|
| C-1 | session 記録が PL の repo に書かれること |
| C-2 | advancement が session にリンクされること |

### D. Visibility

| ID | 検証点 |
|---|---|
| D-1 | visibility: draft が owner にだけ表示されること |
| D-2 | visibility: public が anonymous で表示されること |
| D-3 | visibility toggle が即時反映されること |

## Release Gate

A-1 〜 A-4、B-1 〜 B-3、C-1 〜 C-2、D-1 〜 D-3 が green であること。
