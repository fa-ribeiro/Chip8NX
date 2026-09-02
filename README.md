# Chip8NX

```text
Chip8NX = CHIP-8 + N(ext) / e(X)tensible
```

**A modular, profile-driven CHIP-8 emulator in TypeScript.**

Chip8NX is a CHIP-8 emulator/interpreter built as a hands-on exercise in TypeScript, object-oriented design, emulator architecture, testing, and software engineering.

The project focuses first on accurate **Classic CHIP-8** behavior while keeping the architecture open to additional CHIP-8-family profiles and multiple host applications.

## Status

**Current release: `v0.1.0` — corax89 Opcode Conformance**

The `v0.1.0` milestone established successful execution of the original corax89 CHIP-8 opcode test ROM through the normal Chip8NX machine pipeline.

Current development on `main` additionally passes the relevant Classic CHIP-8 modes of:

- Timendus Corax+;
- Timendus Flags;
- Timendus Quirks;
- Timendus Keypad.

These tests have already exposed and helped correct Classic behavior around flag reset semantics, shift-source semantics, and vertical-blank-synchronized drawing.

The broader target remains accurate Classic CHIP-8 behavior, with additional CHIP-8-family profiles planned only after the Classic implementation is mature.

## Goals

This project is intended both as an emulator and as a learning exercise.

The main goals are to:

- build a solid foundation in TypeScript;
- practice object-oriented and modular software design;
- understand the CHIP-8 architecture and instruction set;
- model CHIP-8 variants and quirks explicitly when multiple behaviors genuinely need to coexist;
- keep components independently testable and replaceable;
- use external conformance ROMs as behavioral acceptance tests;
- support multiple host applications without coupling the emulator core to a specific UI or platform.

## Architecture

The emulator separates machine definition, application composition, initialization, execution, and runtime orchestration.

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
   |             |
   |             v
   |         Scheduler
   |             |
   |             v
   |           Clock
   |
   +--> ExecutionContext
          |
          +--> machine state
          +--> DisplayBuffer
          +--> VerticalBlank
```

A `Chip8Profile` describes the machine being emulated, including memory layout, display geometry, display refresh frequency, timer frequency, and font placement.

The application is responsible for selecting concrete implementations such as memory, keyboard, random-number generation, clock, and host-specific presentation.

`MachineInitializer` establishes a clean machine state, installs profile data, resets transient machine state such as vertical-blank availability, and loads a program.

`Cpu` owns the CHIP-8 fetch/decode/execute cycle.

`Chip8Runtime` coordinates CPU execution, CHIP-8 timers, and emulated display-frame boundaries.

`VerticalBlank` models display synchronization as emulated machine state. Classic `Dxyn` waits for an available vertical-blank interval rather than depending on a terminal, browser, or desktop renderer.

The generic deadline-driven `Scheduler` maintains exact chronological ordering between periodic tasks.

Host rendering remains outside the emulator runtime. A terminal, browser, or desktop application can observe `DisplayBuffer` independently without affecting CHIP-8 timing semantics.

## Quick start

### Requirements

- Deno 2.x

### Check the project

```bash
deno task check
```

This performs TypeScript checking, formatting validation, and linting.

### Run unit and integration tests

```bash
deno task test
```

This runs colocated unit tests and the integration test suite.

Third-party conformance ROMs are intentionally not included in the repository, so conformance tests are kept separate from the default test task.

### Run conformance tests

After installing the required external ROM fixtures as documented in [`packages/core/tests/conformance/README.md`](./packages/core/tests/conformance/README.md):

```bash
deno task test:conformance
```

### Run all tests

```bash
deno task test:all
```

### Run the CI contract locally

```bash
deno task ci
```

The CI task runs the project checks plus unit and integration tests. It does not require locally installed third-party conformance ROMs.

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
├── LICENSE
├── README.md
├── THIRD_PARTY_NOTICES.md
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

### `v0.1.0` — corax89 Opcode Conformance ✓

The original corax89 CHIP-8 opcode test ROM produces its expected successful result screen through the normal Chip8NX initialization, CPU, runtime, scheduler, and display pipeline.

### Timendus Corax+ ✓

Extends opcode coverage beyond the original corax89 ROM, including call/return behavior, `8XY7`, `FX1E`, `FX65`, BCD edge cases, and register-width behavior.

### Timendus Flags ✓

Validates arithmetic and logical results, carry and borrow semantics, shifted-out flags, operand ordering, and use of `VF` as an instruction operand.

### Timendus Quirks — Classic CHIP-8 ✓

Validates Classic behavior for:

- logical-operation `VF` reset;
- `FX55` / `FX65` index-register increment;
- vertical-blank-synchronized drawing;
- sprite clipping;
- `Vy`-based shifting;
- `V0`-based `BNNN` jumping.

### Timendus Keypad ✓

Validates all three Classic CHIP-8 keyboard instructions:

- `EX9E` skips when the key identified by `VX` is pressed;
- `EXA1` skips when the key identified by `VX` is not pressed;
- `FX0A` waits for a key press followed by release while CHIP-8 timers continue to advance.

The full automated Keypad test passes without requiring additional production-code changes.

### Next

Continue through relevant Timendus tests and other Classic CHIP-8 behavior until the project has a well-defined Classic conformance target suitable for `1.0.0`.

### Future work

After the Classic implementation is mature:

- additional CHIP-8-family profiles;
- explicit profile-driven compatibility behavior where variants genuinely differ;
- terminal, web, and desktop frontends;
- debugging and inspection tooling.

## External conformance fixtures

Third-party ROM images are not distributed with Chip8NX.

The conformance-test documentation describes how to obtain the external fixtures locally and pins the exact filenames, sizes, and checksums used by the project.

See:

- [`packages/core/tests/conformance/README.md`](./packages/core/tests/conformance/README.md)
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)

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

## License

Chip8NX source code is licensed under the [MIT License](./LICENSE).

Third-party conformance ROMs and other external materials remain subject to their respective upstream licenses and are not covered by the Chip8NX MIT license. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for details.
