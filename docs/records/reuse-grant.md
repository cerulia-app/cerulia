# reuse-grant

## 役割

character-branch の cross-boundary reuse を明示的に許可する record。same campaign の既定動作だけでは足りない持ち出し、fork、公開共有を説明するための consent ledger になる。

## 置き場所

branch owner の repo、または campaign steward の repo。

## 主なフィールド

- characterBranchRef
- sourceCampaignRef
- targetKind
- targetRef
- targetDid
- reuseMode
- revokesRef
- grantedByDid
- grantedAt
- expiresAt
- revokedAt
- revokedByDid
- revokeReasonCode
- requestId
- note

## 更新主体

branch owner、または branch owner から委任を受けた campaign steward。

## 参照関係

- character-branch
- campaign
- character-episode

## 設計上の注意

- same campaign の継続利用は campaign.defaultReusePolicyKind で扱ってよく、その場合は reuse-grant を省略してもよい。
- cross-campaign、cross-house、cross-world の持ち出しや公開共有は reuse-grant を前提にする方が安全である。
- explicit reuse-grant を使う場合、sourceCampaignRef は必須の source boundary とする。campaign-less branch を越境 reuse したい場合は、先に source campaign を明示した branch か fork を作る。
- branch owner の同意を優先し、campaign steward は owner 委任がある場合だけ grant を代理発行してよい。
- targetKind は campaign、house、world、actor、public の閉じた値にする。
- targetRef は campaign、house、world のような record-backed target にだけ使い、actor target は targetDid で表す。public target では targetRef と targetDid のどちらも不要である。
- targetKind ごとの invariant は固定する。campaign / house / world では targetRef 必須かつ targetDid 禁止、actor では targetDid 必須かつ targetRef 禁止、public では targetRef と targetDid の両方を禁止する。
- reuseMode は fork-only、fork-and-advance、summary-share、full-share のような閉じた値にする。
- cross-boundary または delegated な character-conversion を行うときも、新しい consent primitive は増やさず reuse-grant を使う。character-conversion は reuseGrantRef を持てるが、それ自体で新しい reuse 権限を作らない。
- revoke は append-only に扱い、revokeReuse は revokesRef で元の grant を指す新しい reuse-grant record を追加する。active / revoked / expired の summary は linked chain の最新状態から導出する。
- public target に対して current design で許す reuseMode は summary-share だけに限定する。full-share は dedicated な character publication surface を導入するまで使わない。
- revokedAt は future reuse を止めるだけであり、既存の character-episode や publication を自動では消さない。過去の公開を止めたい場合は publication retire や superseding correction を別に行う。