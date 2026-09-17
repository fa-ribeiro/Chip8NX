# Host Composition Evaluation

The Terminal application introduced a three-level composition model:

1. individual components;
2. standard subsystem compositions;
3. a ready-to-use standard terminal host.

The model was deliberately kept host-local until a substantially different frontend could provide a second case study. The Web application now provides that evidence, and the later profile work through CHIP-48 and SUPER-CHIP gives a second kind of composition pressure to evaluate: one host composing multiple machine profiles without changing Core ownership boundaries.

The later profile-semantics refactor adds one more useful piece of evidence. Machine profiles now distinguish explicitly between:

```text
machine characteristics
    → memory, stack, display, timing, fonts

instructionSet
    → which instruction semantics exist

quirks
    → how shared instructions vary
```

That clarification changed how profile semantics are represented, but it did not create pressure for a new composition framework.

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
- `RplFlags` where the host needs longer-lived SUPER-CHIP user storage;
- `ExecutionContext`;
- `MachineInitializer`;
- `Decoder`;
- `InstructionExecutor`;
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

The SUPER-CHIP work strengthens this boundary. `DisplayBuffer` owns the distinction between logical display geometry and physical backing geometry, including the shared 128×64 backing store used by low- and high-resolution SUPER-CHIP modes.

The Web `CanvasDisplay` therefore renders the backing framebuffer directly rather than reproducing SUPER-CHIP scaling rules in the host:

```text
DisplayBuffer
    logical mode + physical backing pixels
          ↓
CanvasDisplay
    presentation only
```

That change required no new display hierarchy in Core and no SUPER-CHIP-specific Canvas renderer.

The later instruction-set refactor also makes another boundary explicit: a SUPER-CHIP-capable `DisplayBuffer` does not itself grant SUPER-CHIP instruction semantics. Display capability and instruction-set membership are separate composition concerns.

### Audio

The sound timer remains emulated machine state.

The Web host observes it and uses `WebAudioBeeper` for browser-specific sound presentation. Browser audio lifecycle and autoplay restrictions remain outside Core.

### Runtime timing

`Chip8Runtime` and `Scheduler` own CPU, timer, and display-frame timing.

Host loops determine when an application services or observes the emulator; they do not redefine emulated timing.

SUPER-CHIP introduces display-mode-dependent sprite timing, but this still does not make the runtime profile-aware. The runtime continues to produce vertical-blank opportunities; instruction execution resolves `profile.quirks.spriteDrawTiming` against the current display mode and decides whether a draw attempt must consume one.

Likewise, SUPER-CHIP interpreter-exit conditions change interpreter state through `ExitState` rather than introducing a host/runtime stop callback. An exited CPU simply performs no further fetch/decode/execute work until initialization resets that state.

See [Runtime and timing architecture](./runtime-and-timing.md).

### Profiles

`Chip8Profile` remains an immutable machine description rather than a composition root.

The current built-in profiles are:

```text
CLASSIC_CHIP8_PROFILE
CHIP48_PROFILE
SUPERCHIP_PROFILE
```

Applications still decide how profile data becomes concrete collaborators.

The profile now exposes three distinct composition inputs:

```text
machine characteristics
    memory size
    program start address
    stack capacity
    display specification + refresh frequency
    timer frequency
    fonts.small
    optional fonts.large

instructionSet
    chip8
    superchip-1.1

quirks
    shift source
    memory-transfer index behavior
    jump-offset source
    logic-flag behavior
    sprite overflow
    sprite draw timing
    index-overflow behavior
```

For example, the Web host uses the selected profile to choose or configure:

- memory and stack capacities;
- program start address;
- display specification;
- sprite-overflow behavior for `DisplayBuffer`;
- small-font and optional large-font composition through `profile.fonts`;
- instruction-set membership and shared-instruction quirks for `InstructionExecutor`;
- timer and display frequencies;
- instruction formatting appropriate to the profile's assembly semantics.

Conceptually:

```text
Chip8Profile
    ├── machine characteristics
    │      ↓
    │   construct/configure state and capabilities
    │
    ├── instructionSet ─┐
    └── quirks ─────────┴──> InstructionExecutor
```

This is still application-owned composition. The profile does not instantiate components itself.

The distinction between `instructionSet` and `quirks` also prevents the composition root from treating extension-only semantics as generic feature flags. `00FD`, `Fx30`, `Fx75` / `Fx85`, display controls, extended `Dxy0`, and high-resolution affected-row `VF` semantics follow from `superchip-1.1`; shared behaviors such as shifts, memory transfers, sprite timing, and `Fx1E` overflow follow from `Chip8Quirks`.

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

See [Web application](../guides/web-application.md).

## Application-owned composition

The Web case study and subsequent profile work strengthen ADR 0012.

Applications continue to act as their own composition roots and explicitly choose concrete implementations.

The comparison does not demonstrate a need for:

