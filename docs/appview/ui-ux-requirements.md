# UI/UX要件

## 1. 価値階層

- public top の first viewport は service value first にする。一般ユーザーが理解できる言葉だけで成立させる。
- 認可済み利用者の first screen は `/home` であり、character-first にする。session lobby を先頭にしない。
- first viewport で伝える価値は「作る」「続ける」「持ち運ぶ」「見せる」であり、「監査する」「運営する」ではない。
- いまの版 / current edition を既定表示にする。superseded、retired、revoked は archive / audit 導線へ分離する。
- public mode の campaign view は full dossier ではなく shell に留め、public publication に裏づく情報だけを出す。
- session、board、replay、governance は optional extension として見せ、core continuity surface を上書きしない。
- session deep-link は access preflight を挟めるようにし、未認可時の sign-in / join / appeal / public replay 導線を出し分ける。

## 2. Character Studio UX

### 2.1 作成導線

- create flow は new sheet、import、branch、convert の 4 lane を最初に分ける。
- campaign 接続は optional step とし、最初から mandatory parent tree にしない。
- campaign 選択は continuity scope intent として扱い、branch field への即時 write と混同しない。canonical な campaign linkage は episode / conversion / publication 側で materialize する。
- campaign intent を持つ draft は、canonical link が未成立な間 `intent only / not yet linked` と分かる状態表示を持つ。
- reuse 境界と publication は、sheet 入力の途中ではなく review step で判断させる。
- create flow の各 step は「まだ local draft か」「accepted された continuity fact か」を常に見分けられるようにする。

### 2.2 review step

accepted 前の最終確認では、少なくとも次を 1 画面で見せる。

- どの character continuity を作るか
- どの imported provenance / conversion provenance が残るか
- linked campaign があるか
- publication を今すぐ作るか、後に回すか
- reuse 境界がどう見えるか

### 2.3 初回価値の見せ方

- signed-in home では create lane を continue zone のすぐ近くに置く。
- create lane は icon ではなく、何を始める lane かを短文で説明する card にする。
- create lane では personal continuity と campaign continuity の違いを lane copy で説明する。
- 「便利に作れる」を front に出しても、generic builder と誤解させないよう、import、branch、convert を同格に見せる。

## 3. 可視性と権限説明

- すべての surface に現在の reader lens を表示する。少なくとも public、owner-steward、participant、governance、audit を区別する。
- ボタンや panel が無効なときは、理由を OAuth bundle 不足、session role 不足、audience grant 不足、publication 未公開のどれかに落として説明する。
- publication、reveal、redaction、retire を同じ「公開設定」トグルにまとめない。
- public surface では unrevealed secret、private audienceRef、retired carrier history、hidden membership 状態を漏らさない。
- public は viewer lens を意味し、active な公開中の版を read-only で返す範囲に限る。参加可否や admission の意味を重ねない。
- signed-in 利用者が `/` や public campaign / publication を見ている場合でも、現在の lens が public であることを badge で明示する。
- participant surface でも secret plaintext を summary card に混ぜず、明示的に開いた panel でだけ表示する。
- participant session view は participant-safe summary に留め、controller list や recovery detail は governance console 側に分離する。

## 4. mutation UX

- すべての mutation result は mutationAck の resultKind を UI に反映する。
- accepted では emittedRecordRefs や currentRevision を次の画面遷移に使う。
- rejected は validation / policy failure として扱い、黙って元画面に戻さない。
- rebase-needed は board、campaign revision、authority snapshot などの競合として扱い、差分再読込と再実行の導線を出す。
- manual-review は operator review や appeal flow へ進む待機状態として明確に見せる。
- optimistic UI を許すのはタブ切り替えや panel 展開などの presentation state だけに留める。authoritative state は ack 前に確定表示しない。
- create flow では accepted 前の preview card に「draft」表示を付け、current edition と視覚的に区別する。

## 5. 信頼性と監査可能性

- 重要操作では actor、時刻、理由コード、影響範囲を確認できるようにする。
- access preflight では、今の lens で何ができないかと、次に取りうる導線を必ず表示する。
- `/home` の session rail は authorityHealthKind を compact status として常設してよいが、lease-expired / controller-missing / transfer-in-progress の詳細 banner は session / governance surface で展開する。
- `/home` でも non-healthy session は warning rail に昇格させ、次の actor と governance への直リンクを併記する。
- authority transfer は pendingControllerDids、transferPhase、transferCompletedAt を一まとまりで見せる。
- lease 失効や controller 不在では gameplay mutation を再開したことにせず、read-only banner と governance 導線を表示する。
- removed / banned、reveal / redaction、publication retire のような紛争になりやすい操作は、participant summary と audit detail を別導線にする。
- public replay と participant replay は文言も情報量も分ける。public replay には「見えていないものがある」可能性を示してよいが、何が隠れているかは示さない。

