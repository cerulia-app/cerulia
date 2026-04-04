# デザインシステム

## visual direction

Cerulia の AppView の主概念は Character Continuity Workbench であり、その見た目は監視盤のような dark dashboard ではなく、continuity artifact を静かに読み解く daylight workbench として設計する。情報密度は高くてよいが、tone は admin console ではなく、読み物と作業台の中間に置く。

## product cues

- public first: public top は promise、example、CTA の順で始める
- characters first after sign-in: sign-in 後は character の現在地を先に見せる
- value before atmosphere: 何ができる workbench かを先に伝え、daylight tone はその理解を支える
- continuity over utility chrome: 操作部より current edition と provenance を先に読ませる
- archive is secondary: 履歴は見せるが、既定の grammar を支配させない

## color tokens

| token | value | 用途 |
| --- | --- | --- |
| `--color-sky` | `#EAF4FF` | shell background |
| `--color-paper` | `#FFFDF8` | card background |
| `--color-ink` | `#16324A` | primary text |
| `--color-coral` | `#D96C4E` | primary CTA と重要アクション |
| `--color-moss` | `#678D58` | accepted state、continuity success |
| `--color-stone` | `#7B7A74` | archive、secondary text |

## typography

- hero には表情のある serif 系 headline を使ってよい
- body と UI label は読みやすい sans-serif を使う
- current edition、archive、tombstone の差は色より label と hierarchy で示す

## styling architecture

- AppView の styling は native CSS を採用し、global token CSS、small reset/base、shared semantic primitives、feature または component-scoped CSS に分ける
- `app.css` のような単一の global stylesheet に shell、feature、form、responsive override を積み増し続けない
- Tailwind CSS は現時点では採用しない。utility class の局所性より、Cerulia の service language と mode grammar を semantic class と component boundary で追えることを優先する
- DaisyUI のような preset component library も現時点では採用しない。daylight workbench では generic dashboard grammar より、current edition、publication、archive、draft の差を意図的に表現できることを優先する
- reset は採用してよいが、方針の中心ではない。link、focus、form control の baseline を揃える小さい base layer として扱う
- shared primitive は Mode badge、surface card、button link、status chip、archive notice など、route をまたいで意味が安定しているものに限る
- route 固有の layout grammar や copy 密度の調整は feature または component-scoped CSS に閉じ、global で横断上書きしない

## layout grammar

### public top

- hero stage
- short value lane
- publication shelf
- dual CTA

### signed-in home

- continue zone
- create zone
- publish zone
- campaign context

### character studio / detail

- create lane card
- current edition card
- provenance rail
- publication row
- archive split

### campaign workspace

- campaign identity shell
- rule provenance block
- published artifact list
- public shell note

### publication detail

- current publication summary
- surface summary
- retire action
- explanatory tombstone when needed

## core components

| component | 役割 |
| --- | --- |
| Mode badge | public と owner-steward を text 付きで示す |
| Create lane card | new / import / branch / convert を別 grammar で示す |
| Current edition card | いまの版を最も強い hierarchy で示す |
| Publication row | 公開中の版と surface summary を短く示す |
| Archive notice | retired / superseded link の説明を行う |
| Empty state | continuity がまだ無い場合の次の一手を示す |

## motion

- page-load では hero と primary cards のみ短く reveal する
- destructive action や archive notice では演出を抑え、静かな確認体験にする
- generic micro-motion を乱用しない

## responsive rules

- `/home`、`/characters`、`/campaigns`、publication detail は mobile で 1 カラムに落ちても意味を失わないこと
- create lane は mobile で card stack にする
- tombstone と archive notice は mobile でも通常 detail と明確に区別できること

## accessibility baseline

- mode badge、status、archive state は text で判別できること
- keyboard-only で hero CTA、create lane、current edition card、publication row に到達できること
- color だけで current / archived / disabled を表現しないこと
