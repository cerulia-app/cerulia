# auth namespace

permission-set 定義は dedicated な auth lexicon にまとめ、app.cerulia.auth* の flat な bundle 名で管理する。

## 基本方針

- permission-set は GM、PL のような卓内 role を表さず、OAuth scope 用の technical bundle だけを表す。
- 定義は core / board / secret / rpc に散らさず、auth lexicon に集約する。
- client は必要な bundle を組み合わせて要求し、1 つの broad super-scope に依存しない。
- atomic capability と bundle の二層化は、この段階では導入しない。まずは flat な least-privilege bundle で固定する。

各 bundle は Lexicon primary type `permission-set` の main definition として実装し、`permissions` は `resource = rpc` または `resource = repo` のどちらかに固定する。service endpoint 向け bundle は `resource = rpc` と exact `lxm` set を持ち、repo write bundle は exact collection/action set を持つ。

## 推奨 bundle 一覧

| bundle | 役割 | 代表 capability |
| --- | --- | --- |
| app.cerulia.authCoreReader | core projection を読む | getCharacterHome、getCampaignView、listCharacterEpisodes、listReuseGrants、listPublications |
| app.cerulia.authCoreWriter | 個人repoの core lineage record を更新する | characterSheet 更新、characterBranch 作成、recordCharacterConversion、recordCharacterAdvancement、recordCharacterEpisode、importCharacterSheet |
| app.cerulia.authCorePublicationOperator | core publication を更新する | publishSubject、retirePublication |
| app.cerulia.authReuseOperator | core reuse ledger を更新する | grantReuse、revokeReuse |
| app.cerulia.authSessionParticipant | 通常参加者向けの session 呼び出し | getSessionView、getReplayView(mode=participant)、joinSession、leaveSession、updateCharacterState、sendMessage、rollDice、listHandouts |
| app.cerulia.authBoardReader | 盤面の participant-safe 読み取りを行う | getBoardView(mode=participant) |
| app.cerulia.authBoardOperator | 盤面の operator 読み取りと確定操作を行う | getBoardView(mode=operator)、applyBoardOp |
| app.cerulia.authSecretOperator | 公開切替と鍵ライフサイクルを扱う | createSecretEnvelope、revealSubject、redactRecord、rotateAudienceKey |
| app.cerulia.authGovernanceOperator | session governance と operator read を扱う | getGovernanceView、listSessionPublications(mode=governance)、createSessionDraft、inviteSession、cancelInvitation、moderateMembership、openSession、startSession、pauseSession、resumeSession、setSessionVisibility、closeSession、archiveSession、reopenSession、transferAuthority、createCharacterInstance、submitAction |
| app.cerulia.authAppealOriginator | 当事者の救済申立てだけを扱う | listAppealCases(view=participant)、submitAppeal、withdrawAppeal |
| app.cerulia.authAppealResolver | appeal を審理・解決する | listAppealCases、submitAppeal、withdrawAppeal、reviewAppeal、escalateAppeal、resolveAppeal |
| app.cerulia.authPublicationOperator | session-backed carrier を更新する | publishSessionLink、retireSessionLink |
| app.cerulia.authAuditReader | 監査 view と export を読む | getAuditView、exportServiceLog |

## Lexicon-ready permission-set skeleton

service bundle は次の形を正本にする。

```json
{
	"lexicon": 1,
	"id": "app.cerulia.authBoardReader",
	"defs": {
		"main": {
			"type": "permission-set",
			"permissions": [
				{
					"type": "permission",
					"resource": "rpc",
					"inheritAud": true,
					"lxm": [
						"app.cerulia.rpc.getBoardView"
					]
				}
			]
		}
	}
}
```

repo write bundle は exact collection/action を固定する。たとえば app.cerulia.authCoreWriter では characterSheet / characterBranch / characterConversion / characterAdvancement / characterEpisode collection に対する create / update だけを許し、publication や reuse-grant は別 bundle へ分ける。

## 設計上の注意

- authCoreReader は owner / steward 向けの core continuity read に使う。public publication summary のような完全公開 projection は OAuth なしで返してよいが、その場合でも projection contract 自体は同じにする。
- public mode は reader lens であり、auth bundle ではない。anonymous read を許す場合でも、返す内容は active な public publication current head に裏づけられた block だけに限定する。
- getBoardView の participant-safe lens は authBoardReader、operator lens は authBoardOperator に寄せる。board mutate は authBoardOperator に残し、participant read と operator read を UI 上でも別権限として説明する。
- getSessionView は participant-safe な session summary に留め、controller list や recovery detail を含む operator read は getGovernanceView と authGovernanceOperator に寄せる。
- getSessionAccessPreflight は anonymous read を許してよいが、session 参加権そのものを与えない。sign-in / join / appeal / governance への導線判断だけを返す。
- getReplayView の `mode = public` と listSessionPublications の active public carrier lens は public mode として anonymous read を許してよい。getReplayView の `mode = participant` は authSessionParticipant、retired carrier や運用詳細は authGovernanceOperator に寄せる。
- submitAppeal は affected participant が呼べる必要があるため、通常参加権とは別に authAppealOriginator へ切り出す。
- withdrawAppeal は起票者が appeal 自体を取り下げるため、通常参加権とは別に authAppealOriginator へ切り出す。
- listAppealCases は participant-facing summary 用の query に留め、raw review history は authAuditReader で getAuditView を使って読む。
- authAppealOriginator で呼ぶ listAppealCases は participant view だけを返し、resolver view は返さない。
- removed / banned の当事者例外は dedicated な appeal-only carve-out として扱う。submitAppeal は affectedActorDid または controller に維持する。withdrawAppeal は openedByDid にだけ維持する。listAppealCases(view=participant) は openedByDid または affectedActorDid の read-only summary として維持する。
- controller 起点の submitAppeal と controller が起票した case の withdrawAppeal も扱えるように、authAppealResolver に submitAppeal と withdrawAppeal を含めてよい。
- reviewAppeal、escalateAppeal、resolveAppeal は controller または限定条件下の recovery controller が使うため、authAppealResolver を別 bundle に切る。
- authAppealResolver で呼ぶ listAppealCases は resolver view を返してよい。
- publishSubject と retirePublication は core publication の canonical path なので authCorePublicationOperator に切る。
- grantReuse と revokeReuse は branch owner または steward の同意系操作なので authReuseOperator に切る。
- publishSessionLink と retireSessionLink は governance と近いが、session-backed carrier の運用を分離したいので dedicated bundle にする。
- createSessionDraft は planning session の初期化だけを担い、openSession とは別 permission のまま authGovernanceOperator に含める。
- auth bundle 名は role 名に寄せず、technical responsibility を名前に出す。

## 避けるべき切り方

- GM専用scope、PL専用scopeを作る
- core / board / secret / rpc に permission-set 定義を散らす
- broad super-scope 1 本で運用する
- atomic capability と bundle を同時に導入して初手から複雑化する