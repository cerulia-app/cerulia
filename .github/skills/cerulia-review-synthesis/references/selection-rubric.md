# Selection Rubric

Use this rubric when choosing between competing improvements proposed by the review agents.

## Hard Gates

Reject an alternative immediately if it violates one of these constraints.

- It treats the session itself as an actor instead of a record graph centered on session and related records.
- It makes shared table state depend on multiple equal primaries instead of an explicit authority or finalization point.
- It conflates OAuth or permission-set concerns with session roles or audience-based visibility.
- It defers the secret boundary or reduces secrecy to labels without access control and key lifecycle rules.
- It stores ephemeral board motion or transient presence as durable protocol history when only confirmed operations belong there.
- It relies on undocumented manual operator behavior to explain away a platform-level rule gap.

## Evaluation Dimensions

Score surviving alternatives by comparing them across these dimensions.

1. AT Protocol fit
   - Does it keep signed durable facts, portable schemas, and view projection concerns separated cleanly?
   - Does it avoid forcing low-latency ephemeral behavior into the protocol layer?

2. Cerulia architecture fit
   - Does it preserve the split among session authority, AppView, realtime sync, and secret handling?
   - Does it reinforce the repo and record model already described in the docs?

3. Authority and secrecy fit
   - Does it keep OAuth, session role, and audience grant as separate layers?
   - Does it improve key lifecycle, visibility rules, or disclosure boundaries without introducing new ambiguity?

4. Player and community trust
   - Can an ordinary player, spectator, or moderator predict who can see what and who can overrule whom?
   - Does it improve consent, explainability, appeals, or later disclosure handling?

5. GM operability and recovery
   - Can a live table operator use it without hidden knowledge or fragile hand-maintained steps?
   - Does it make contested actions, co-GM flows, or recovery safer?

6. Schema and migration cost
   - Does it close the gap with a small and durable change?
   - Does it avoid forcing a later full rewrite of records, lexicon, or replay semantics?

7. Auditability
   - Can the system later explain why a decision, removal, reveal, or redaction happened?
   - Is the resulting behavior legible across architecture, records, and community operation?

## Alternative Shapes To Prefer

If the subagents did not already produce enough distinct options, expand the candidate set using shapes like these.

- Clarify an invariant or responsibility boundary in architecture docs
- Add a policy or lifecycle rule without changing the record surface
- Add a field, relation, revision marker, or explicit state transition to a record
- Add a permission or audit rule for moderator or GM action
- Move a concern between authority, AppView, realtime, and secret layers to restore a cleaner boundary

## Tie-Breakers

When two alternatives both fit the philosophy, prefer the one that:

- Resolves the ambiguity earlier in the lifecycle instead of relying on later repair
- Produces clearer participant expectations with less hidden operator discretion
- Preserves compatibility with replay, audit, and future migration
- Changes the fewest durable concepts while still closing the real gap

## Red Flags In Synthesis

Slow down and re-read the docs if the selected option seems to require any of these moves.

- Turning the review into generic social policy without anchoring it in the architecture
- Picking the most operationally convenient fix even though it weakens stated invariants
- Treating all agent findings as equally strong without re-checking the source documents
- Letting one perspective erase another when the correct answer is a documented tradeoff