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

- the Core and Inspection package architecture, explicit machine profiles, and application-composition boundaries;
- [instruction execution](./architecture/instruction-execution.md), including fetch/decode/execute orchestration, the typed `Instruction` boundary, Classic/CHIP-48/SUPER-CHIP semantics, interpreter exit, invariant ownership, and verification;
- [runtime and timing](./architecture/runtime-and-timing.md), including monotonic time, exact deadline scheduling, catch-up, pause/resume semantics, timer and vertical-blank state, display-mode-dependent sprite timing, equal-deadline ordering, single stepping, and interpreter exit behavior;
- [machine state and capabilities](./architecture/machine-state-and-capabilities.md), including focused mutable state, capability seams, display mode and backing geometry, `ExitState`, persistent RPL flags, small/large-font lookup, profiles, runtime configuration, and reset ownership;
- [machine initialization](./architecture/machine-initialization.md), including binary images, small/large-font placement, memory-layout validation, validate-before-mutate guarantees, display/exit reset semantics, deliberately preserved RPL state, and ROM-replacement boundaries;
- [machine lifecycle](./architecture/machine-lifecycle.md), including construction, initialization, paused/running transitions, interpreter exit, single stepping, reset sequencing, profile recomposition, RPL persistence, and application/runtime ownership;
- [disassembly](./architecture/disassembly.md), including Core decoding semantics, Inspection-owned disassembly and instruction formatting, strict reusable behavior, and application-level exploratory traversal policy;
- [tracing](./architecture/tracing.md), including Core CPU-attempt observation, success/failure records, retry visibility, non-interference guarantees, and Inspection-owned formatting and bounded history;
- [host composition evaluation](./architecture/composition-evaluation.md), including the Terminal and Web composition case studies, profile-aware composition, persistent host-owned state, formatter selection, and the evidence for keeping machine/session construction application-owned.

### Guides

Guides explain how to accomplish larger tasks using the emulator or how to understand host-level composition.

See [Guides](./guides/README.md).

Current topics include:

- embedding the CHIP-8 Core in an application, including profile-driven Classic, CHIP-48, and SUPER-CHIP composition;
- disassembling CHIP-8 programs, customizing instruction formatting, and exploratory whole-ROM inspection;
- terminal composition levels and terminal component diagrams;
- continuous integration;
- preparing, verifying, and tagging project releases, including application-level manual verification;
- the Web application and browser-host composition, including selectable machine profiles, SUPER-CHIP framebuffer presentation, execution controls, responsive play-and-inspection layout, passive machine inspection, keyboard adaptation, audio, and appearance themes.

### Reference

Reference documents record stable implementation and conformance facts.

See [Reference](./reference/README.md).

Current topics include:

- Classic CHIP-8 opcode coverage audit;
- SUPER-CHIP 1.1 coverage audit.

### Decisions

Architecture Decision Records preserve significant design choices and their reasoning.

See [Architecture Decision Records](./decisions/README.md).

ADRs are historical records. New experiments and later machine-profile evidence should not rewrite accepted ADRs unless the project deliberately adopts a new architectural decision.

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

`docs:check` runs Deno's documentation linter against the public Core and Inspection entrypoints. It is not part of the normal `deno task ci` contract, but it is reviewed during release preparation as a public-API documentation audit.

The existing APIs still contain historical `missing-jsdoc` diagnostics. Release review should distinguish that known backlog from newly introduced documentation problems rather than treating the presence of historical diagnostics as either a new failure or an automatic success.

New or substantially changed public APIs should include useful JSDoc describing their contract, semantics, invariants, or lifecycle where those details are not obvious from the type signature. The longer-term goal is to reduce the existing documentation backlog without adding ceremonial comments solely to satisfy the linter.