| banner state | 意味 | primary CTA |
| --- | --- | --- |
| lease-expired | 現在の lease holder が失効し、新規 gameplay mutation を受け付けない | controller が再承認または transfer を確定するまで待つ |
| controller-missing | 有効 controller が live governance を継続できず、read-only へ落ちている | recovery transfer か controller 承認の close / reopen を確認する |
| transfer-in-progress | authority handoff と gmAudience 再配布が完了していない | transfer の進行状況を確認する |
| blocked-appeal | appeal review が blocked で、通常参加導線では進められない | appeal / governance route へ進む |

| banner state | next actor | next action | still readable | blocked operations |
| --- | --- | --- | --- | --- |
| lease-expired | controller | lease 再承認または transfer 確定 | session view、replay、既存 handout、board snapshot | gameplay mutation、applyBoardOp、updateCharacterState |
| controller-missing | recovery controller または controller | narrow transfer を確定し、必要なら close / reopen へ進める | session view、replay、既存 handout、board snapshot | gameplay mutation、authority を経る通常操作 |
| transfer-in-progress | current / pending controller | transferCompletedAt を成立させる | session view、replay、既存 handout、board snapshot | gameplay resume CTA |
| blocked-appeal | resolver / recovery controller | appeal review を前進させる | participant summary、appeal summary | 通常参加導線での紛争解決 |

- recovery transfer は authority metadata を回復するだけで、accepted transfer 自体は gameplay mutation の再開を意味しない。
- UI copy で reveal-publicly と書く場合、それは API enum `publish-publicly` の表示名であり、disclosure audience を public に広げるだけで、core publication row を新規作成しない。

## 6. レイアウトとデバイス要件

- `/home`、`/characters`、campaign workspace、publication detail は desktop で 2 から 3 カラム、mobile で 1 カラムに落としても意味が崩れないようにする。
- create lane は desktop では横並び、mobile では縦積みで成立させる。
- board は desktop での操作性を優先し、mobile では quick read と限定的操作に絞ってよい。
- close / archive の UI では、session state change、carrier retire、publication retire を 1 つのトグルにまとめない。
- mobile の participant board は read-only とし、編集可能かどうかを route へ入る前に明示する。
- keyboard-only で主要操作に到達できること。
- mode badge、status、role、visibility は色だけに依存せず、テキストで区別できること。
- screen reader で current state、retired 状態、redacted 状態、pending review 状態を識別できること。

## 7. AppView が持ってよいローカル状態

- 最近見た branch / campaign / session
- 並び順、フィルタ、折りたたみ状態
- create flow の draft state、publication preview、reason note
- board sidebar の開閉状態

ただし、secret plaintext や grant material のような高リスク情報は、明示的な暗号化方針なしに local draft として保持しない。

## 8. 文言要件

- role と permission-set を同義にしない。
- GM と controller を同義にしない。
- 公開と後公開を同義にしない。publication は continuity artifact の公開、reveal は secret payload の後公開として書き分ける。
- replay、audit、archive を同義にしない。
- public top の first viewport は一般ユーザーが理解できる語だけで成立させる。
- public copy の最初の動詞は「作る」「続ける」「持ち運ぶ」「見せる」を優先し、「統治する」「監査する」を前に出さない。
- public campaign shell では「閲覧用の公開概要」であることを短い注記で明示し、参加導線は sign-in / session 側へ逃がす。

| 用語 | AppView での使い方 |
| --- | --- |
| publication | core publication の現行版に基づく公開入口 |
| carrier | session-publication が提供する外向け導線 |
| replay | replay route で読む公開済みまたは participant 向けの出来事列 |
| reveal | secret payload を後から見えるようにすること |
| redaction | disclosure / replay / UI の既定表示から外すこと |
| retire | publication または carrier の現行入口を終了すること |
| archive | いまの版ではない履歴や監査導線 |

## 9. 非目標

- social feed 的な engagement 最適化を AppView の中心に置くこと
- session 一覧を product home にすること
- 秘匿境界を label や badge だけで説明したつもりになること
- governance detail を通常参加者の主要操作面へ常時混在させること
- Cerulia を generic な character builder SaaS として見せること