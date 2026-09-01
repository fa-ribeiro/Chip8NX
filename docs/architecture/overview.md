# Chip8NX Architecture Overview

Chip8NX is designed around a reusable CHIP-8 core that can be hosted by multiple applications.

The core does not assume a terminal, browser, desktop toolkit, renderer, audio system, filesystem, or event loop. Those decisions belong to applications built around the core.

The architecture distinguishes three important concerns:

```text
Profile
"What machine are we emulating?"
        |
        v
Application composition
"Which concrete implementations are used?"
        |
        v
Runtime
"How is the assembled machine driven over time?"
```

## Machine profile

A `Chip8Profile` is a declarative description of the CHIP-8 environment being emulated.

For example, the Classic CHIP-8 profile defines characteristics such as:

- memory size;
- program start address;
- stack capacity;
- display geometry;
- timer frequency;
- font image;
- font location.

A profile describes the machine itself. It does not select host-specific implementations.

Future profiles may also describe compatibility behavior and quirks required by CHIP-8 variants such as CHIP-48, Super-CHIP, or XO-CHIP.

## Components

The emulator is composed from focused components such as:

- `Memory`;
- `Registers`;
- `Stack`;
- `ProgramCounter`;
- `IndexRegister`;
- `Timer`;
- `DisplayBuffer`;
- `Keyboard`;
- `Font`;
- `RandomNumberGenerator`;
- `Cpu`.

Each component owns a narrow responsibility and validates its own local invariants.

Generic components do not contain hidden Classic CHIP-8 defaults.

For example:

```ts
new Stack(profile.stackCapacity);

new ProgramCounter(profile.programStartAddress);

new DisplayBuffer(profile.display.width, profile.display.height);
```

The profile supplies machine-specific values while the components remain reusable.

## Execution context

`ExecutionContext` groups the machine state required by instruction execution.

The `Cpu` owns the CHIP-8 fetch/decode/execute cycle:

```text
read opcode
    |
    v
advance PC
    |
    v
decode instruction
    |
    v
execute instruction against ExecutionContext
```

Instruction decoding and instruction execution remain separate responsibilities.

The `InstructionExecutor` is stateless. Machine-specific mutable dependencies such as registers, memory, keyboard state, timers, fonts, and random-number generation belong to the execution context.

## Machine initialization

`MachineInitializer` establishes a valid initial machine state.

It is responsible for:

- validating memory layout before mutation;
- clearing mutable machine state;
- resetting registers and stack;
- setting the initial program counter;
- resetting timers and the index register;
- clearing the display;
- resetting transient keyboard interpretation state;
- installing profile-provided font data;
- loading the program image.

It does not construct components or control runtime execution.

## Runtime

`Chip8Runtime` coordinates execution over time.

It schedules:

- CPU execution at a runtime-configured frequency;
- both CHIP-8 timers at the profile-defined timer frequency.

It also provides:

- pause;
- resume;
- single-step execution.

Rendering, audio output, host input events, and host event loops remain outside the runtime.

## Scheduling

The generic `Scheduler` owns temporal ordering.

Periodic work is represented internally by exact rational deadlines rather than by independent tasks accumulating elapsed time.

When the host calls `tick()`, the scheduler executes all occurrences whose deadlines are due, globally ordered by time.

This is important for emulator correctness because CPU instructions and timer ticks must remain chronologically ordered even when the host calls the scheduler irregularly.

The scheduler contains no CHIP-8-specific logic.

## Application composition

The reusable core deliberately does not provide a `CompositionRoot`, `MachineFactory`, or dependency-injection container.

The application is the composition root.

For example, a terminal application may choose:

```text
Classic CHIP-8 profile
Ram
TerminalKeyboard
TerminalRenderer
DefaultRandomNumberGenerator
real monotonic clock
```

while a web application may choose:

```text
Classic CHIP-8 profile
Ram
BrowserKeyboard
Canvas renderer
DefaultRandomNumberGenerator
browser-compatible clock
```

Both applications can run the same emulated machine semantics.

## Display boundary

`DisplayBuffer` represents emulated CHIP-8 graphical state.

It should not be confused with host rendering.

```text
DisplayBuffer
    |
    +--> Terminal renderer
    +--> Canvas renderer
    +--> Desktop renderer
    +--> Test inspection
```

A renderer observes the display buffer and presents it using host-specific technology.

The CHIP-8 core does not need to know how that presentation happens.

## Dependency direction

Dependencies should point inward toward the emulator core.

```text
terminal app ----\
web app ----------> Chip8NX Core
desktop app ------/
tests ------------/
```

The core must not import application-specific code.

This boundary is what allows the emulator to remain reusable across multiple frontends.
