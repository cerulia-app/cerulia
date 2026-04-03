---
name: cerulia-implementation-review
description: "Cerulia の実装レビューを統合したいときに使う。Go review、AT Protocol review、security review、consistency review、test validity review、deployment and operations review の各 reviewer agent を選択的に呼び出し、重複を整理して優先度付きで返す。Use for: integrated review, repo-wide review, PR review, package review, multi-perspective code review."
argument-hint: "レビュー対象の package、PR、変更範囲、懸念点、深さを書く。未指定なら Cerulia 全体から relevant な reviewer agents を選んで統合レビューする。"
---

# Cerulia Implementation Review

Cerulia の実装を複数観点でレビューし、専門レビュアー agent の所見を重複なく統合して返す Skill です。

## When to Use
- Cerulia の PR や変更セットを複数観点でまとめてレビューしたいとき
- package 単位の変更を Go、protocol、tests、operations まで含めて確認したいとき
- README、docs、config、HTTP surface、deploy 前提と実装のズレを一緒に見たいとき
- 個別レビュー agent の結果を人手でマージせず、統合された優先順位付きの指摘がほしいとき

## Reviewer Agents
- Cerulia Go 実装レビュー: Go の実装品質、package 境界、context、error handling、config、resource lifecycle を見る
- Cerulia AT Protocol 実装レビュー: identity、repo ownership、XRPC、lexicon surface、record authority、auth 前提を見る
- Cerulia セキュリティ / 脆弱性レビュー: 認証/認可、権限境界、secret handling、audit export 分離、surface 間の漏えい防止を見る
- Cerulia 実装整合性レビュー: README、planning docs、config、HTTP surface、environment contract との整合性を見る
- Cerulia テスト妥当性レビュー: テストの正当性、境界条件、失敗ケース、保守性、網羅性を見る
- Cerulia デプロイ / 運用レビュー: Cloud Run、Neon、R2、Secret Manager、GitHub Actions、local compose 前提の deployability と運用復旧を見る

## Procedure
1. レビュー対象の scope を確定する。package、PR、runtime path、API surface、repo-wide review のどれかを明確にする。
2. 次の branching で reviewer agents を選ぶ。
   - repo-wide review、広い PR、または境界をまたぐ変更なら 6 つすべてを呼び出す。
   - Go package や lifecycle の変更なら Cerulia Go 実装レビュー と Cerulia テスト妥当性レビュー を基本にし、docs や config 契約が絡むときは Cerulia 実装整合性レビュー を足す。認証/認可、secret、外部入力、export path の安全性が絡むなら Cerulia セキュリティ / 脆弱性レビュー を足す。startup、env、deploy に触れるなら Cerulia デプロイ / 運用レビュー も足す。
   - protocol-facing な API、auth、record、lexicon、reference shape の変更なら Cerulia AT Protocol 実装レビュー を必ず含め、実装面の妥当性確認として Cerulia Go 実装レビュー と Cerulia テスト妥当性レビュー を追加する。権限境界、surface ごとの redaction、raw export 分離が絡むなら Cerulia セキュリティ / 脆弱性レビュー も追加する。契約や docs の主張も変わるなら Cerulia 実装整合性レビュー も追加する。
   - auth、secret disclosure、audit export、public/participant/governance/audit lens、blob/object storage、外部入力境界の変更なら Cerulia セキュリティ / 脆弱性レビュー を必ず含める。実装コードが主因なら Cerulia Go 実装レビュー、protocol-facing surface なら Cerulia AT Protocol 実装レビュー、運用や secret 配布が絡むなら Cerulia デプロイ / 運用レビュー を追加する。
   - config、startup、environment contract、deploy 導線の変更なら Cerulia デプロイ / 運用レビュー と Cerulia 実装整合性レビュー を基本にし、実装コードが主因なら Cerulia Go 実装レビュー を追加する。secret 配置や bucket 分離、権限誤設定が懸念なら Cerulia セキュリティ / 脆弱性レビュー も加える。既存テストや追加すべきテストがあるなら Cerulia テスト妥当性レビュー も加える。
   - docs や contract drift の確認が主題なら Cerulia 実装整合性レビュー を中心にし、影響を受ける実装面の reviewer agent を追加する。
3. 選んだ各 reviewer agent に、同じ scope、ユーザーの懸念点、期待する深さをそのまま渡してレビューさせる。狭い質問で過剰に全 agent を呼ばない。
4. 返ってきた findings を root cause 単位で統合する。同じ問題を複数観点が指摘している場合は重複を消し、重なり自体に意味があるときだけ Cross-Cutting Notes に残す。
5. 重大度と実装リスクで並べ替え、開発者が今対応すべき短いリストに圧縮する。意味のある問題が残らなければ、そのことを明示する。
6. どの reviewer agents を走らせ、どこを見たかを Coverage に書く。必要な reviewer agent を実行できなかった場合も黙って省略せず Coverage で明示する。

## Quality Bar
- cosmetic な重複や観点違いをそのまま並べない
- severity は style ではなく correctness、保守性、運用リスク、将来の再設計コストで決める
- 各 finding には Why it matters now、Evidence、Minimal next action を含める
- Cross-Cutting Notes には複数 reviewer が同じ根本問題を指したときだけ書く
- Open Questions には統合判断を妨げる未確認点だけを書く
- Coverage には実行した reviewer agents と対象範囲を必ず書く

## Output Format
## Findings
- [high|medium|low][reviewer] Short title
- Why it matters now
- Evidence
- Minimal next action

## Cross-Cutting Notes
- Where multiple reviewers point to the same root cause

## Open Questions
- What still blocks a confident integrated review

## Coverage
- Which reviewers ran and what they reviewed

## Example Prompts
- /cerulia-implementation-review internal/platform/config と internal/platform/httpserver を中心に、Go と deploy 観点でレビュー
- /cerulia-implementation-review auth と record handling の実装を AT Protocol と test 妥当性込みでレビュー
- /cerulia-implementation-review 認証/認可 と getAuditView/exportServiceLog 周辺を security、Go、test 観点でレビュー
- /cerulia-implementation-review この PR 全体を 6 観点でレビューして、重複をまとめて優先度順に返す
