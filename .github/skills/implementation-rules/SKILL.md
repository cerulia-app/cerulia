---
name: implementation-rules
description: "Always use this before starting implementation work. This skill provides rules for implementation choices that affect the product's consistency, maintainability, and alignment with repository conventions."
user-invocable: false
---
Provide a single source of truth for repository-wide conventions that affect implementation choices and tool selection.

### Rule: build-scripts-must-be-javascript

- Policy: To avoid OS-dependent behavior in the repository, implement build and automation scripts in JavaScript.
- Why: JavaScript-based scripts keep execution behavior consistent across Windows, macOS, and Linux.
- Applies to: Build scripts, generation scripts, automation scripts, and task wrappers.
- Prefer: `node` or `bun` runnable JavaScript files.

### Rule: test-runner-default-is-bun-test

- Policy: Use `bun test` as the default test runner.
- Why: The repository standardizes on Bun for package and test workflows.
- Applies to: New test commands, CI test jobs, and local verification commands.
- Exception: The `appview` package can use its existing test runner and configuration.

### Rule: prefer-bun-over-npm

- Policy: Prefer Bun over npm for package management and script execution.
- Why: The repository standardizes on Bun to reduce toolchain drift.
- Applies to: Dependency installation, script execution, updates, and lockfile decisions.
- Exception: Use npm only when a concrete compatibility requirement is verified.

### Rule: appview-frontend-is-projection-only

- Policy: `+page.svelte` and `+layout.svelte` files must act as pure projections of data. They receive data from `+page.server.ts` or `+layout.server.ts` and render it without transformation.
- Why: Keeping frontend files free of data-fetching and business logic makes them easier to test, review, and replace independently. Business logic and data shaping belong to the server layer, not the render layer.
- Applies to: All `+page.svelte` and `+layout.svelte` files in `appview/src/routes/`.
- Prohibited in `.svelte` files: `fetch` calls, AT Protocol SDK calls, data normalization, conditional data reshaping, and any logic that would need to be duplicated if the component were replaced.
- Required: Data fetching, AT Protocol calls, pagination assembly, and data transformation are placed in the corresponding `+page.server.ts` or `+layout.server.ts` file and exposed to the component only through the typed `data` prop.
- Exception: Reactive UI state that has no server-side representation (e.g., open/closed toggles, animation triggers) may live in the component.

### Rule: appview-i18n-server-selection

- Policy: In `appview/src/routes/`, localized strings must be selected in `+*.server.ts` and passed to Svelte components through `data.i18n`.
- Why: Server-side selection avoids sending all language maps to the client and keeps render files as pure projections.
- Applies to: Route-level i18n modules such as `i18n.server.ts`, `+layout.server.ts`, `+page.server.ts`, `+layout.svelte`, and `+page.svelte`.

## Decision Procedure

1. Identify whether the task touches build tooling, scripts, or tests.
2. If yes, enforce all matching rules in this skill.
3. If the task touches `appview/src/routes/`, enforce `appview-frontend-is-projection-only`.
4. If the task touches route-level i18n in `appview/src/routes/`, enforce `appview-i18n-server-selection`.
5. If a package-level exception exists, apply the exception and record it in the change rationale.
6. If no rule exists yet, proceed with minimal change and propose a new rule entry.

## Completion Checks

- Scripts added for build or automation are JavaScript-based.
- Test commands default to `bun test` unless the target is `appview`.
- Commands and documentation prefer Bun over npm unless an explicit exception exists.
- `+page.svelte` and `+layout.svelte` files contain no `fetch` calls, AT Protocol SDK calls, or data transformation logic.
- Data fetching and shaping in `appview` routes are implemented in `+page.server.ts` or `+layout.server.ts`.
- Route-level i18n text is selected on the server and passed via `data.i18n`.
- Any exception is explicitly stated in commit or PR rationale.

## Maintenance

- Keep each rule atomic and uniquely named.
- Prefer adding new rule sections over editing unrelated rules.
- Remove or revise rules only when repository policy changes.
