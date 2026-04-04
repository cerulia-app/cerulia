---
name: cerulia-appview-review
description: "Cerulia の AppView レビューを統合したいときに使う。AppView implementation review、boundary review、debuggability review、UI/UX review、test validity review の各 reviewer agent を選択的に呼び出し、重複を整理して優先度付きで返す。Use for: integrated frontend review, AppView PR review, route review, Svelte review, UI review, boundary review, debuggability review, frontend test review."
argument-hint: "レビュー対象の route、component、PR、変更範囲、懸念点、深さを書く。未指定なら appview 変更全体から relevant な reviewer agents を選んで統合レビューする。"
---

# Cerulia AppView Review

Cerulia の AppView を複数観点でレビューし、専門レビュアー agent の所見を重複なく統合して返す Skill です。

## When to Use
- Cerulia の AppView PR や変更セットを、Svelte 実装、frontend boundary、debuggability、UI/UX、tests までまとめてレビューしたいとき
- route や screen 単位の変更について、どの reviewer agent を呼ぶべきか自分で選ばずに済ませたいとき
- AppView が backend projection の写像であり続けているかを、UI 品質やテスト妥当性と合わせて確認したいとき
- 無意味な fallback、swallowed error、曖昧な mutation feedback、mobile 崩れ、a11y 抜けを一緒に洗いたいとき
- 個別 reviewer agent の結果を人手でマージせず、統合された優先順位付きの指摘がほしいとき

## Reviewer Agents
- Cerulia AppView 実装レビュー: Svelte、TypeScript、CSS、responsive、accessibility、state management、mutation feedback の実装品質を見る
- Cerulia AppView 境界レビュー: frontend が current edition、publication truth、permission、lens、archive state を再定義していないかを見る
- Cerulia AppView デバッグ性レビュー: hidden fallback、swallowed error、opaque loading、silent coercion、duplicated state を見る
- Cerulia AppView UI/UX レビュー: シンプルさ、Bluesky に着想を得た clarity、copy、navigation、desktop/mobile、accessibility を見る
- Cerulia AppView テスト妥当性レビュー: route contract、lens boundary、mutation feedback、responsive、a11y、tombstone、error state を捕まえられるかを見る

## Core Sources To Re-read During Review

Always treat these files as the normative anchors when AppView intent or severity is unclear.

- docs/appview/README.md
- docs/appview/layer-boundaries.md
- docs/appview/ui-ux-requirements.md
- docs/appview/design-system.md
- docs/appview/test-plan.md
- docs/architecture/philosophy.md
- docs/architecture/layers.md
- docs/architecture/overview.md

Use affected routes, load functions, components, tests, and styles as the primary evidence. Re-read the docs only when the intended UI or boundary contract is unclear.

## Procedure
1. レビュー対象の scope を確定する。route、component、layout、load、form action、browser test、PR、repo-wide AppView review のどれかを明確にする。
2. 次の branching で reviewer agents を選ぶ。
   - appview 全体、広い PR、複数 route、shared shell、または境界と UI の両方にまたがる変更なら 5 つすべてを呼び出す。
   - Svelte component、load function、form action、state wiring、style 実装が主題なら Cerulia AppView 実装レビュー を基本にし、local state が projection truth を再構成していそうなら Cerulia AppView 境界レビュー を足す。loading、error、mutation feedback が曖昧なら Cerulia AppView デバッグ性レビュー を足す。見た目や操作導線が変わるなら Cerulia AppView UI/UX レビュー も足す。テスト追加や既存テストの信頼性が論点なら Cerulia AppView テスト妥当性レビュー も加える。
   - current edition、publication truth、permission、reader lens、archive split、draft と accepted の境界、public/private の露出範囲が主題なら Cerulia AppView 境界レビュー を必ず含める。fallback や truth reconstruction が絡むなら Cerulia AppView デバッグ性レビュー も追加する。UI copy や layout で境界がぼやけるなら Cerulia AppView UI/UX レビュー も追加する。テストでその境界を守れているかが論点なら Cerulia AppView テスト妥当性レビュー も加える。
   - hidden fallback、swallowed error、catch-and-continue、empty default data、optional chaining だらけの読み流し、opaque loading、mutation 失敗の曖昧表示が主題なら Cerulia AppView デバッグ性レビュー を必ず含める。契約の握りつぶしなら Cerulia AppView 境界レビュー を追加し、UI 上で失敗の見え方が悪いなら Cerulia AppView UI/UX レビュー を追加する。実装コードが主因なら Cerulia AppView 実装レビュー も加える。テストがその失敗を検知できるかを見るなら Cerulia AppView テスト妥当性レビュー を加える。
   - screen 構成、copy、navigation、mode badge、archive notice、CTA、desktop/mobile layout、keyboard path、screen reader text が主題なら Cerulia AppView UI/UX レビュー を基本にし、見た目が backend semantics をぼかすなら Cerulia AppView 境界レビュー を足す。実装上の崩れや CSS の脆さが主因なら Cerulia AppView 実装レビュー も追加する。該当 UI の browser test や a11y coverage が論点なら Cerulia AppView テスト妥当性レビュー も加える。
   - browser test、route integration test、mutation feedback test、responsive test、a11y test、fixture、mock、coverage が主題なら Cerulia AppView テスト妥当性レビュー を基本にする。テスト対象の実装が怪しいなら Cerulia AppView 実装レビュー、境界前提が怪しいなら Cerulia AppView 境界レビュー、失敗状態の観測性が怪しいなら Cerulia AppView デバッグ性レビュー、UI 要件とのズレが怪しいなら Cerulia AppView UI/UX レビュー を追加する。
