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

## Current Implementation

The profile model has since been exercised by more than one historical machine target.

Chip8NX currently provides built-in profiles for:

- Classic CHIP-8;
- CHIP-48 2.25.

`Chip8Profile` remains the complete declarative description of the machine being emulated. It now includes both architectural characteristics and compatibility-sensitive behavior.

Conceptually:

```text
Chip8Profile
    ├── machine characteristics
    │   ├── memory size
    │   ├── program start address
    │   ├── stack capacity
    │   ├── display geometry and refresh frequency
    │   ├── timer frequency
    │   └── font image and placement
    │
    └── compatibility
        ├── shift source
        ├── memory-transfer index behavior
        ├── jump-offset source
        ├── logic-operation flag behavior
        ├── sprite overflow behavior
        └── sprite draw timing
```

Compatibility is therefore one part of a profile, not another name for a profile.

A named historical profile describes one coherent historical machine target. For example, the CHIP-48 profile combines CHIP-48 machine characteristics with the compatibility semantics documented for CHIP-48 2.25.

The same `Chip8Profile` type may also be used to construct deliberate custom combinations. The type system does not require every profile value to correspond to a named historical interpreter.

Compatibility choices are represented using semantic values rather than boolean quirk flags. For example:

```ts
shiftSource: "vx";
memoryTransferIndex: "increment-by-x";
spriteOverflow: "clip";
```

This makes the selected behavior explicit without requiring callers to know what an enabled or disabled "quirk" means.

The introduction of CHIP-48 also demonstrated that some compatibility dimensions require more than two choices. `Fx55` and `Fx65`, for example, currently support:

```text
increment-by-count   I += X + 1
increment-by-x       I += X
unchanged            I is not changed
```

This variation was added only after a real historical profile demonstrated the need for it.

Profiles remain declarative data. They do not construct machine components, contain host adapters, or own runtime policy such as CPU execution frequency.

Applications remain responsible for composition and supply the relevant profile values to the components they construct.

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
