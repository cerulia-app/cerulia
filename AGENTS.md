# Cerulia Workspace Instructions

## Preparation Phase

- Read all documents under `docs/architecture` before answering the user's request.
- Read the necessary docs yourself before changing code, contracts, or scope.
- Interpret the user's request in 5W1H before starting work.

## Core Rules

- Explain the reasons for every judgment in 5W1H.
- Review and commit frequently without waiting to be asked.
- Prefer the smallest change that keeps the design coherent and the boundaries clean, but choose the change size required to preserve consistency and clean boundaries.
- Prefer reducing implementation and features to keep things simple. Add only when it is unavoidable.
- Organize implementation at the directory, file, and code layers. Separate each layer by a single concern.
- Enforce KISS, DRY, and YAGNI. Do not add abstraction, indirection, configuration, helpers, options, or future-facing structure without a present and concrete need.

## Language and Communication

- Treat language as part of the product. Choose every word deliberately.
- Choose words deliberately for the user, the product, and the product's users.
- Do not stop at "it communicates." Choose words by how they will be understood and how they will feel after they are understood.
- Distinguish conjunctions and near-synonyms with care. Be able to explain why a word was chosen and why another word was not.
- Remove purposeless phrasing. If an expression has no reason to exist, it is noise; noise creates ambiguity, and ambiguity damages the product.

## 5W1H Intake Format

Before starting any work, write the request interpretation in this format:

**What**: A concise summary of the change needed.
- Who: Who is affected by this request?
- When: At what stage or timing does this change matter?
- Where: Which package, file, boundary, or surface is in scope?
- Why: Why is this change necessary now?
- How: How will the change be implemented and verified?
