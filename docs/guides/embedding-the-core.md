# Embedding the Chip8NX Core

The CHIP-8 Core is designed to be hosted by applications without depending on a particular UI or platform.

This guide shows the explicit/manual composition path. It exposes the Core pieces so an application can select implementations at meaningful boundaries.

For the architectural rationale behind these steps, see:

- [Machine state and capabilities](../architecture/machine-state-and-capabilities.md)
- [Machine initialization](../architecture/machine-initialization.md)
- [Instruction execution](../architecture/instruction-execution.md)
- [Runtime and timing](../architecture/runtime-and-timing.md)

## 1. Select a profile

For Classic CHIP-8:

```ts
import { CLASSIC_CHIP8_PROFILE } from "@chip8nx/core";

const profile = CLASSIC_CHIP8_PROFILE;
```

The profile supplies machine characteristics such as memory size, program start address, stack capacity, display geometry/timing, timer frequency, and font definition.

## 2. Construct machine state and capabilities

```ts
import {
  ClassicFont,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  IndexRegister,
  KeyboardState,
  ProgramCounter,
  Ram,
  Registers,
  Stack,
  Timer,
  VerticalBlank,
} from "@chip8nx/core";

const registers = new Registers();
const memory = new Ram(profile.memorySize);
const stack = new Stack(profile.stackCapacity);
const programCounter = new ProgramCounter(profile.programStartAddress);
const indexRegister = new IndexRegister();

const delayTimer = new Timer();
const soundTimer = new Timer();

const displayBuffer = new DisplayBuffer(profile.display.width, profile.display.height);
const verticalBlank = new VerticalBlank();

const keyboard = new KeyboardState();
const font = new ClassicFont(profile.fontBaseAddress);
const randomNumberGenerator = new DefaultRandomNumberGenerator();
```

`DisplayBuffer` stores emulated pixels. `VerticalBlank` stores the display-synchronization opportunity consumed by Classic `Dxyn`. Host rendering is a separate responsibility.

## 3. Create the execution context

```ts
import type { ExecutionContext } from "@chip8nx/core";

const context: ExecutionContext = {
  registers,
  memory,
  stack,
  programCounter,
  indexRegister,
  delayTimer,
  soundTimer,
  displayBuffer,
  verticalBlank,
  keyboard,
  font,
  randomNumberGenerator,
};
```

`ExecutionContext` groups resources required by instruction execution. It is not a factory and does not take ownership of their construction/lifecycle.

## 4. Obtain a program image

External I/O belongs to the application.

For example, a Deno host can read a ROM from the filesystem:

```ts
import { MemoryImage } from "@chip8nx/core";

const bytes = await Deno.readFile(path);
const program = new MemoryImage(bytes);
```

A browser may obtain the same bytes from a file picker, network request, embedded asset, or drag-and-drop operation. Core initialization begins once those bytes have become a `MemoryImage`.

## 5. Initialize the machine

```ts
import { MachineInitializer, MemoryImageLoader } from "@chip8nx/core";

const initializer = new MachineInitializer(new MemoryImageLoader());
initializer.initialize(context, profile, program);
```

Initialization validates known memory-layout relationships before mutation, resets the existing machine state, installs profile-provided font data, and loads the program.

It does not start runtime execution.

For reset scope and failure guarantees, see [Machine initialization architecture](../architecture/machine-initialization.md).

## 6. Create the CPU

```ts
import { Cpu, Decoder, InstructionExecutor } from "@chip8nx/core";

const cpu = new Cpu(context, new Decoder(), new InstructionExecutor());
```

One CPU cycle is:

```text
fetch
  ↓
advance normal PC
  ↓
decode
  ↓
execute
```

The CPU does not own real-time scheduling.

## 7. Create the runtime

Choose a CPU execution frequency:

```ts
import { Frequency } from "@chip8nx/core";

const runtimeConfiguration = {
  cpuFrequency: Frequency.fromInteger(500n),
};
```

Create a scheduler using a monotonic clock:

```ts
import { PerformanceClock, Scheduler } from "@chip8nx/core";

const scheduler = new Scheduler(new PerformanceClock());
```

Then create the runtime:

```ts
import { Chip8Runtime } from "@chip8nx/core";

const runtime = new Chip8Runtime(
  cpu,
  delayTimer,
  soundTimer,
  verticalBlank,
  scheduler,
  runtimeConfiguration,
  profile.timerFrequency,
  profile.display.refreshFrequency,
);
```

The two profile frequencies have distinct semantics:

- `profile.timerFrequency` controls delay/sound timer countdown;
- `profile.display.refreshFrequency` controls emulated display-frame boundaries.

The runtime starts paused.

## 8. Start and service execution

```ts
runtime.resume();
```

Then call:

```ts
runtime.tick();
```

regularly from the host event loop.

The host does **not** need to call `tick()` at the CPU or display frequency. The deadline-driven scheduler decides which CPU, timer, and display events are due and preserves their emulated chronological order.

## Pause and resume

```ts
runtime.pause();
runtime.resume();
```

Pause suspends scheduled CPU, timer, and display progression. Host time spent paused does not accumulate as execution debt.

## Single-step execution

While paused:

```ts
runtime.step();
```

performs one CPU **attempt**.

That distinction matters: `Fx0A` or a waiting draw may retry rather than complete a logical instruction on that attempt.

Timers and normal scheduled display time do not advance. A display-synchronized draw may receive a temporary vertical-blank opportunity so debugger-style stepping can make useful progress without advancing scheduled time.

## Rendering

`DisplayBuffer` is emulated machine state, not a host renderer.

Applications observe and present it independently:

```text
DisplayBuffer
    ├── Terminal renderer
    ├── Canvas renderer
    ├── Desktop renderer
    └── tests / inspection
```

Host presentation frequency does not define CHIP-8 display timing, and rendering the buffer does not signal `VerticalBlank`.

## Keyboard input

A host adapter translates platform input into Core key transitions:

```ts
keyboard.press(chip8Key);
keyboard.release(chip8Key);
```

`KeyboardState` owns CHIP-8-facing pressed state and `Fx0A` wait semantics. The host owns platform event collection, key mapping, protocol decoding, and any platform-specific synthetic-release policy.

## Sound

The sound timer is machine state. Actual sound output is a host concern.

A host may observe `soundTimer.getValue()` and drive terminal, browser, desktop, or other audio without making `Timer` responsible for presentation.

## Application responsibility summary

The application owns:

```text
profile selection
component implementation selection
ROM I/O
composition
runtime lifecycle calls
host event loop
rendering
audio output
host input translation
```

The reusable Core owns:

```text
CHIP-8 state
instruction semantics
machine initialization
CPU execution
runtime timing coordination
scheduling
```

## Why the manual path remains useful

The Terminal host provides higher-level convenience compositions, but the Web-host evaluation showed that those host-local layers should not be generalized into a mandatory Core hierarchy.

This guide therefore remains the maximum-control Core composition path.

See [Host composition evaluation](../architecture/composition-evaluation.md).
