# デザインシステム

## visual direction

Cerulia の AppView は、キャラクターを作り、遊んだ記録を残し、見せるためのサービスとして設計する。tone は admin console ではなく、読み物と作業台の中間に置く。

## product cues

- characters first: キャラクターの現在地を先に見せる
- value before atmosphere: 何ができるかを先に伝える
- plain words: 内部語を使わず、身近な言葉で伝える

## color tokens

| token | value | 用途 |
| --- | --- | --- |
| `--color-sky` | `#EAF4FF` | shell background |
| `--color-paper` | `#FFFDF8` | card background |
| `--color-ink` | `#16324A` | primary text |
| `--color-coral` | `#D96C4E` | primary CTA |
| `--color-moss` | `#678D58` | success state |
| `--color-stone` | `#7B7A74` | secondary text |

## typography

- hero には表情のある serif 系 headline を使ってよい
- body と UI label は読みやすい sans-serif を使う

## styling architecture

- native CSS、semantic class と component boundary で追える構成
- Tailwind CSS は現時点では不採用
- reset は小さい base layer として扱う
- shared primitive は surface card、button、status chip に限る

SvelteKit 実装では component-scoped CSS と small shared stylesheet を基本にする。utility-first framework は導入しない。

## layout grammar

### public top

- hero stage（1 行の約束）
- 具体例（公開キャラクター）
- dual CTA（始める / 見る）

### signed-in home

- キャラクター一覧
- 最近のセッション
- 作成 / 記録 CTA

### character detail

- stats 表示（schema-less の public/shared surface では structured stats を省略）
- 立ち絵
- セッション履歴
- 成長履歴

### character create

- ルールシステム選択
- schema-driven フォーム + ダイスロール
- 確認 / 作成

## core components

| component | 役割 |
| --- | --- |
| Character card | キャラクターのサムネイル（立ち絵、名前、システム） |
| Session entry | セッション記録の 1 行表示 |
| Schema form | character-sheet-schema の fieldDefs から動的生成するフォーム |
| Dice roller | クライアント側ダイスロール UI |
| Empty state | まだ何もない場合の次の一手を示す |

## responsive rules

- `/home`、`/characters` は mobile で 1 カラムに落ちても意味を失わないこと
- character create は mobile でもステップ形式で操作できること

## accessibility baseline

- WCAG 2.1 AA を目指す
- keyboard-only で hero CTA、character card、create form に到達できること
- color だけで状態を表現しないこと
