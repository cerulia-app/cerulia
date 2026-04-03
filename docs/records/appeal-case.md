# appeal-case

## 役割

optional governance extension が contested run moderation や session-backed governance を扱いたいときに使う durable record。continuity core の必須 workflow ではない。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- targetRef
- targetKind
- targetRequestId
- affectedActorDid
- requestedOutcomeKind
- openedByDid
- openedAt
- status
- caseRevision
- reviewRevision
- authoritySnapshotRequestId
- controllerTransferPolicyKind
- controllerEligibleDids
- controllerRequiredCount
- controllerReviewDueAt
- blockedReasonCode
- escalatedAt
- escalatedByDid
- escalateRequestId
- recoveryEligibleDids
- recoveryAuthorityRequestId
- resolvedAt
- resolvedByDid
- handoffSummary
- resultSummary
- reviewOutcomeSummary
- detailEnvelopeRef
- withdrawnByDid
- withdrawnAt
- withdrawRequestId
- controllerResolutionRequestId
- recoveryResolutionRequestId
- requestId
- note

## 更新主体

appeal の起票は affected participant または controller が行ってよい。case-level の取り下げは openedByDid が行い、解決は controller が先に扱う。blocked になった case だけ recovery controller が扱う。

## 参照関係

- session
- membership
- ruling-event
- appeal-review-entry
- session-authority

## 設計上の注意

