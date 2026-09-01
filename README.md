# Chip8NX

```text
Chip8NX = CHIP-8 + N(ext) / e(X)tensible
```

**A modular, profile-driven CHIP-8 emulator in TypeScript.**

Chip8NX is a CHIP-8 emulator/interpreter built as a hands-on exercise in TypeScript, object-oriented design, emulator architecture, testing, and software engineering.

The project focuses first on accurate **Classic CHIP-8** behavior while keeping the architecture open to additional CHIP-8-family profiles and multiple host applications.

## Status

**Current release: `v0.1.0` - corax89 Opcode Conformance**

Chip8NX passes the original corax89 CHIP-8 opcode test ROM through the normal machine initialization, CPU, runtime, scheduling, and display pipeline.

The broader Classic CHIP-8 conformance target is the Timendus CHIP-8 test suite.

## Goals

This project is intended both as an emulator and as a learning exercise.

The main goals are to:

- build a solid foundation in TypeScript;
- practice object-oriented and modular software design;
- understand the CHIP-8 architecture and instruction set;
- model CHIP-8 variants and quirks explicitly;
- keep components independently testable and replaceable;
- use external conformance ROMs as behavioral acceptance tests;
- support multiple host applications without coupling the emulator core to a specific UI or platform.

## Architecture

The emulator separates machine definition, application composition, initialization, and runtime orchestration.

```text
     Chip8Profile
    "What machine?"
          |
          v
 Application composition
"Which implementations?"
          |
          v
  MachineInitializer
   "Establish state"
          |
   +------+------+
   |             |
   v             v
  Cpu       Chip8Runtime
                 |
                 v
             Scheduler
                 |
                 v
               Clock
```

A `Chip8Profile` describes the machine being emulated.

The application is responsible for selecting concrete implementations such as memory, keyboard, display, random-number generation, and host-specific presentation.

`MachineInitializer` establishes a clean machine state, installs profile data, and loads a program.

`Cpu` owns the CHIP-8 fetch/decode/execute cycle.

`Chip8Runtime` coordinates CPU execution and the CHIP-8 timers.

The generic deadline-driven `Scheduler` maintains exact chronological ordering between periodic tasks.

## Quick start

### Requirements

- Deno 2.x

### Check the project

```bash
deno task check
```

### Run all tests

```bash
deno task test
```

The test suite contains:

- colocated unit tests;
- integration tests;
- conformance tests using real CHIP-8 ROMs.

### Watch tests

```bash
deno task test:watch
```

### Generate API documentation

```bash
deno task docs:build
```

Generated API documentation is written to:

```text
build/docs/api/
```

### Check public API documentation

```bash
deno task docs:check
```

Documentation linting is being introduced incrementally while the public API is still evolving.

## Repository structure

```text
.
├── packages/
│   └── core/
│       ├── mod.ts
│       ├── src/
│       └── tests/
│
├── apps/
├── docs/
├── CHANGELOG.md
├── README.md
└── deno.json
```

### `packages/core`

The reusable **Chip8NX Core** package (`@chip8nx/core`).

It contains machine components, profiles, CPU execution, initialization, runtime orchestration, scheduling, and core tests.

Its intended public API is exposed through:

```text
packages/core/mod.ts
```

### `apps`

Host applications belong here.

Planned examples include:

- terminal application;
- web application;
- desktop application;
- debugging or visualization tools.

Applications may choose different host implementations while sharing the same emulator core.

### `docs`

Long-form project documentation that does not naturally belong in source-level JSDoc.

## Documentation

Documentation is split into two layers.

### API documentation

Public TypeScript APIs are documented directly in the source with JSDoc and generated with Deno's documentation tooling.

### Project documentation

Architecture, guides, and design decisions belong under `docs/`:

- [Architecture](./docs/architecture/README.md)
- [Guides](./docs/guides/README.md)
- [Architecture Decision Records](./docs/decisions/README.md)

Source comments explain individual APIs; project documentation explains how the larger system fits together and why major design decisions were made.

## Conformance roadmap

### `v0.0.1` — IBM Logo POC ✓

A real CHIP-8 ROM executes end-to-end and produces the expected framebuffer.

### `v0.1.0` — corax89 CHIP-8 test ROM ✓

The original corax89 opcode test ROM produces its expected successful result screen through the complete Chip8NX execution pipeline.

### Timendus CHIP-8 test suite

The broader compatibility target for Classic CHIP-8 behavior, including opcode and flag semantics.

### Future work

After the Classic implementation is mature:

- additional CHIP-8-family profiles;
- explicit compatibility quirks;
- terminal, web, and desktop frontends;
- debugging and inspection tooling.

## References

The project is developed with reference to:

- CHIP-8 Variant Database — Classic CHIP-8;
- Matthew Mikolay's CHIP-8 technical reference;
- Tobias V. Langhoff's CHIP-8 emulator guide;
- corax89 CHIP-8 test ROM;
- Timendus CHIP-8 test suite.

When references disagree, Classic CHIP-8 behavior is currently resolved primarily against the Classic CHIP-8 variant documentation.

## Versioning

The project follows Semantic Versioning.

During `0.x`, minor versions represent meaningful capability or conformance milestones and may include API changes.

See [CHANGELOG.md](./CHANGELOG.md) for release history.
