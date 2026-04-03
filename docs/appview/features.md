# 必要機能一覧

AppView の機能は、内部 surface の列挙ではなく、「ユーザーが何を達成できるか」で整理する。public top の約束は「作る、続ける、持ち運ぶ、見せるを一つにつなぐこと」であり、sign-in 後の最初の具体価値は character creation convenience だが、その中身は continuity workflow 全体である。

## Primary Product Modules

| module | 約束する価値 | 主な利用者 | 主画面 | 読み取り正本 | 書き込み正本 |
| --- | --- | --- | --- | --- | --- |
| character studio | new sheet、import、branch、convert を迷わず始められる | branch owner、steward | signed-in home、characters、character detail | getCharacterHome | importCharacterSheet、createCharacterBranch、recordCharacterConversion |
| signed-in home workbench | いまの版、recent episode、reuse、publication をひと目で読める | branch owner、steward | signed-in home、character detail | getCharacterHome | recordCharacterAdvancement、recordCharacterEpisode、publishSubject、retirePublication |
| campaign workspace | shared rule chain と共有継続を理解しやすい | campaign steward、shared continuity reader | campaigns、campaign detail | getCampaignView | createCampaign、attachRuleProfile、retireRuleProfile |
| publication library | 公開中の版を読み、何を見せているかを管理できる | owner、steward、public reader | publications、publication detail | listPublications | publishSubject、retirePublication |

public top は独立した第 5 module ではなく、1 つの約束、1 つの具体例、2 つの CTA から始まる public entry shell として扱う。

## Character Studio の具体的 lane

character creation convenience を front に出すため、create flow は最初から次の lane に分ける。

| lane | 主な利用者 | 入力の起点 | 期待する結果 |
| --- | --- | --- | --- |
| new sheet | 新規利用者 | displayName、ruleset、基本 profile | owner の最初の character continuity |
| import | 既存シート持ち込み利用者 | externalSheetUri、imported snapshot、sourceRevision | provenance 付き branch |
| branch | 継続キャラ利用者 | baseSheetRef、branch label、campaign / local 用途 | campaign / local durable branch |
| convert | ruleset 越境利用者 | source branch、target ruleset、conversion note | conversion provenance 付き target branch |

create flow の最後では、次の 3 点を review する。

- campaign へ接続するか
- reuse 境界をどうするか
- publication を今すぐ作るか、後で作るか

campaign は optional に留め、最初から mandatory parent tree にしない。
ここで選ぶ campaign は continuity scope intent であり、branch 自体に campaignRef を書き込むことを意味しない。accepted linkage は run / chapter summary では episode の `campaignRef`、ruleset conversion path では conversion の `targetCampaignRef` で materialize する。変換 path では `targetCampaignRef` が canonical provenance であり、episode 側はその summary mirror に留まる。

## Secondary Contextual Modules

| module | 主な利用者 | 主画面 | 読み取り正本 | 書き込み正本 | 備考 |
| --- | --- | --- | --- | --- | --- |
| session run shell | participant、GM、viewer | session view | getSessionView | createSessionDraft、openSession、startSession、pauseSession、resumeSession、closeSession、archiveSession、reopenSession | continuity ではなく run envelope |
| session access preflight | anonymous、非参加者、appeal-only actor、operator | access preflight | getSessionAccessPreflight | なし | target surface と理由コードを固定する |
| membership flow | invited actor、participant、operator | session view、governance console | getSessionView | inviteSession、cancelInvitation、joinSession、leaveSession、moderateMembership | role と status を分けて扱う |
| board workspace | board operator、participant | board view | operator board view、participant-safe board read | applyBoardOp | operator mutate と participant read を分離する |
| runtime state panel | participant、GM | session view、character inspector | getSessionView、character-state projection | updateCharacterState | board durable state とは別 revision の runtime overlay |
| disclosure and handouts | GM、participant、spectator | handout panel、replay | listHandouts、getReplayView | revealSubject、redactRecord、rotateAudienceKey | publish と reveal を混ぜない |
| replay and public carrier | public reader、participant、operator | replay、publication detail | getReplayView、listSessionPublications | publishSessionLink、retireSessionLink | session-publication は adapter |
| appeal access | affected participant、resolver | appeal access、governance console | listAppealCases | submitAppeal、withdrawAppeal、reviewAppeal、escalateAppeal、resolveAppeal | appeal-only access を通常参加権から分離する |
| governance and audit | operator、resolver | governance console、audit view | dedicated governance read model、listAppealCases、getAuditView、exportServiceLog | transferAuthority、reviewAppeal、resolveAppeal ほか | participant summary と operator detail を分ける |

