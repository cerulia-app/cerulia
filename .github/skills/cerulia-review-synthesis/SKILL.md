---
name: cerulia-review-synthesis
description: "Use when: Cerulia の設計文書レビューを複数の専用エージェントで実行し、結果を統合したいとき。architecture、records/lexicon、GM運用、一般PL、コミュニティ運営の 5 観点を横断し、各エージェントの最小改善案を少なくとも 4 案に広げて比較し、AT Protocol の哲学と Cerulia の哲学・アーキテクチャに最も沿う選択肢を選ぶ。レビュー統合、改善案比較、設計の網羅性確認に使う。"
argument-hint: "レビュー対象、疑っている前提、重点シナリオを書く。未指定なら README と docs 全体を横断する。"
---

# Cerulia Review Synthesis

この skill は subagent の結果を受け取ってから考え始めるのではなく、先に自分で設計文書を読み、候補となる設計ギャップや判断 fork の仮説を立てたうえで、その検証と補完のために review agents を使う。

## When to Use

- Cerulia の設計文書を 1 回で多面的にレビューしたいとき
- 個別レビューエージェントの出力を統合して、重複や矛盾を整理したいとき
- 各エージェントが出した最小改善案をそのまま採用せず、複数案を比較してより良い案を選びたいとき
- player trust、GM operability、community governance と architecture consistency を同時に見たいとき

## Required Review Agents

Run these workspace agents as subagents. Use the exact names below.

- Cerulia 設計整合性レビュー
- Cerulia Records/Lexicon レビュー
- Cerulia GM運用レビュー
- Cerulia 一般PLレビュー
- Cerulia コミュニティ運営レビュー

## Core Sources To Re-read During Synthesis

Always treat these files as the normative anchors when selecting the final recommendation.

- docs/README.md
- docs/architecture/philosophy.md
- docs/architecture/decisions.md
- docs/architecture/layers.md
- docs/architecture/authority.md
- docs/architecture/secrets.md
- docs/architecture/edge-cases.md
- docs/architecture/mvp.md

Use affected records and lexicon files as supporting evidence when a finding touches schema or protocol surface.

## Procedure

1. Define scope.
   - If the user specifies files, records, or scenarios, pass that scope through unchanged.
   - If the user gives only a broad request, default to README and all files under docs/architecture, docs/records, and docs/lexicon.
   - If the user emphasizes a scenario such as GM handoff, spectator replay, expulsion, or secret handling, repeat that emphasis in every subagent prompt.

2. Perform a first-pass review yourself.
   - Read the scope and the core anchor docs first.
   - Extract the core claims, invariants, likely tensions, and candidate design gaps.
   - Write down provisional hypotheses about what is contradictory, underspecified, operationally risky, or likely to need redesign.

3. Launch all five review agents.
   - Prefer parallel execution.
   - Give each subagent the same review scope plus any scenario emphasis.
   - Pass your provisional hypotheses to every subagent and ask them to confirm, refute, refine, or replace them.
   - Treat the architecture and records agents as design-lens reviewers, but treat the GM, player, and community agents as end-user-lens reviewers who are not assumed to know AT Protocol internals.
   - Ask each subagent to keep findings first, include the minimal improvement for every finding, and cite the files or design claims it relied on.

4. Normalize the raw outputs.
   - Merge duplicate findings that describe the same underlying design gap.
   - Fold your own first-pass hypotheses into the same normalization step instead of treating subagent output as the only source of truth.
   - Preserve which perspectives raised the issue.
   - Keep perspective-specific concerns separate when the risk differs for GM, player, moderator, or architecture even if the same files are involved.

5. Re-check the merged findings against the core sources.
   - Re-read the anchor documents yourself before choosing a recommendation.
   - Verify that the subagent evidence is actually supported by the docs.
   - Verify that your first-pass hypotheses still hold after the subagent feedback.
   - If two subagents disagree, resolve the disagreement by returning to the docs instead of averaging their opinions.

6. Expand each proposed fix into at least four alternatives.
   - Start with the strongest minimal improvement proposed by the subagents.
   - Add enough distinct alternatives to reach four or more options.
   - Prefer alternatives from different change shapes: wording clarification, policy/rule change, record or lexicon change, workflow safeguard, authority or AppView boundary adjustment.
   - Reject fake variety. Four options that all say the same thing with different phrasing do not count.

7. Score the alternatives using the [selection rubric](./references/selection-rubric.md).
   - Apply the hard gates first.
   - Then compare the surviving options across architecture fit, AT Protocol fit, secrecy and authority fit, operational clarity, governance clarity, auditability, and migration blast radius.
   - Prefer the option that closes the design gap with the smallest durable change while preserving the architecture's stated invariants.

8. Select the best recommendation.
   - State which alternative you selected.
   - Explain why it is better than the other options, not just why it is good in isolation.
   - If no alternative survives the hard gates, report the issue as an unresolved design fork instead of forcing a choice.

9. Produce an integrated review.
   - Findings come first.
   - Keep the review focused on contradictions, missing invariants, trust gaps, operational fragility, schema gaps, or governance ambiguity.
   - Do not drift into prose polish, UI brainstorming, or unrelated implementation ideas.

## Standard Subagent Prompt Shape

Use this structure when invoking each review agent.

```text
Review this Cerulia design scope: {scope}.

Priority scenarios: {scenarios or "none specified"}.

Candidate hypotheses from first-pass review: {hypotheses or "none yet"}.

Use your specialized review lens. If you are the GM, player, or community review agent, assume no AT Protocol expertise and judge from user-visible expectations, explanations, and operational legibility rather than protocol correctness. Findings first. For every finding, include the smallest plausible improvement that would reduce the risk without redesigning the whole system. Explicitly say whether each supplied hypothesis is confirmed, refuted, or needs reframing. Cite the files or design claims you relied on. Keep coverage explicit.
```

## Output Format

## Executive Summary
- 2 to 5 lines on the highest-risk gaps and the main recommendation themes

## Integrated Findings
- [high|medium|low] Short title
- Affected perspectives
- Why it matters
- Evidence from the docs
- Alternatives considered
- Selected improvement
- Why this option best fits AT Protocol and Cerulia architecture
- Remaining tradeoffs or residual risk

## Cross-Cutting Open Questions
- Questions that still block a confident decision after synthesis

## Coverage
- Which subagents ran
- Which files or scenarios were covered
- Which areas were intentionally not reviewed

## Completion Checks

Before finishing, confirm all of the following.

- All five review agents were run or any missing agent is explicitly explained as a blocker.
- A first-pass self-review was performed before subagent execution, and its hypotheses were re-checked after synthesis.
- Each final recommendation was chosen from at least four distinct alternatives.
- The chosen option was checked against AT Protocol fit and Cerulia architecture fit, not just convenience.
- No chosen option collapses session into an actor, merges OAuth permissions with session roles, reduces secrecy to label-only, or stores ephemeral board motion as durable history.
- Duplicated findings were merged and perspective-specific risks were preserved.