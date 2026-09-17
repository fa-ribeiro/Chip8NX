# Chip8NX Documentation

This directory contains long-form documentation for the Chip8NX project.

Source-level API behavior should normally be documented with JSDoc close to the TypeScript implementation. Documentation here focuses on concepts that span multiple classes or modules, explains architectural reasoning, records stable implementation/conformance facts, and provides task-oriented guides.

## Start here

If you are new to the project, begin with the [architecture overview](./architecture/overview.md). It explains the Core/Inspection/host boundaries and gives the vocabulary used by the rest of the documentation.

Then choose the reading path that matches what you are trying to understand.

### Understand the machine architecture

```text
Architecture overview
    ↓
Machine state and capabilities
    ↓
Machine profiles and variation
    ↓
Instruction execution
    ↓
Runtime and timing
    ↓
Machine lifecycle
```

- [Architecture overview](./architecture/overview.md)
- [Machine state and capabilities](./architecture/machine-state-and-capabilities.md)
- [Machine profiles and variation](./architecture/machine-profiles-and-variation.md)
- [Instruction execution](./architecture/instruction-execution.md)
- [Runtime and timing](./architecture/runtime-and-timing.md)
- [Machine lifecycle](./architecture/machine-lifecycle.md)

### Embed Chip8NX in an application

```text
Embedding the Core
    ↓
Machine initialization
    ↓
Machine lifecycle
    ↓
Runtime and timing
```

- [Embedding the Core](./guides/embedding-the-core.md)
- [Machine initialization](./architecture/machine-initialization.md)
- [Machine lifecycle](./architecture/machine-lifecycle.md)
- [Runtime and timing](./architecture/runtime-and-timing.md)

### Understand CHIP-8-family variation and SUPER-CHIP

```text
Machine profiles and variation
    ↓
Instruction execution
    ↓
Machine state and capabilities
    ↓
Runtime and timing
    ↓
SUPER-CHIP 1.1 coverage audit
```

- [Machine profiles and variation](./architecture/machine-profiles-and-variation.md)
- [Instruction execution](./architecture/instruction-execution.md)
- [Machine state and capabilities](./architecture/machine-state-and-capabilities.md)
- [Runtime and timing](./architecture/runtime-and-timing.md)
- [SUPER-CHIP 1.1 coverage audit](./reference/superchip-1.1-coverage-audit.md)

### Understand inspection and debugging foundations

```text
Disassembly
    ↓
Tracing
    ↓
Web application
```

- [Disassembly](./architecture/disassembly.md)
- [Tracing](./architecture/tracing.md)
- [Web application](./guides/web-application.md)

### Understand host composition decisions

- [Host composition evaluation](./architecture/composition-evaluation.md)
- [Terminal composition levels](./guides/terminal-composition-levels.md)
- [Web application](./guides/web-application.md)
- [ADR 0012 — Application-owned composition](./decisions/0012-application-owned-composition.md)

## Structure

```text
docs/
├── architecture/
├── guides/
├── reference/
└── decisions/
```

### Architecture

Architecture documents explain how the emulator is structured, which document owns each major semantic contract, and how components collaborate.

See [Architecture](./architecture/README.md) for the detailed map and topic ownership guide.

Current architecture topics include:

- [overview](./architecture/overview.md) — package and host boundaries and the high-level system map;
- [machine state and capabilities](./architecture/machine-state-and-capabilities.md) — mutable machine state, capabilities, invariants, observation, and state-lifetime categories;
- [machine profiles and variation](./architecture/machine-profiles-and-variation.md) — machine characteristics/resources, `instructionSet`, shared-instruction `quirks`, built-in historical profiles, and profile-extension rules;
- [instruction execution](./architecture/instruction-execution.md) — fetch/decode/execute orchestration, instruction-set membership, quirk-sensitive execution, retries, interpreter exit, and execution verification;
- [runtime and timing](./architecture/runtime-and-timing.md) — scheduling, timers, vertical blank, pause/resume, catch-up, equal-deadline ordering, and manual-step timing;
- [machine initialization](./architecture/machine-initialization.md) — validate-before-mutate initialization, memory/font/program installation, and the exact reset contract;
- [machine lifecycle](./architecture/machine-lifecycle.md) — construction, initialization, running/paused transitions, interpreter exit, reset sequencing, and session replacement;
- [disassembly](./architecture/disassembly.md) — Core decoding semantics and Inspection-owned static instruction inspection;
- [tracing](./architecture/tracing.md) — passive CPU-attempt observation, non-interference, formatting, and bounded history;
- [host composition evaluation](./architecture/composition-evaluation.md) — evidence from the Terminal and Web hosts for application-owned composition and intentionally deferred abstractions.

### Guides

Guides explain how to accomplish concrete tasks using the emulator or how to work with host-level composition.

See [Guides](./guides/README.md).

Current topics include:

- embedding the CHIP-8 Core in an application;
- disassembling CHIP-8 programs and performing exploratory whole-ROM inspection;
- understanding Terminal composition levels;
- understanding the Web application and browser-host composition;
- reproducing continuous integration locally;
- preparing and verifying project releases.

### Reference

Reference documents record stable implementation and conformance facts rather than teaching the architecture from first principles.

See [Reference](./reference/README.md).

Current topics include:

- Classic CHIP-8 opcode coverage audit;
- SUPER-CHIP 1.1 coverage audit.

### Decisions

Architecture Decision Records preserve significant design choices and their reasoning.

See [Architecture Decision Records](./decisions/README.md).

ADRs are historical records. New experiments, later machine-profile evidence, and subsequent refactors should not rewrite accepted ADRs as though the newer architecture had existed when the original decision was made. When needed, document later consequences or superseding decisions explicitly.

## Documentation ownership rule

When several documents touch the same subject, prefer one canonical explanation and short contextual summaries elsewhere.

For example:

```text
profile semantics
    → machine-profiles-and-variation.md

exact initialization/reset contents
    → machine-initialization.md

manual-step / vertical-blank timing
    → runtime-and-timing.md

lifecycle sequencing
    → machine-lifecycle.md

historical SUPER-CHIP coverage/evidence
    → reference/superchip-1.1-coverage-audit.md
```

Cross-links should carry readers to the owning document rather than reproducing the full contract in every related page.

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
