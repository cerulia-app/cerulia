# 秘匿 namespace

秘匿関連は app.cerulia.secret.* に寄せる。理由は、record本体の構造だけでなく、鍵世代、grant、reveal、redactionというライフサイクル全体をまとめて扱いたいからです。

## 推奨NSID一覧

| NSID | primary type | record-key | 用途 |
| --- | --- | --- | --- |
| app.cerulia.secret.audience | record | stable | 論理的な公開先 |
| app.cerulia.secret.audienceGrant | record | stable または tid | actorごとの復号権 |
| app.cerulia.secret.asset | record | stable | blobや外部URIのmetadata |
| app.cerulia.secret.handout | record | stable | 卓上資料の見せ方 |
| app.cerulia.secret.secretEnvelope | record | stable または tid | 暗号化payloadへの参照 |
| app.cerulia.secret.revealEvent | record | tid | 後公開の履歴 |
| app.cerulia.secret.redactionEvent | record | tid | 撤回や差し替えの履歴 |

## secret namespace に入れる理由

- message、roll、token、character-state から共通利用できる
- 暗号方式の変更や鍵世代の更新を閉じ込められる
- handout固有の概念と、より汎用的な secret-envelope を分けられる

## audience と grant の分離

audience は「誰向けか」という論理名であり、grant は「誰にどの鍵を配ったか」という実体です。この分離を崩すと、途中参加、追放、GM交代が急に難しくなる。

- derived audience は membership、role、session state の変更時に再計算し、その結果に合わせて grant を更新する。
- derived audience と membership / controller 連動 audience の key rotation は 3 パターンに固定する。effective recipient 集合が変わらない再計算では rotation しない。effective recipient 集合が縮む場合は新しい keyVersion と grant を先に揃えてから次の暗号文を出す。effective recipient 集合が広がるが past ciphertext を既定では見せたくない場合も、新しい keyVersion を切って新規 recipient にはその世代だけを配る。
- past ciphertext の共有は membership churn の副作用にせず、必要なら reveal、再暗号化、または明示的な backfill workflow で扱う。
- 公開replay の見え方は stale な grant ではなく reveal と redaction を反映した公開投影で決める。
- reveal の後に redaction が積まれた場合、通常の replay では redaction を優先し、audit では履歴を残す。