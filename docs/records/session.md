# session

## 役割

セッション（実プレイの回）の記録。どのシナリオを、いつ、誰と遊んだかを残す post-run の summary record。run control（開始、一時停止、権限移譲）は持たない。

## 置き場所

GM（または主催者）の repo。

## 主なフィールド

- scenarioRef
- gmDid
- participantEntries
- campaignRef
- playedAt
- hoEntries
- externalArchiveUris
- outcomeSummary
- supersedesRef
- retiredAt
- requestId
- createdAt

### participantEntries

参加者のリスト。各 entry は次を持つ。

- displayName（任意: Cerulia を使っていないプレイヤー向け）
- ownerDid（任意: Cerulia ユーザーの DID）
- characterBranchRef（任意: 使用したキャラクターの branch）

ownerDid と displayName の両方が無い entry は不正とする。Cerulia を使っていない参加者は displayName のみで記録できる。

### hoEntries

HO（ハンドアウト）の記録。各 entry は次を持つ。

- hoLabel
- characterBranchRef（任意: この HO を担当したキャラクター）
- ownerDid（任意: この HO を担当したプレイヤー）

## 更新主体

session record の owner（GM / 主催者）。

## 参照関係

- scenario
- campaign
- character-branch（participantEntries 内）

## 設計上の注意

- session は post-run の記録であり、run lifecycle（open / active / paused / closed）を持たない
- GM の record が参加の canonical fact であり、プレイヤーの session-participation は自己リンクである
- participantEntries に他人の characterBranchRef を含められる。これは「あの卓にキャラ X がいた」という historical fact の記録であり、character state の変更ではない
- session record は削除しない。訂正は supersedesRef 付きの新しい session を積む
- retiredAt はセッション記録を将来の索引から外すために使い、過去の session-participation を自動では消さない
- campaignRef は任意。campaign 外の単発卓では省略する
- scenario から house を辿れるため、session.houseRef は持たない。house の逆引きは projection で扱う
- externalArchiveUris は YouTube、NRPG、ブログ等の外部記録へのリンクに使う
- outcomeSummary はプレイヤー向けの要約であり、監査専用 detail は含めない
