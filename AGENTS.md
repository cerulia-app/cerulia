# Cerulia Agent Context

Keep this file minimal. Use it only for repository-specific judgment rules.

## Primary Context

- `docs/architecture/philosophy.md`
- `docs/architecture/layers.md`
- `docs/architecture/overview.md`

## Decision Rule

When a task requires design judgment, implementation judgment, tradeoff analysis, or idea generation:

1. Always generate at least 4 plausible options.
2. Re-evaluate those options from first principles against Cerulia's philosophy, architecture, and boundaries, not generic product or framework defaults.
3. Choose the single option that best fits Cerulia and proceed with that decision unless the user explicitly asks to keep multiple options open.

## Commit Rule

- When the smallest meaningful implementation unit is complete, make a git commit.
- Never use whole-worktree staging or commit shortcuts such as `git add .`, `git add -A`, or `git commit -a`.
- Always specify the exact target files when staging for a commit, and keep each commit limited to those files.
- Use Conventional Commits with an English prefix and a Japanese subject, for example: `feat: ルータ初期化を追加`

## Cerulia Invariants

- Treat Cerulia core as a continuity ledger for character, campaign, rules provenance, publication, and reuse.
- Keep optional extensions optional. Session, live play, board, disclosure, and dispute concerns must not redefine core truth.
- Do not move canonical roots, publication truth, or provenance ownership into carrier, session, or social surfaces.
- Prefer the smallest change that preserves these boundaries cleanly.