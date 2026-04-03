# membership

## 役割

誰がそのsessionにどう関わるかを表すrecord。role と status を持ち、卓への所属の正本になる。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- actorDid
- role
- status
- supersedesRef
- invitedByDid
- joinedAt
- leftAt
- bannedAt
- requestId
- statusChangedAt
- statusChangedByDid
- statusReasonCode
- note

## 更新主体

session authority。参加申請自体はXRPCで受けても、正本membershipの確定はauthorityが行う。

## 参照関係

- session
- audience
- character-instance

## 設計上の注意

- role は gm、player、viewer、spectator のような卓内行為権限を表す。
- audience grant を membership の代用品にしない。membership は所属、grant は復号権である。
- status は invited、joined、left、removed、banned などの明示的な状態遷移にする。
- 同じ (sessionRef, actorDid) について、supersedes されていない最新 row を current membership head とみなす。
- membershipRef の record-key は stable な opaque key とし、actorDid 文字列そのものを canonical key にしない。
- 新しい membership 状態遷移を追加するとき、既存 current head があれば supersedesRef でそれを指さなければならない。
- supersedesRef を使う場合、参照先は同じ sessionRef と actorDid を持つ membership に限る。
- membership の書き込みは、本人起点の leaveSession と controller 起点の moderateMembership に分ける。
- 招待制 join は controller 起点の inviteSession と cancelInvitation で扱う。
- requestId は inviteSession、cancelInvitation、joinSession、leaveSession、moderateMembership、または accepted appeal による corrective membership transition のいずれで現在の membership 版が確定したかを service log と相関づける。
- inviteSession は invited membership と初期 role を作り、left または招待取り消し由来の removed を invited に戻す再招待にも使える。
- cancelInvitation は未参加の invited membership を取り消し、invited -> removed の status 遷移として理由付きで残す。
- joinSession の受理条件は、既存の invited membership があることとする。invite-only を外す admission policy は MVP の外に置き、membership.status には追加しない。
- leaveSession は joined から left への自己離脱にだけ使う。
- moderateMembership は remove / ban / restore のような moderation 起点の status 遷移に使う。
- removed / banned の異議申立ては appeal-case で起票し、controller-review を先に行う。blocked case だけを recovery-review に上げる。
- removed / banned になった actor でも、openedByDid または affectedActorDid に該当する appeal については authAppealOriginator による appeal-only access を維持してよい。これは通常の参加権とは別の carve-out である。
- restore は moderateMembership または accepted membership appeal による joined への新しい status 遷移として残し、appeal-case はその requestId を相関する。open appeal を終端する corrective membership transition は resolveAppeal が emit する membership を canonical にし、moderateMembership は appeal を伴わない通常 restore にだけ使う。appeal 由来の correction では statusReasonCode に appeal-correction を使ってよい。
- viewer は卓内向け投影を読む読み取り専用の参加者であり、spectator は観戦向けまたは公開向け投影を見る立場として分ける。
- spectator の canonical UI surface は replay と handout の read-only lens に固定し、participant shell や gameplay write へは昇格させない。transport では participant read endpoint を role-based filter 付きで使ってよいが、別の gameplay 権限を意味させない。
- removed / banned のような争いが起きやすい変更では、statusChangedByDid と statusReasonCode を必須にする。
- 判断を見直すときは古い状態を消さず、新しい status 遷移として残す。

## status 遷移の既定効果

| 遷移 | 標準 procedure | 投影の既定 | grant の既定 | 鍵の既定 |
| --- | --- | --- | --- | --- |
| left / removed with invitation-revoked reason -> invited | inviteSession | invitee に pending の招待として見せてよい。公開投影は広げない。 | grant を発行しない。 | 自動では更新しない。 |
| invited -> removed | cancelInvitation | join 前の招待を無効化し、session 向け投影へ入れない。公開投影は広げない。 | grant を発行しない。 | 自動では更新しない。 |
| invited -> joined | joinSession | session 向け投影へ参加者として出す。公開投影は membership 変更だけでは広げない。 | audience policy に従って新しい grant を発行する。過去分は既定では追加 grant がある場合だけ与える。 | 自動では更新しない。 |
| joined -> left | leaveSession | session / spectator 向け投影から外す。公開投影は reveal / redaction 規則だけで決める。 | 未来向けの新規 grant は止める。 | 自動では更新しない。 |
| joined -> removed | moderateMembership | session / spectator 向け投影から直ちに外す。公開投影は membership 変更だけでは広げない。appeal-only access は openedByDid / affectedActorDid にだけ残してよい。 | future grant を直ちに revoke する。 | 今後の秘匿を止めたいなら次の発行前に更新する。過去分まで止めたいときだけ再暗号化する。 |
| joined -> banned | moderateMembership | removed と同じだが、再参加は新しい moderation 遷移があるまで拒否する。appeal-only access は openedByDid / affectedActorDid にだけ残してよい。 | future grant を直ちに revoke する。 | removed と同じ。 |
| removed / banned -> joined | moderateMembership または resolveAppeal | 再承認後に session 向け投影へ戻す。open appeal を終端する correction は resolveAppeal を canonical にする。 | 現在の keyVersion 以降に対して新しい grant を発行する。 | 旧 keyVersion を巻き戻さない。 |