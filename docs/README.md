# Chip8NX Documentation

This directory contains long-form documentation for the Chip8NX project.

Source-level API behavior should normally be documented with JSDoc close to the TypeScript implementation. Documentation here focuses on concepts that span multiple classes or modules, explains architectural reasoning, and provides task-oriented guides.

## Structure

```text
docs/
├── architecture/
├── guides/
├── reference/
└── decisions/
```

### Architecture

Architecture documents explain how the emulator is structured and how major components collaborate.

See [Architecture](./architecture/README.md).

Current topics include:

- the Core and Inspection package architecture and their application composition boundaries;
- [instruction execution](./architecture/instruction-execution.md), including fetch/decode/execute orchestration, the typed `Instruction` boundary, execution semantics, invariant ownership, and verification;
- [runtime and timing](./architecture/runtime-and-timing.md), including monotonic time, exact deadline scheduling, catch-up, pause/resume semantics, timer and vertical-blank state, equal-deadline ordering, and single stepping;
- [machine state and capabilities](./architecture/machine-state-and-capabilities.md), including focused mutable state, capability seams, snapshot-based state observation, profiles, runtime configuration, and reset ownership;
- [machine initialization](./architecture/machine-initialization.md), including binary images, memory-layout validation, validate-before-mutate guarantees, reset/reload semantics, and ROM-replacement boundaries;
- [machine lifecycle](./architecture/machine-lifecycle.md), including construction, initialization, paused/running transitions, single stepping, reset sequencing, and application/runtime ownership;
- [disassembly](./architecture/disassembly.md), including Core decoding semantics, Inspection-owned disassembly and instruction formatting, strict reusable behavior, and application-level exploratory traversal policy;
- [tracing](./architecture/tracing.md), including Core CPU-attempt observation, success/failure records, retry visibility, non-interference guarantees, and Inspection-owned formatting and bounded history;
- host composition across the Terminal and Web applications, including the Web host's composition of Core execution and CPU-state observation with Inspection-owned disassembly and recent-attempt tooling.

### Guides

Guides explain how to accomplish larger tasks using the emulator or how to understand host-level composition.

See [Guides](./guides/README.md).

Current topics include:

- embedding the CHIP-8 Core in an application;
- disassembling CHIP-8 programs, customizing instruction formatting, and exploratory whole-ROM inspection;
- terminal composition levels and terminal component diagrams;
- continuous integration;
- preparing, verifying, and tagging project releases;
- the Web application and browser-host composition, including execution controls, responsive play-and-inspection layout, passive machine inspection, keyboard adaptation, audio, and appearance themes.

### Reference

Reference documents record stable implementation and conformance facts.

See [Reference](./reference/README.md).

Current topics include:

- Classic CHIP-8 opcode coverage audit.

### Decisions

Architecture Decision Records preserve significant design choices and their reasoning.

See [Architecture Decision Records](./decisions/README.md).

ADRs are historical records. New experiments such as the terminal layered-composition case study should not rewrite accepted ADRs until the project deliberately adopts a new architectural decision.

## API documentation

Generated API documentation is produced from the public reusable package entrypoints:

```text
packages/core/mod.ts
packages/inspection/mod.ts
```

Generate it with:

```bash
deno task docs:build
```

The generated site is written to:

```text
build/docs/api/
```

Generated documentation is a build artifact and should not be committed to source control.

Documentation diagnostics can be run with:

```bash
deno task docs:check
```

`docs:check` runs Deno's documentation linter against the public Core and Inspection entrypoints. It is currently used as a public-API documentation audit rather than as a repository CI or release gate, because the existing APIs still contain historical `missing-jsdoc` diagnostics.

New or substantially changed public APIs should include useful JSDoc describing their contract, semantics, invariants, or lifecycle where those details are not obvious from the type signature. The longer-term goal is to reduce the existing documentation backlog without adding ceremonial comments solely to satisfy the linter.
