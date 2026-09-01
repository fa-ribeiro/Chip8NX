# Architecture

This directory documents the high-level architecture of the CHIP-8 emulator core.

Source-level JSDoc explains individual classes, interfaces, methods, and types. The documents here instead explain how larger parts of the system collaborate and why the architecture is organized the way it is.

## Documents

- [Overview](./overview.md) — major architectural layers and dependency direction.
- [Machine lifecycle](./machine-lifecycle.md) — construction, initialization, execution, pause/resume, and reset.

For the rationale behind major architectural choices, see the [Architecture Decision Records](../decisions/README.md).

Future topics may include:

- instruction execution;
- display and input boundaries;
- CHIP-8 variants and quirks;
- conformance testing;
- public API boundaries.
