# Host Composition Evaluation

The Terminal application introduced a three-level composition model:

1. individual components;
2. standard subsystem compositions;
3. a ready-to-use standard terminal host.

The model was deliberately kept host-local until a substantially different frontend could provide a second case study. The Web application now provides that evidence, and the later profile work through CHIP-48 and SUPER-CHIP gives a second kind of composition pressure to evaluate: one host composing multiple machine profiles without changing Core ownership boundaries.

## Result

The comparison supports three conclusions:

- the Terminal Level 1 / Level 2 / Level 3 structure remains useful for the Terminal host;
- it should not be generalized into a mandatory Core or project-wide composition framework;
- supporting multiple machine profiles does not, by itself, justify a generic machine factory or universal session abstraction.

What generalized successfully was not the host hierarchy, but the **reusable boundaries** beneath it.

Core remains the common machine foundation. Where passive inspection is required, applications can additionally compose `@chip8nx/inspection` without changing Core or adopting a shared host hierarchy.

> Convenience layers may assemble lower-level components and provide good defaults, but they should arise from real application responsibilities and must not remove lower-level capability.

See [ADR 0012 — Application-Owned Composition](../decisions/0012-application-owned-composition.md).

## What remained common

Both applications use the same Core machine concepts:

- `Chip8Profile`;
- memory and registers;
- stack;
- program counter and index register;
- delay and sound timers;
- `VerticalBlank`;
- `DisplayBuffer`;
- `KeyboardState`;
- font and random-number generation;
- `ExitState`;
- `RplFlags` where the host needs SUPER-CHIP-compatible persistent user storage;
- `ExecutionContext`;
- `MachineInitializer`;
- `Cpu`;
- `Scheduler`;
- `Chip8Runtime`.

They also converge on the same host/Core boundaries.

### Keyboard

Core owns CHIP-8-facing keyboard semantics through `Keyboard` and the standard mutable `KeyboardState` implementation.

Hosts translate their own input mechanisms into CHIP-8 key transitions.

The Terminal path includes terminal byte input, protocol parsing, key-event interpretation, and terminal-specific release behavior.

The Web host instead combines independent physical and virtual sources:

```text
BrowserKeyboard ─┐
                 ├──> KeyboardInputHub ──> KeyboardState
VirtualKeypad ───┘
```

The host structures differ, but both converge naturally on the same Core capability.

See [Machine state and capabilities architecture](./machine-state-and-capabilities.md).

### Display

`DisplayBuffer` remains emulated machine state.

Terminal and Canvas presentation are independent host adapters that observe that state. Neither renderer owns CHIP-8 display timing or SUPER-CHIP display-mode semantics.

The SUPER-CHIP work strengthens this boundary. `DisplayBuffer` now owns the distinction between logical display geometry and physical backing geometry, including the shared 128×64 backing store used by low- and high-resolution SUPER-CHIP modes.

The Web `CanvasDisplay` therefore renders the backing framebuffer directly rather than reproducing SUPER-CHIP scaling rules in the host:

```text
DisplayBuffer
    logical mode + physical backing pixels
          ↓
CanvasDisplay
    presentation only
```

That change required no new display hierarchy in Core and no SUPER-CHIP-specific Canvas renderer.

### Audio

The sound timer remains emulated machine state.

The Web host observes it and uses `WebAudioBeeper` for browser-specific sound presentation. Browser audio lifecycle and autoplay restrictions remain outside Core.

### Runtime timing

`Chip8Runtime` and `Scheduler` own CPU, timer, and display-frame timing.

Host loops determine when an application services or observes the emulator; they do not redefine emulated timing.

SUPER-CHIP introduces mode-dependent sprite timing, but this still does not make the runtime profile-aware. The runtime continues to produce vertical-blank opportunities; instruction execution decides whether the active profile and display mode require one.

Likewise, SUPER-CHIP interpreter-exit conditions change interpreter state through `ExitState` rather than introducing a host/runtime stop callback. An exited CPU simply performs no further instruction attempts until initialization resets that state.

See [Runtime and timing architecture](./runtime-and-timing.md).

### Profiles

`Chip8Profile` remains immutable machine description rather than a composition root.

The current built-in profiles are:

```text
CLASSIC_CHIP8_PROFILE
CHIP48_PROFILE
SUPERCHIP_PROFILE
```

Applications still decide how profile data becomes concrete collaborators.

