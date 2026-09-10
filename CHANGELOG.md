# Changelog

All notable changes to this project will be documented in this file.

The project follows Semantic Versioning.

During the `0.x` development phase:

- **PATCH** releases contain fixes, refactors, documentation improvements, and other changes that do not represent a new emulator capability milestone.
- **MINOR** releases represent meaningful emulator capabilities and conformance milestones, and may include breaking API changes while the public API remains unstable.
- **1.0.0** will mark the first stable Classic CHIP-8 implementation with an intentionally supported public API and agreed conformance requirements.

## [Unreleased]

## [0.7.0] - 2026-09-10 - Web Inspection Workbench

### Added

- Added the host-independent `@chip8nx/inspection` workspace package for passive CHIP-8 inspection tooling.
- Added public-package integration coverage proving that Core semantics and observation contracts compose with Inspection disassembly, formatting, and bounded trace history through public APIs only.
- Added a focused Core public-API integration test for the CPU instruction-observation contract.
- Added a read-only Web inspection workbench showing:
  - current CPU register, index-register, program-counter, stack, and timer state;
  - a bounded best-effort disassembly window around the current program counter;
  - bounded recent CPU instruction-attempt history.
- Added passive inspection of failed CPU attempts so manual stepping and runtime failures can expose the actual post-failure CPU state and retained failed trace.
- Added a responsive Web workspace that keeps the CHIP-8 display, virtual keypad, execution controls, and inspection information readily accessible across desktop and narrow layouts.
- Added persistent Web appearance themes:
  - Retro Green;
  - Retro Amber;
  - Dark.
- Added theme-aware Canvas framebuffer presentation so CHIP-8 foreground and background colors follow the selected Web theme.
- Added a compact machine-state indicator showing whether no ROM is loaded, execution is running, or execution is paused.
- Added an explicit physical-keyboard to CHIP-8 keypad mapping alongside the virtual keypad.
- Added lightweight inline SVG icons for emulator commands and inspection-panel headings.

### Changed

- Moved instruction formatting, disassembly, bounded trace history, and trace formatting from `@chip8nx/core` to `@chip8nx/inspection`.
- Reduced Core tracing ownership to the minimal CPU observation boundary: `InstructionTrace`, its success/failure variants, and `InstructionTraceObserver`.
- Reorganized the private Core observation source under `cpu/observation`, reflecting that instruction traces are produced by `Cpu.step()` rather than by a separate Core tracing subsystem.
- Updated Terminal and disassembler applications to compose `@chip8nx/core` with `@chip8nx/inspection` where passive inspection capabilities are required.
- Extended generated API documentation and documentation linting to cover the public entrypoints of both reusable packages.
- Reconciled architecture, tracing, disassembly, usage, CI, and project documentation with the Core / Inspection responsibility boundary.
- Clarified that Core owns machine semantics, runtime mechanisms, and authoritative observation signals; Inspection owns passive consumers; applications own host-specific presentation and lifecycle policy.
- Kept debugger execution-control behavior deliberately deferred until concrete reusable needs such as breakpoints, watchpoints, or step-over semantics are demonstrated.
- Changed the Web host from a primarily vertical emulator page into a responsive play-and-inspection workspace with the display and keypad grouped together and the inspector positioned alongside them on larger viewports.
- Replaced separate Start and Pause controls with one runtime-state-driven Start/Pause control.
- Replaced the native visible ROM file input with a compact application-styled ROM loader while retaining the browser file-input mechanism underneath.
- Made the selected ROM name persistent in the toolbar and kept transient lifecycle/error information in the separate status area.
- Restyled emulator command controls as one consistent theme-aware, worn/backlit visual family.
- Reorganized and consolidated Web CSS around semantic theme variables, shared component tokens, responsive layout rules, and reusable surface/control styling.

### Milestone

`v0.7.0` turns the Web host into Chip8NX's first interactive inspection workbench.

The reusable architecture remains deliberately split by responsibility:

```text
@chip8nx/core
    machine semantics
    runtime mechanisms
    CPU observation signal
          ↓
@chip8nx/inspection
    instruction formatting
    disassembly
    bounded trace history
    trace formatting
          ↓
apps/web
    inspection policy
    lifecycle
    browser presentation
```

