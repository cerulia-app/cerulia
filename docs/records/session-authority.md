# session-authority

## 役割

optional run extension が shared mutation を確定したいときに使う authority record。Cerulia core の必須 record ではなく、structured run の control plane を明示する補助 record である。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- authorityId
- gmAudienceRef
- controllerDids
- recoveryControllerDids
- leaseHolderDid
- leaseExpiresAt
- transferPolicy
- pendingControllerDids
- transferPhase
- transferStartedAt
- transferCompletedAt
- requestId
- updatedByDid
- changeReasonCode
- createdAt
- updatedAt

## 更新主体

現在のcontroller、または緊急時のrecovery controller。

## 参照関係

- session-authority 自身も sessionRef で session を逆参照する
- session が authorityRef として参照する
- appeal-case が extension dispute の審理主体として参照する
- appeal-review-entry が review trail の審理主体として参照する
- session-publication が session-backed carrier の governance 主体として参照する
- membership が role と controller の違いを補助する
- audience が gmAudienceRef として参照される

## 設計上の注意

- sessionRef を持たせて、1 つの authority がどの extension run を担当するかを逆引きできるようにする。
- GM role は gameplay 上の立場であり、controller は共有recordの確定権である。
- controller を単数前提にしない。共同GMや移譲を想定して配列にする。
- ownership の話ではなく、運用責任の話として扱う。
- transferPolicy は defs で閉じた型にし、MVP では majority-controllers、unanimous-controllers、recovery-fallback-majority のような有限集合から選ぶ。
- authority transfer は transferPhase を stable / preparing / rotating-grants / finalizing の有限集合で持つ。
- createSessionDraft は初期 `controllerDids` をそのまま actorDids に持つ explicit-members snapshot audience を初期 `gmAudienceRef` として必ず発行し、参照先 audience の `snapshotSourceRequestId` には生成された session-authority の `requestId` を pin する。
- gmAudienceRef は controller handoff の completion fence に使う dedicated audience を指し、explicit-members の snapshot に固定する。derived-membership を completion 判定に使ってはならず、参照先 audience は snapshotSourceRequestId を持たなければならない。
- pendingControllerDids は移譲先候補であり、transferCompletedAt までは外向けの有効 writer に含めない。
- requestId は現在の session-authority 版を確定した直近の governance mutation と service log を相関づける。
- recovery controller は通常時の moderation や live ruling を直接 overrule せず、extension dispute が blocked になったときだけ限定して関与する。
- recoveryControllerDids は continuity core の必須要件ではないが、MVP で session-authority / appeal workflow を採る session では非空を必須にする。blocked appeal と break-glass handoff の終着点を未定義にしないためである。
- blocked appeal は quorum-impossible または deadline-expired に限定し、appeal-case 側の controllerEligibleDids、controllerRequiredCount、controllerReviewDueAt と appeal-review-entry の latest effective approve / deny 集計で判定する。deadline-expired は approve と deny のどちらも requiredCount に届かない場合に限る。
- recovery controller が session-authority に対して更新できるのは、transfer 関連 field と blocked dispute の recovery-review provenance に限る。core publication や branch ownership は直接更新しない。
- lease で扱えるのは通常運用だけに限る。controller list の変更、transferPolicy の変更、session の ended / archived 遷移、ended からの再開は transferPolicy に従う controller 側の承認で扱う。
- 有効な lease が切れたら、新しい lease の確定または controller 側の再承認が済むまで新規 mutate を拒否する。
- 有効な lease 切れや controller 不在は live-play の break-glass 継続を意味しない。MVP では recovery controller が gameplay mutation を再開してはならず、運用上の回復経路は transferAuthority か controller 承認による close / reopen に限る。
- recovery controller は lease 失効または controller 不在時に、transfer 関連 field を更新する narrow な transferAuthority path だけを実行してよい。これは governance recovery に限り、accepted 後も gameplay mutation は controller 側の確定が済むまで再開しない。
- updatedByDid と changeReasonCode は直近の controller 側変更を示し、以前の変更は repo history で監査する。
- authority transfer は段階的に見えても、外から見た正本は原子的に切り替える。外向けの有効 writer は常に現在の controllerDids と有効な leaseHolderDid から読み、旧 controller は新しい controller 設定と GM only audience の再配布が両方そろうまで authoritative のままとする。
- transferStartedAt は pendingControllerDids を確定した時点で埋め、transferCompletedAt は controllerDids の切り替えと gmAudienceRef の再配布完了が揃った時点で埋める。
- accepted な transferAuthority は successor `gmAudienceRef` を explicit-members snapshot として再発行し、future GM-only ciphertext に必要な grant 更新まで含めて completion fence に入れる。controllerDids の切り替えだけ先に公開してはならない。
- transferAuthority の accepted ack で返す transferCompletedAt は、その時点で旧 controller が authoritative ではなく、gmAudienceRef の再配布も完了したことを示す completion witness として扱う。