- a Core `Chip8Machine` aggregate;
- a mandatory machine factory;
- a generic host abstraction;
- a dependency-injection container;
- a project-wide Level 1 / Level 2 / Level 3 framework;
- a generic profile registry or variant manager;
- a capability graph derived automatically from profile identity;
- a strategy object per quirk.

This keeps host-specific lifecycle, policy, interaction, and presentation outside the reusable Core and Inspection packages.

The SUPER-CHIP work is especially useful evidence here. It introduced genuinely new machine behavior—dual display modes, a shared backing framebuffer, large-font support, extension-specific instructions, interpreter exit, and persistent RPL state—without requiring a parallel machine architecture or generic variant framework.

The later profile refactor strengthened the same design. Instead of growing one compatibility object with `supported` / `unsupported` switches, the model separated instruction-set membership from shared-instruction quirks while leaving application-owned composition unchanged.

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
instruction-set configuration
quirk distribution
persistent-state lifetime
host-specific retained references
```

The profile refactor makes this design pressure clearer rather than simpler.

A shared helper would need to know that different profile fields configure different collaborators:

```text
profile.memorySize
    → Ram

profile.display.specification
profile.quirks.spriteOverflow
    → DisplayBuffer

profile.fonts
    → font capability + initialization resources

profile.instructionSet
profile.quirks
    → InstructionExecutor

profile.timerFrequency
profile.display.refreshFrequency
    → Chip8Runtime
```

That is useful repeated composition, but it is not yet evidence that one universal factory should own every choice.

The addition of `RplFlags` makes the ownership question even more concrete. A helper that blindly creates all state per machine session would be wrong for the Web host because SUPER-CHIP RPL storage deliberately outlives ordinary reset and replacement `WebMachineSession` objects.

Likewise, formatter selection is application composition rather than Core machine construction. Classic CHIP-8 uses `ClassicInstructionFormatter`, while CHIP-48 and the current SUPER-CHIP profile use CHIP-48-style formatting where their shared semantics differ, together with common formatting support for SUPER-CHIP instructions.

A shared factory would therefore have to decide whether it:

```text
constructs only Core
constructs Core + Inspection
owns or receives RplFlags
selects instruction formatters
retains host-visible components
initializes the program
owns runtime configuration
```

Those decisions are now easier to name, but not yet stable enough to justify extraction.

For now, explicit construction remains useful architectural documentation. Revisit this only when additional hosts or tooling create concrete pressure for shared assembly.

See [Embedding the Core](../guides/embedding-the-core.md) for the explicit composition path.

## Profile recomposition as architectural evidence

The Web profile selector provides a concrete example of application-owned recomposition without requiring Core to own a generic machine-session abstraction.

When the selected profile changes while a ROM is loaded, the Web host composes a replacement session around the retained program image. The selected `Chip8Profile` is applied consistently across machine characteristics, instruction-set membership, shared-instruction quirks, timing, resources, and inspection presentation. Host lifecycle policy decides when the replacement becomes active and whether the previous session's running/paused state is preserved.

Two boundaries are especially useful evidence:

```text
superchip-1.1
    → Fx75 / Fx85 exist

host-owned RplFlags lifetime
    → how long stored values survive
```

The Web application therefore owns `RplFlags` above individual sessions rather than hiding that lifetime inside `Chip8Profile` or a generic session factory. Likewise, formatter selection remains application composition: Inspection provides reusable formatters, while the host chooses the one appropriate to the selected machine.

`WebMachineSession` remains a Web-local aggregate because it retains exactly the references required by that host's demonstrated lifecycle, inspection, input, and presentation needs. Another host need not retain the same objects or support profile replacement at all.

These details support the architectural conclusion without making this evaluation a second implementation guide. The concrete browser workflow is documented in [Web application](../guides/web-application.md), and the profile model itself is documented in [Machine profiles and variation](./machine-profiles-and-variation.md).

## Conclusion

The host-composition evaluation remains complete enough to answer the original composition question, and the later profile and SUPER-CHIP work gives stronger evidence for the same conclusion:

- the Terminal three-level model remains useful inside the Terminal host;
- the Web host is free to use different host-local compositions;
- the reusable Core boundaries have held across both applications;
- passive Inspection capabilities can be composed where required without becoming mandatory machine infrastructure;
- multiple profiles can be composed through the same Core boundaries without introducing a generic variant manager;
- profile semantics are now more precisely divided into machine characteristics, instruction-set membership, and shared-instruction quirks;
- extension-specific semantics can be added without turning resources or quirks into generic support flags;
- persistent state such as SUPER-CHIP RPL flags can be owned at the host lifetime that matches its semantics;
- profile-specific inspection formatting can be selected at the application composition boundary;
- application-owned composition remains the project-wide rule;
- repeated machine assembly remains worth observing, but not yet extracting.

The Web inspection workbench, CHIP-48 profile selection, SUPER-CHIP 1.1 support, and the later instruction-set/quirk separation all arrived without requiring a universal host abstraction or a Core `Chip8Machine` aggregate. The application instead composes existing reusable boundaries and retains host-specific policy locally.

No new Core composition abstraction is introduced as a result of this evaluation.