- core の correction は supersedes と retire と revoke で扱い、この record は optional extension の disputed workflow にだけ使う。
- MVP で appeal の対象にするのは、ruling-event と membership の contested change に限る。必要なら extension が publication carrier や disclosure event を対象に広げてよい。
- requestedOutcomeKind の互換表は閉じる。`targetKind = ruling-event` では `supersede-ruling` だけを許可し、`targetKind = membership` では MVP では `restore-membership` だけを許可する。`reconsider-membership` は将来の explicit output contract 追加まで予約値として扱い、受理しない。
- status は controller-review、recovery-review、accepted、denied、withdrawn のような有限集合にする。
- targetKind が membership のときは targetRequestId を必須にし、争点になっている membership change の requestId を pin する。
- affectedActorDid はこの appeal の直接の当事者を指し、通常 view の closed case 可視性は openedByDid と affectedActorDid を基準にしてよい。
- caseRevision は submitAppeal で 1 から始め、withdrawAppeal、escalateAppeal、resolveAppeal の compare-and-set 更新ごとに増やす。
- reviewRevision は submitAppeal で 0 から始め、accepted された appeal-review-entry append ごとに 1 ずつ増やす。
- authoritySnapshotRequestId は appeal open 時点の session-authority.requestId を固定し、controllerEligibleDids と controllerTransferPolicyKind の provenance に使う。
- controllerTransferPolicyKind は appeal open 時点の transferPolicy kind を immutable snapshot として固定する。
- requestId は submitAppeal で確定した opening anchor とし、appeal-case の起票要求を指す immutable requestId として扱う。
- controllerEligibleDids と controllerRequiredCount は appeal open 時点の immutable audit snapshot とし、appeal open 後に再計算しない。
- controllerEligibleDids は appeal を開いた時点の controllerDids snapshot から conflicted controller を除いた集合として固定する。
- conflicted controller は、targetKind が ruling-event のときは appealed ruling の decidedByDid、targetKind が membership のときは target membership の actorDid と statusChangedByDid を除く。
- controllerRequiredCount は appeal を開いた時点の transferPolicy と controllerDids snapshot から計算し、majority-controllers と recovery-fallback-majority では $\max(1, \lceil m / 2 \rceil)$、unanimous-controllers では $m$ とする。ここで $m$ は appeal open 時点の controllerDids 件数である。
- controllerReviewDueAt までは controller 側の review を優先し、recovery controller は通常時に直接 overrule しない。
- targetKind が ruling-event で、session.state が open / active / paused のときは controllerReviewDueAt を openedAt から 15 分後に固定する。
- それ以外の appeal では controllerReviewDueAt を openedAt から 24 時間後に固定する。
- controller の個別判断は appeal-review-entry に 1 action 1 record で積む。
- withdrawAppeal、escalateAppeal、resolveAppeal は caseRevision だけでなく current reviewRevision に対しても compare-and-set を行い、より新しい accepted reviewAppeal が先に入った場合は失敗して再試行する。
- controller-review phase の terminal 判定では reviewerDid ごとの latest effective approve 数と latest effective deny 数を別々に集計する。
- deny の終端は controller-review phase の latest effective deny 数が controllerRequiredCount 以上になったときに resolveAppeal で確定してよい。
- blocked 判定は 2 通りだけに固定する。1 つ目は quorum-impossible で、controllerEligibleDids の件数が controllerRequiredCount を下回るときに即時 blocked とする。2 つ目は deadline-expired で、controllerReviewDueAt 時点で controller-review phase の latest effective approve 数と latest effective deny 数のどちらも controllerRequiredCount に届いていないときに blocked とする。
- blockedReasonCode は quorum-impossible または deadline-expired の有限集合にする。
- blocked は persisted status ではなく、quorum-impossible または deadline-expired から導く派生状態とする。recovery-review への handoff は escalateAppeal が status を原子的に更新し、escalatedAt、escalatedByDid、escalateRequestId、recoveryEligibleDids を埋めて表す。
- participant view の nextResolverKind は controller-review / blocked / recovery-review / none の閉じた集合に固定する。blocked は blocked 判定後かつ recovery-review handoff 前後の待機状態、none は accepted / denied / withdrawn の terminal state にだけ使う。
- recoveryEligibleDids は escalateAppeal 時点の recoveryControllerDids snapshot を固定したものであり、recovery-review の間は再計算しない。recoveryAuthorityRequestId はその snapshot を切った時点の session-authority.requestId を指す。MVP では recoveryEligibleDids に含まれる 1 人の recovery controller による resolveAppeal を許す。
- MVP の session-authority は recoveryControllerDids 非空を前提にするため、blocked appeal に recovery sink が無い実装差を許さない。
- accepted または denied の quorum が成立した controller-review case は追加の controller-review entry を受け付けず、resolveAppeal で終端を確定する。
- quorum-impossible または deadline-expired に達した case は recovery-review へ速やかに handoff しなければならず、authority service が自動で escalateAppeal を実行してよい。explicit な escalateAppeal はその idempotent fallback として扱う。
- handoffSummary は blocked から recovery-review へ上げた participant-facing の説明を持ち、通常 view で escalatedAt と併せて返してよい。
- resultSummary は participant-facing の最終説明に限定し、accepted、denied、withdrawn の terminal outcome だけに使う。
- reviewOutcomeSummary は resolver-facing の redacted aggregate summary である。resolver view では persisted な snapshot があればそれを返し、snapshot がまだ無い controller-review 中は current reviewRevision に対する latest effective approve / deny から live aggregate を補助表示してよい。escalateAppeal または resolveAppeal は、その時点の aggregate string を appeal-case に固定して凍結してよい。participant view には出さず、audit view では raw appeal-review-entry を使う。
- listAppealCases の participant view では blockedReasonCode、nextResolverKind、handoffSummary、resultSummary を返し、resolver view ではそれに加えて reviewOutcomeSummary、controllerReviewDueAt、recoveryAuthorityRequestId を返してよい。
- detailEnvelopeRef は audit-only の詳細や controller ごとの補足説明を指してよい。
- withdraw は review action の撤回であり、appeal-case 自体の取り下げは withdrawAppeal で withdrawn 状態に遷移させる。
- withdrawAppeal は controller-review 中かつ escalatedAt が未設定で、controllerReviewDueAt を過ぎておらず、approve / deny の quorum が未成立の case に限って許可する。
- controllerResolutionRequestId は controller-review 下で accepted または denied を確定した terminal mutation を指す。
- recoveryResolutionRequestId は recovery-review 下で accepted または denied を確定した terminal mutation を指す。
- resolvedByDid は accepted または denied を確定した controller または recovery controller を durable に指す。
- recovery-review の resolveAppeal は、latest effective recovery-review appeal-review-entry を必須にし、その reviewDecisionKind は approve または deny でなければならない。resolver 自身がその entry の reviewerDid である必要はない。
- authority service が自動で escalateAppeal を実行した場合、escalatedByDid には session authority actor DID を入れてよい。
- denied 終端では domain record を変えないことも許すが、その場合でも appeal-case の status、resolvedAt、resultSummary は必ず更新する。
- resolveAppeal の domain correction は targetKind ごとに 1 系統へ固定する。membership target の accepted は superseding membership current head をちょうど 1 件だけ emit し、ruling-event target の accepted は supersedesRef 付き ruling-event をちょうど 1 件だけ emit する。appeal-case 自体を domain correction の正本にしない。
- accepted appeal が superseding ruling-event を emit する場合、その ruling-event.resultSummary は appeal-case.resultSummary から導出し、通常 surface に出る説明を食い違わせない。
- escalatedAt が入った後の handoffSummary は凍結し、後から説明を変えるときは同じ case を上書きせず、新しい audit detail か superseding domain record で扱う。
- resolvedAt または withdrawnAt が入った appeal-case の resultSummary と reviewOutcomeSummary は凍結し、後から説明を変えるときは同じ case を上書きせず、新しい appeal-case または superseding domain record で扱う。
- appeal の解決そのものは appeal-case 上で完結させず、accepted membership appeal では新しい membership 状態遷移、accepted ruling appeal では superseding ruling-event を canonical domain output とする。appeal-case はその lifecycle と requestId を追跡する。
- archived session でも、監査や correction のために appeal-case を開閉してよい。