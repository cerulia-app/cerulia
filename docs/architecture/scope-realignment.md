# スコープ再編の採用記録

## 文書の位置づけ

Cerulia のスコープ再編を記録するための採用記録。

## 採用した結論

Cerulia の製品スコープを PL 個人向けのキャラクター管理・セッション記録・共有サービスに固定する。

ここでいうサービスは次だけを扱う。

- character lineage（作成、分岐、成長、変換）
- session history（セッション経験の記録）
- campaign / house scope（長期卓、コミュニティ）
- scenario catalog（シナリオ台帳）
- rules provenance（ルールシステムとハウスルール）
- character-sheet-schema（キャラクターシートの型定義）

次は製品スコープに含めない。

- session の run authority
- membership と参加承認
- message / roll / ruling-event のような卓中イベント
- disclosure / secrets / handout
- board / realtime / replay
- appeal / governance / audit console
- アクセス制限
- publication（重厚な公開管理）

## hard boundary

- 全 record は原則公開。visibility: draft|public で AppView が表示制御
- 他人の DID や characterBranchRef を record に書かない
- session authority を core に入れない
- 既存サービスのスコープ（セッション進行等）をカバーしない

## なぜ campaign は残すのか

campaign はセッションのシリーズであり、長期卓の shared rule chain と共有文脈を束ねる anchor。ただし単発セッションが多数派であり、campaign はオプション。

campaign が担うのは次。
- shared rule chain の基準
- 複数セッションを束ねる文脈

campaign が担わないのは次。
- 参加承認
- 進行中の state 管理