For example, the Web host uses the selected profile to choose:

- memory and stack capacities;
- program start address;
- display specification;
- compatibility behavior for `InstructionExecutor`;
- timer and display frequencies;
- small-font and optional large-font composition;
- instruction formatter appropriate to the profile's assembly semantics.

This is still application-owned composition. The profile does not instantiate components itself.

## What remained host-specific

The two applications developed different composition structures because their host responsibilities differ.

### Terminal

The Terminal application naturally groups input and presentation around a shared terminal output resource:

```text
Level 1
    individual terminal components

Level 2
    StandardTerminalInput
    StandardTerminalPresentation

Level 3
    StandardTerminalHost
```

`StandardTerminalHost` owns the shared terminal resource and coordinates the lifecycle of the standard Terminal subsystems.

It does not own CHIP-8 execution, machine composition, ROM loading, or emulated timing.

See [Terminal composition levels](../guides/terminal-composition-levels.md).

### Web

The Web application has different composition pressures:

- physical browser keyboard input;
- virtual keypad input;
- `KeyboardInputHub` for simultaneous input sources;
- Canvas framebuffer presentation;
- Web Audio presentation;
- ROM replacement and reload lifecycle;
- selectable Classic CHIP-8, CHIP-48 2.25, and SUPER-CHIP 1.1 profiles;
- profile recomposition while retaining the current ROM image;
- profile-appropriate instruction formatting;
- application-lifetime RPL storage shared across machine-session replacement;
- unified Start/Pause, Step, and Reset controls;
- browser visibility handling;
- a `requestAnimationFrame` host loop;
- browser audio unlocking;
- persistent appearance themes;
- live CPU-state presentation;
- best-effort nearby disassembly through `@chip8nx/inspection`;
- bounded recent instruction-attempt history through `@chip8nx/inspection`;
- a persistent `WebMachineSession` application-state aggregate.

Those responsibilities do not naturally form the same three composition levels used by the Terminal host.

Instead, the Web host acts directly as its own composition root:

```text
@chip8nx/core
    machine execution
    runtime
    authoritative observation
          ↓
@chip8nx/inspection
    passive disassembly
    formatting
    bounded trace retention
          ↓
apps/web
    profile selection
    lifecycle
    policy
    browser presentation
```

There is still no demonstrated need for a Web equivalent of `StandardTerminalHost`.

## Application-owned composition

The Web case study and subsequent profile work strengthen ADR 0012.

Applications continue to act as their own composition roots and explicitly choose concrete implementations.

The comparison does not demonstrate a need for:

- a Core `Chip8Machine` aggregate;
- a mandatory machine factory;
- a generic host abstraction;
- a dependency-injection container;
- a project-wide Level 1 / Level 2 / Level 3 framework;
- a generic profile registry or variant manager.

This keeps host-specific lifecycle, policy, interaction, and presentation outside the reusable Core and Inspection packages.

The SUPER-CHIP work is especially useful evidence here. It introduced genuinely new machine behavior—dual display modes, a shared backing framebuffer, large-font support, interpreter exit, and persistent RPL state—without requiring a parallel machine architecture or generic variant framework.

## Repeated machine assembly

The comparison continues to reveal genuine repetition: applications manually construct largely the same Core machine graph before attaching their own host adapters.

The Web host now does this for multiple profiles rather than only for Classic CHIP-8, so the repetition is more visible than it was during the original second-host evaluation.

That repetition remains a candidate for a future convenience abstraction, but it is still not sufficient evidence for one.

Extracting a helper would require deliberate decisions about:

```text
ownership
injection points
default implementations
initialization
exposed components
profile generality
persistent-state lifetime
host-specific retained references
```

The addition of `RplFlags` makes the ownership question more concrete. A helper that blindly creates all state per machine session would be wrong for the Web host because SUPER-CHIP RPL storage deliberately outlives one reset or one replacement `WebMachineSession`.

Likewise, formatter selection is application composition rather than Core machine construction. Classic CHIP-8 uses `ClassicInstructionFormatter`, while CHIP-48 and the current SUPER-CHIP profile use CHIP-48-style formatting where their semantics differ.

A shared factory would therefore have to decide whether it constructs only Core, also constructs Inspection collaborators, or accepts a larger set of policies and retained external state. That design pressure is now clearer, but not yet stable enough to justify extraction.

For now, explicit construction remains useful architectural documentation. Revisit this only when additional hosts or tooling create concrete pressure for shared assembly.

