---
name: subagent-implementation-scope
description: "Use when: implementation plan is complete and code changes should be delegated to subagents. Enforces subagent implementation, context isolation, minimal independent scopes, GPT-5.4 model selection, parallel editing, and Review Orchestrator loops."
---

# Subagent Implementation Scope

Use this skill after an implementation plan is complete and before any code change starts.

The purpose is to keep implementation context isolated. The main agent owns planning, coordination, review orchestration, and final reporting. Subagents own code edits inside explicitly bounded scopes. This prevents unrelated edit logs and reasoning paths from polluting the context used for later implementation and review decisions.

## Mandatory Policy

- The main agent must not edit product code for the planned implementation.
- The main agent may read files, inspect diffs, run tests, start Review Orchestrator, and summarize results.
- The main agent may edit coordination artifacts only when the user explicitly requested customization or planning artifacts.
- Each code-changing subagent must receive one independent, minimal scope and must report changed files, verification commands, unresolved risks, and any assumptions.
- The main agent must run `Review Orchestrator` after receiving subagent completion reports.
- If review finds issues, the main agent must start a new subagent in a fresh context for the fix. Do not reuse the previous implementation context as the fixing context.

## Scope Partitioning

Partition work into the smallest scopes that require serial editing.

A scope is serial only when one edit depends on the result of another edit in the same conceptual unit. If two edits can be made and verified independently, split them into separate scopes even if they belong to the same feature.

Use these checks before launching subagents:

1. Identify the behavior or contract each scope changes.
2. List the files each scope is expected to touch.
3. Mark dependencies between scopes as `none`, `must follow`, or `may run in parallel`.
4. Split any scope that contains unrelated decision points.
5. Keep cross-package or cross-layer work together only when separating it would require duplicated design decisions.

## Delegation Procedure

1. Confirm the implementation plan is complete enough to assign code-changing work.
2. Convert the plan into minimal independent scopes.
3. For each scope, write a subagent prompt that includes the minimum required context defined below.
4. Launch independent scopes in parallel when the tool supports it and the scopes do not edit the same files.
5. Wait for all code-changing subagents for the current wave to finish.
6. Inspect reported changes and run only the additional verification needed to integrate the results.
7. Run `Review Orchestrator` from the main agent with the implementation goals, changed files, verification evidence, and subagent reports.
8. If review returns findings, create new fix scopes and launch fresh subagents. Repeat review until no blocking findings remain or the task is genuinely blocked.
9. Finalize only after the main agent has summarized changed files, verification, review status, and remaining risks.

## Minimum Subagent Context

Each code-changing subagent prompt must contain only the context needed to complete its assigned scope. Do not include unrelated edit history, discarded approaches, review discussion from other scopes, or implementation details from independent scopes.

Include these fields:

- `Overall purpose`: the high-level product or engineering goal and any global constraints that this scope must respect.
- `Scope purpose`: why this specific scope exists.
- `Done`: observable completion conditions for this scope.
- `Editable files`: exact file paths the subagent may edit, or the narrowest directory paths when exact files are not known yet.
- `Reference material`: design documents, existing code locations, tests, fixtures, or contracts the subagent must read before editing.
- `Out of scope`: files, directories, behaviors, refactors, or decisions the subagent must not touch.
- `Verification`: commands or checks the subagent should run, plus any checks the main agent will run after integration.
- `Report format`: changed files, important decisions, verification results, assumptions, unresolved issues, and risks.

If any field is unknown, the main agent must either narrow the scope before launching the subagent or explicitly mark the unknown as an assumption the subagent must verify before editing.

## Model Selection

- For normal code-changing implementation scopes, use `GPT-5.4 (copilot)` when invoking a generic subagent.
- For currently defined custom agents that already specify their model in frontmatter, call the agent without a `model` argument.
- For lightweight mechanical edits across multiple files that require no judgment, such as replacing repeated code with an already-defined helper, use `GPT-5.4 mini (copilot)`.
- If a mechanical edit targets 20 or more files, launch at least 5 subagents in parallel and assign each subagent 4 to 10 files.

## Review Orchestrator Boundary

`Review Orchestrator` is controlled by the main agent, not by implementation subagents.

Implementation subagents must not invoke Review Orchestrator. Their responsibility ends with scoped code edits, local verification, and a completion report. The main agent invokes Review Orchestrator after integrating subagent reports so review runs from a clean coordination context.

## Parallelism Rules

- Run scopes in parallel only when they do not edit the same files and neither scope needs the other's result.
- If scopes share a generated artifact, shared type, migration, or public contract, serialize the scope that defines the contract before scopes that consume it.
- If parallel subagents produce conflicting edits, the main agent must assign a fresh reconciliation scope to a new subagent instead of resolving code conflicts directly.

## Anti-Patterns

These patterns violate this skill even when the edit appears small or urgent:

- The main agent directly edits product code because the change seems small.
- The main agent puts multiple independent scopes into one subagent prompt.
- The main agent runs parallelizable scopes serially without a concrete dependency.
- The main agent sends follow-up fix instructions to the same implementation subagent instead of launching a fresh subagent context.
- An implementation subagent invokes `Review Orchestrator` or delegates review orchestration to another subagent.
- The main agent assigns 20 or more lightweight mechanical file edits to one subagent.
- A subagent prompt includes unrelated prior edits, rejected approaches, or another scope's implementation details.
- A subagent edits outside `Editable files` or outside the narrow directory boundary without first reporting the need to expand scope.
- The main agent resolves merge conflicts or cross-scope code conflicts directly instead of assigning a fresh reconciliation scope.

## Completion Checks

- The main agent performed no product-code edits for the implementation.
- Every product-code edit came from a subagent with a bounded scope.
- Each subagent prompt contained the minimum required context and excluded unrelated implementation history.
- Each subagent report names changed files, verification results, assumptions, and residual risks.
- Review Orchestrator ran after subagent completion reports.
- Review findings were either fixed by fresh subagent scopes or explicitly carried as unresolved risks.
- The final response identifies the implemented scopes, verification performed, and review outcome.
