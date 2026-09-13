# Embedding the Chip8NX Core

The CHIP-8 Core is designed to be hosted by applications without depending on a particular UI or platform.

This guide shows the explicit/manual composition path. It exposes the Core pieces so an application can select implementations at meaningful boundaries while allowing `Chip8Profile` to describe which CHIP-8-family machine is being assembled.

For the architectural rationale behind these steps, see:

- [Machine state and capabilities](../architecture/machine-state-and-capabilities.md)
- [Machine initialization](../architecture/machine-initialization.md)
- [Instruction execution](../architecture/instruction-execution.md)
- [Runtime and timing](../architecture/runtime-and-timing.md)
- [Machine lifecycle](../architecture/machine-lifecycle.md)

## 1. Select a profile

Chip8NX currently provides three built-in profiles:

```ts
import {
  CHIP48_PROFILE,
  type Chip8Profile,
  CLASSIC_CHIP8_PROFILE,
  SUPERCHIP_PROFILE,
} from "@chip8nx/core";
```

For Classic CHIP-8:

```ts
const profile: Chip8Profile = CLASSIC_CHIP8_PROFILE;
```

A host can instead select:

```ts
const profile = CHIP48_PROFILE;
```

or:

```ts
const profile = SUPERCHIP_PROFILE;
```

The profile supplies stable machine characteristics and compatibility semantics such as:

```text
memory size
program start address
stack capacity
display specification and refresh frequency
timer frequency
small-font image and base address
optional large-font image and base address
shift semantics
memory-transfer index behavior
jump-offset semantics
logic-flag behavior
sprite-overflow behavior
sprite-draw timing behavior
interpreter-exit availability
RPL-flag availability
index-overflow behavior
zero-row scroll-down behavior
```

The profile describes **what machine is being emulated**. Host/runtime policy such as CPU frequency remains separate.

## 2. Construct machine state and capabilities

The manual path creates the state and capabilities explicitly:

```ts
import {
  ClassicFont,
  DefaultRandomNumberGenerator,
  DisplayBuffer,
  ExitState,
  IndexRegister,
  KeyboardState,
  ProgramCounter,
  Ram,
  Registers,
  RplFlags,
  Stack,
  SuperChipFont,
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

const displayBuffer = new DisplayBuffer(
  profile.display.specification,
  profile.compatibility.spriteOverflow,
);
const verticalBlank = new VerticalBlank();

const keyboard = new KeyboardState();

const font = profile.largeFont === null
  ? new ClassicFont(profile.fontBaseAddress)
  : new SuperChipFont(
    profile.fontBaseAddress,
    profile.largeFont.baseAddress,
  );

const randomNumberGenerator = new DefaultRandomNumberGenerator();

const exitState = new ExitState();
const rplFlags = new RplFlags();
```

`DisplayBuffer` owns emulated display state. For a fixed-display profile, its logical and backing dimensions are the same. For SUPER-CHIP, it owns the current low/high display mode over the shared 128×64 backing framebuffer.

`VerticalBlank` stores display-synchronization opportunities produced by runtime scheduling and consumed by instructions that require them.

`Font` is a capability rather than an instruction-specific memory-layout dependency. Classic and CHIP-48 use `ClassicFont`; SUPER-CHIP uses `SuperChipFont` so both small and large sprite-address lookup are available.

`ExitState` represents interpreter exit requested by SUPER-CHIP `00FD` or triggered by historical exit conditions such as invalid `00C0` and `Fx1E` index overflow.

`RplFlags` represents the eight SUPER-CHIP user flags. Its lifecycle is intentionally longer than ordinary resettable machine state. If a host wants RPL values to survive machine reset or machine-session replacement, it must keep the same `RplFlags` instance across those operations.

For a simple one-machine host, constructing it once at application startup is sufficient.

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
  rplFlags,
  exitState,
};
```

`ExecutionContext` groups the state and capabilities required by instruction execution. It is not a factory and does not take ownership of their construction or host lifecycle.

The context is deliberately explicit. When a new instruction family demonstrates a genuinely new machine dependency, adding that dependency to the context lets TypeScript identify every composition site that must make an ownership decision.

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

Initialization validates known memory-layout relationships before mutation, resets ordinary resettable machine state, installs the profile's small font and optional large font, and loads the program.

For SUPER-CHIP, initialization also restores the display to its initial low-resolution mode and resets `ExitState`.

RPL flags are deliberately **not** reset by `MachineInitializer`:

```text
initialize/reset
    registers      → reset
    stack          → reset
    timers         → reset
    display        → reset
    ExitState      → reset
    RplFlags       → preserved
```

Initialization does not start runtime execution.

For reset scope and failure guarantees, see [Machine initialization architecture](../architecture/machine-initialization.md).

## 6. Create the CPU

```ts
import { Cpu, Decoder, InstructionExecutor } from "@chip8nx/core";

const cpu = new Cpu(
  context,
  new Decoder(),
  new InstructionExecutor(profile.compatibility),
);
```

The decoder remains profile-independent. It recognizes encoded CHIP-8-family instruction syntax, while the executor and the composed machine capabilities provide the semantics required by the selected profile.

One normal CPU attempt is:

```text
check ExitState
  ↓
