# ADR 0007: Tests Live Beside Their Implementation

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The project contains many small modular components and prioritizes maintainable, focused tests.

Unit tests should remain easy to discover and should move naturally when their production module is refactored.

Higher-level tests have different ownership because they deliberately span several production modules.

## Decision

Place unit tests beside the production module they test, using the `.test.ts` suffix.

Example:

```text
scheduler/
├── scheduler.ts
└── scheduler.test.ts
```

Use dedicated test areas for tests that intentionally span production-module boundaries:

```text
tests/
├── integration/
└── conformance/
```

Conformance ROM fixtures live alongside their conformance tests.

## Rationale

Colocated unit tests make the relationship between a component and its focused tests explicit.

Separating integration and conformance tests prevents cross-module scenarios and external ROM acceptance tests from being mistaken for unit tests.

## Consequences

### Positive

- Unit tests are easy to discover and refactor with their implementation.
- Higher-level tests have an explicit home.
- Conformance testing is clearly distinguished from implementation testing.

### Negative

- Tests are distributed between source directories and dedicated higher-level test directories.
- Contributors must understand the distinction between unit, integration, and conformance tests.

## Alternatives Considered

### Put every test under one top-level test directory

Rejected because it separates small unit tests from the modules they document and verify.

### Put every test beside source files

Rejected for integration and conformance tests because those tests intentionally have no single production-module owner.

## Related Decisions

- [ADR 0001: Modular Component Architecture](./0001-modular-component-architecture.md)
- [ADR 0005: Use `@std/assert` for Tests](./0005-std-assert.md)
