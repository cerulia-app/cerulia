# Cerulia Workspace Instructions

## Core Rules

- Read the necessary docs yourself before changing code, contracts, or scope.
- Explain reasons in 5W1H.
- Review and commit frequently without waiting to be asked.
- Prefer the smallest change that keeps the design coherent and the boundaries clean.
- Enforce KISS, DRY, and YAGNI. Do not add abstraction, indirection, configuration, helpers, options, or future-facing structure without a present and concrete need.
- Treat language as part of the product. Choose every word deliberately.
- Distinguish conjunctions and near-synonyms with care. Be able to explain why a word was chosen and why another word was not.
- Remove purposeless phrasing. If an expression has no reason to exist, it is noise; noise creates ambiguity, and ambiguity damages the product.

## 5W1H Intake Format

- Who: Who is affected by this request?
- What: What exactly needs to change?
- When: At what stage or timing does this change matter?
- Where: Which package, file, boundary, or surface is in scope?
- Why: Why is this change necessary now?
- How: How will the change be implemented and verified?

## Skill Priority

- If a task requires repository conventions (build scripts, test runner choice, cross-package policy), load `.github/skills/repo-best-practices/SKILL.md` first.