The Web host now composes both reusable packages to provide complementary views of a running or paused machine:

```text
CPU state
    → what the processor contains now

Nearby instructions
    → how bytes around the current PC decode

Recent instructions
    → what CPU attempts actually occurred
```

Nearby disassembly is intentionally best-effort at the application boundary: each neighboring address is inspected independently, so undecodable bytes remain visible as unavailable rows without turning passive inspection into an emulator failure.

Execution observation remains passive. The inspector can expose successful attempts, failed attempts, retry behavior, and post-failure CPU state, but it does not decide when execution pauses or resumes.

This milestone also establishes the Web host's first deliberate usability layer: responsive play and inspection regions, compact execution controls, explicit keyboard mapping, persistent appearance themes, and theme-aware framebuffer presentation.

Breakpoints, watchpoints, pause conditions, step-over/step-out behavior, memory editing, CHIP-8 variant/profile selection, and other active debugger semantics remain deliberately deferred until concrete use cases demonstrate the need for them.

## [0.6.0] - 2026-09-07 - Tracing and Execution Observation

### Added

- Structured `InstructionTrace` model representing successful and failed CPU instruction attempts.
- Optional `InstructionTraceObserver` boundary at `Cpu.step()`.
- Before/after `CpuState` observation for traced attempts without expanding traces into whole-machine snapshots.
- `ClassicInstructionTraceFormatter` for conventional human-readable instruction traces.
- `StateChangeInstructionTraceFormatter` for composable reporting of changed CPU state.
- `InstructionTraceBuffer`, a bounded ring-buffer observer retaining recent traces in chronological order.
- Focused CPU tracing coverage for successful attempts, retry attempts, fetch failures, decode failures, execution failures, observer failures, and original-error preservation.
- Trace-formatter coverage for success, failure, state changes, unchanged state, and failure paths that mutate CPU state.
- Bounded-history coverage for capacity validation, ordering, overflow, repeated wraparound, snapshot ownership, object identity, and clearing.
- Public-API integration coverage proving that tracing observation, history, and formatting compose through `packages/core/mod.ts` without private source imports.
- Terminal `--trace` mode:

  ```text
  deno task terminal --trace <rom-path>
  ```

- Dedicated tracing architecture documentation covering the CPU-attempt observation boundary, success/failure records, non-interference guarantees, retry visibility, formatting boundaries, bounded history, and deliberately deferred debugger concerns.
- Expanded architecture documentation for instruction execution, runtime and timing, machine state and capabilities, machine initialization, and machine lifecycle.

### Changed

- Moved `InstructionFormatter` and `ClassicInstructionFormatter` from the disassembly-specific area to the neutral `instruction/formatting` area after tracing became a second real consumer.
- Extended `Cpu` with one optional trace observer while avoiding trace snapshot creation when tracing is disabled.
- Isolated observer failures so tracing cannot turn successful CPU execution into failure.
- Preserved the exact original CPU error when tracing a failed attempt, even when the observer itself throws.
- Represented failed execution traces using the actual post-failure CPU state rather than implying transactional rollback.
- Kept retry-style instructions such as waiting `Fx0A` and vblank-gated `Dxyn` visible as repeated real CPU attempts.
- Extended the public `@chip8nx/core` API with the tracing model, observer, formatters, bounded history, and shared instruction-formatting surface.
- Kept trace formatting, trace storage, and application output separate from CPU observation.
- Kept Terminal trace output application-owned; trace mode suppresses alternate-screen framebuffer presentation while preserving keyboard input and emulated execution.
- Updated architecture and documentation navigation to distinguish read-only disassembly from observation of instruction attempts that actually execute.
- Performed an editorial review of the architecture and guide documentation to improve consistency and remove duplicated or stale explanations.
- Removed the tracked VS Code launch configuration so editor-specific launch settings are no longer part of the versioned project configuration.

### Milestone

`v0.6.0` establishes Chip8NX's reusable execution-observation foundation.

The CPU remains responsible for the semantics of one instruction attempt, while `Chip8Runtime` remains responsible for when scheduled attempts occur:

```text
Chip8Runtime
    ↓
when an attempt occurs

Cpu.step()
    ↓
what the attempt means
    ↓
InstructionTrace
    ↓
optional observers
    ├── formatting / application output
    └── bounded recent history
```

