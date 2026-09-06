# Chip8NX Architecture Overview

Chip8NX is designed around a reusable CHIP-8 Core that can be hosted by multiple applications.

The Core does not assume a terminal, browser, desktop toolkit, renderer, audio system, filesystem, or host event loop. Those decisions belong to applications built around the Core.

At the highest level, the architecture distinguishes three concerns:

```mermaid
flowchart LR
    Profile["Chip8Profile<br/><small>What machine?</small>"]
    Composition["Application composition<br/><small>Which implementations?</small>"]
    Runtime["Chip8Runtime<br/><small>How is the machine driven?</small>"]

    Profile --> Composition --> Runtime
```

## Machine profile

A `Chip8Profile` is a declarative description of the CHIP-8 environment being emulated.

The Classic profile supplies characteristics such as:

- memory size;
- program start address;
- stack capacity;
- display width and height;
- display refresh frequency;
- timer frequency;
- font image;
- font location.

A profile describes the machine itself. It does not select host-specific implementations.
Future profiles may describe different machine characteristics or compatibility behavior when CHIP-8-family variants genuinely require different semantics.

## Core component overview

The following diagram is intentionally high level. It shows the main components and their most important direct relationships without trying to represent every method call.

```mermaid
flowchart TB
    Profile["Chip8Profile"]
    Program["MemoryImage"]

    Initializer["MachineInitializer"]
    Loader["MemoryImageLoader"]

    Runtime["Chip8Runtime"]
    Scheduler["Scheduler"]
    Clock["Clock"]

    Cpu["Cpu"]
    Decoder["Decoder"]
    Executor["InstructionExecutor"]
    Context["ExecutionContext"]

    subgraph State["Machine state and capabilities"]
        Memory["Memory / Ram"]
        Registers["Registers"]
        Stack["Stack"]
        PC["ProgramCounter"]
        I["IndexRegister"]
        Delay["Delay Timer"]
        Sound["Sound Timer"]
        Buffer["DisplayBuffer"]
        VBlank["VerticalBlank"]
        Keyboard["Keyboard / KeyboardState"]
        Font["Font"]
        RNG["RandomNumberGenerator"]
    end
    Profile --> Initializer
    Program --> Initializer
    Loader --> Initializer
    Initializer --> Context

    Cpu --> Decoder
    Cpu --> Executor
    Cpu --> Context

    Runtime --> Scheduler
    Scheduler --> Clock
    Runtime --> Cpu
    Runtime --> Delay
    Runtime --> Sound
    Runtime --> VBlank
    Context --> Memory
    Context --> Registers
    Context --> Stack
    Context --> PC
    Context --> I
    Context --> Delay
    Context --> Sound
    Context --> Buffer
    Context --> VBlank
    Context --> Keyboard
    Context --> Font
    Context --> RNG
```

`ExecutionContext` is an explicit aggregate of the mutable state and capabilities required by instruction execution.
The context does not make these components a monolith. The individual components remain independently constructed, replaceable, and testable.

## Focused components

The emulator is composed from narrow components such as:

- `Memory`;
- `Registers`;
- `Stack`;
- `ProgramCounter`;
- `IndexRegister`;
- `Timer`;
- `DisplayBuffer`;
- `VerticalBlank`;
- `Keyboard`;
- `Font`;
- `RandomNumberGenerator`;
- `Cpu`;
- `Disassembler`;

Generic components do not hide Classic-specific defaults.

For example:

```ts
new Stack(profile.stackCapacity);

new ProgramCounter(profile.programStartAddress);
new DisplayBuffer(profile.display.width, profile.display.height);
```

The profile supplies machine-specific values while the components remain reusable.

## CPU execution pipeline

The CPU owns one CHIP-8 fetch/decode/execute cycle.

```mermaid
flowchart LR
    PC["ProgramCounter"]
    Memory["Memory"]
    Cpu["Cpu"]
    Opcode["Opcode"]
    Decoder["Decoder"]
    Instruction["Typed Instruction"]
    Executor["InstructionExecutor"]
    Context["ExecutionContext"]

    PC --> Cpu
    Memory --> Cpu
    Cpu -->|"fetch"| Opcode
    Opcode --> Decoder
    Decoder -->|"decode"| Instruction
    Instruction --> Executor
    Context --> Executor
```

The CPU fetches the two-byte instruction word, advances the normal program counter, decodes the opcode into a typed `Instruction`, and delegates semantic effects to the stateless `InstructionExecutor` through `ExecutionContext`.

The typed `Instruction` is the central boundary between encoded representation and instruction semantics. Control-flow instructions override the already-advanced program counter when required, while retry-style instructions such as Classic `Fx0A` and vblank-gated `Dxyn` restore the current instruction address so it can be attempted again later.

See [Instruction execution architecture](./instruction-execution.md) for the detailed fetch/decode/execute model, typed instruction representation, execution semantics, invariant ownership, and verification strategy.

### Disassembly and inspection

Decoded instructions are also available to read-only inspection tools.

Disassembly shares the same `Decoder` and typed `Instruction` model used by CPU execution, but diverges after decoding:

```mermaid
flowchart LR
    Opcode["Opcode"]
    Decoder["Decoder"]
    Instruction["Typed Instruction"]

    Executor["InstructionExecutor"]
    Context["ExecutionContext"]

    Formatter["InstructionFormatter"]
    Result["DisassembledInstruction"]
    Opcode --> Decoder
    Decoder --> Instruction

    Instruction --> Executor
    Executor -->|"apply semantics"| Context

    Instruction --> Formatter
    Formatter -->|"present"| Result
```

