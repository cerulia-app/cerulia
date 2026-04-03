# デザインシステム

## Brand Frame

AppView は operations console ではなく、character continuity を見通しよく扱う service surface として見える必要がある。Cerulia の青空モチーフは、軽さや爽やかさの装飾ではなく、いまの版、引き継ぎ元、次に持っていく先が読めることを示す比喩として使う。

このため、public top と signed-in surface では見せる順番を明確に分ける。

- public top は service value first とし、「何ができるか」と「どこから始めるか」を先に伝える。
- signed-in home と character studio は characters first とし、続きから作業に戻れることを先に伝える。

避けるべき方向は次の通りとする。

- 監視盤のような dark dashboard
- 無機質な CRUD 画面
- リゾート広告のような軽い sky blue
- generic な character builder SaaS に見える入力フォーム中心の面

## Design Principles

- service value first on public: public 面では、概念の説明より先に、作る、続ける、持ち運ぶ、見せるの価値を見せる。
- characters first after sign-in: sign-in 後は session status より character の現在地を先に見せる。
- plain words first: public copy では「いまの版」「引き継ぎ元」「公開中の版」を先に使い、内部語は補助説明に下げる。
- continuity stays visible: 由来、分岐、公開状態は、表の列ではなく、つながった線と card で読ませる。
- horizon gives orientation: 地平線、一本の基準線、横方向の rail を使い、現在地と行き先を視覚的にそろえる。
- depth separates lenses: public と owner-steward の差は色だけでなく、余白、情報量、説明の厚みで分ける。
- session is contextual: session、board、governance は必要時に密度を上げてもよいが、global shell の人格を奪わせない。

## Visual Motifs

青空モチーフは色だけでなく、形として次の 4 要素で固定する。

| motif | 役割 |
| --- | --- |
| horizon line | 画面の基準線。hero、current edition、publication row の足場にする |
| route rail | 引き継ぎ元、分岐先、再利用先を横方向につなぐ細い線 |
| cloud card | 情報を読む面。本文や入力面は常に card に載せる |
| sky field | 余白と奥行きを作る背景。情報そのものは載せない |

ルールは次の通りとする。

- hero の主役は広い空ではなく、空を背にした 1 つの約束と 1 つの具体例である。
- current edition や publication の list は、棚や台帳よりも、水平線に沿った並びとして扱う。
- origin や branch は、カード間をつなぐ route rail で示し、複雑な矢印図にはしない。
- 背景の sky field は service の空気を作るために使い、長文や細かな status を直接載せない。

## Core Tokens

| token | value | 用途 |
| --- | --- | --- |
| `--color-sky-top` | #E4F6FF | public top の上層背景、hero の広い余白 |
| `--color-sky-mid` | #B8E2FA | global shell の主グラデーション |
| `--color-horizon` | #5A99D6 | primary action、focus line、基準線 |
| `--color-zenith` | #1F4F8A | 見出し、強い帯、深い panel |
| `--color-cloud` | #FAFDFF | 主要 card 背景、入力面、publication 面 |
| `--color-mist` | #EAF3F8 | secondary panel、section 境界、補助面 |
| `--color-ink` | #18324A | 本文、主要 icon、line |
| `--color-sunline` | #E4A24B | current edition、公開中の版、現在地の細い accent |
| `--color-reef` | #4E7C69 | reuse、campaign continuity、補助 accent |
| `--color-signal` | #C65A48 | retire、warning、destructive action |
| `--color-night-panel` | #122F4A | session / governance の高密度 panel |

配色規則は次の通りとする。

- global shell は `--color-sky-top` から `--color-sky-mid` への縦グラデーションを基調とする。
- 情報面は `--color-cloud` または `--color-mist` の card に載せ、文字を高彩度の空色へ直置きしない。
- `--color-horizon` は action と基準線に、`--color-zenith` は見出しと深い帯に使い、青を一色に寄せない。
- `--color-sunline` は current edition や公開中の版の細い強調に限定し、装飾色として多用しない。
- session / governance は `--color-night-panel` を使ってよいが、外周の空色 shell と切り離さない。

## Typography

