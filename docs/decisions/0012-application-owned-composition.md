# ADR 0012: Application-Owned Composition

- **Status:** Accepted
- **Date:** 2026-08-31

## Context

The emulator consists of many focused components:

```text
Memory
Registers
Stack
ProgramCounter
IndexRegister
Timers
DisplayBuffer
Keyboard
Font
RandomNumberGenerator
Cpu
Scheduler
Runtime
```

It would be possible to hide their construction behind abstractions such as:

```text
Chip8Machine
MachineFactory
CompositionRoot
MachineBuilder
dependency-injection container
```

Doing so early would make construction shorter, but it would also move concrete implementation choices into reusable core code or require a large factory-configuration API.

The project intends to support multiple host applications:

- terminal;
- web;
- desktop;
- testing and debugging tools.

Those applications may need different concrete implementations.

## Decision

The reusable CHIP-8 core does not provide a composition-root abstraction.

The application entrypoint is the composition root.

Application code explicitly chooses and connects concrete implementations.

## Rationale

Explicit construction at the application boundary is valuable architectural documentation.

For example:

```text
Terminal application
    Classic profile
    Ram
    TerminalKeyboard
    TerminalRenderer
    default RNG
    monotonic clock
```

and:

```text
Web application
    Classic profile
    Ram
    BrowserKeyboard
    Canvas renderer
    default RNG
    browser-compatible clock
```

can share the same emulator core without requiring the core to know either host.

Factories or builders would currently hide simple wiring without solving an actual complexity problem.

## Display Boundary

`DisplayBuffer` is part of emulated machine state.

A terminal or Canvas display is a renderer outside the emulated machine.

```text
DisplayBuffer
    |
    +--> TerminalRenderer
    +--> CanvasRenderer
    +--> DesktopRenderer
```

The same principle applies to audio:

```text
SoundTimer
    machine state

Speaker / WebAudio / terminal bell
    host presentation
```

## Consequences

### Positive

- The core remains independent of UI and platform technology.
- Different applications can select different adapters around the same machine implementation.
- Construction remains explicit and understandable.
- The project avoids an unnecessary factory or DI framework.

### Negative

- Applications may initially contain some repetitive construction code.
- Repeated application composition may eventually reveal a shared helper worth extracting.

That duplication is intentional until actual applications demonstrate a concrete abstraction worth introducing.

## Alternatives Considered

### Core `Chip8Machine` god object

Rejected because it would tend to absorb execution, initialization, runtime, rendering, and lifecycle responsibilities.

### Core factory or builder

Rejected because it would either hard-code concrete implementations or require a speculative dependency-injection configuration API.

## Related Decisions

- [ADR 0001: Modular Component Architecture](./0001-modular-component-architecture.md)
- [ADR 0010: Use a Unified CHIP-8 Profile](./0010-unified-chip8-profile.md)