The two paths have different responsibilities:

```text
execution:
Opcode → Decoder → Instruction → InstructionExecutor → machine-state changes

inspection:
Opcode → Decoder → Instruction → InstructionFormatter → human-readable result
```

Inspection does not execute the instruction or mutate machine state. The shared typed `Instruction` boundary keeps opcode interpretation centralized in `Decoder` while allowing execution and tooling to consume the same semantic model.

`Disassembler` coordinates memory reads, decoding, formatting, and sequential range traversal. Presentation remains outside Core, so the resulting structured data can be consumed by command-line tools, debuggers, tracers, or graphical hosts.

See [Disassembly architecture](./disassembly.md) for the detailed component boundaries, composition model, range semantics, and extension strategy.

## Machine initialization

`MachineInitializer` establishes a valid initial state for already-constructed components.

It:

1. validates the complete memory layout before mutation;
2. clears mutable machine state;
3. resets registers, stack, timers, index register, display, vertical-blank state, and keyboard interpreter state;
4. sets the initial program counter;
5. installs profile-provided font data;
6. loads the program image.

It does not construct components, perform external I/O, or drive execution.
The random-number generator is intentionally not reset by machine initialization because CHIP-8 does not define an RNG seeding lifecycle.

## Runtime and timing

`Chip8Runtime` maps generic periodic scheduling onto CHIP-8 execution.

```mermaid
flowchart LR
    Clock["Clock"]
    Scheduler["Scheduler"]
    Runtime["Chip8Runtime"]

    Cpu["CPU"]
    Timers["Delay / Sound Timers"]
    VBlank["VerticalBlank"]

    Clock --> Scheduler
    Scheduler --> Runtime

    Runtime -->|"CPU frequency"| Cpu
    Runtime -->|"timer frequency"| Timers
    Runtime -->|"display frequency"| VBlank
```

The layers have distinct responsibilities:

- `Clock` provides monotonic time;
- `Scheduler` owns exact periodic deadlines, catch-up, suspension, and global chronological ordering;
- `Chip8Runtime` maps those generic deadlines to CPU, timer, and vertical-blank work;
- timed state such as `Timer` and `VerticalBlank` remains independent of scheduling.

When deadlines are equal, runtime registration order makes the result deterministic:

```text
vertical blank
    ↓
timers
    ↓
CPU
```

Pausing suspends scheduled progression without accumulating execution debt. Manual single stepping remains a separate paused operation: it executes one CPU attempt without advancing scheduled timer or display time.

See [Runtime and timing architecture](./runtime-and-timing.md) for deadline representation, catch-up, equal-deadline policy, pause/resume rebasing, timed machine state, and single-step semantics.

## Display boundary

`DisplayBuffer` is emulated graphical state.

`VerticalBlank` is emulated display-timing state.

A host renderer is neither of those things.

```mermaid
flowchart LR
    Runtime["Chip8Runtime"]
    VBlank["VerticalBlank"]
    Cpu["Cpu / Dxyn"]
    Buffer["DisplayBuffer"]

    Terminal["Terminal renderer"]
    Canvas["Canvas renderer"]
    Desktop["Desktop renderer"]
    Tests["Tests / inspection"]
    Runtime -->|"display frame"| VBlank
    VBlank -->|"permission consumed by Dxyn"| Cpu
    Cpu --> Buffer

    Buffer -.-> Terminal
    Buffer -.-> Canvas
    Buffer -.-> Desktop
    Buffer -.-> Tests
```

A renderer observes the buffer and presents it using host-specific technology.

Host rendering does **not** generate CHIP-8 vertical blank and does not need to run at the exact emulated display refresh frequency.
This separation allows a terminal host, browser host, desktop host, and deterministic tests to share the same display semantics.

## Keyboard boundary

The machine-facing abstraction is `Keyboard`.

The standard mutable Core implementation is `KeyboardState`.

Host adapters translate platform events into state transitions:

```mermaid
flowchart LR
    Host["Host key events"]
    Adapter["Host keyboard adapter"]
    State["KeyboardState"]
    Executor["InstructionExecutor"]

    Host --> Adapter
    Adapter -->|"press / release"| State
    State -->|"Keyboard capability"| Executor
```

`KeyboardState` owns CHIP-8-facing pressed-state behavior and the `FX0A` press-then-release wait state machine.

The host adapter owns platform-specific concerns such as terminal escape-sequence parsing, browser event handling, or synthetic release behavior.

## Application composition

The reusable Core deliberately does not require a dependency-injection container or a single mandatory machine factory.

The application remains the composition root.

A terminal application can choose terminal-specific adapters while a browser application can choose browser-specific adapters, with both sharing the same Core semantics.
The terminal application provides optional higher-level composition helpers through its Level 1 / Level 2 / Level 3 model. Evaluation against the Web application showed that this structure is useful for Terminal but does not need to become a mandatory Core or project-wide composition framework.

Different hosts may develop different host-local composition structures around the same Core boundaries.

See:

- [Terminal composition levels](../guides/terminal-composition-levels.md)
- [Host composition evaluation](./composition-evaluation.md)

## Dependency direction

Dependencies point inward toward the emulator Core.

```mermaid
flowchart LR
    Terminal["Terminal app"]
    Web["Web app"]
    Desktop["Desktop app"]
    Tests["Tests"]

    Core["Chip8NX Core"]

    Terminal --> Core
    Web --> Core
    Desktop --> Core
    Tests --> Core
```

The Core must not import application-specific code.

That boundary is what allows the emulator to remain reusable across multiple frontends.
