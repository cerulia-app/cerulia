# Design System

このファイルは AppView の target MVP に向けた visual / interaction design system を定義する。


## 状態

- target MVP では character detail を shared surface の主役として設計する
- target MVP では player profile も共有面として提供する
- [DESIGN.md](../../DESIGN.md) は exploratory な aesthetic proposal とし、product-specific な判断はこの文書と関連文書で固定する

## Creative North Star

Cerulia の共有画面は、SNS の feed ではなく public character dossier として設計する。
狙うのは「見慣れたプロフィールの読みやすさ」と「TRPG キャラクターシートの信頼感」の両立である。

各画面は、できるだけ早く次の 3 つに答えるべきである。

1. このキャラクターは誰か
2. いま何を見せるべき状態か
3. どんな履歴をたどってきたか

SNS っぽさを借りてよいのは、第一印象の把握しやすさまでである。
feed、social graph、会話の連鎖、常時更新の気配を持ち込まない。

## Product Mindset

### 1. shared root は character detail である

Cerulia の canonical shared surface は character detail である。player profile は同格に近い共有面として提供するが、shared root は移さない。
player profile を使う時も、画面が「卓で使うキャラクター情報」と「プレイヤー自己紹介」を混同しないことを優先する。

### 2. first view で 3 点を同時に伝える

初見で優先するのは、プロフィール、structured stats、立ち絵である。
どれか 1 つだけが強すぎる構成は避ける。

### 3. history は feed ではなく dossier の節である

session 履歴と advancement は重要だが、主役は character そのものである。
履歴は時系列の騒がしい feed ではなく、人物の来歴として整理して見せる。

### 4. owner workbench と public read を混ぜない

owner にだけ必要な編集、保存状態、再試行導線は残すが、public read の視線を壊さない位置に分離する。

### 5. exact pin は backstage に置く

schema の exact pin や互換性管理は canonical contract として残してよいが、通常利用の主語にしない。
ユーザーには schema title、ruleset、入力可能な field を前面に出し、pin や migration は必要時だけ recovery として見せる。

### 5. 画像がなくても成立させる

portrait は強い価値だが、テキストと structured stats だけでも「そのキャラを共有された」と感じられることを正とする。

## Candidate Comparison

実装で迷ったときは、まず次の 4 案を比較基準として思い出す。

| 案 | 強み | 主な問題 | 判定 |
| --- | --- | --- | --- |
| SNS プロフィール直系 | 見慣れていて把握が速い | feed 化しやすく、SNS 機能を再実装しやすい | 不採用 |
| シート優先 | ルール文脈と play-ready 性が強い | 共有リンクの第一印象が硬くなりやすい | 部分採用 |
| ギャラリー優先 | 立ち絵の魅力を強く出せる | 低速回線、schema-less、stats first と相性が悪い | 不採用 |
| プロフィール主導ドシエ | identity、portrait、stats を同時提示しやすい | section 設計を誤ると擬似タブ UI になる | 推奨 |

Cerulia の target MVP では、プロフィール主導ドシエ案を採用する。
これは「プロフィールの分かりやすさを借りるが、character detail の意味を崩さない」ための折衷ではなく、Cerulia に最も自然な shared surface として選ぶ。

## Recommended Layout Model

### Hero

最上部の hero で次を 1 画面内に収める。

- portrait
- character name / branch name
- ruleset と公開状態
- short profile text
- play-ready な主要 stats

hero は banner + avatar + bio だけで終わらせない。
「見た目は profile、情報密度はシート冒頭」という設計にする。

### Section Stack

hero の下は、原則として次の順で縦に積む。

1. 人物像
2. シート詳細
3. 遊んだ記録
4. 成長

必要なら in-page anchor を置いてよいが、section ごとに route や別 page のような心理モデルを作らない。

### History Presentation

session 履歴と advancement は別の意味を持つ。

- session は public-safe な play record の要約
- advancement は owner が確定した恒久変化
- public に埋め込む session は accepted かつ public の record だけに限る

両者を 1 本の SNS 風 timeline に雑に混ぜない。

## Visual Direction

### Tone

- quiet archive
- deep midnight を基調にした tonal layering
- 境界は線よりも面の濃淡で出す
- UI 自体は静かに保ち、portrait と text が主役になる余白を確保する

### Color Use

- base は暗い neutral を使い、彩度の高い色は primary action と状態の強調に限定する
- section 区切りは 1px divider ではなく tonal shift で作る
- draft、schema 更新必須、rejected は CTA と別の意味として色を分離する

### Typography

- 見出しは character の顔として少し文学性のある display serif を使う
- 本文と UI label は可読性の高い sans を使う
- startup 的な均質さを避け、display と body の役割差を明確にする
- 日本語対応を前提に、display は Shippori Mincho または Zen Old Mincho 系、body は IBM Plex Sans JP 系を第一候補として検討する
- 多言語化を前提に、日本語と Latin script をまたいでも tone と可読性が崩れにくい組み合わせを選ぶ

### Composition

- hero は左右対称にしすぎず、portrait と text block の重心を少しずらす
- card を並べるより、大きな section 面を積み重ねる
- desktop は 1 カラム基調 + 補助カラム、mobile は同じ意味順で縦積みする

### Motion

- hover や reveal は section の読書体験を支える程度に留める
- feed 的な頻繁な micro-interaction や attention grabbing motion は避ける

## Shared Surface Rules

1. shared root としての public direct link の意味は character detail に固定する（player profile の direct link 提供とは矛盾しない）
2. first view で profile、portrait、主要 stats を同時に読む
3. public-safe な session と advancement は detail の内部で完結させる
4. draft は隠さず明示するが、発見導線には混ぜない
5. text と stats を先に読み込める構成を守る
6. 他人の DID や参加関係を public の見せ場にしない
7. owner action は補助 UI として載せ、read order を壊さない
8. player profile を提供しても、shared root を character detail から動かさない

## Decision Framework

実装中に迷ったら、いきなりコンポーネントを増やさず次の順で決める。

1. 今回の論点が identity、sheet、history のどこに属するかを切り分ける
2. 強調順だけを変えた 3 案以上を 5 分で並べる
3. 次の invariant を満たさない案を先に捨てる

- character detail 1 画面で共有が完結する
- first view に profile、portrait、stats が入る
- public session route を欲しがらない
- player profile があっても follow graph を欲しがらない
- 他人の graph を見せたくならない
- 画像なしでも成立する

4. 残った案のうち、最も plain words で説明しやすいものを採る

## Related Documents

- [共有画面ワイヤーフレーム](character-detail-wireframes.md)
- [UI/UX 要件](ui-ux-requirements.md)
- [遷移構造](navigation.md)
- [サービスビジョン](service-vision.md)
