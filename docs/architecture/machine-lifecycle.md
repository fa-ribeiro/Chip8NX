# Machine Lifecycle

A CHIP-8 machine passes through several conceptually distinct phases:

```text
construct components
        |
        v
initialize machine
        |
        v
resume runtime
        |
        v
execute
   |         |
 pause     reset
   |         |
 step        |
   |         v
 resume   initialize again
```

## Construction

Construction belongs to the application composition root.

The application chooses concrete implementations and assembles the execution context.

Conceptually:

```ts
const profile = CLASSIC_CHIP8_PROFILE;

const memory = new Ram(profile.memorySize);
const registers = new Registers();
const stack = new Stack(profile.stackCapacity);
const programCounter = new ProgramCounter(profile.programStartAddress);

const displayBuffer = new DisplayBuffer(
  profile.display.width,
  profile.display.height,
);
```

Construction selects implementations. It does not establish the complete runnable machine state.

## Initialization

`MachineInitializer.initialize()` establishes that state.

Initialization first validates the complete memory layout.

Known validation failures occur before any machine state is mutated.

The initializer then establishes:

```text
Memory             cleared
V0-VF              0
Stack              empty
I                  0
PC                 profile program start
Delay timer        0
Sound timer        0
Display            cleared
Keyboard wait      reset
Font               reinstalled
Program            loaded
```

The font is installed on every initialization because CHIP-8 memory is writable and a program may have modified the font region during a previous run.

## Program images

Programs are represented by `MemoryImage`.

`MemoryImage` is deliberately generic and may structurally contain zero or more bytes.

`MachineInitializer` imposes the stronger semantic requirement that a runnable machine must be initialized with:

- a non-empty font image;
- a non-empty program image.

This illustrates the validation strategy used throughout the project:

> Low-level abstractions validate local structural invariants. Higher-level domain operations validate relationships and semantic requirements.

## Keyboard lifecycle

Resetting keyboard interpretation state does not mean pretending that all physical keys were released.

`Keyboard.reset()` clears transient interpreter state such as an outstanding `FX0A` key-release wait while preserving the keys currently reported as physically pressed by the host.

## Random-number generator lifecycle

Initialization deliberately does not reset the random-number generator.

CHIP-8 does not define a random-number generator seeding lifecycle, and implementations may use:

- system randomness;
- deterministic seeded randomness;
- recorded randomness;
- test sequences.

The application or concrete RNG implementation owns that lifecycle.

## Runtime startup

`Chip8Runtime` starts paused.

This keeps machine construction and initialization separate from execution.

A typical startup sequence is:

```text
construct components
        |
        v
MachineInitializer.initialize(...)
        |
        v
runtime.resume()
        |
        v
host repeatedly calls runtime.tick()
```

## Pause

Pausing freezes emulated execution:

- CPU scheduling is suspended;
- timer scheduling is suspended.

Elapsed host time while paused does not become execution debt.

A five-minute pause therefore does not cause five minutes of CPU instructions and timer ticks to execute when the machine resumes.

## Single stepping

Single-step execution is allowed only while paused.

One call to:

```ts
runtime.step();
```

executes exactly one CPU instruction.

It does not tick the delay or sound timer.

This gives debuggers a predictable model:

```text
pause
step
inspect
step
inspect
resume
```

## `FX0A` is not a runtime pause

The Classic CHIP-8 `FX0A` instruction waits for a key press/release cycle.

This does not pause the emulator runtime.

While the CPU repeatedly waits on `FX0A`:

- CPU scheduling continues;
- timer scheduling continues.

That distinction is important because CHIP-8 timers continue independently of an instruction waiting for input.

## Reset

Resetting a machine does not require reconstructing all components.

The application can call `MachineInitializer.initialize()` again using the same execution context, profile, and program image.

This:

- clears mutable state;
- reinstalls system data;
- reloads the program;
- returns the machine to its defined initial state.

The runtime should be paused before reinitializing the machine.
