# Architecture

This directory documents the high-level architecture of Chip8NX's reusable Core and Inspection packages and the boundaries through which applications compose them.

Source-level JSDoc explains individual classes, interfaces, methods, and types. The documents here instead explain how larger parts of the system collaborate, their dependency direction, and important state, lifecycle, compatibility, and timing boundaries.

Chip8NX currently models three built-in historical machine profiles through the same architecture:

- Classic CHIP-8;
- CHIP-48 2.25;
- SUPER-CHIP 1.1.

SUPER-CHIP extends the demonstrated variation beyond compatibility choices into additional machine state and capabilities such as dual display modes, a shared physical framebuffer, a large font, persistent RPL flags, and interpreter exit. These extensions remain within the existing profile/state/capability/composition model rather than introducing a parallel emulator hierarchy.

## Documents

- [Overview](./overview.md) — package boundaries, machine profiles, major Core and Inspection relationships, SUPER-CHIP display/state extensions, host boundaries, and application composition.
- [Instruction execution](./instruction-execution.md) — fetch/decode/execute orchestration, the typed `Instruction` boundary, profile-agnostic decoding, Classic/CHIP-48/SUPER-CHIP execution semantics, `ExecutionContext`, interpreter exit, invariant ownership, and verification strategy.
- [Runtime and timing](./runtime-and-timing.md) — monotonic time, deadline-driven scheduling, catch-up, pause/resume semantics, equal-deadline ordering, timers, vertical blank, display-mode-dependent sprite timing, single-step behavior, and the relationship between SUPER-CHIP interpreter exit and runtime scheduling.
- [Machine state and capabilities](./machine-state-and-capabilities.md) — focused mutable state, invariant ownership, capability boundaries, display mode/backing geometry, `ExitState`, persistent `RplFlags`, font capabilities, profiles and runtime configuration, state observation, lifecycle, and reset ownership.
- [Machine initialization](./machine-initialization.md) — binary images, small/large-font placement, memory layout validation, validate-before-mutate guarantees, display and exit reset semantics, deliberately preserved RPL flags, reset/reload semantics, ROM replacement boundaries, and initialization verification.
- [Machine lifecycle](./machine-lifecycle.md) — construction, initialization, paused/running transitions, interpreter exit, single stepping, reset sequencing, profile recomposition, RPL persistence, and application/runtime ownership.
- [Disassembly](./disassembly.md) — Core decoding semantics, Inspection-owned disassembly and instruction formatting, range semantics, strict reusable behavior, application-level tolerant traversal, and future extension points.
- [Tracing](./tracing.md) — Core CPU-attempt observation, non-interference guarantees, retry visibility, Inspection-owned formatting and bounded history, and deferred debugger concerns.
- [Host composition evaluation](./composition-evaluation.md) — comparison of the Terminal and Web composition case studies, profile-aware Web recomposition, host-owned persistent RPL storage, formatter selection, SUPER-CHIP presentation, and the resulting project-wide conclusions about what should and should not be abstracted.

For the rationale behind major architectural choices, see the [Architecture Decision Records](../decisions/README.md).

Host-specific architecture belongs with the relevant host documentation.

The Terminal application's Level-1/2/3 composition model is documented in [Terminal composition levels](../guides/terminal-composition-levels.md).

The browser host's composition of selectable machine profiles, machine execution, Canvas/audio/input adapters, execution controls, passive Inspection tooling, persistent host-owned RPL state, and Web presentation policy is documented in [Web application](../guides/web-application.md).

For a practical example of assembling the public Core API around a selected profile, see [Embedding the Core](../guides/embedding-the-core.md).