## AppView Shell が自前で持つべき機能

| 機能 | 置く場所 | 理由 |
| --- | --- | --- |
| mode badge | 全 surface 共通 | owner-steward / public / participant / governance / audit の lens を混ぜないため |
| permission explanation | button disabled state、error panel | 403 や InvalidRequest を単なる失敗表示で終わらせないため |
| recent items | signed-in home | branch、campaign、session への復帰を速くするため |
| create flow draft state | create zone、character studio | multi-step draft を accepted 前の local state として扱うため |
| publication preview | character detail、publication library | いまの版として見える前の見え方を確認するため |
| mutation status banner | form、board、governance action | accepted / rejected / rebase-needed / manual-review を説明するため |
| archive / audit split | publication detail、governance console | いまの版と履歴を混ぜないため |
| local layout state | board sidebar、search filter、timeline fold | presentation convenience を record 化しないため |

## Surface ごとの最低要件

### 1. Character Studio / Detail

- primary branch と create lane を同じ screen grammar で扱う。
- create lane の card copy で personal continuity と campaign continuity の違いを短く説明する。
- recent episode、recent conversion、publication row、reuse grant を並列に読める。
- imported provenance と conversion provenance は public summary より濃く表示してよい。
- create flow は accepted 前の draft と accepted 後の continuity fact を明確に分ける。
- retired branch の direct link は、active branch detail と同じ主導線に混ぜず、read-only historical detail または explanatory tombstone として開く。
- session output を取り込む場合でも、最終的な continuity write は branch 側へ戻す。

### 2. Campaign Workspace

- campaign identity と published artifact を同じ surface で読める。
- owner-steward mode では rule provenance と default reuse policy を読める。
- public mode では campaign shell と public publication だけを出し、read-only shell であることと参加導線が sign-in / session 側にあることを明示する。
- session や membership は campaign workspace の canonical input にしない。

### 3. Publication Library

- subject ごとのいまの版を既定表示にする。
- publication、reveal、redaction、retire を別導線にする。
- 公開中の版と archived chain を 1 面に混ぜない。
- carrier の差し替え可能性を短い説明で示す。
- retired または superseded な direct link は、いまの版への CTA を持つ explanatory tombstone / preflight に必ず解決し、無言の 404 や opaque redirect にしない。
- tombstone / preflight は通常 detail と同じ見出しにせず、retired / superseded link notice であることを先頭で明示する。

### 4. Public Entry Shell

- public reader が sign-in しなくても Cerulia の価値を理解できる。
- public top は canonical 一覧面そのものではなく、publication library と campaign / publication deep-link へ入る entry shell として扱う。
- first viewport は 1 つの約束、1 つの具体例、2 つの CTA だけで成立させる。
- 最初の 1 画面で current head や publication のような内部語を始めない。
- 見えているのが公開中の版だけであることを説明する。
- campaign shell は閲覧用の公開概要であり、参加受付や admission gate ではないことを短く説明する。
- character、campaign、publication を同じ card grammar で並べ、別製品に見せない。

### 5. Session Run Shell

- session state、membership、authority の current 状態を分けて見せる。
- board、handout、replay、governance への入口を context navigation として持つ。
- session が campaignRef を持つ場合は campaign への provenance link を出す。
- session が campaign-less でも成立するように campaign 依存の UI を必須にしない。
- participant lens では participant-safe な session summary だけを見せ、controller list や recovery detail は governance console に逃がす。
- session deep-link は shell を即時表示するのではなく、必要なら access preflight を経由する。
- `/home` の session rail では authorityHealthKind を chip または compact status として先に見せ、詳細 banner は session / governance surface で展開する。

### 6. Governance Console

- participant 操作と operator 操作を別 panel に分ける。
- authority transfer の phase、pending controller、completion witness を読める。
- appeal summary と raw audit detail を別 route に分ける。
- removed / banned actor に対する appeal-only access を UI でも明確にする。
- governance console は dedicated governance read model を前提にし、participant session query の延長で作らない。

### 7. Board Workspace

- operator board workspace と participant read-only board は同一権限で扱わない。
- participant read-only board は redacted token / scene 情報に留め、hidden token や未公開 handout の境界を越えない。
- mobile の participant board は read-only に固定し、applyBoardOp を伴う編集は許可しない。
- operator editing は desktop 優先にしてよい。