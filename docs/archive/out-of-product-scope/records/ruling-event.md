# ruling-event

## 役割

実プレイ中に session authority が下した裁定を表す durable record。何が要求され、どの ruleset と override chain で判断され、どの record が出力されたかをあとから説明できるようにする。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- requestId
- appealCaseRef
- actionKind
- actorDid
- normalizedActionRef
- rulesetNsid
- rulesetManifestRef
- ruleProfileRefs
- decisionKind
- audienceRef
- resultSummary
- detailEnvelopeRef
- emittedRecordRefs
- supersedesRef
- decidedByDid
- createdAt

## 更新主体

session authority。transport / auth / stale revision の reject は service log に残し、rules-resolved な accept、deny、manual correction だけを ruling-event にしてよい。

## 参照関係

- session
- ruleset-manifest
- rule-profile
- appeal-case
- audit-detail-envelope
- secret-envelope
- roll
- character-state
- board-op
- message
- redaction-event

## 設計上の注意

- ruling-event は requestId だけでは失われる authoritative decision を durable に残すための record である。
- one action が zero or more durable output を持てるようにし、emittedRecordRefs で複数 record を束ねる。
- deny であっても rules-resolved な判断なら ruling-event を作ってよい。emittedRecordRefs は空でよい。
- 誤裁定の correction は既存 ruling-event を上書きせず、supersedesRef 付きの新しい ruling-event を積む。
- supersedesRef を使う場合、参照先は同じ sessionRef と actionKind を持つ ruling-event に限る。normalizedActionRef がある場合は、その値も一致していなければならない。
- contested ruling は appeal-case を通して review し、accepted appeal は superseding ruling-event を emit する。
- resolveAppeal が ruling-event target を accepted で終端するときは、supersedesRef 付き ruling-event をちょうど 1 件だけ emit し、domain correction の canonical output を分岐させない。
- accepted appeal が superseding ruling-event を emit する場合、その resultSummary は対応する appeal-case.resultSummary に合わせる。
- appeal 由来の ruling-event では appealCaseRef を埋め、どの appeal-case で確定した superseding judgment かを逆参照できるようにする。
- resultSummary は通常 surface に出してよい説明を持ち、秘密の根拠や hidden state を含む詳細は detailEnvelopeRef に逃がす。