3. 選んだ各 reviewer agent に、同じ scope、ユーザーの懸念点、期待する深さをそのまま渡してレビューさせる。狭い質問で過剰に全 agent を呼ばない。
4. findings を root cause 単位で統合する。同じ問題を複数観点が指摘している場合は重複を消し、重なり自体に意味があるときだけ Cross-Cutting Notes に残す。
5. 重大度と修正優先度で並べ替える。特に frontend-local truth reconstruction、public/private lens leakage、archive/current 混同、debuggability を壊す silent fallback は、単なる style 問題へ格下げしない。
6. 開発者が今対応すべき短いリストに圧縮する。意味のある問題が残らなければ、そのことを明示する。
7. どの reviewer agents を走らせ、どこを見たかを Coverage に書く。必要な reviewer agent を実行できなかった場合も黙って省略せず Coverage で明示する。

## Standard Subagent Prompt Shape

Use this structure when invoking each review agent.

```text
Review this Cerulia AppView scope: {scope}.

Priority concerns: {concerns or "none specified"}.

Review from your specialized AppView lens. Findings first. Prefer real correctness, boundary, debuggability, usability, or test-confidence risks over generic frontend advice. For every finding, include the smallest plausible improvement that would reduce the risk without redesigning the whole surface. Cite the files, routes, tests, or docs you relied on. Keep coverage explicit.
```

## Quality Bar
- cosmetic な重複や観点違いをそのまま並べない
- severity は style ではなく correctness、boundary fit、debuggability、usability、test confidence、release risk で決める
- frontend-local truth reconstruction、meaningless fallback、swallowed error、public/private lens leakage、archive/current grammar 混同を軽い指摘に落とさない
- mobile、keyboard、screen reader を見ない UI review は不十分と扱う
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
- /cerulia-appview-review appview/src/routes/home と shared shell を中心に、boundary と UI/UX を重点レビュー
- /cerulia-appview-review この AppView PR 全体を 5 観点でレビューして、重複をまとめて優先度順に返す
- /cerulia-appview-review publication detail と tombstone 周辺を debugability と test 妥当性込みでレビュー
- /cerulia-appview-review current edition と archive split が frontend で再定義されていないか確認して
- /cerulia-appview-review mobile での /home と /characters の導線を UI/UX、実装、test 観点でレビュー

## Completion Checks

Before finishing, confirm all of the following.

- Relevant reviewer agents were run or any omitted agent is explicitly explained in Coverage.
- Duplicated findings were merged and perspective-specific risks were preserved.
- The final output does not hide boundary violations or debuggability regressions inside generic style feedback.
- The review explicitly checks whether AppView remains a mapping of backend projection and mutation results rather than inventing local truth.
- The review does not ignore mobile, keyboard, or screen-reader implications when the change affects UI.