Tracing is deliberately observational. It records facts about execution without controlling execution.

That boundary complements the read-only disassembly capability introduced in `v0.5.0`:

```text
encoded program
    ↓
disassembly
    → inspect instructions without execution

running machine
    ↓
tracing
    → observe actual CPU attempts
```

Together, these capabilities establish the reusable inspection foundation on which later Terminal, Web, desktop, debugger, or analysis consumers can be built.

Breakpoints, execution control, observer fan-out, timestamps, sequence numbers, whole-machine snapshots, persistent trace formats, replay, and richer history-query APIs remain deliberately deferred until concrete consumers create demonstrated architectural pressure for them.

## [0.5.0] - 2026-09-05 - Disassembly and Inspection

### Added

- Reusable Core disassembly subsystem for read-only CHIP-8 instruction inspection.
- `DisassembledInstruction` result model preserving the source address, typed `Instruction`, and formatted human-readable text.
- Pluggable `InstructionFormatter` formatting boundary.
- `ClassicInstructionFormatter` using conventional Classic CHIP-8 assembly notation.
- `Disassembler.disassembleAt()` for inspecting a single instruction at an arbitrary memory address.
- `Disassembler.disassemble()` for strict linear disassembly of known instruction ranges.
- Exhaustive Classic instruction-formatting coverage, including all register-operation forms.
- Unit coverage for single-instruction decoding, formatting delegation, sequential range traversal, invalid opcodes, memory boundaries, invalid byte lengths, and unmatched trailing bytes.
- Public-API integration coverage exercising ROM loading, memory composition, decoding, formatting, and disassembly through `packages/core/mod.ts`.
- Command-line disassembler application under `apps/disassembler`.
- Root `disassemble` task for exploratory ROM inspection:

  ```text
  deno task disassemble <rom-path>
  ```

- Tolerant application-level whole-ROM linear traversal that reports unsupported Classic CHIP-8 words as `UNKNOWN` and continues with subsequent words.
- Dedicated disassembly architecture documentation covering responsibility boundaries, dependency direction, lifecycle, error ownership, extension points, and the relationship between inspection and execution.
- Practical disassembly guide covering known instruction ranges, single-instruction inspection, custom formatters, error behavior, and the exploratory CLI.

### Changed

- Added `apps/disassembler` to the Deno workspace.
- Extended the public `@chip8nx/core` API with the disassembly and instruction-formatting types and implementations.
- Extended the Core architecture overview with the read-only inspection path branching from the existing typed `Instruction` model.
- Updated architecture, guide, and top-level documentation indexes to include the new disassembly subsystem and CLI.
- Updated the root README with the `v0.5.0` capability milestone, CLI quick start, repository structure, and post-disassembly future-work direction.
- Clarified the distinction between strict Core range disassembly and tolerant application-level ROM inspection.
- Clarified that CHIP-8 ROMs may mix executable code with sprites, strings, tables, constants, or other data, so successful opcode decoding does not by itself prove that a ROM word represents executable code.
- Retained `Decoder` as an injected concrete dependency while keeping `InstructionFormatter` abstract, reflecting demonstrated formatter variation without prematurely introducing a decoder abstraction.
- Kept tolerant traversal, code/data interpretation, control-flow analysis, descriptions, symbols, and richer inspection metadata outside the Core disassembly contract until additional consumers justify shared abstractions.

### Milestone

`v0.5.0` introduces the first reusable instruction-inspection capability in Chip8NX Core.

Disassembly reuses the same `Decoder` and typed `Instruction` model used by CPU execution, then deliberately diverges into a read-only formatting path rather than executing or mutating machine state:

```text
encoded bytes
    ↓
Opcode
    ↓
Decoder
    ↓
Instruction
   /           \
execution    inspection
```

The Core API supports both single-instruction inspection and strict linear disassembly of ranges known to contain instructions. Human-readable presentation is separated through the `InstructionFormatter` boundary, with `ClassicInstructionFormatter` supplied as the standard Classic CHIP-8 implementation.

