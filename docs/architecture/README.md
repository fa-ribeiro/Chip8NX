# Architecture

This directory documents the high-level architecture of the reusable Chip8NX Core.

Source-level JSDoc explains individual classes, interfaces, methods, and types. The documents here instead explain how larger parts of the system collaborate, their dependency direction, and important lifecycle/timing boundaries.

## Documents

- [Overview](./overview.md) — global Core component model, major subsystem relationships, host boundaries, and application composition.
- [Instruction execution](./instruction-execution.md) — fetch/decode/execute orchestration, the typed `Instruction` boundary, execution semantics, `ExecutionContext`, invariant ownership, and verification strategy.
- [Runtime and timing](./runtime-and-timing.md) — monotonic time, deadline-driven scheduling, catch-up, pause/resume semantics, equal-deadline ordering, timers, vertical blank, and single-step timing behavior.
- [Machine lifecycle](./machine-lifecycle.md) — construction, initialization, execution, pause/resume, display synchronization, single stepping, and reset.
- [Disassembly](./disassembly.md) — read-only instruction inspection, decoding and formatting boundaries, dependency direction, range semantics, lifecycle, application-level tolerant traversal, and future extension points.
- [Host composition evaluation](./composition-evaluation.md) — comparison of the Terminal and Web composition case studies and the resulting project-wide conclusions.

For the rationale behind major architectural choices, see the [Architecture Decision Records](../decisions/README.md).

Host-specific architecture belongs with the relevant host documentation. The terminal application's Level-1/2/3 composition model is documented in [Terminal composition levels](../guides/terminal-composition-levels.md).
