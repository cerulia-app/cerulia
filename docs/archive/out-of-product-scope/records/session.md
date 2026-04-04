# session

## 役割

optional extension が structured run を持ちたいときに使う run envelope。Cerulia core の canonical root ではなく、continuity artifact にぶら下がる補助 record として扱う。

## 置き場所

session authority actor の repo。

## 主なフィールド

- sessionId
- campaignRef
- title
- visibility
- rulesetNsid
- rulesetManifestRef
- ruleProfileRefs
- authorityRef
- state
- createdAt
- scheduledAt
- endedAt
- archivedAt
- requestId
- stateChangedAt
- stateChangedByDid
- stateReasonCode
- visibilityChangedAt
- visibilityChangedByDid
- visibilityReasonCode

## 更新主体

optional extension の operator。core はこの recordを前提にしない。

## 参照関係

- campaign
- membership
- session-publication
- character-episode
- scene
- handout
- message
- roll

## 設計上の注意

- sessionId は record 内の stable identifier であり、cross-record reference、AppView route、XRPC、projection では sessionRef を使う。sessionId を sessionRef の代わりに外部 surface へ露出させない。
- session は extension の run envelope であり、product の canonical root ではない。利用者に最初に見せる continuity は character home と campaign view である。
- planning は createSessionDraft で作られる初期状態であり、openSession は既存 planning session を open へ進める遷移専用 procedure とする。
- token 位置や character の現在 HP のような高頻度状態はここに入れない。
- 単一巨大 JSON record にしない。session は record graph の根として薄く保つ。
- campaignRef は任意とし、存在する場合だけ continuity scope への provenance として使う。
- state は planning、open、active、paused、ended、archived のような粗い状態に留める。
- rulesetNsid と rulesetManifestRef は extension run が使った contract を provenance として pin する。core の continuity contract を置き換えない。
- ruleProfileRefs は extension run の local override chain を指す。campaignRef がある場合でも、core continuity chain の後ろに extension 側の local override を足すだけに留める。
- ruleProfileRefs に入れる profile は rulesetManifestRef と互換な overlay に限る。resolver contract を壊す変更は同じ manifest のまま上書きせず、新しい manifest か migration として扱う。互換性の確認は createSessionDraft が受ける expectedRulesetManifestRef と session.rulesetManifestRef の一致で行う。
- visibility は extension run の admission と公開可否を決める gate であり、core publication の正本を置き換えない。
- setSessionVisibility は extension run の admission と run projection だけを変える。既存の core publication を止めたい場合は retirePublication を、session-backed carrier だけを止めたい場合は retireSessionLink を別に行う。
- session-publication は session-backed carrier をまとめる adapter であり、canonical source of truth は core の publication に置く。
- character-episode は sourceRunRef として session を参照してよいが、growth fact の authoritative source は character-advancement に残す。
- extension が recordCharacterEpisode を起こしても、それは canonical continuity write を branch owner または認可された continuity steward に渡す handoff に過ぎない。session authority が core lineage を単独で所有しない。
- visibility の変更や state 遷移は extension の governance 扱いであり、core の mandatory invariant ではない。
- requestId は extension run mutation と service log を相関づける field として使う。

## state ごとの標準ルール

| state | 主に許可する操作 | 主に拒否する操作 |
| --- | --- | --- |
| planning | session 設定、transferAuthority、inviteSession、cancelInvitation、joinSession、membership 承認、character 準備、audience 準備、handout 準備 | rollDice、applyBoardOp、本番向けの updateCharacterState |
| open / active / paused | transferAuthority、inviteSession、cancelInvitation、joinSession、leaveSession、moderateMembership、sendMessage、rollDice、updateCharacterState、applyBoardOp、reveal と redaction、submitAppeal、withdrawAppeal、reviewAppeal、escalateAppeal、resolveAppeal、recordCharacterEpisode | - |
| ended | redactRecord、終了処理としての reveal、rotateAudienceKey、transferAuthority、submitAppeal、withdrawAppeal、reviewAppeal、escalateAppeal、resolveAppeal、recordCharacterEpisode | inviteSession、cancelInvitation、joinSession、leaveSession、moderateMembership、sendMessage、rollDice、applyBoardOp |
| archived | redactRecord、rotateAudienceKey、transferAuthority、submitAppeal、withdrawAppeal、reviewAppeal、escalateAppeal、resolveAppeal、appeal 起因の corrective membership 変更などの監査と安全対応 | ended で止める通常操作に加え、revealSubject と通常の membership の新規変更 |

- transferAuthority は state を進める操作ではなく、planning / open / active / paused / ended / archived のどこでも使える governance path として扱う。accepted transfer 自体は gameplay mutation の再開を意味しない。
- ended から active または paused へ戻すときは、lease ではなく controller 側の承認を必要にする。
- archived は通常の gameplay に対して終端状態とし、再開は通常運用ではなく移行判断として扱う。
- appeal の review-flow は gameplay mutation とは別 gate とし、各 procedure の詳細な許可条件は rpc 側の appeal contract に従う。
- archived 中でも、accepted membership appeal による corrective membership transition は監査・訂正経路として許可してよい。
- leaveSession は joined から left への自己離脱にだけ使い、remove / ban / restore は moderateMembership で扱う。

## state transition の標準フロー

draft 作成は createSessionDraft が担い、下表は persistent session が存在した後の state 遷移だけを表す。

| from | to | 確定主体 | 補足 |
| --- | --- | --- | --- |
| planning | open | controller 側の承認 | 募集や参加受付を始める段階 |
| open | active | 有効な lease holder または controller | 実卓開始 |
| active | paused | 有効な lease holder または controller | 一時停止 |
| paused | active | 有効な lease holder または controller | 再開 |
| open / active / paused | ended | controller 側の承認 | gameplay mutation を閉じ、episode と publication の整理に移る |
| ended | active / paused | controller 側の承認 | reopenSession はこの遷移にだけ使う |
| ended | archived | controller 側の承認 | 公開や redaction の整理後に終端化する |

- どの遷移でも stateChangedAt、stateChangedByDid、stateReasonCode を更新する。
- archived は通常運用では再開しない。必要なら新しい session か移行処理として扱う。
- closeSession や archiveSession の既定後処理として、session-backed public carrier を残す場合でも retireSessionLink か retired surface への移行を明示する。core publication は必要なら別に retire する。