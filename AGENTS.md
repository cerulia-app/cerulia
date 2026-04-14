# Cerulia Workspace Instructions

Keep this file minimal. Put durable design detail in docs and link to it from here.

## Read First

- Cerulia is docs-first. Treat the latest docs under [docs/](docs/) as the source of truth before changing code or contracts.
- Read the primary context before implementation or design work: [docs/architecture/philosophy.md](docs/architecture/philosophy.md), [docs/architecture/layers.md](docs/architecture/layers.md), [docs/architecture/overview.md](docs/architecture/overview.md).
- For rationale and scope details, link instead of copying: [docs/architecture/decisions.md](docs/architecture/decisions.md), [docs/architecture/backend-repositories.md](docs/architecture/backend-repositories.md), [docs/architecture/implementation-plan.md](docs/architecture/implementation-plan.md), [docs/architecture/test-plan.md](docs/architecture/test-plan.md), [docs/appview/README.md](docs/appview/README.md), [docs/records/](docs/records/), [docs/lexicon/](docs/lexicon/).
- Treat [docs/archive/out-of-product-scope/](docs/archive/out-of-product-scope/) as non-current material unless the task explicitly needs historical context.

## Workspace Shape

- This workspace is docs-first and currently centers on design docs plus a minimal appview skeleton.
- [appview/](appview/) is the active runnable package for the next implementation pass.
- [api/](api/), [projection/](projection/), and [protocol/](protocol/) are placeholders here. Backend repository roles are defined in [docs/architecture/backend-repositories.md](docs/architecture/backend-repositories.md).

## Build And Test

- [appview/package.json](appview/package.json) is the source of truth for frontend commands. For substantial appview work, prefer `npm run verify` in [appview/](appview/) before considering the unit complete.
- [api/package.json](api/package.json), [projection/package.json](projection/package.json), and [protocol/package.json](protocol/package.json) currently expose no scripts. Do not invent backend commands without updating the package definitions or docs.

## Architecture Boundaries

- Treat [docs/architecture/philosophy.md](docs/architecture/philosophy.md), [docs/architecture/layers.md](docs/architecture/layers.md), and [docs/architecture/overview.md](docs/architecture/overview.md) as authoritative for scope and boundary rules.
- The easiest boundary mistakes are adding non-owner character writes, turning `session` into run control, treating `draft` as protocol secrecy, or writing other players' identifiers into someone else's record.

## Implementation Conventions

- Before implementing, read the relevant architecture or product docs needed to justify the change.
- When a task requires design judgment, generate at least 4 plausible options, evaluate them from Cerulia's philosophy and boundary rules, then choose the single best fit unless the user explicitly wants multiple options kept open.
- Prefer the smallest change that preserves the boundaries cleanly.
- If one file grows past about 100 lines, reconsider whether it still represents one cohesive concern. A longer file is acceptable only when it still cleanly maps to a single concern.
- Do not extract trivial inline logic into helper functions just to satisfy style pressure.
- In Svelte instance scripts, avoid `declare global` for window extensions; use local casts instead.

## Review And Commit

- Unless the user explicitly says otherwise, use the `cerulia-review` skill for substantial work and for the completion review step.
- Review for architectural fit, boundary violations, regressions, and missing tests before treating a unit as complete.
- Unless the user explicitly says otherwise, commit the smallest meaningful implementation unit after review.
- Never use whole-worktree staging shortcuts such as `git add .`, `git add -A`, or `git commit -a`. Stage exact target files only.
- Use Conventional Commits with an English prefix and a Japanese subject, for example `feat: ルータ初期化を追加`.