## Profile recomposition in the Web host

The Web profile selector provides a concrete example of application-owned recomposition.

When a user changes the selected profile while a ROM is loaded, the Web application:

1. retains the current ROM image;
2. constructs a replacement machine using the selected `Chip8Profile`;
3. initializes that machine with the same ROM;
4. selects the corresponding instruction formatter;
5. stops the old host-facing input/runtime lifecycle only after replacement composition succeeds;
6. preserves whether the previous machine was running or paused;
7. reattaches the browser keyboard and virtual keypad to the new session.

Conceptually:

```text
current ROM
    +
selected profile
    ↓
create replacement WebMachineSession
    ↓
swap sessions
    ↓
preserve host lifecycle state
```

This behavior belongs in `apps/web` because it is a user-interface lifecycle policy, not a Core machine semantic.

### Persistent RPL ownership

Not every machine-related object belongs inside `WebMachineSession`.

SUPER-CHIP RPL flags intentionally survive ordinary machine initialization. The Web application therefore owns one `RplFlags` instance above individual machine sessions and injects it into every replacement session:

```text
Web application lifetime
        │
        └── RplFlags
              │
              ├── session A
              ├── reset A
              ├── profile recomposition
              └── session B
```

This is a concrete example of why lifecycle ownership matters more than mechanical object grouping.

Putting `new RplFlags()` inside every session constructor would make the code locally tidy but would violate the emulated SUPER-CHIP persistence semantics.

The current Web contract preserves RPL data for the lifetime of the page/application. Persistence across browser reloads remains outside the current design.

## Formatter composition

Profile support also exposed variation in passive inspection presentation.

The decoder remains shared and profile-agnostic. It preserves enough operand information for later semantics and presentation.

The Web composition root chooses the formatter:

```text
Classic CHIP-8
    → ClassicInstructionFormatter

CHIP-48
    → Chip48InstructionFormatter

SUPER-CHIP 1.1
    → Chip48InstructionFormatter
      for CHIP-48-style semantic forms,
      plus shared formatting for SUPER-CHIP opcodes
```

This keeps formatting variation in `@chip8nx/inspection` while keeping the choice of which formatter applies to the active machine in the application composition root.

No global profile lookup or profile-aware singleton is required.

## `WebMachineSession`

`WebMachineSession` remains a Web application aggregate rather than a missing Core machine abstraction.

It retains the references required by the browser application's demonstrated lifecycle and presentation needs:

```text
ROM lifecycle
    romName
    program
    profile
    context
    initializer

execution
    cpu
    runtime

inspection
    traceHistory
    snapshotInspection()

presentation
    displayBuffer
    soundTimer

browser input
    browserKeyboard
    virtualKeypad
```

The addition of profile recomposition strengthens rather than weakens the case for keeping this aggregate host-local.

For example, another host might:

- support only one profile;
- allow profile selection before ROM loading but not while running;
- retain RPL storage for a different host-defined lifetime;
- use the same Core CPU observation signal without retaining a trace buffer;
- inspect memory without presenting nearby instructions;
- have no interactive inspection UI at all.

Those hosts would not necessarily need the same retained references or lifecycle.

`WebMachineSession` should therefore remain application-owned until multiple consumers demonstrate a stable shared machine-session abstraction.

## Conclusion

The host-composition evaluation remains complete enough to answer the original composition question, and the v0.8/v0.9 profile work gives stronger evidence for the same conclusion:

- the Terminal three-level model remains useful inside the Terminal host;
- the Web host is free to use different host-local compositions;
- the reusable Core boundaries have held across both applications;
- passive Inspection capabilities can be composed where required without becoming mandatory machine infrastructure;
- multiple profiles can be composed through the same Core boundaries without introducing a generic variant manager;
- persistent state such as SUPER-CHIP RPL flags can be owned at the host lifetime that matches its semantics;
- profile-specific inspection formatting can be selected at the application composition boundary;
- application-owned composition remains the project-wide rule;
- repeated machine assembly remains worth observing, but not yet extracting.

The Web inspection workbench, CHIP-48 profile selection, and SUPER-CHIP 1.1 support all arrived without requiring a universal host abstraction or a Core `Chip8Machine` aggregate. The application instead composes existing reusable boundaries and retains host-specific policy locally.

No new Core composition abstraction is introduced as a result of this evaluation.
