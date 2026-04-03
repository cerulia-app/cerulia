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

## Cerulia Invariants

- Treat Cerulia core as a continuity ledger for character, campaign, rules provenance, publication, and reuse.
- Keep optional extensions optional. Session, live play, board, disclosure, and dispute concerns must not redefine core truth.
- Do not move canonical roots, publication truth, or provenance ownership into carrier, session, or social surfaces.
- Prefer the smallest change that preserves these boundaries cleanly.