| role | 推奨書体 | 役割 |
| --- | --- | --- |
| display | Zen Old Mincho | hero、page title、公開面の見出し |
| body | IBM Plex Sans JP | 本文、UI label、説明文 |
| mono | IBM Plex Mono | record id、revision、technical detail |

ルールは次の通りとする。

- public top は display を使って service の人格を出すが、hero の文言は短く保つ。
- signed-in home と character studio は body を中心にし、作業面の速度を落とさない。
- 見出しは詩的すぎる表現に寄せず、意味が先に読めることを優先する。
- dense console 風の all-caps label や、過剰な small text を常態化させない。

## Layout Grammar

- public top: hero、value lane、featured editions、short continuity note、final CTA の順に積む。
- public top の各 block は 1 つの新しい概念だけを導入する。最初の 1 画面で glossary を始めない。
- hero は 1 つの約束、1 つの具体例、2 つの主要 CTA を基本とする。KPI card を敷き詰めない。
- signed-in home: desktop では 3 カラム、mobile では 1 カラム。左に continue、中央に create / publish、右に campaign / session / queue を置く。
- character studio: 上部に create / branch / convert の導線、中央に current edition、下部に origin / publication / timeline を置く。
- campaign workspace: public では共有 continuity の概要を広めに見せ、owner-steward では provenance と policy を厚くする。
- session surfaces: 文脈上少し暗くしてよいが、brand、breadcrumb、home 戻り、mode badge は維持する。

## Components

| component | 使い方 |
| --- | --- |
| Hero stage | 1 つの約束、1 つの具体例、2 つの CTA を置く |
| Value lane | 「作る」「続ける」「持ち運ぶ」「見せる」を短文 card で示す |
| Continue card | sign-in 後に、いま触るべき character continuity を返す |
| Current edition card | いまの版、公開状態、関連 campaign を 1 枚で読む |
| Origin line | import、branch、conversion、reuse を route rail でつなぐ |
| Publication row | 公開中の版を水平線に沿って並べる |
| Mode badge | public、owner-steward、participant、governance、audit を text 付きで常設する |
| Archive drawer | 過去の版、retired、review 待ちを main content から分けて収める |

## Motion

- page load は 120 から 180ms の staggered reveal を基本にし、hero の文言、具体例、CTA、card の順で読めるようにする。
- motion は「漂う」より「晴れる」に寄せ、上から下へ静かに現れる方向感を持たせる。
- current edition の切り替えは fade ではなく、short slide と accent line の移動で示す。
- origin line や publication row の展開は height animation より opacity と translate を優先する。
- mutationAck は toast だけで済ませず、対象 card 側に accepted / rejected / rebase-needed / manual-review を返す。
- governance や destructive action では演出を抑え、静かな確認体験にする。

## Copy Rules

- public top の first viewport は、一般ユーザーが理解できる言葉だけで成立させる。
- public copy では「いまの版」「引き継ぎ元」「公開中の版」を先に使い、current head、publication、reveal などの語は補助説明に下げる。
- 1 つの block で導入する新しい概念は 1 つまでに留める。
- hero copy は service value を主語にし、record type や schema を主語にしない。
- CTA は実際の遷移先をそのまま言う。「サインインしてホームで始める」のように、期待と動作をずらさない。
- default button label は「作成」「取り込む」「分岐する」「公開する」「続きを見る」を使い、「新規レコード作成」のような内部語を避ける。
- 青空モチーフを言葉にするときは、爽やかさではなく「見通す」「引き継ぐ」「広げる」「持ち運ぶ」に結びつける。
- session 系画面でも brand tone を切り替えすぎず、別製品に見える分断を作らない。

## Device and Accessibility

- mobile でも create / continue / publish の 3 導線が first viewport に収まるようにする。
- keyboard-only で hero CTA、value lane、current edition card、publication row に到達できること。
- mode badge、status、retired 状態は色だけで区別しない。
- 背景グラデーションや accent line の上に十分なコントラストを確保し、主要本文は常に card 面へ逃がす。
- screen reader では current state、過去の版、retired、redacted、pending review が明示的に読まれること。
- board を除き、tablet 幅でも console 風の dense table を既定にしない。