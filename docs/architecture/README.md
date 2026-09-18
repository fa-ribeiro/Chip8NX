# Architecture

This directory documents the high-level architecture of Chip8NX's reusable Core and Inspection packages and the boundaries through which applications compose them.

Source-level JSDoc explains individual classes, interfaces, methods, and types. The documents here instead explain how larger parts of the system collaborate, their dependency direction, and important state, lifecycle, semantic-variation, observation, composition, and timing boundaries.

Chip8NX currently models four built-in machine profiles through the same architecture:

- Classic CHIP-8;
- CHIP-48 2.25;
- historical SUPER-CHIP 1.1;
- SUPER-CHIP Modern.

The profile model separates three concerns:

```text
Chip8Profile
    ├── machine characteristics / resources
    ├── instructionSet
    │   → which instruction semantics exist
    └── quirks
        → how shared instructions vary
```

The canonical explanation of that model is [Machine profiles and variation](./machine-profiles-and-variation.md).

## Suggested reading order

For a first architecture pass, the recommended path is:

```text
Overview
    ↓
Machine state and capabilities
    ↓
Machine profiles and variation
    ↓
Instruction execution
    ↓
Runtime and timing
    ↓
Machine initialization
    ↓
Machine lifecycle
```

This order moves from the broad package/component map into increasingly specific semantic and lifecycle boundaries.

Inspection and host composition can then be read as a second path:

```text
Disassembly
    ↓
Tracing
    ↓
Host composition evaluation
```

The Web and Terminal guides provide the concrete host case studies behind those architectural conclusions.

## Find the authoritative topic

Several architecture documents necessarily mention the same machine behavior from different viewpoints. To avoid multiple competing definitions, use this ownership map when reading or editing the documentation:

| Topic                                                                                                    | Canonical document                                                    |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Overall Core / Inspection / host boundaries                                                              | [Overview](./overview.md)                                             |
| Mutable machine state, capabilities, invariants, observation, state-lifetime categories                  | [Machine state and capabilities](./machine-state-and-capabilities.md) |
| Machine characteristics, `instructionSet`, `quirks`, built-in profile semantics, profile-extension rules | [Machine profiles and variation](./machine-profiles-and-variation.md) |
| Fetch/decode/execute, instruction semantics, retries, instruction-set enforcement                        | [Instruction execution](./instruction-execution.md)                   |
| Scheduler, timers, vertical blank, pause/resume, catch-up, manual-step timing                            | [Runtime and timing](./runtime-and-timing.md)                         |
| Validate-before-mutate initialization, memory rebuild, exact reset contents                              | [Machine initialization](./machine-initialization.md)                 |
| Construction/run/pause/reset/replacement sequencing and ownership                                        | [Machine lifecycle](./machine-lifecycle.md)                           |
| Static instruction inspection and formatting boundaries                                                  | [Disassembly](./disassembly.md)                                       |
| CPU-attempt observation, trace formatting/history, non-interference                                      | [Tracing](./tracing.md)                                               |
| Cross-host composition evidence and abstraction decisions                                                | [Host composition evaluation](./composition-evaluation.md)            |

Related documents should summarize the local consequence and link to the owner rather than restating the entire contract.

## Documents

### Overview

[Overview](./overview.md) is the architecture entry point. It explains package boundaries, major component relationships, application composition, and the high-level machine/profile model. Use it to orient yourself before following a more specialized path below.

### Machine state and capabilities

[Machine state and capabilities](./machine-state-and-capabilities.md) owns the architecture of focused mutable state and semantic capabilities:

- registers, PC, `I`, stack, memory, timers, display, vertical blank, `ExitState`, and `RplFlags`;
- invariant ownership;
- observation through snapshots;
- `Keyboard`, `Font`, and `RandomNumberGenerator` capability boundaries;
- the distinction between resettable, longer-lived, provider-owned, and externally driven state.

It deliberately does not re-specify the full profile model or exact reset sequence.

### Machine profiles and variation

[Machine profiles and variation](./machine-profiles-and-variation.md) owns the declarative machine-definition model:

```text
machine characteristics / resources
instructionSet
quirks
```

It explains the built-in Classic CHIP-8, CHIP-48, historical SUPER-CHIP, and Modern SUPER-CHIP profiles; why extension-only semantics are different from shared-instruction quirks; how two extension dialects can share opcode-family membership without sharing exact semantics; how profile values configure focused collaborators; and how new variation should be classified.

### Instruction execution

[Instruction execution](./instruction-execution.md) owns fetch/decode/execute orchestration, the typed `Instruction` boundary, profile-agnostic decoding, `Chip8InstructionSet` enforcement, `Chip8Quirks` consumption, retries, interpreter exit, drawing semantics, and execution verification.

### Runtime and timing

[Runtime and timing](./runtime-and-timing.md) owns monotonic time, deadline-driven scheduling, catch-up, pause/resume semantics, timers, vertical blank, equal-deadline ordering, sprite-draw timing, and the detailed temporary-vblank contract used by paused single stepping.

### Machine initialization

[Machine initialization](./machine-initialization.md) owns binary-image installation, `fonts.small` / optional `fonts.large` placement, memory-layout validation, validate-before-mutate guarantees, display/exit reset semantics, deliberate RPL preservation, and the exact contents of machine reset/reinitialization.

### Machine lifecycle

[Machine lifecycle](./machine-lifecycle.md) owns lifecycle sequencing: construction, initialization, paused/running transitions, interpreter exit, single-step orchestration, reset, ROM replacement, profile replacement, and which layer coordinates each transition. It links to runtime and initialization for their detailed mechanics rather than duplicating them.

### Disassembly

[Disassembly](./disassembly.md) owns Core decoding vs Inspection formatting/disassembly boundaries, strict reusable range semantics, application-level exploratory traversal, and static-inspection responsibilities.

### Tracing

[Tracing](./tracing.md) owns Core CPU-attempt observation, success/failure records, retry visibility, observer non-interference, Inspection-owned formatting and bounded history, and the deliberately passive boundary between tracing and future debugger/control policy.

### Host composition evaluation

[Host composition evaluation](./composition-evaluation.md) compares the Terminal and Web case studies and records the architectural evidence for application-owned composition, profile recomposition, host-owned longer-lived state such as RPL storage, formatter selection, and intentionally deferred factory/session abstractions.

## Host-specific architecture

Host-specific behavior belongs with the relevant host documentation rather than being duplicated into these architecture pages.

The Terminal application's Level-1/2/3 composition model is documented in [Terminal composition levels](../guides/terminal-composition-levels.md).

The browser host's selectable Classic, CHIP-48, historical SUPER-CHIP, and Modern SUPER-CHIP profiles, Canvas/audio/input adapters, execution controls, passive Inspection tooling, persistent host-owned RPL state, appearance, and Web lifecycle policy are documented in [Web application](../guides/web-application.md).

For a practical example of assembling the public Core API around a selected profile, see [Embedding the Core](../guides/embedding-the-core.md).

## Architecture decisions

For the rationale behind major architectural choices, see the [Architecture Decision Records](../decisions/README.md).

ADRs are historical records. Later profile work or architecture refactors should be recorded as consequences, extensions, or new decisions rather than retroactively rewriting the original decision context.
