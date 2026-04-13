# character-branch

## 役割

character-sheet から派生した、campaign/local な durable branch を表す record。分岐成長、外部シート由来の provenance、恒久 override を受ける層になる。

## 置き場所

基本は owner の個人 repo。

## 主なフィールド

- ownerDid
- baseSheetRef
- branchKind
- branchLabel
- overridePayloadRef
- importedFrom
- sourceRevision
- syncMode
- requestId
- revision
- createdAt
- updatedAt
- updatedByDid
- retiredAt

## 更新主体

branch owner のみ。

## 参照関係

- character-sheet
- character-advancement
- session（session.participantEntries から参照される）
- publication

## 設計上の注意

- branch は所有権の移譲ではなく、baseSheetRef から派生した履歴レイヤーである
- same baseSheetRef から複数 branch を作ることで、同じキャラの複数 campaign 分岐を表現できる
- branch は publication / reuse の durable subject なので、branchRef 自体は安定 object として扱う。branch metadata の更新で branchRef を差し替えない
- imported provenance と durable な local override は branch に置く。外部 context の一時状態は product-core に含めない
- importedFrom と sourceRevision は provenance を表す field であり、外部元を live canonical source とみなすことを意味しない
- ruleset をまたぐ変換で生じた target branch は durable な reuse / publication subject であり、変換 provenance 自体は character-conversion で残す
- syncMode は snapshot、manual-rebase、pinned-upstream のような閉じた値で持ち、自動同期の有無を曖昧にしない
- character の canonical 解決順は、imported base、branch override、active な advancement sequence の順とする
- branch override は sourceRevision が指す imported snapshot に対して適用する。base を進められるのは manual-rebase か、明示的な import-sync entry のときだけにする
- revision は createCharacterBranch で 1 から始め、branchLabel、overridePayloadRef、importedFrom、sourceRevision、syncMode の accepted metadata update ごとに 1 ずつ増やす
- campaign-less な local branch は正当な first state である。campaign への結びつきは session.campaignRef で表現される
- retired branch の direct link は current branch detail と同一視せず、AppView 上では read-only historical detail または explanatory tombstone として扱う
