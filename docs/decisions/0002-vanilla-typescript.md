# ADR 0002: Vanilla TypeScript and Minimal Dependencies

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The project is primarily a learning exercise for TypeScript, object-oriented design, architecture, and CHIP-8 internals.

Using large frameworks or utility libraries for foundational behavior would hide some of the implementation details the project is intended to explore.

## Decision

Use vanilla TypeScript and keep runtime dependencies to a minimum.

Implement foundational emulator behavior ourselves where practical.

Development and testing tooling may use appropriate Deno and Deno standard-library facilities.

## Rationale

Keeping runtime dependencies small makes emulator behavior transparent and keeps the learning focus on TypeScript and the machine being implemented.

The decision does not prohibit dependencies categorically; a dependency should earn its place by solving a real problem better than maintaining equivalent project code.

## Consequences

### Positive

- More emulator behavior remains visible and understandable.
- Runtime dependency surface stays small.
- The project retains high learning value.
- Platform/tooling integration remains straightforward with Deno.

### Negative

- The project may contain more utility code than a production application using larger libraries.
- Some functionality must be maintained locally.

## Alternatives Considered

### Adopt a larger application or testing framework

Rejected for the core because it would add capabilities and abstractions that are unnecessary for the current project goals.

## Related Decisions

- [ADR 0005: Use `@std/assert` for Tests](./0005-std-assert.md)
