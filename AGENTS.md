# Cerulia Agent Context

Keep this file minimal. Use it only for repository-specific judgment rules.

## Primary Context

- `docs/architecture/philosophy.md`
- `docs/architecture/layers.md`
- `docs/architecture/overview.md`

## Implementation Mindset

- Before implementing, read the primary context and any adjacent architecture docs needed to understand Cerulia's philosophy, architecture, and boundaries well enough to justify the design.
- As a rule, if one file is growing past about 100 lines, reconsider the design and whether that file is still only one cohesive concern.
- A file may exceed that size only when the whole file still cleanly represents one concern.
- Do not extract trivial inline logic into extra functions just to satisfy style or file-length pressure.

## Decision Rule

When a task requires design judgment, implementation judgment, tradeoff analysis, or idea generation:

1. Always generate at least 4 plausible options.
2. Re-evaluate those options from first principles against Cerulia's philosophy, architecture, and boundaries, not generic product or framework defaults.
3. Choose the single option that best fits Cerulia and proceed with that decision unless the user explicitly asks to keep multiple options open.

## Commit Rule

- Unless the user explicitly says otherwise, commit autonomously when the smallest meaningful implementation unit is complete.
- When the smallest meaningful implementation unit is complete, make a git commit.
- Never use whole-worktree staging or commit shortcuts such as `git add .`, `git add -A`, or `git commit -a`.
- Always specify the exact target files when staging for a commit, and keep each commit limited to those files.
- Use Conventional Commits with an English prefix and a Japanese subject, for example: `feat: ルータ初期化を追加`

## Review Rule

- Unless the user explicitly says otherwise, use the `cerulia-implementation-review` skill for periodic reviews during substantial work and for the review step in the completion hook.
- Review for architectural fit, boundary violations, regressions, and missing tests before considering a unit complete.

## Completion Hook

- Treat review and commit as the required completion hook for each implementation task unless the user explicitly says otherwise.
- Before declaring an implementation task complete, run the review for that unit with the `cerulia-implementation-review` skill, then make the commit for that same unit.
- Do not treat an implementation task as finished until both steps have been completed.

## Cerulia Invariants

- Treat Cerulia core as a continuity ledger for character, campaign, rules provenance, publication, and reuse.
- Keep optional extensions optional. Session, live play, board, disclosure, and dispute concerns must not redefine core truth.
- Do not move canonical roots, publication truth, or provenance ownership into carrier, session, or social surfaces.
- Prefer the smallest change that preserves these boundaries cleanly.