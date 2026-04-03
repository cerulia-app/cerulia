# audience

## 役割

秘匿の論理的な公開先を表すrecord。GM only、参加者全体、特定PLのみ、観戦者向けなどのまとまりを作る。

## 置き場所

session authority actor のrepo。

## 主なフィールド

- sessionRef
- audienceId
- audienceKind
- title
- selectorPolicy
- snapshotSourceRequestId
- requestId
- keyVersion
- status
- updatedByDid
- statusReasonCode
- createdAt
- updatedAt

## 更新主体

session authority。

## 参照関係

- audience-grant
- secret-envelope
- handout
- message
- roll

## 設計上の注意

- audience は論理グループであり、平文本文そのものではない。
- role ベースの audience と、明示リスト型 audience の両方を扱えるようにする。
- selectorPolicy は kind 付きの閉じた構造にし、audienceKind と整合させる。
- audienceKind と selectorPolicy.kind の対応は defs の canonical mapping に従い、1:1 で扱う。
- role-based audience の selectorPolicy は role 名と必要最小限の membership 条件だけを持つ。
- explicit audience の selectorPolicy は actorDids を構造的に持ち、grant record から逆算しない。
- authority handoff の completion fence に使う audience は explicit-members の snapshot に固定し、derived-membership を completion 判定に使わない。
- explicit-members snapshot audience を durable に残すときは snapshotSourceRequestId を必須にし、その snapshot を切った authority または membership 側の requestId を pin する。
- requestId は rotateAudienceKey のような mutation で現在の audience 版を確定した直近要求と service log を相関づける。
- updatedByDid と statusReasonCode は audience の status 遷移や keyVersion 周りの重要変更をレコード単体で説明するために使ってよい。
- 誰が実際に復号できるかは audience-grant で確定する。
- audienceKind が derived のとき、selectorPolicy は membership、role、session state から機械的に計算できるものに限る。
- derived audience は membership、role、session state の変更時に再計算し、その結果に合わせて audience-grant を更新する。
- derived audience は snapshotSourceRequestId を持ってはならない。
- keyVersion は、将来の暗号文を読める集合が変わるとき、または暗号方式を変えるときだけ更新する。
- derived audience と membership / controller 連動 audience の keyVersion 運用は次の matrix に固定する。effective recipient 集合が変わらない再計算では keyVersion を更新しない。effective recipient 集合が縮む場合は、次の暗号文を出す前に keyVersion を更新し、旧 grant を revoke し、残る recipient へ新しい grant を配る。effective recipient 集合が広がるが過去 ciphertext を既定では見せたくない場合も、次の暗号文を出す前に keyVersion を更新し、新規 recipient には新しい keyVersion だけを配る。
- 過去 ciphertext の backfill は membership churn の副作用にせず、必要なら reveal、再暗号化、または明示的な backfill workflow で扱う。
- controller / GM handoff で GM-only 系 audience の有効集合が変わる場合は、上記の shrink / expand ルールをそのまま適用する。
- spectator 向け可視性は、参加者全体 audience とは別 audience に切り出す。

## status の既定値

- active: 新しい grant と新しい暗号文を発行してよい。
- rotating: keyVersion 更新中で、新旧 grant の入れ替えを進めている。
- retired: 既存 ciphertext の参照だけを残し、新しい暗号文は発行しない。