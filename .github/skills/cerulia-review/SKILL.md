---
name: cerulia-review
description: "Use when: Cerulia の review を実装、AppView、records/lexicon、architecture、運用、GM/PL/コミュニティ運用の観点まで含めて進めたいとき。まず自分で対象を読み、scope と candidate hypotheses を作ってから、Cerulia レビュー集約 agent を exact name で呼び、できるだけ多くの relevant reviewer agents を並列実行して生の報告を保持したまま受け取る。Use for: integrated review, appview review, backend review, docs review, records review, review planning."
argument-hint: "レビュー対象、変更範囲、priority concerns、気になっている仮説、深さを書く。未指定なら scope を先に絞る。"
---

# Cerulia Review

Review the target first. Define scope, risks, and candidate hypotheses before invoking Cerulia レビュー集約.

## Workflow

1. Read the relevant code, tests, docs, config, records, and routes.
2. Define scope and list candidate hypotheses.
3. Invoke Cerulia レビュー集約 with scope, concerns, hypotheses, and depth.
4. Re-check the highest-risk findings against primary sources.
5. Fix findings now if they are non-blockers today but are likely to create long-term cost, drift, or regressions.

## Request Shape

- Scope
- Priority concerns
- Candidate hypotheses
- Depth

## Prompt Template

```text
Review this Cerulia scope: {scope}.

Priority concerns: {concerns or "none specified"}.

Candidate hypotheses from first-pass review: {hypotheses or "none yet"}.

Depth: {quick|medium|thorough or equivalent}.

Select the broadest materially relevant reviewer set, prefer parallel execution, merge only truly identical findings, classify findings as blocker or non-blocker, and recommend next steps that address root causes rather than minimal local patches.
```

## Quality Bar

- Do a first-pass review before orchestration.
- Do not narrow reviewer coverage unless a lens is clearly irrelevant.
- Re-check the most important findings against source material.
- Fix non-blocker issues now when they are likely to create long-term cost or drift.
- Keep the final review concise and findings-first.

## Example Prompts

- /cerulia-review internal/authz と internal/core/projection を中心に、権限境界と projection contract のズレ仮説を立ててからレビュー
- /cerulia-review appview/src/routes/publication と appview/tests を対象に、public/private lens leakage 仮説込みで thorough review
- /cerulia-review docs/architecture と docs/records を対象に、設計境界と record lifecycle の矛盾仮説を作ってからレビュー
- /cerulia-review この PR 全体を対象に、まず一次レビューで怪しい境界を仮説化してから広く並列レビュー