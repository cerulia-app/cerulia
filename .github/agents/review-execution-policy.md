# Review Execution Policy

This file defines how Cerulia review agents should receive context and how the orchestration layer should control review bias across repeated passes.

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

## Output Expectations

Every review result should separate:

- findings
- coverage gaps
- evidence used
- confidence limits

For every finding, reviewers should also explain in 5W1H form:

- why the issue is a problem now
- what should be done instead

The orchestration layer should aggregate by root cause and keep overlap notes concise.
The orchestration layer should also remind the user to examine reviewer proposals critically and only adopt fixes that hold up against Cerulia's actual goals, boundaries, and evidence.