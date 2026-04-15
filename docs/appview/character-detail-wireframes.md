# Character Detail Wireframes

このファイルは character detail の shared surface を、実装に落とす前の wireframe と reading order で定義する。
狙いは「プロフィールとして見やすい」「TRPG の character sheet として信頼できる」「Cerulia の境界を壊さない」を同時に満たすことにある。

## Surface Intent

- canonical shared surface は [navigation.md](navigation.md) の /characters/[branch]
- public session route は追加しない
- owner UI は同じ route に載ってよいが、public read の視線からは分離する

## Reading Order

1. 誰のどのキャラクターか
2. どのシステムで、どの状態で共有されているか
3. いま卓相手がすぐ知りたい stats は何か
4. どんな人物で、どんな履歴を持つか

## Desktop Wireframe

```text
+----------------------------------------------------------------------------------+
| muted cover / atmosphere band                                                    |
|                                                                                  |
| [portrait 5:7]   Character Name                     ruleset / visibility / share |
|                 branch / short catch                tags / branch label          |
|                 one-paragraph profile text                                     |
|                                                                                  |
|                 key stats: SAN | HP | MP | DB | move | armor                    |
|                 quick facts: age | occupation | origin | play style              |
+----------------------------------------------------------------------------------+
| 人物像                                                                           |
| personality / background / hook / public-safe notes                              |
+----------------------------------------------------------------------------------+
| シート詳細                                                                       |
| ability block                  skill block / loadout / derived values            |
| schema-less の場合は structured stats を出さず、profile text を厚くする           |
+----------------------------------------------------------------------------------+
| 遊んだ記録                                                                       |
| session card | session card | session card                                       |
| each card: scenario / date / role / result / external archive link               |
| only accepted + public sessions appear here                                      |
| inline expand only. no public session page                                       |
+----------------------------------------------------------------------------------+
| 成長                                                                             |
| advancement ledger: date / summary / linked session                              |
+----------------------------------------------------------------------------------+
| owner tools (only for owner)                                                     |
| edit / visibility / export / save state / retry                                  |
+----------------------------------------------------------------------------------+
```

## Mobile Wireframe

```text
+----------------------------------------------+
| muted cover                                  |
| [portrait]  Character Name                   |
|            ruleset / visibility              |
|            short catch                       |
+----------------------------------------------+
| key stats grid                               |
| SAN | HP | MP | DB                           |
| move | armor | etc                           |
+----------------------------------------------+
| 人物像                                       |
+----------------------------------------------+
| シート詳細                                   |
| accordion or stacked groups                  |
+----------------------------------------------+
| 遊んだ記録                                   |
| compact session cards                        |
+----------------------------------------------+
| 成長                                         |
| compact ledger                               |
+----------------------------------------------+
| owner tools                                  |
+----------------------------------------------+
```

## Layout Rules

### Hero Rules

- first viewport に portrait、identity、主要 stats を同時に入れる
- hero は banner 演出だけに使わず、play-ready 情報も含める
- 立ち絵の読み込み前に portrait 枠を確保して layout shift を抑える

### Section Rules

- section は縦積みを基本にし、擬似タブを主 UI にしない
- anchor navigation を置く場合も、初期表示で必要情報を隠さない
- 歴史系 section は feed より ledger に近い語り口でまとめる

### Owner Rules

- owner actions は public content の前に割り込ませない
- pending / accepted / rejected / rebase-needed は owner panel で明確に出し分ける
- export や edit は owner が control する補助面として扱う

## State Variants

### Draft Direct Link

- hero 上部か visibility row で draft を明示する
- public discoverability を持たないことと、direct link で閲覧できることを同時に伝える
- draft session は character detail の public history には混ぜない

### Low Bandwidth

- first response は text、identity、stats を優先する
- portrait は遅延読込でも枠を固定する
- session card のサムネイルや装飾は後回しでよい

### Schema-less

- structured stats section を無理に表で埋めない
- 人物像、来歴、共有メモを厚くし、schema-backed との差を誤魔化さない

## Rejected Patterns

- player profile のような follower / following 的メタ情報
- session を主役にした feed
- 画像がないと成立しない large gallery hero
- public read の中央に owner save state を置く構成
- section ごとに別 route を欲しがる構成