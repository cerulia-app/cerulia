---
name: atproto-spec-reference
description: "Use when: AT Protocol の公式仕様を参照して設計判断、records/lexicon、XRPC、OAuth、permission、repo、sync、identity、account、blob、event stream、NSID、record key、TID まわりを確認したいとき。atproto.com/specs の正本を topic ごとに取得し、必要な場合だけ atproto.com/guides や docs.bsky.app を補助参照して、規格上の must/should/may と実装ガイドや Bluesky 固有事情を分けて答える。仕様確認、設計照合、実装前の根拠確認に使う。"
argument-hint: "確認したい論点、用語、ファイル、設計案を書く。未指定なら関連 spec を特定して横断参照する。"
---

# AT Protocol Official Spec Reference

## When to Use

- AT Protocol 上で何が規格として要求されているかを確認したいとき
- Cerulia の records、lexicon、権限、秘匿、同期、identity 設計が公式仕様と矛盾しないか確かめたいとき
- OAuth、permission、XRPC、repo、firehose、handle、DID まわりの判断を記憶ではなく正本から引きたいとき
- ガイド、SDK、提案書、既存実装の挙動ではなく、まず authoritative な仕様を押さえたいとき

## Source Priority

Use sources in this order and keep the distinction explicit in the answer.

1. Normative: atproto.com/specs の各仕様ページ
2. Official but non-normative: atproto.com/guides、docs.bsky.app の guide 類
3. Context only: GitHub proposal、SDK docs、実装コード、discussion

If a spec page itself says a linked proposal or guide is non-authoritative, treat it as background only.

The current `atproto-website` repo covers `atproto.com/specs/*` and `atproto.com/guides/*`. `docs.bsky.app` は別 repo なので、この repo を読んでも docs.bsky.app 全体は網羅されない。

## Procedure

1. Define the question in protocol terms.
   - Translate the user's wording into spec topics such as identity, handle, DID, account, at-uri, NSID, record-key, TID, data model, blob, lexicon, repository, event-stream, sync, XRPC, OAuth, permission, labels, or cryptography.
   - If the user gave a repo file or design proposal, identify which protocol layer it touches.

2. Map the question to the smallest authoritative source set.
   - Use the topic map in [official-sources](./references/official-sources.md).
   - Usually start from one primary spec page and add one or two neighboring pages only when the first page delegates or assumes them.
   - Do not answer from memory alone when the user asks what is required, allowed, invalid, normative, or interoperable.

3. Fetch the official specs.
   - Prefer atproto.com/specs/<topic> pages.
   - Re-fetch the exact page even if you think you know the rule already.
   - If older official material points to `/specs/auth`, use `/specs/oauth` as the current canonical spec.
   - If the question is about Bluesky-operated hostnames, proxy routing, or API entry points rather than protocol guarantees, fetch the relevant docs.bsky.app guide as secondary context and label it non-normative.

4. Extract the actual normative claims.
   - Pull out concrete constraints such as required fields, forbidden patterns, validation rules, lifecycle guarantees, size limits, or authority boundaries.
   - Distinguish must/required from should/recommended and from future work.
   - Note when the spec explicitly allows multiple implementations or leaves behavior unspecified.

5. Separate protocol guarantees from deployment-specific behavior.
   - Say clearly whether a statement comes from the base protocol, from Bluesky's hosted deployment guidance, or from implementation convention.
   - Do not present Bluesky app routing details as if they were universal protocol requirements.
   - If a spec page is explicitly marked WIP, mention that stability caveat instead of presenting it as fully settled.

6. Apply the result to Cerulia when relevant.
   - Compare the spec result against README and docs/architecture if the user is asking about this repo's design.
   - Call out direct conflicts with Cerulia's stated architecture, especially around actor model, authority, session roles, OAuth scopes, secret boundary, and replay/sync semantics.
   - Prefer the smallest spec-compatible design adjustment.

7. Answer with evidence first.
   - Lead with the conclusion.
   - Then list the authoritative sources actually consulted.
   - Then explain the implication for the user's design, implementation, or question.
   - If the spec is silent or still evolving, say so explicitly instead of over-committing.

## Output Format

## Short Answer
- One short paragraph with the conclusion

## Normative Basis
- Spec page
- Concrete rule or constraint
- Whether it is required, recommended, or future work

## Design or Implementation Implication
- What this means for the user's design or code

## Secondary Context
- Optional; only when guide or Bluesky deployment docs were needed

## Open Edges
- Optional; use when the spec is silent, unstable, or marks an area as future change

## Cerulia-Specific Guardrails

When the question touches this repository, keep these checks in mind.

- Do not collapse session or table state into an actor if the repo architecture treats sessions as record graphs.
- Do not confuse OAuth scopes or permission sets with in-session GM and player roles.
- Do not treat labels as a substitute for secret access control.
- Do not push ephemeral board motion or presence into durable protocol history unless the action is meant to be replayed and audited.
- If a Cerulia design choice intentionally diverges from protocol defaults or common Bluesky practice, identify the divergence and its interoperability cost.

## Completion Checks

Before finishing, confirm all of the following.

- At least one authoritative spec page from atproto.com/specs was actually consulted.
- Every normative claim in the answer is tied to an authoritative source.
- Any guide, proposal, SDK, or implementation reference is explicitly labeled non-normative.
- The answer distinguishes protocol rules from Bluesky-operated deployment details.
- Older official links such as `/specs/auth` were normalized to the current canonical page before answering.
- If the question was about Cerulia, the answer states whether the current design is aligned, misaligned, or still ambiguous.

## Example Prompts

- AT URI の authority に handle を使う設計は durable ですか
- OAuth と permission set の観点で、Cerulia の GM 権限をどう切り分けるべきですか
- firehose と repo diff の仕様上、board-op を永続イベントにする条件は何ですか
- docs/lexicon と docs/records の案が Lexicon と Data Model の制約に反していないか見て