# ADR 0010: Use a Unified CHIP-8 Profile

- **Status:** Accepted
- **Date:** 2026-08-31

## Context

Machine-specific values were initially considered as two separate concepts:

```text
Chip8Profile
Chip8Configuration
```

The intended distinction was that the profile would contain compatibility-defining properties while configuration would contain implementation choices.

Examples included:

```text
memory size          -> profile
program start        -> profile

stack capacity       -> configuration
font base address    -> configuration
```

In practice this boundary proved difficult to justify consistently.

Changing stack capacity may affect observable program behavior. Changing font placement may also affect programs that access interpreter memory directly.

The distinction therefore introduced additional concepts without providing a clear technical boundary or an immediate consumer that required them.

## Decision

Use one `Chip8Profile` as the complete declarative description of the CHIP-8 environment being emulated.

The Classic profile contains characteristics including:

```text
memory size
program start address
stack capacity
display geometry
timer frequency
font image
font base address
```

Future profile-specific compatibility quirks may also belong here when multiple behaviors actually need to coexist.

## Rationale

The resulting model is easier to explain:

> A profile describes what machine is being emulated.

Component implementations remain independently configurable.

For example:

```ts
new DisplayBuffer(width, height);
new Stack(capacity);
new Ram(size);
```

still support arbitrary values in tests and alternative compositions.

The profile simply provides the values appropriate for one complete machine definition.

## Consequences

### Positive

- Applications have one source for machine characteristics.
- Generic components contain no hidden Classic defaults.
- The distinction between machine definition and runtime policy becomes clearer.
- Future profiles have an explicit home for compatibility behavior.

### Negative

- Some profile properties are conventional machine choices rather than universally intrinsic properties of all historical interpreters.
- A future variant with richer modes may require profile fields to evolve.

## Alternatives Considered

### Separate `Chip8Profile` and `Chip8Configuration`

Rejected because the boundary was difficult to justify and produced extra indirection without a current consumer that needed the distinction.

## Related Decisions

- [ADR 0001: Modular Component Architecture](./0001-modular-component-architecture.md)
- [ADR 0009: Separate Opcode Decoding from Instruction Execution Semantics](./0009-separate-decoding-from-execution.md)
- [ADR 0012: Application-Owned Composition](./0012-application-owned-composition.md)
