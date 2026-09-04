# Host Composition Evaluation

The terminal application introduced a three-level composition experiment:

1. individual components;
2. standard subsystem compositions;
3. a standard terminal host.

The experiment was intentionally kept inside the terminal application until a substantially different host could provide a second architectural case study.

The Web application now provides that second case study.

This document records the resulting evaluation.

## Purpose

The question was not whether the terminal composition model works.

It does.

The question was whether the same Level 1 / Level 2 / Level 3 structure represents a reusable Chip8NX composition model that should be generalized into Core.

The Web host provides enough contrasting evidence to answer that question.

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

The applications also converge on the same important host boundaries.

### Keyboard

Core owns CHIP-8 keyboard semantics through `Keyboard` and its standard mutable implementation, `KeyboardState`.

Hosts translate their own input mechanisms into that state.

The terminal input path includes terminal byte input, terminal protocol parsing, key-event interpretation, and terminal-specific release behavior.

The Web host instead combines independent physical and virtual input sources:

```text
BrowserKeyboard ─┐
                 ├──> KeyboardInputHub ──> KeyboardState
VirtualKeypad ───┘
```

The host-side structures differ, but both converge naturally on `KeyboardState`.

### Display

`DisplayBuffer` remains emulated machine state.

Terminal presentation and Canvas presentation are independent host adapters that observe that state.

Neither host renderer owns CHIP-8 display timing.

### Audio

The sound timer remains emulated machine state.

The Web host observes it and uses `WebAudioBeeper` for browser-specific sound presentation.

Browser audio lifecycle and autoplay restrictions remain outside Core.

### Runtime timing

`Chip8Runtime` and `Scheduler` continue to own emulated CPU, timer, and display-frame timing.

Host loops determine when an application services or observes the emulator; they do not redefine CHIP-8 timing.

## What did not remain common

The two applications developed different host-level composition structures.

### Terminal

The terminal application naturally groups input and presentation around a shared terminal output resource.

This led to:

```text
Level 1
    individual terminal components

Level 2
    StandardTerminalInput
    StandardTerminalPresentation

Level 3
    StandardTerminalHost
```

`StandardTerminalHost` has a concrete ownership role: it owns the shared terminal resource and coordinates the lifecycle of the standard terminal subsystems.

It does not own CHIP-8 execution, machine composition, ROM loading, or emulated timing.

### Web

The Web application has different composition pressures:

- physical browser keyboard input;
- virtual keypad input;
- `KeyboardInputHub` for independent simultaneous input sources;
- Canvas presentation;
- Web Audio presentation;
- ROM replacement;
- start, pause, step, and reset controls;
- browser visibility handling;
- a `requestAnimationFrame` host loop;
- browser audio unlocking;
- a persistent `WebMachineSession` application-state aggregate.

These responsibilities do not naturally form the same three composition levels used by the terminal host.

In particular, there is no demonstrated need for a Web equivalent of `StandardTerminalHost`.

## Evaluation result

The second host validates the current Core boundaries more strongly than it validates the terminal composition hierarchy.

The Terminal Level 1 / Level 2 / Level 3 model remains a useful terminal-host design.

It should not currently be generalized into a mandatory Core or project-wide composition framework.

The broader principle behind the experiment remains useful:

> Convenience layers may assemble lower-level components and provide good defaults, but they should arise from real application responsibilities and must not remove lower-level capability.

Different hosts may therefore develop different composition structures around the same Core boundaries.

## Application-owned composition

ADR 0012 remains applicable.

Applications continue to act as their own composition roots and explicitly select concrete implementations.

The Web case study does not currently demonstrate a need for:

- a Core `Chip8Machine` aggregate;
- a mandatory machine factory;
- a generic host abstraction;
- a dependency-injection container;
- a project-wide Level 1 / Level 2 / Level 3 framework.

This keeps host-specific lifecycle and presentation decisions outside the reusable emulator Core.

## Repeated Classic machine assembly

The comparison does reveal one genuine area of repetition.

Both the terminal examples and the Web application construct essentially the same Classic Core machine graph before attaching their respective host adapters.

That repetition is now a visible candidate for a future convenience abstraction.

It is not yet sufficient evidence that such an abstraction should be introduced.

Extracting it now would require answering questions about ownership, injection points, defaults, initialization, exposed components, and profile generality that the applications do not currently need answered.

For now, explicit machine construction remains useful architectural documentation.

This candidate should be revisited if additional hosts, tools, or application code create concrete pressure for a shared machine-assembly helper.

## `WebMachineSession`

`WebMachineSession` remains a Web application aggregate rather than a missing Core machine abstraction.

It retains the state and capabilities needed by the browser application's lifecycle, including ROM reset, runtime control, rendering, and browser input adapters.

Other hosts do not necessarily have the same lifecycle or need the same retained references.

Its existence therefore does not currently justify introducing a universal Core `Chip8Machine` object.

## Conclusion

The second-host experiment is complete enough to answer the original composition question:

- the Terminal three-level model is useful and remains available within the terminal host;
- Web is free to develop different host-local compositions;
- the current Core host boundaries have held up across both applications;
- application-owned composition remains the project-wide rule;
- repeated Classic machine assembly is worth observing, but not yet extracting.

No Core composition abstraction is introduced as a result of this evaluation.
