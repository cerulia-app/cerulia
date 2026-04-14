# Official Sources

Use this file to map protocol questions to official AT Protocol sources.

This map mirrors the current `atproto-website` repository layout:

- Normative specs live under `atproto.com/specs/*` and in the repo under `src/app/[locale]/specs/`
- Official explanatory docs live under `atproto.com/guides/*` and in the repo under `src/app/[locale]/guides/`
- `docs.bsky.app` is official but lives in a separate repository, so this repo does not fully cover it

## Priority Rules

1. Start with atproto.com/specs pages.
2. Follow cross-links between specs when one page delegates definitions to another.
3. Use docs.bsky.app only for operational guidance or Bluesky-hosted service behavior.
4. Treat proposals and SDK docs as explanatory context, not authority.

Some older official pages and blog posts still link to `/specs/auth`; treat `/specs/oauth` as the canonical current spec route.

## Topic Map

### Protocol Overview

- Overall protocol architecture, major layers, and which lower-level spec to branch to first
  - https://atproto.com/specs/atp

### Identity and Naming

- DID syntax, DID documents, signing keys, PDS service entries
  - https://atproto.com/specs/did
- Handle syntax, resolution, invalid handles, bidirectional verification
  - https://atproto.com/specs/handle
- Account hosting state, lifecycle, migration, and PDS hosting responsibilities
  - https://atproto.com/specs/account
- AT URI durability, normalization, DID-vs-handle authority usage
  - https://atproto.com/specs/at-uri-scheme
- NSID syntax, authority, naming rules, and wildcard matching
  - https://atproto.com/specs/nsid
- Record key syntax and Lexicon key-type semantics
  - https://atproto.com/specs/record-key
- TID syntax, ordering, and timestamp/logical-clock semantics
  - https://atproto.com/specs/tid

### Data, Schema, and Media

- Base data types, JSON and CBOR encoding, blob and CID formats
  - https://atproto.com/specs/data-model
- Blob metadata, upload/download lifecycle, garbage collection, and CDN/security expectations
  - https://atproto.com/specs/blob
- Lexicon schema language, records, queries, procedures, subscriptions, permission-set
  - https://atproto.com/specs/lexicon
- Repository structure, commits, MST, CAR export, diffs
  - https://atproto.com/specs/repository

### Transport, APIs, and Sync

- XRPC endpoint behavior, error responses, service proxying, headers
  - https://atproto.com/specs/xrpc
- Event stream framing, WebSocket transport, cursors, and sequence numbers
  - https://atproto.com/specs/event-stream
- Firehose, repo export, commit event validation, resync behavior
  - https://atproto.com/specs/sync
- OAuth profile, PAR, PKCE, DPoP, server metadata, session verification
  - https://atproto.com/specs/oauth
- Permission resources, scope string syntax, permission sets, namespace authority
  - https://atproto.com/specs/permission

### Moderation and Trust

- Label object format, negation, expiration, labeler identity, label distribution
  - https://atproto.com/specs/label
- Signing curves, multikey encoding, low-S signatures
  - https://atproto.com/specs/cryptography

## Secondary Official Sources

Use only when the question is about hosted-service behavior, operational entry points, or developer guidance beyond the normative specs.

- Auth and permission model guides
  - https://atproto.com/guides/auth
  - https://atproto.com/guides/oauth-patterns
  - https://atproto.com/guides/scopes
  - https://atproto.com/guides/permission-sets
- Identity and account operation guides
  - https://atproto.com/guides/identity
  - https://atproto.com/guides/account-lifecycle
  - https://atproto.com/guides/account-migration
- Data and repo workflow guides
  - https://atproto.com/guides/reads-and-writes
  - https://atproto.com/guides/reading-data
  - https://atproto.com/guides/writing-data
  - https://atproto.com/guides/data-repos
  - https://atproto.com/guides/data-validation
- Sync and stream workflow guides
  - https://atproto.com/guides/sync
  - https://atproto.com/guides/streaming-data
  - https://atproto.com/guides/backfilling
- Lexicon workflow guides
  - https://atproto.com/guides/lexicon
  - https://atproto.com/guides/installing-lexicons
  - https://atproto.com/guides/publishing-lexicons
  - https://atproto.com/guides/lexicon-style-guide
- Blob, media, and moderation guides
  - https://atproto.com/guides/images-and-video
  - https://atproto.com/guides/blob-lifecycle
  - https://atproto.com/guides/blob-security
  - https://atproto.com/guides/video-handling
  - https://atproto.com/guides/moderation
  - https://atproto.com/guides/labels
  - https://atproto.com/guides/creating-a-labeler
  - https://atproto.com/guides/using-ozone
- Stack and hosting guides
  - https://atproto.com/guides/the-at-stack
  - https://atproto.com/guides/self-hosting
  - https://atproto.com/guides/going-to-production
- Bluesky API host and routing guide
  - https://docs.bsky.app/docs/advanced-guides/api-directory
- OAuth client implementation guide
  - https://docs.bsky.app/docs/advanced-guides/oauth-client
- Bluesky-operated infrastructure guides
  - https://docs.bsky.app/docs/advanced-guides/entryway
  - https://docs.bsky.app/docs/advanced-guides/firehose
  - https://docs.bsky.app/docs/advanced-guides/rate-limits
- AT Protocol guides landing page
  - https://atproto.com/guides

## Practical Retrieval Patterns

- If a question says "what part of AT Protocol governs this", start with `atp`, then branch to the most specific leaf spec.
- If a question says "is this allowed by AT Protocol", fetch the exact spec page first.
- If a question is about identifier syntax or path composition, usually combine DID, Handle, NSID, Record Key, TID, and AT URI as needed.
- If a question is about account state, migration, or relay propagation of account visibility, combine Account and Sync, then add DID or Handle if host discovery matters.
- If a question is about WebSocket framing, replay cursors, or backfill windows, read Event Stream and Sync together.
- If a question is about blob upload, media delivery, or CDN safety, read Blob and Data Model together, then add the relevant guide.
- If a question says "which service should this request go to", combine XRPC or OAuth specs with the API directory guide.
- If a question says "can this be validated by Lexicon alone", usually read both Data Model and Lexicon.
- If a question says "is this durable or replay-safe", usually read AT URI, Repository, and Sync together.
- If a question mixes app auth and in-app permissions, read OAuth and Permission, then explicitly separate them from application roles.
- If an older official page says `/specs/auth`, normalize that to `/specs/oauth` in your reasoning and answer.

## Common Interpretation Traps

- A Bluesky deployment convention is not automatically a protocol guarantee.
- Some older official guides and blog posts still refer to `/specs/auth`; this is stale naming, not a separate current spec.
- A guide or proposal may explain intent, but the spec page is still authoritative.
- `event-stream` is an official spec page, but it is currently marked `wip: true` in `atproto-website`; quote it carefully and surface the stability caveat.
- Blog posts and roadmap entries often describe proposals or rollouts ahead of spec text; they are useful context, not current normative authority.
- "Possible Future Changes" sections are not current requirements.
- "Should" guidance is not the same as "must", but still matters for interoperability and safety.
- Some pages describe validation syntax broadly while allowing unsupported methods or resources to pass syntax validation and fail later at resolution or application time.