A minimal command-line application validates the Core API as a real external consumer. During real-ROM testing, the CLI exposed an important distinction between instruction ranges and arbitrary ROM contents: CHIP-8 programs may contain code mixed with embedded data, and data can either fail decoding or coincidentally resemble valid instructions.

The CLI therefore keeps tolerant whole-ROM traversal as an application policy. Unsupported words are rendered as `UNKNOWN` and inspection continues, while the strict Core range-disassembly contract remains unchanged.

This milestone establishes the inspection foundation needed for later debugger, tracer, and analysis tooling without prematurely introducing control-flow analysis, code/data classification, generic plugin infrastructure, or variant-specific decoding abstractions.

## [0.4.0] - 2026-09-04 - Interactive Web Host

### Added

- Second interactive Chip8NX host application under `apps/web`, using Vite and vanilla TypeScript.
- Browser ROM-file loading and Classic CHIP-8 execution.
- `CanvasDisplay` for browser framebuffer presentation.
- Start/resume, pause, single-step, and reset-to-paused execution controls.
- Persistent `WebMachineSession` application-state aggregate for the currently loaded ROM.
- `BrowserKeyboard` physical-keyboard adapter using `KeyboardEvent.code`.
- Browser-keyboard key release on browser focus loss to prevent stuck input.
- Virtual 4×4 CHIP-8 keypad.
- `KeyboardInputHub` for combining independent physical and virtual keyboard input sources without losing per-source key ownership.
- `WebAudioBeeper` for simple CHIP-8 sound presentation through the Web Audio API.
- Focused tests for the Web display, keyboard, virtual keypad, input hub, and audio components.
- Web application guide documenting browser-host architecture, input composition, Canvas presentation, Web Audio, runtime lifecycle, and host composition.

### Changed

- Added `apps/web` to the Deno workspace and project-wide checking and testing.
- Extended the project CI contract to verify the Web production build.
- Evaluated the Terminal Level 1 / Level 2 / Level 3 composition experiment against the Web host as a second, substantially different application.
- Retained application-owned composition and host-local composition structures rather than introducing a mandatory Core composition framework.
- Updated architecture and project documentation with the results of the Terminal-versus-Web composition evaluation.

### Milestone

`v0.4.0` introduces the second complete Chip8NX host application.

The Web frontend can load and run Classic CHIP-8 programs with Canvas framebuffer presentation, physical and virtual keyboard input, execution lifecycle controls, and Web Audio sound presentation.

The Web application also completes the second-host composition case study. Comparison with the Terminal host validates the existing Core host boundaries while showing that host-level composition structures should be allowed to differ according to platform responsibilities.

The Terminal Level 1 / Level 2 / Level 3 model therefore remains a terminal-specific composition model, while application-owned composition remains the project-wide rule.

No new Core composition abstraction is introduced as part of this milestone.

## [0.3.0] - 2026-09-03 - Interactive Terminal Host

### Added

- First interactive Chip8NX host application under `apps/terminal`.
- Terminal framebuffer rendering using Unicode block characters to represent two vertical CHIP-8 pixels per terminal cell.
- Terminal presentation lifecycle using an alternate screen, hidden cursor, and clean terminal-state restoration.
- Retro ANSI green standard terminal presentation.
- Interactive terminal keyboard input using the conventional CHIP-8 keypad mapping.
- Enhanced CSI-u / Kitty keyboard handling with explicit press, repeat, and release events where supported.
- Legacy terminal-input fallback using host-time synthetic key releases.
- `Escape` as the standard terminal exit command, while retaining `Ctrl+C` as an alternative exit path.
- Public `KeyboardState` Core component for deterministic pressed-key state and Classic `FX0A` press-then-release semantics.
- Level-2 `StandardTerminalPresentation` composition.
- Level-2 `StandardTerminalInput` composition.
- Level-3 `StandardTerminalHost` ready-to-use terminal composition.
- Three runnable examples demonstrating terminal composition at:
  - Level 1 — individual components;
  - Level 2 — standard subsystem compositions;
  - Level 3 — standard terminal host.
- Mermaid architecture diagrams covering Core components, CPU execution, runtime/display timing, machine lifecycle, terminal components, and terminal composition levels.
- Terminal composition guide documenting the Level-1 / Level-2 / Level-3 case study.

### Changed

