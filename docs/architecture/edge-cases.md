# TRPGのエッジケース

新しい方針では、まず continuity core だけで扱えるケースと、extension を入れたときだけ扱うケースを分ける。

## continuity core で扱うケース

| ケース | 主に使う record / flow | 綺麗に扱う条件 |
| --- | --- | --- |
| campaign 全体の house rule 継承 | campaign、rule-profile | world / house seed を campaign shared chain に畳み込む |
| 季節ルールや共有方針の差し替え | rule-profile | supersedesRef 付きで新しい profile を積む |
| 同じキャラの複数 campaign 分岐 | character-sheet、character-branch | 同じ base sheet から複数 branch を作る |
| ruleset をまたぐキャラ変換 | character-conversion、character-branch、ruleset-manifest、reuse-grant | 変換後の branch を durable subject にし、source / target manifest と conversion contract を pin する |
| マイルストーン成長と XP 消費 | character-advancement | 成長を append-only ledger で扱う |
| retrain、respec、誤成長の訂正 | character-advancement | correction を supersedesRef 付きの新規 entry で積む |
| run や章ごとの継続履歴の要約 | character-episode、character-advancement | growth fact は advancement に残し、episode は summary に留める |
| campaign をまたぐキャラ持ち込み | character-branch、reuse-grant、campaign | same campaign は default policy、cross-boundary reuse は explicit grant で扱う |
| 外部キャラシの持ち込みとローカル差分 | character-sheet、character-branch | imported base と local override の precedence を固定する |
| 公開入口の差し替えや失効 | publication | publish / retire を append-only に扱う |
| 長期キャンペーンの retcon | character-advancement、character-episode、publication | supersede と retire を分けて扱う |

## optional extension で扱うケース

| ケース | 主に使う record / flow | 綺麗に扱う条件 |
| --- | --- | --- |
| structured run の開始と終了 | session、session-authority | run artifact を core root にしない |
| 共同 GM と一時進行担当 | session-authority、lease | controller と lease を extension に閉じる |
| PL の途中参加と離脱 | membership | continuity core ではなく run governance として扱う |
| 秘匿 handout の後公開 | secret-envelope、reveal-event | disclosure を publication と分ける |
| 伏せ token の一部公開 | token、reveal-event | public facet と secret facet を分ける |
| 同時に token を動かす | board-op、board-snapshot | durable op と揮発同期を分ける |
| 回線切断後の復帰 | board-snapshot、board-op | snapshot と op replay を両方持つ |
| NPC の一時操作 | character-instance、membership | owner と controller を分離する |
| 誤爆 message や誤った roll | message、redaction-event | hard delete ではなく表示制御で扱う |
| 非公開 run の公開 replay 化 | session-publication、reveal-event、redaction-event | carrier と disclosure を分ける |
| controller deadlock 下の dispute | appeal-case、appeal-review-entry、session-authority | blocked case だけ recovery に上げる |

## core で特に綺麗に扱えるもの

- campaign 横断の継続線
- rules provenance の保持
- 越境 reuse と revoke
- 公開入口の append-only 管理
- 成長と訂正の監査

## extension を入れると綺麗になるもの

- on-platform の live play
- 秘匿配布と後公開
- run governance と dispute workflow
- board / realtime / replay

新方針では、後者を core 要件にしないことが重要です。