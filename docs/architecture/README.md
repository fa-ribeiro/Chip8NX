# Architecture

This directory documents the high-level architecture of Chip8NX's reusable Core and Inspection packages and the boundaries through which applications compose them.

Source-level JSDoc explains individual classes, interfaces, methods, and types. The documents here instead explain how larger parts of the system collaborate, their dependency direction, and important lifecycle/timing boundaries.

## Documents

- [Overview](./overview.md) — package boundaries, major Core and Inspection relationships, host boundaries, and application composition.
- [Instruction execution](./instruction-execution.md) — fetch/decode/execute orchestration, the typed `Instruction` boundary, execution semantics, `ExecutionContext`, invariant ownership, and verification strategy.
- [Runtime and timing](./runtime-and-timing.md) — monotonic time, deadline-driven scheduling, catch-up, pause/resume semantics, equal-deadline ordering, timers, vertical blank, and single-step timing behavior.
- [Machine state and capabilities](./machine-state-and-capabilities.md) — focused mutable state, invariant ownership, capability boundaries, profiles and runtime configuration, state observation, lifecycle, and reset ownership.
- [Machine initialization](./machine-initialization.md) — binary images, memory layout validation, validate-before-mutate guarantees, reset/reload semantics, ROM replacement boundaries, and initialization verification.
- [Machine lifecycle](./machine-lifecycle.md) — construction, initialization, paused/running transitions, single stepping, reset sequencing, and application/runtime ownership.
- [Disassembly](./disassembly.md) — Core decoding semantics, Inspection-owned disassembly and instruction formatting, range semantics, strict reusable behavior, application-level tolerant traversal, and future extension points.
- [Tracing](./tracing.md) — Core CPU-attempt observation, non-interference guarantees, retry visibility, Inspection-owned formatting and bounded history, and deferred debugger concerns.
- [Host composition evaluation](./composition-evaluation.md) — comparison of the Terminal and Web composition case studies and the resulting project-wide conclusions.

For the rationale behind major architectural choices, see the [Architecture Decision Records](../decisions/README.md).

Host-specific architecture belongs with the relevant host documentation.

The Terminal application's Level-1/2/3 composition model is documented in [Terminal composition levels](../guides/terminal-composition-levels.md).

The browser host's composition of machine execution, Canvas/audio/input adapters, execution controls, passive Inspection tooling, and Web presentation policy is documented in [Web application](../guides/web-application.md).