fetch
  ↓
advance normal PC
  ↓
decode
  ↓
execute
```

The exit check happens before fetch. Once any SUPER-CHIP interpreter-exit condition marks the interpreter exited, later `cpu.step()` calls become no-ops until initialization resets `ExitState`.

For a non-exited CPU, the normal sequencing remains important: the program counter is advanced before decoding/execution, and retry-style instructions restore the instruction address when they need to attempt again.

The CPU does not own real-time scheduling.

## 7. Create the runtime

Choose a CPU execution frequency as host/runtime policy:

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
- `profile.display.refreshFrequency` controls emulated display-frame boundaries and therefore the production of vertical-blank opportunities.

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

The host does **not** need to call `tick()` at the CPU, timer, or display frequency. The deadline-driven scheduler decides which CPU, timer, and display events are due and preserves their emulated chronological order.

SUPER-CHIP does not require a separate scheduler. The runtime continues to produce display opportunities uniformly; instruction execution decides whether the selected profile and current display mode require one.

## Pause and resume

```ts
runtime.pause();
runtime.resume();
```

Pause suspends scheduled CPU, timer, and display progression. Host time spent paused does not accumulate as execution debt.

Interpreter exit is different from runtime pause. SUPER-CHIP exit conditions update `ExitState`; they do not call `runtime.pause()` and do not introduce a second runtime lifecycle state.

## Single-step execution

While paused:

```ts
runtime.step();
```

performs one CPU **attempt**.

That distinction matters: `Fx0A` or a display-synchronized draw may retry rather than complete a logical instruction on that attempt.

Timers and normal scheduled display time do not advance. A draw that requires vertical blank can receive the runtime's temporary step-time vblank opportunity so debugger-style stepping can make useful progress without advancing scheduled time.

For SUPER-CHIP this means:

```text
low-resolution draw
    → vertical-blank-gated

high-resolution draw
    → immediate
```

The runtime remains unaware of SUPER-CHIP display modes; the executor resolves that semantic choice from the profile compatibility and current `DisplayBuffer` mode.

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

A renderer should distinguish logical display geometry from backing geometry where necessary.

For Classic CHIP-8 and CHIP-48:

```text
logical  64 × 32
backing  64 × 32
```

For SUPER-CHIP:

```text
low mode
    logical   64 × 32
    backing  128 × 64

high mode
    logical  128 × 64
    backing  128 × 64
```

Low-resolution SUPER-CHIP semantics are already represented in Core as 2×2 backing-pixel blocks. A host renderer should present the resulting framebuffer rather than reproducing those machine semantics itself.

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

## Resetting an embedded machine

To reset the currently composed machine, reuse the same context and profile:

```ts
runtime.pause();
initializer.initialize(context, profile, program);
```

The same object graph remains in place, ordinary machine state returns to the profile-defined initial state, and RPL flags remain unchanged.

This is different from constructing a completely new machine session.

If a host replaces the object graph—for example when selecting another profile—but wants SUPER-CHIP RPL persistence across that replacement, it should reuse the existing `RplFlags` instance when composing the new `ExecutionContext`.

## Switching profiles

Profile switching is an application-composition concern rather than an operation on an already-constructed Core machine.

A host should compose replacement components from the newly selected profile:

```text
selected Chip8Profile
    ↓
new Memory / Stack / DisplayBuffer / Font
    ↓
new ExecutionContext
    ↓
MachineInitializer
    ↓
new Cpu + InstructionExecutor
    ↓
new Chip8Runtime
```

This is important because profiles can differ in more than instruction quirks. SUPER-CHIP changes display specification and font capabilities in addition to compatibility semantics.

A host may preserve explicitly longer-lived state, such as `RplFlags`, across that recomposition when its lifecycle requires it.

## Application responsibility summary

The application owns:

```text
profile selection
component implementation selection
ROM I/O
composition
longer-lived host ownership such as RPL storage
runtime lifecycle calls
host event loop
rendering
audio output
host input translation
```

The reusable Core owns:

```text
CHIP-8-family machine state
instruction semantics
profile-defined machine characteristics
machine initialization
CPU execution
runtime timing coordination
scheduling
```

The important separation is:

```text
Chip8Profile
    → what machine is being emulated

Chip8RuntimeConfiguration
    → how the host chooses to drive it

ExecutionContext
    → the state and capabilities of the composed machine

Application
    → how those pieces are selected, owned, and presented
```

## Why the manual path remains useful

The Terminal host provides higher-level convenience compositions, while the Web host has now demonstrated profile recomposition across Classic CHIP-8, CHIP-48, and SUPER-CHIP 1.1.

Those applications share recognizable construction steps, but they still make different host-level ownership decisions. In particular, the Web application keeps `RplFlags` above individual machine sessions so their contents can survive ROM replacement and profile recomposition.

That evidence is useful, but it still does not justify turning the Core into a universal machine factory or mandatory session hierarchy.

This guide therefore remains the maximum-control Core composition path:

> construct the components explicitly, let the profile define the emulated machine, and let the application own host-specific lifetime and presentation policy.

See [Host composition evaluation](../architecture/composition-evaluation.md).
