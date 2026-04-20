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

### Rule: cross-repo-dependencies-must-use-package-boundaries

- Policy: When one repository in this workspace consumes another repository, do so only through a declared package dependency and package import boundary. Do not commit relative imports into sibling repository source trees.
- Why: The backend topology depends on api, protocol, and projection staying individually runnable, versionable, and replaceable. Source-level cross-repo imports make the parent workspace layout part of runtime behavior and break that boundary.
- Applies to: api/projection consumption of protocol and any future sibling-repository dependency.
- Prefer: Package imports such as `@cerulia/protocol`, with versioned dependency management handled in package metadata.
- Avoid: `../../protocol/src/...` and similar committed source-level reach-through.

## Decision Procedure

1. Identify whether the task touches build tooling, scripts, or tests.
2. If yes, enforce all matching rules in this skill.
3. If a package-level exception exists, apply the exception and record it in the change rationale.
4. If no rule exists yet, proceed with minimal change and propose a new rule entry.

## Completion Checks

- Scripts added for build or automation are JavaScript-based.
- Test commands default to `bun test` unless the target is `appview`.
- Commands and documentation prefer Bun over npm unless an explicit exception exists.
- Cross-repo usage goes through package imports, not sibling source paths.
- Any exception is explicitly stated in commit or PR rationale.

## Maintenance

- Keep each rule atomic and uniquely named.
- Prefer adding new rule sections over editing unrelated rules.
- Remove or revise rules only when repository policy changes.