- Promoted deterministic keyboard state from test infrastructure into the reusable Core as `KeyboardState`.
- Updated Core, integration, and conformance tests to use the production keyboard-state component where appropriate.
- Added `apps/terminal` to the Deno workspace.
- Extended project-level checking and testing to cover terminal source, tests, and runnable examples.
- Updated the Core embedding guide to match the current `ExecutionContext` and `Chip8Runtime` contracts, including `VerticalBlank` and display refresh frequency.
- Updated architecture and lifecycle documentation to describe emulated vertical-blank scheduling, debugger stepping, keyboard-state ownership, and the host-rendering boundary.
- Expanded project documentation with visual component and dependency diagrams.

### Milestone

`v0.3.0` introduces the first complete Chip8NX host application.

The terminal frontend can load and run Classic CHIP-8 programs with framebuffer presentation, interactive keyboard input, display-synchronized Core execution, and clean host lifecycle management.

The terminal application also completes the first case study for layered composition:

```text
Level 1 — Components
        ↓
Level 2 — Standard compositions
        ↓
Level 3 — Ready-to-use host
```

All three levels are built from the same underlying components and preserve the ability to mix standard and custom subsystems.

This provides concrete evidence for the layered-composition model without yet generalizing it to the reusable Core. The pattern will be evaluated again while developing a second, substantially different host before any project-wide composition abstraction is adopted. Terminal feature development is considered complete for this milestone. Further terminal changes should be limited to bug fixes, documentation corrections, or architectural issues revealed by future hosts.

## [0.2.0] - 2026-09-02 - Classic CHIP-8 Baseline

### Added

- Timendus Corax+ opcode conformance test.
- Timendus Flags conformance test.
- Timendus Quirks conformance test running in automated Classic CHIP-8 mode.
- Timendus Keypad conformance test covering `EX9E`, `EXA1`, and `FX0A`.
- `VerticalBlank` machine-state component for display synchronization.
- Display refresh frequency as an explicit `Chip8Profile` characteristic.
- Runtime scheduling of emulated display-frame boundaries.
- Unit and integration coverage for vertical-blank availability, scheduling, pause/resume behavior, and debugger stepping.
- Explicit unit coverage for Classic zero-height `DXY0` display-wait behavior.
- Documented Classic CHIP-8 opcode coverage audit.

### Changed

- Corrected Classic `8XY1`, `8XY2`, and `8XY3` semantics so `VF` is reset after the logical result is written.
- Corrected Classic `8XY6` and `8XYE` semantics so `Vy` is the shift source and `Vx` receives the shifted result.
- Changed Classic `Dxyn` execution to wait for and consume a vertical-blank opportunity before drawing.
- Extended `Chip8Runtime` to coordinate CPU execution, timer countdown, and display-frame timing.
- Updated paused single-step execution so a display-synchronized draw can complete without advancing scheduled time or leaking a synthetic vertical-blank opportunity.
- Updated IBM Logo and Timendus Corax+ conformance execution budgets to account for Classic vertical-blank-synchronized drawing while keeping their framebuffer acceptance criteria unchanged.
- Expanded external conformance-fixture documentation for the Timendus test suite.
- Documented `0mmm` native COSMAC system calls as intentionally unsupported by the generic CHIP-8 core.

### Conformance

Chip8NX `v0.2.0` passes:

- IBM Logo;
- original corax89 opcode test;
- Timendus Corax+;
- Timendus Flags;
- Timendus Quirks in Classic CHIP-8 mode;
- Timendus Keypad.

The Classic opcode audit confirms that every Classic opcode family is intentionally handled by the implementation. Ordinary CHIP-8 virtual-machine instructions have executable semantics and direct unit coverage. The historical `0mmm` instruction is recognized and decoded but intentionally rejected because it transfers execution to native CDP1802 machine code outside the scope of the generic CHIP-8 core.

### Milestone

`v0.2.0` establishes the Chip8NX Classic CHIP-8 baseline.

Classic opcode implementation and conformance are now sufficiently complete that additional Classic conformance ROMs no longer block feature development. Further conformance testing remains useful when it provides new behavioral evidence, but development can now proceed toward applications, public-API refinement, and future CHIP-8-family profiles.

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
