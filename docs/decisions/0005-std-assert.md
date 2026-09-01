# ADR 0005: Use `@std/assert` for Tests

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The project uses Deno and aims to minimize dependencies while keeping tests expressive.

A full third-party testing framework would add another abstraction layer without providing a current requirement that Deno's built-in test runner and standard assertions cannot satisfy.

## Decision

Use Deno's test runner with the `@std/assert` package for assertions.

## Rationale

This provides a small, idiomatic Deno testing stack with clear assertions and no larger test framework.

## Consequences

### Positive

- Tests use familiar Deno ecosystem tooling.
- The testing dependency surface remains small.
- Tests stay explicit and close to standard platform behavior.

### Negative

- Features provided by larger testing frameworks must be implemented explicitly if they become necessary.

## Alternatives Considered

### Adopt a larger third-party testing framework

Rejected because no current testing requirement justifies the added dependency and abstraction surface.

## Related Decisions

- [ADR 0002: Vanilla TypeScript and Minimal Dependencies](./0002-vanilla-typescript.md)
- [ADR 0007: Tests Live Beside Their Implementation](./0007-test-location.md)
