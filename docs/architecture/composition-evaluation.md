# Host Composition Evaluation

The Terminal application introduced a three-level composition model:

1. individual components;
2. standard subsystem compositions;
3. a ready-to-use standard terminal host.

The model was deliberately kept host-local until a substantially different frontend could provide a second case study. The Web application now provides that evidence.

## Result

The comparison supports two conclusions:

- the Terminal Level 1 / Level 2 / Level 3 structure remains useful for the Terminal host;
- it should not be generalized into a mandatory Core or project-wide composition framework.

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

Terminal and Canvas presentation are independent host adapters that observe that state. Neither renderer owns CHIP-8 display timing.

### Audio

The sound timer remains emulated machine state.

The Web host observes it and uses `WebAudioBeeper` for browser-specific sound presentation. Browser audio lifecycle and autoplay restrictions remain outside Core.

### Runtime timing

`Chip8Runtime` and `Scheduler` own CPU, timer, and display-frame timing.

Host loops determine when an application services or observes the emulator; they do not redefine emulated timing.

See [Runtime and timing architecture](./runtime-and-timing.md).

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
    lifecycle
    policy
    browser presentation
```

There is still no demonstrated need for a Web equivalent of `StandardTerminalHost`.

## Application-owned composition

The Web case study strengthens ADR 0012.

Applications continue to act as their own composition roots and explicitly choose concrete implementations.

The comparison does not demonstrate a need for:

- a Core `Chip8Machine` aggregate;
- a mandatory machine factory;
- a generic host abstraction;
- a dependency-injection container;
- a project-wide Level 1 / Level 2 / Level 3 framework.

This keeps host-specific lifecycle, policy, interaction, and presentation outside the reusable Core and Inspection packages.

## Repeated Classic machine assembly

The comparison does reveal one genuine area of repetition: both hosts construct essentially the same Classic Core machine graph before attaching host adapters.

That repetition is a visible candidate for a future convenience abstraction, but it is not yet sufficient evidence for one.

Extracting a helper would require deliberate decisions about:

```text
ownership
injection points
default implementations
initialization
exposed components
profile generality
```

For now, explicit construction remains useful architectural documentation. Revisit this only when additional hosts or tooling create concrete pressure for shared assembly.

## `WebMachineSession`

`WebMachineSession` remains a Web application aggregate rather than a missing Core machine abstraction.

It retains the references required by the browser application's demonstrated lifecycle and presentation needs:

```text
ROM lifecycle
    program
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

The addition of inspection responsibilities strengthens rather than weakens the case for keeping this aggregate host-local.

For example, another host might use the same Core CPU observation signal without retaining a trace buffer, might inspect memory without presenting nearby instructions, or might have no interactive inspection UI at all.

Those hosts would not necessarily need the same retained references or lifecycle.

`WebMachineSession` should therefore remain application-owned until multiple consumers demonstrate a stable shared machine-session abstraction.

## Conclusion

The second-host evaluation remains complete enough to answer the original composition question:

- the Terminal three-level model remains useful inside the Terminal host;
- the Web host is free to use different host-local compositions;
- the reusable Core boundaries have held across both applications;
- passive Inspection capabilities can be composed where required without becoming mandatory machine infrastructure;
- application-owned composition remains the project-wide rule;
- repeated Classic machine assembly remains worth observing, but not yet extracting.

The subsequent Web inspection workbench provides additional evidence for the same conclusion.

Adding CPU-state presentation, nearby disassembly, trace history, themes, and richer browser lifecycle behavior did not require a universal host abstraction or a Core `Chip8Machine` aggregate. The application instead composed existing reusable boundaries and retained the host-specific policy locally.

No new Core composition abstraction is introduced as a result of this evaluation.
