# session

## 役割

PL が自分の repo に書く、セッション経験の記録。どのシナリオを、いつ、どのキャラクターで遊んだかを残す post-run record。run control（開始、一時停止、権限移譲）は持たない。

GM も PL であり、GM としてセッションを記録する場合も同じ record を使う。「GM 専用の record」は存在しない。

## 置き場所

PL の個人 repo。

## 主なフィールド

- scenarioRef（任意: scenario record への参照。scenarioLabel と排他的）
- scenarioLabel（任意: scenario record がない場合の名前。scenarioRef と排他的）
- characterBranchRef（任意: 使用したキャラクターの branch。role=pl では必須、role=gm では省略可）
- role（pl / gm）
- campaignRef（任意: 長期卓の場合のみ）
- playedAt
- hoLabel（任意: 担当した HO のラベル）
- hoSummary（任意: HO の公開概要テキスト。ネタバレを含まない）
- outcomeSummary（任意: セッションの結果概要）
- externalArchiveUris（任意: YouTube、ブログ等の外部記録へのリンク）
- visibility（draft / public）
- note（任意: public-safe な補足メモ）
- createdAt
- updatedAt

### scenarioRef と scenarioLabel

scenarioRef は scenario record への参照。scenario record が存在しない場合は scenarioLabel で名前だけを記録する。`scenarioRef` と `scenarioLabel` はちょうど 1 つだけ持つ。

label-only session は後から updateSession で scenarioRef に置き換えてよい。同じ履歴エントリを保ったまま link を正規化する。

## 更新主体

session record の owner（PL 本人）。

## 参照関係

- scenario
- character-branch
- campaign

## 設計上の注意

- session はシナリオ完走の記録。未完走の卓は session にしない。途中経過は外部記録（externalArchiveUris や note）で補う
- 1 シナリオ完走 = 1 session。1 回の集まりで 2 本のシナリオを完走した場合は 2 つの session を書く
- session は PL が自分で書く record であり、他人の DID や characterBranchRef を含めない。他の参加者とのリンクは、各自が自分で session を書くことで projection が成立させる
- role: pl の session では characterBranchRef を必須とする。GM として参加した場合は role: gm とし、characterBranchRef は省略してよい
- campaignRef は任意。単発卓（多数派）では省略する
- visibility: draft のセッションは Cerulia AppView では一覧や public embedding から隠す。AT Protocol 上は公開されているため、owner-only の秘匿を意味しない
- hoLabel と hoSummary はネタバレを含まない公開情報だけを扱う。secret handout や disclosure payload は product-core に入れず、AppView で折りたたみ表示する
- outcomeSummary はプレイヤー向けの要約。キャラクターのロスト（死亡等）もここで記録する
- externalArchiveUris は YouTube、ブログ、配信アーカイブ等の外部記録へのリンクに使う
- note は public-safe な補足だけに使う。private scratch や非公開メモは product-core に入れない
