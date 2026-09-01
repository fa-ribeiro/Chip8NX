# Embedding the Chip8NX Core

The CHIP-8 core is designed to be hosted by different applications without depending on a particular UI or platform.

An application is responsible for:

1. selecting a machine profile;
2. choosing concrete component implementations;
3. constructing the machine;
4. loading a program;
5. initializing the machine;
6. driving the runtime;
7. presenting display and sound state.

## Select a profile

For Classic CHIP-8:

```ts
import { CLASSIC_CHIP8_PROFILE } from "@chip8nx/core";

const profile = CLASSIC_CHIP8_PROFILE;
```

The profile provides the machine characteristics required to construct compatible components.

## Construct the machine

Conceptually:

```ts
const registers = new Registers();

const memory = new Ram(profile.memorySize);

const stack = new Stack(profile.stackCapacity);

const programCounter = new ProgramCounter(profile.programStartAddress);

const indexRegister = new IndexRegister();

const delayTimer = new Timer();
const soundTimer = new Timer();

const displayBuffer = new DisplayBuffer(
  profile.display.width,
  profile.display.height,
);

const font = new ClassicFont(profile.fontBaseAddress);
```

The application must also choose concrete implementations for capabilities such as:

```text
Keyboard
RandomNumberGenerator
Clock
```

Different applications can therefore use different host adapters without changing CHIP-8 semantics.

## Create the execution context

The machine components used by instruction execution are grouped into an `ExecutionContext`.

Conceptually:

```ts
const context: ExecutionContext = {
  registers,
  memory,
  stack,
  programCounter,
  indexRegister,
  delayTimer,
  soundTimer,
  displayBuffer,
  keyboard,
  font,
  randomNumberGenerator,
};
```

## Load a program

External I/O belongs to the application.

For example, a Deno application may read a ROM using:

```ts
const bytes = await Deno.readFile(path);
const program = new MemoryImage(bytes);
```

The emulator core itself does not need to know that the bytes came from a filesystem.

A browser application could obtain the same bytes from:

- a file picker;
- a network request;
- embedded assets;
- drag and drop.

All of those sources ultimately become a `MemoryImage`.

## Initialize the machine

Create a `MachineInitializer`:

```ts
const initializer = new MachineInitializer(new MemoryImageLoader());
```

Then initialize:

```ts
initializer.initialize(context, profile, program);
```

Initialization validates the memory layout before mutating the machine.

It then resets machine state, installs profile system data, and loads the program.

## Create the CPU

```ts
const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());
```

The CPU owns one CHIP-8 instruction cycle:

```text
fetch
decode
execute
```

It does not control real-time scheduling.

## Create the runtime

Choose a CPU execution frequency appropriate for the application:

```ts
const runtimeConfiguration = {
  cpuFrequency: Frequency.fromInteger(500n),
};
```

Create a scheduler using a monotonic clock:

```ts
const scheduler = new Scheduler(clock);
```

Then create the runtime:

```ts
const runtime = new Chip8Runtime(
  cpu,
  delayTimer,
  soundTimer,
  scheduler,
  runtimeConfiguration,
  profile.timerFrequency,
);
```

The runtime starts paused.

## Start execution

```ts
runtime.resume();
```

The host application should call:

```ts
runtime.tick();
```

regularly.

The host does not need to call it at the CPU frequency.

The deadline-driven scheduler uses the monotonic clock to determine which CPU and timer events are due and executes them in chronological order.

For example, a browser might call `runtime.tick()` from an animation loop while a terminal application may call it from a different host loop.

## Pause and resume

```ts
runtime.pause();

runtime.resume();
```

Pause freezes both CPU execution and CHIP-8 timer countdown.

Host time spent paused is discarded rather than accumulated as execution debt.

## Single-step execution

While paused:

```ts
runtime.step();
```

executes exactly one CPU instruction.

Timers remain unchanged.

Calling `step()` while the runtime is running is invalid.

## Rendering

`DisplayBuffer` is emulated machine state, not a host renderer.

Applications should observe it and present it independently.

Conceptually:

```text
DisplayBuffer
     |
     +--> terminal renderer
     |
     +--> Canvas renderer
     |
     +--> desktop renderer
```

The renderer should not be required by the CPU or runtime.

## Keyboard input

A host-specific keyboard implementation should implement the `Keyboard` capability.

Examples may eventually include:

```text
TerminalKeyboard
BrowserKeyboard
DesktopKeyboard
TestKeyboard
```

The core should not know how host events are collected.

## Sound

The sound timer is machine state.

Actual audio output is a host concern.

A future terminal application might produce a terminal bell while a browser application might use Web Audio.

Keeping those outputs outside the core prevents platform-specific dependencies from leaking into CHIP-8 execution.

## Application responsibility summary

The application owns:

```text
profile selection
component implementation selection
ROM I/O
composition
host loop
rendering
sound output
host input
```

The reusable core owns:

```text
CHIP-8 state
instruction semantics
machine initialization
runtime coordination
scheduling
```

This separation allows several frontends to share one emulator implementation.
