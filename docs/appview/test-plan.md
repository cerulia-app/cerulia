# AppView テスト計画

## 対象

- route navigation
- キャラクター作成フロー
- セッション記録フロー
- visibility の表示制御
- public character detail の表示

## 必須テスト群

### A. Route and Navigation

| ID | 検証点 |
|---|---|
| A-1 | sign-in 後に `/home` に到達すること |
| A-2 | anonymous で `/` が表示されること |
| A-3 | anonymous で公開キャラクターが見えること |
| A-4 | draft キャラクターが一覧に出ず、direct link では draft 状態付きで表示されること |
| A-5 | keyboard-only で主要導線に到達できること |
| A-6 | mobile layout でも `/home`、`/characters`、`/sessions` が意味を失わないこと |
| A-7 | 公開キャラクターがない場合の sample は synthetic fixture と明示されること |

### B. Character Create Flow

| ID | 検証点 |
|---|---|
| B-1 | rulesetNsid 選択 → schema 選択 → フォーム生成が動くこと |
| B-2 | extensible な schema group で追加 field が入力でき、非 extensible な位置の unknown field は reject されること |
| B-3 | ダイスロールの結果がフォームに反映されること |
| B-4 | 作成完了で sheet + branch がペアで生まれること |
| B-5 | default branch が `main` kind かつ指定した初期 visibility で生成されること |

### C. Session Record Flow

| ID | 検証点 |
|---|---|
| C-1 | session 記録が PL の repo に書かれること |
| C-2 | advancement が session にリンクされること |
| C-3 | `/sessions` から新規記録へ遷移できること |
| C-4 | session detail / edit が `/sessions` 一覧内で完結すること |
| C-5 | role=gm の session は character なしで入力・表示できること |

### D. Visibility

| ID | 検証点 |
|---|---|
| D-1 | visibility: draft が一覧から隠れ、detail では draft 状態付きで表示されること |
| D-2 | visibility: public が anonymous で表示されること |
| D-3 | visibility toggle が即時反映されること |
| D-4 | rejected / rebase-needed が別の UI feedback として表示されること |
| D-5 | reasonCode / correlationId を受け取って support に渡せること |
| D-6 | retired branch detail が read-only historical detail になり、edit CTA を出さないこと |
| D-7 | draft retired branch も direct link では draft 状態付きの historical detail として表示されること |

### E. Rules Overlay

| ID | 検証点 |
|---|---|
| E-1 | campaign / house の public surface が raw rule-profile read に依存せず、overlay summary だけを表示すること |
| E-2 | owner / maintainer 向け rule-profile read/edit 導線が public surface から分離されていること |

## Release Gate

A-1 〜 A-7、B-1 〜 B-5、C-1 〜 C-5、D-1 〜 D-7、E-1 〜 E-2 が green であること。
