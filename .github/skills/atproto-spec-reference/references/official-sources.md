# Official Sources

Use this file to map protocol questions to official AT Protocol sources.

## Priority Rules

1. Start with atproto.com/specs pages.
2. Follow cross-links between specs when one page delegates definitions to another.
3. Use docs.bsky.app only for operational guidance or Bluesky-hosted service behavior.
4. Treat proposals and SDK docs as explanatory context, not authority.

## Topic Map

### Identity and Naming

- DID syntax, DID documents, signing keys, PDS service entries
  - https://atproto.com/specs/did
- Handle syntax, resolution, invalid handles, bidirectional verification
  - https://atproto.com/specs/handle
- AT URI durability, normalization, DID-vs-handle authority usage
  - https://atproto.com/specs/at-uri-scheme

### Data and Schema

- Base data types, JSON and CBOR encoding, blob and CID formats
  - https://atproto.com/specs/data-model
- Lexicon schema language, records, queries, procedures, subscriptions, permission-set
  - https://atproto.com/specs/lexicon
- Repository structure, commits, MST, CAR export, diffs
  - https://atproto.com/specs/repository
- Firehose, repo export, commit event validation, resync behavior
  - https://atproto.com/specs/sync

### API and Authorization

- XRPC endpoint behavior, error responses, service proxying, headers
  - https://atproto.com/specs/xrpc
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

- Bluesky API host and routing guide
  - https://docs.bsky.app/docs/advanced-guides/api-directory
- OAuth client implementation guide
  - https://docs.bsky.app/docs/advanced-guides/oauth-client
- AT Protocol guides landing page
  - https://atproto.com/guides

## Practical Retrieval Patterns

- If a question says "is this allowed by AT Protocol", fetch the exact spec page first.
- If a question says "which service should this request go to", combine XRPC or OAuth specs with the API directory guide.
- If a question says "can this be validated by Lexicon alone", usually read both Data Model and Lexicon.
- If a question says "is this durable or replay-safe", usually read AT URI, Repository, and Sync together.
- If a question mixes app auth and in-app permissions, read OAuth and Permission, then explicitly separate them from application roles.

## Common Interpretation Traps

- A Bluesky deployment convention is not automatically a protocol guarantee.
- A guide or proposal may explain intent, but the spec page is still authoritative.
- "Possible Future Changes" sections are not current requirements.
- "Should" guidance is not the same as "must", but still matters for interoperability and safety.
- Some pages describe validation syntax broadly while allowing unsupported methods or resources to pass syntax validation and fail later at resolution or application time.