---
name: repo-best-practices
description: 'Use when: working in this repository and needing shared implementation conventions, build/testing defaults, or exception rules. Load this first before domain-specific skills when repository policy may affect decisions.'
user-invocable: true
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

## Decision Procedure

1. Identify whether the task touches build tooling, scripts, or tests.
2. If yes, enforce all matching rules in this skill.
3. If a package-level exception exists, apply the exception and record it in the change rationale.
4. If no rule exists yet, proceed with minimal change and propose a new rule entry.

## Completion Checks

- Scripts added for build or automation are JavaScript-based.
- Test commands default to `bun test` unless the target is `appview`.
- Any exception is explicitly stated in commit or PR rationale.

## Maintenance

- Keep each rule atomic and uniquely named.
- Prefer adding new rule sections over editing unrelated rules.
- Remove or revise rules only when repository policy changes.
