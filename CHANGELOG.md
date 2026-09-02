# Changelog

All notable changes to this project will be documented in this file.

The project follows Semantic Versioning.

During the `0.x` development phase:

- **PATCH** releases contain fixes, refactors, documentation improvements, and other changes that do not represent a new emulator capability milestone.
- **MINOR** releases represent meaningful emulator capabilities and conformance milestones, and may include breaking API changes while the public API remains unstable.
- **1.0.0** will mark the first stable Classic CHIP-8 implementation with an intentionally supported public API and agreed conformance requirements.

## [Unreleased]

### Added

- Timendus Corax+ opcode conformance test.
- Timendus Flags conformance test.
- Timendus Quirks conformance test running in automated Classic CHIP-8 mode.
- `VerticalBlank` machine-state component for display synchronization.
- Display refresh frequency as an explicit `Chip8Profile` characteristic.
- Runtime scheduling of emulated display-frame boundaries.
- Unit and integration coverage for vertical-blank availability, scheduling, pause/resume behavior, and debugger stepping.

### Changed

- Corrected Classic `8XY1`, `8XY2`, and `8XY3` semantics so `VF` is reset after the logical result is written.
- Corrected Classic `8XY6` and `8XYE` semantics so `Vy` is the shift source and `Vx` receives the shifted result.
- Changed Classic `Dxyn` execution to wait for and consume a vertical-blank opportunity before drawing.
- Extended `Chip8Runtime` to coordinate CPU execution, timer countdown, and display-frame timing.
- Updated paused single-step execution so a display-synchronized draw can complete without advancing scheduled time or leaking a synthetic vertical-blank opportunity.
- Updated IBM Logo and Timendus Corax+ conformance execution budgets to account for Classic vertical-blank-synchronized drawing while keeping their framebuffer acceptance criteria unchanged.
- Expanded external conformance-fixture documentation for the Timendus test suite.

### Conformance

Current `main` passes:

- IBM Logo;
- original corax89 opcode test;
- Timendus Corax+;
- Timendus Flags;
- Timendus Quirks in Classic CHIP-8 mode.

## [0.1.0] - 2026-09-01 - corax89 Opcode Conformance

### Added

- **Chip8NX** project identity.
- MIT project license.
- Third-party notices and conformance-fixture provenance documentation.
- GitHub Actions CI using the project-level `deno task ci` contract.
- Dedicated conformance-test tasks for locally supplied external ROM fixtures.
- Public `@chip8nx/core` package entrypoint.
- Automated API documentation generation with `deno doc`.
- Documentation structure for architecture, guides, and design decisions.
- End-to-end conformance test for the original corax89 CHIP-8 opcode test ROM.

### Changed

- Reorganized the repository as a Deno workspace.
- External CHIP-8 ROM fixtures are no longer distributed with the repository and are ignored by Git.
- The default `test` and CI tasks run unit and integration tests without requiring third-party ROMs; conformance tests are opt-in through `test:conformance`.
- Renamed the reusable core workspace to `packages/core`.
- Moved the reusable emulator implementation into `packages/core`.
- Separated reusable emulator code from future application/frontend code.

### Milestone

Chip8NX passes the original corax89 CHIP-8 opcode test ROM through the normal machine initialization, CPU, runtime, scheduler, and display pipeline.

The milestone required no production-code changes: the instruction implementation developed before introducing the corax89 conformance test already produced the expected successful result framebuffer.

## [0.0.1] - 2026-09-01 - IBM Logo POC

### Added

- Classic CHIP-8 machine profile.
- Modular CHIP-8 components for memory, registers, stack, timers, display, keyboard, fonts, and random-number generation.
- Typed instruction decoding and execution pipeline.
- CHIP-8 CPU with fetch, decode, and execute cycle.
- CPU state snapshots.
- Immutable memory images and generic memory-image loading.
- Original Classic CHIP-8 font data and configurable font placement.
- Machine initialization with pre-mutation memory-layout validation.
- Runtime orchestration for CPU execution and CHIP-8 timers.
- Generic deadline-driven scheduler using exact rational deadlines.
- Pause, resume, and single-step runtime controls.
- Unit, integration, and conformance test organization.
- Canonical IBM Logo ROM conformance test.

### Changed

- Moved Classic machine characteristics into a unified `Chip8Profile`.
- Removed machine-specific defaults from generic components such as `ProgramCounter`, `Stack`, and `ClassicFont`.
- Replaced elapsed-time periodic-task scheduling with a globally chronological, deadline-driven scheduler.

### Milestone

The emulator successfully loads and executes the canonical IBM Logo ROM through the normal machine initialization, CPU, runtime, and scheduler pipeline and produces the expected framebuffer.
