# Review Execution Policy

This file defines how Cerulia review agents should receive context and how the orchestration layer should control review bias across repeated passes.

## Scope Separation

This file is the single source of truth for shared Cerulia review policy.

- define shared review rules here: reduction-first judgment, review kinds, context discipline, repeat-review classification, and normalized output contract
- define orchestration procedure in `.github/agents/review-orchestrator.agent.md`: reviewer selection, reviewer-specific briefing, execution flow, dedupe, and aggregation
- define only boundary-specific judgment criteria in individual reviewer `.agent.md` files
- do not duplicate or redefine shared policy in orchestrator or reviewer prompts except to tell the agent to read this file first and follow it

## Reduction-First Policy

Reviewers should first ask not what is missing, but what can be removed while still satisfying the current requirements, boundaries, and evidence.

Default review posture:

- prefer deletion, simplification, narrowing scope, and wording reduction over additive improvement ideas
- treat feature growth, optionality, abstraction, and configurability as suspect unless the current requirement cannot be met without them
- reject review suggestions that merely make the artifact richer, smarter, or more future-ready without proving present necessity

Exception rule for additions:

- any recommendation that adds behavior, surface area, abstraction, configuration, or workflow must explicitly justify itself in 5W1H
- the 5W1H must prove why the addition is necessary now to satisfy a concrete current requirement, why a simpler reduction-first option fails, where the impact is bounded, who is affected, when the need appears, and how the change will be verified
- if that proof is missing, the orchestration layer should prefer no-addition guidance

## Review Kinds

### 1. Direction Check

Use before or during design and implementation planning.

Provide:

- target outcome and concept-level goal
- current Cerulia boundary docs
- candidate designs, assumptions, and open questions
- intended scope and non-goals

Avoid:

- presenting rough implementation artifacts as if they were final evidence
- hiding unresolved assumptions behind local code convenience

### 2. In-Progress Check

Use while implementation is underway.

Provide:

- changed files or target surfaces
- the relevant Cerulia docs and invariants
- known risks, suspected weak spots, and current tests if available
- prior findings ledger only for dedupe and status tracking

Avoid:

- turning prior findings into anchoring bias for fresh artifact judgment
- suppressing newly visible issues just because they were not seen earlier

### 3. Final Confirmation

Use when asking whether the current artifact is ready for signoff.

Provide first:

- the current artifact itself
- rendered behavior, screenshots, outputs, or user-visible evidence
- current tests or validation results when available
- the minimum necessary Cerulia docs for boundary judgment

Suppress unless strictly needed:

- detailed edit history
- the author's intended fix
- prior review findings
- the names of files that were just edited, if the same judgment can be made from the artifact itself

The final pass should be artifact-first and should read as close as possible to a first encounter.

### 4. Delta Recheck

Use after fixes for a previously reviewed artifact when the goal is to confirm the addressed delta without reopening the whole project as if nothing was known.

Provide:

- the current artifact
- the previous review result
- which findings were intentionally addressed
- the minimum supporting evidence for the changed area

Rules:

- keep the previous findings ledger active
- re-report still-present old issues as unresolved, not new
- report newly visible issues only when the changed area or new evidence makes them supportable now
- if the delta materially changed adjacent surfaces, expand review only one boundary outward instead of reopening every reviewer by default

## Context Discipline

- Give each reviewer only the context needed for its boundary.
- Do not send implementation internals to plain-language or screenshot-first reviewers unless those internals are directly user-visible.
- Do not send prior findings to the reviewer when they are likely to bias an independent final judgment.
- When a reviewer cannot judge confidently because evidence is missing, require a coverage gap instead of speculative findings.

## Repeat Review Policy

Repeated reviews must not create an endless stream of newly reported old issues.

The orchestration layer should keep a findings ledger with a stable issue key per root cause.

For each pass, classify findings as:

- unresolved: reported before and still present
- regressed: previously fixed or absent, now present again
- newly visible: pre-existing issue exposed by newly added surface or evidence
- new: introduced or first supportable in the current pass

Rules:

- Do not present unresolved issues as brand new.
- Do not hide blocking issues just because they are old.
- When broader coverage becomes available in a later pass, explicitly mark the result as newly visible rather than implying reviewer inconsistency.
- Prefer a bounded baseline set over repeated rediscovery.

## Reviewer Selection Policy

- Select reviewers by boundary and evidence, not by habit.
- Add screenshot-based UI review when screenshots or rendered captures are available, or when the reviewer can feasibly obtain them through browser tooling or automated capture.
- Add AppView copy review when user-facing text changed or when public explanation quality is in scope.
- Add general tester review when usability, scenario fit, or first-run trust matters.
- Add clean-slate review when a change replaced a previous direction or when generated or AI-assisted edits risk residue.

## Normalized Output Contract

Every reviewer result and every orchestrated aggregate result must use the same core section names:

- findings
- coverage gaps
- evidence used
- confidence limits

Additional aggregate-only sections may follow those core sections when needed, such as:

- overlap notes
- status ledger
- fix judgment

Within each finding, use the same field order:

- severity: blocker or non-blocker
- short title
- area at risk
- why this is a problem now in 5W1H
- what should be done instead in 5W1H
- evidence
- recommended next step
- addition necessity proof in 5W1H only when the recommendation adds behavior, surface area, abstraction, configuration, or workflow
- status only when a repeated-pass classification is supportable

Boundary-specific nuance belongs inside the finding body, not in renamed section headers or alternate schemas.

The orchestration layer should aggregate by root cause and keep overlap notes concise.
The orchestration layer should also remind the user to examine reviewer proposals critically and only adopt fixes that hold up against Cerulia's actual goals, boundaries, and evidence.