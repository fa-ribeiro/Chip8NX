# ADR 0001: Modular Component Architecture

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The emulator is intended to support multiple frontends and future CHIP-8 variants. Components should be independently replaceable and testable.

The project is also a learning exercise in TypeScript and object-oriented design, so component boundaries should make responsibilities explicit without introducing abstractions solely for their own sake.

## Decision

Build the emulator from small, specialized components with explicit boundaries.

Components should communicate through narrow abstractions and shared domain state where appropriate.

The architecture is intentionally analogous to assembling hardware from interchangeable pieces.

Abstractions should correspond to demonstrated boundaries. The project should avoid creating interfaces, factories, builders, or wrappers merely to make the design appear more abstract.

## Rationale

Focused components make individual emulator responsibilities easier to understand, test, and replace.

This structure also allows host-specific applications to reuse the same emulation core while choosing different implementations at their boundaries.

## Consequences

### Positive

- Components can be tested independently.
- Implementations can be swapped without changing unrelated components where an abstraction boundary exists.
- Terminal, desktop, and web frontends can share the same emulator core.
- Future CHIP-8 variants can reuse the existing foundation.
- Responsibilities remain visible in the type and module structure.

### Negative

- More types and files are introduced.
- Composition requires more up-front design.
- Poorly chosen abstractions can become unnecessary complexity.
- Some component boundaries may evolve as real substitution requirements appear.

## Alternatives Considered

### One monolithic emulator class

Rejected because it would combine CPU execution, memory, input, display, timing, initialization, and host orchestration into one object, making the system harder to test and extend.

### Abstract every implementation immediately

Rejected because speculative interfaces and factories add complexity without demonstrated substitution requirements.

## Related Decisions

- [ADR 0012: Application-Owned Composition](./0012-application-owned-composition.md)
