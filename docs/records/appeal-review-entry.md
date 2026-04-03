# appeal-review-entry

## 役割

controller または recovery controller が appeal-case に対して行った個別 review action を表す append-only record。承認、否認、棄権、撤回を durable に残し、quorum と blocked 判定の正本にする。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- appealCaseRef
- sessionRef
- reviewPhaseKind
- reviewerDid
- reviewDecisionKind
- caseRevision
- reviewRevision
- supersedesRef
- detailEnvelopeRef
- requestId
- note
- createdAt

## 更新主体

controller-review 中は controllerEligibleDids に含まれる controller、recovery-review 中は recovery controller が書く。

## 参照関係

- appeal-case
- session-authority

## 設計上の注意

- 1 reviewer の 1 action を 1 record にする。1 appeal を 1 record にまとめない。
- reviewDecisionKind は approve、deny、abstain、withdraw の有限集合にする。
- ここでの withdraw は reviewer が自分の直前 review action を撤回する意味に限る。appeal-case 自体の取り下げとは別物である。
- recovery-review phase では reviewDecisionKind を approve または deny に限定し、abstain / withdraw は controller-review phase にだけ使う。
- reviewer が同じ phase で判断を変えるときは、新しい entry を積み、supersedesRef で直前の自分の entry を参照する。
- supersedesRef を使う場合、参照先は同じ appealCaseRef、sessionRef、reviewPhaseKind、reviewerDid を持つ appeal-review-entry に限る。
- withdraw entry では supersedesRef を必須にし、その reviewer / phase の直前 latest effective entry を打ち消す。
- 同じ reviewerDid と reviewPhaseKind について、superseded されていない最新 entry だけを latest effective entry とみなす。
- caseRevision は reviewAppeal が受理された時点で検証した appeal-case.caseRevision を保持する。
- reviewRevision は reviewAppeal が受理された結果として採番された appeal-case.reviewRevision を保持する。
- controller-review phase の terminal 判定では reviewerDid ごとの latest effective approve 数と latest effective deny 数を別々に集計する。approve は accepted path、deny は denied path に使い、abstain と withdraw はどちらの terminal count にも入れない。
- transport の重複、競合、権限不足による reject は appeal-review-entry にせず、service log に残す。
- note は短い review note に留め、監査専用の補足理由や証跡は detailEnvelopeRef に逃がしてよい。
- reviewAppeal は append-only entry を追加する前に current caseRevision を open-state fence として原子的に検証し、その検証済み caseRevision を entry に保存する。stale caseRevision や終端済み case への追記を reject する。
- reviewAppeal は current reviewRevision に対しても原子的に compare-and-set し、受理された entry の reviewRevision を 1 つ進める。新しい review が先に入った場合は stale review として reject する。
- controller-review phase では controllerReviewDueAt を過ぎて受信した reviewAppeal を reject し、サーバ受信時刻だけを cutoff に使う。
- recovery-review phase の entry は quorum 形成用ではなく、blocked appeal を recovery controller がどう処理したかの監査 trail として使う。
- recovery-review の terminal resolveAppeal は、対応する latest effective recovery-review entry を前提にし、その reviewDecisionKind は approve または deny でなければならない。その trail なしで終端してはならない。