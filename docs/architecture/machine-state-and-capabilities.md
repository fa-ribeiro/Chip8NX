# Machine State and Capabilities Architecture

Chip8NX separates the mutable state of the emulated machine from the capabilities it depends on. Machine definitions and runtime-driving configuration remain separate inputs to composition rather than becoming live execution state.

At a high level:

```text
Machine definition
    ↓
application composition
    ↓
ExecutionContext
    ├── persistent machine state
    ├── semantic capabilities
    └── machine resources

Runtime configuration
    ↓
Chip8Runtime
    ↓
scheduled progression
```

The central rule is:

> State describes what the emulated machine currently contains; capabilities describe roles the machine can ask to perform. Definitions and runtime policy configure those objects without becoming mutable machine state themselves.

These are architectural categories, not TypeScript declaration categories. An interface can represent mutable state, and a capability implementation can maintain internal state of its own.

See also:

- [Architecture overview](./overview.md)
- [Instruction execution architecture](./instruction-execution.md)
- [Machine profiles and variation](./machine-profiles-and-variation.md)
- [Runtime and timing architecture](./runtime-and-timing.md)
- [Machine lifecycle](./machine-lifecycle.md)
- [ADR 0012 — Application-owned composition](../decisions/0012-application-owned-composition.md)

## In this document

- [Responsibility Model](#responsibility-model)
- [Architectural Categories Are Not TypeScript Categories](#architectural-categories-are-not-typescript-categories)
- [Persistent Machine State](#persistent-machine-state)
- [Focused Invariant Ownership](#focused-invariant-ownership)
- [State Observation Without Leaking Ownership](#state-observation-without-leaking-ownership)
- [Capabilities and Services](#capabilities-and-services)
- [Keyboard: Host Adaptation vs CHIP-8 Semantics](#keyboard-host-adaptation-vs-chip-8-semantics)
- [Randomness: A Reproducible Capability](#randomness-a-reproducible-capability)
- [Font: Layout Without Memory Ownership](#font-layout-without-memory-ownership)
- [Why These Roles Are Interfaces](#why-these-roles-are-interfaces)
- [Configuration Boundary](#configuration-boundary)
- [Lifecycle Boundaries](#lifecycle-boundaries)
- [Design Summary](#design-summary)

## Responsibility Model

The current Core can be understood through three broad groups.

### Persistent machine state

Persistent state survives from one instruction to the next and forms part of the machine's observable execution state.

Examples include:

```text
Registers
ProgramCounter
IndexRegister
Stack
Memory
DelayTimer
SoundTimer
DisplayBuffer
VerticalBlank
ExitState
RplFlags
```

Instruction execution reads and mutates these components.

For example:

```text
LD V0, 0x42
    → Registers changes

CALL 0x300
    → Stack changes
    → ProgramCounter changes

LD [I], Vx
    → Memory changes

DRW Vx, Vy, n
    → DisplayBuffer changes
    → VerticalBlank may be consumed

EXIT
    → ExitState changes

LD R, Vx / LD Vx, R
    → RplFlags or Registers change
```

Later instructions observe the results of those mutations.

### Capabilities and services

Some dependencies are better understood as roles the machine can ask to perform.

The current examples are:

```text
Keyboard
RandomNumberGenerator
Font
```

Their roles are:

```text
Keyboard
    → query CHIP-8 key state
    → provide Fx0A press/release semantics

RandomNumberGenerator
    → provide the next random Byte

Font
    → resolve a small or large glyph to its sprite address
```

These roles can vary independently of instruction semantics, which makes them useful substitution seams.

### Configuration boundary

Configuration is not part of `ExecutionContext`. It describes how the application composes and drives the state/capability graph.

The current split is:

```text
Chip8Profile
    → what machine is being emulated
    → machine characteristics + instructionSet + quirks

Chip8RuntimeConfiguration
    → host/runtime execution policy
    → currently CPU frequency
```

Those inputs affect construction, initialization, instruction execution, and runtime scheduling, but they are not current machine values.

For example, `profile.quirks.spriteOverflow` helps configure `DisplayBuffer`; it is not framebuffer state. `profile.instructionSet` configures `InstructionExecutor`; it is not stored inside `ExecutionContext`.

The complete profile model and the distinction between instruction-set membership and shared-instruction quirks are documented in [Machine profiles and variation](./machine-profiles-and-variation.md).

## Architectural Categories Are Not TypeScript Categories

It is tempting to equate:

```text
class
    → state

interface
    → capability
```

but Chip8NX deliberately does not follow that rule.

`Memory` is the clearest counterexample.

It is exposed as an interface:

```ts
export interface Memory {
  readonly size: number;
  read(address: Address): Byte;
  write(address: Address, value: Byte): void;
  clear(): void;
}
```

yet memory is persistent mutable machine state.

The interface exists because the storage role is substitutable, not because memory is stateless.

Likewise, `RandomNumberGenerator` is a capability interface, but a pseudo-random implementation may maintain internal generator state.

The two questions are independent:

```text
What responsibility does this object have?
    → state / capability / configuration / resource

Does that role require substitution?
    → interface or concrete dependency
```

This prevents abstractions from being introduced merely for symmetry.

### Some roles cross category boundaries

`Keyboard` is a useful example.

From the executor's perspective it is an input capability:

```text
is this key pressed?
has an Fx0A key-release sequence completed?
```

But `KeyboardState` also owns the interpreter state required to answer those questions.

A better description is:

> `Keyboard` is an input capability whose implementation owns the state required to provide CHIP-8 keyboard semantics.

The categories describe dominant responsibility, not rigid boxes.

### `ExecutionContext` brings the roles together

`ExecutionContext` groups the concrete resources required by instruction execution:

```text
ExecutionContext
├── Registers
├── Memory
├── Stack
├── ProgramCounter
├── IndexRegister
├── DelayTimer
├── SoundTimer
├── DisplayBuffer
├── VerticalBlank
├── Keyboard
├── Font
├── RandomNumberGenerator
├── RplFlags
└── ExitState
```

It does not erase their distinct responsibilities.

The application constructs the components, the context groups them, and `InstructionExecutor` coordinates them according to instruction semantics.

```text
Application
    → chooses and constructs objects

ExecutionContext
    → groups execution resources

InstructionExecutor
    → applies instruction-level relationships
```

The context therefore solves dependency aggregation without becoming a monolithic `Chip8Machine`.

## Persistent Machine State

Persistent state is split across focused components rather than stored in one large mutable object.

The goal is not merely smaller classes. It is to keep state together with the rules that protect and interpret it.

### State ownership includes behavior ownership

A component should not expose raw storage and expect every caller to preserve its invariants manually.

For example:

```text
Stack
    → owns return-address storage
    → owns capacity
    → owns push/pop semantics
    → owns underflow/overflow checks
```

rather than:

```text
MachineState.stackValues
MachineState.stackPointer
MachineState.stackCapacity
```

with each consumer manipulating those fields directly.

The same pattern appears throughout the Core:

```text
Registers
    → register storage

ProgramCounter
    → next instruction address
    → instruction-sized advancement

Ram
    → byte storage
    → concrete address-space bounds

Timer
    → countdown state
    → no-underflow transition

DisplayBuffer
    → pixel state
    → display mode where supported
    → logical/backing geometry relationship
    → sprite and scrolling state transitions

VerticalBlank
    → one pending synchronization opportunity

ExitState
    → whether interpreter execution has terminated

RplFlags
    → persistent SUPER-CHIP user-flag bytes
```

This is encapsulation in its useful sense:

> Keep state together with the rules required to use that state correctly.

### Registers

`Registers` owns the sixteen CHIP-8 general-purpose registers:

```text
V0 ... VF
```

Every stored value is a `Byte`.

Its storage remains private and callers use:

```text
get(RegisterIndex)
set(RegisterIndex, Byte)
clear()
snapshot()
```

The numeric-domain invariants are already represented by:

```text
RegisterIndex
Byte
```

so the register bank can focus on persistent storage rather than repeat validation owned by those domain types.

### Program counter

`ProgramCounter` owns one `Address`: the next instruction address.

Its focused API is:

```text
getValue()
setValue(Address)
advance()
```

`advance()` encapsulates the fixed CHIP-8 instruction width:

```text
PC = address(PC + INSTRUCTION_SIZE)
```

This lets callers express intent:

```ts
programCounter.advance();
```

instead of scattering:

```text
PC += 2
```

through execution code.

The program counter does not fetch memory, decode instructions, or know the size of the current RAM instance. Those responsibilities require other context.

### Index register

`IndexRegister` owns the current value of register `I`.

It stores an `Address` and exposes:

```text
getValue()
setValue(Address)
```

Instruction-specific behavior remains elsewhere.

For example:

```text
Fx1E
Fx29
Fx55
Fx65
```

decide how `I` changes; `IndexRegister` only owns the resulting stored address.

This keeps storage semantics separate from instruction semantics.

### Stack

`Stack` owns subroutine return-address state.

It keeps storage and capacity private and exposes operations such as:

```text
push(Address)
pop()
peek()
getSize()
getCapacity()
isEmpty()
isFull()
clear()
snapshot()
```

The configured capacity comes from the machine profile through composition rather than being hard-coded in the stack.

Overflow and underflow checks stay inside `Stack` because only the stack owns both its current depth and capacity.

The executor therefore asks:

```text
stack.push(returnAddress)
```

or:

```text
stack.pop()
```

without duplicating stack-pointer arithmetic.

### Memory

`Memory` represents mutable byte-addressable machine state and is exposed as an interface because the storage role is intentionally substitutable.

Its contract is narrow:

```text
size
read(Address)
write(Address, Byte)
clear()
```

It does not own:

- ROM file I/O;
- font installation policy;
- program loading policy;
- instruction fetching;
- disassembly;
- persistence.

`Ram` is the current concrete implementation.

It owns a private contiguous byte array and validates addresses against its configured size.

This gives two validation layers:

```text
Address
    → structurally valid non-negative address

Ram
    → address fits this concrete address space
```

The memory size comes from `Chip8Profile`, so `Ram` remains independent of one hard-coded Classic memory limit.

### Timers

The delay and sound timers are separate `Timer` instances.

Each stores one `Byte` with this transition rule:

```text
value > 0
    → tick decrements by one

value = 0
    → tick leaves it at zero
```

`Timer` does not know when `tick()` should occur.

That belongs to runtime timing.

```text
Timer
    → countdown state

Chip8Runtime
    → schedule countdown transitions
```

The two timers share mechanics but retain separate machine meaning.

### Display buffer

`DisplayBuffer` owns the emulated graphical state independently of host rendering.

```text
DisplayBuffer
    → machine pixels and display mode

Terminal / Canvas / future renderer
    → presentation
```

The buffer owns:

- framebuffer storage;
- logical display dimensions;
- physical backing-store dimensions;
- the active display mode where the machine supports multiple modes;
- clear/reset behavior;
- XOR sprite drawing;
- sprite overflow semantics;
- collision reporting;
- physical framebuffer scrolling.

Classic CHIP-8 and CHIP-48 use fixed 64×32 displays, so their logical and backing dimensions are the same.

Both supported SUPER-CHIP targets use the same switchable display structure:

```text
SUPER-CHIP backing store
    128 × 64

low mode
    logical 64 × 32
    one logical pixel = 2 × 2 backing pixels

high mode
    logical 128 × 64
    one logical pixel = 1 backing pixel
```

The display capability itself does not decide whether a mode-change instruction clears pixels or how encoded scrolling distances should be interpreted. Those are instruction-set semantics.

For historical `superchip-1.1`, `00FE` / `00FF` preserve backing pixels and scrolling distances are already physical backing units. For `superchip-modern`, the executor clears after a successful mode change and translates logical scroll distances into backing units before calling the buffer.

That separation keeps `DisplayBuffer` mechanical:

```text
setMode(mode)
    → change logical interpretation

clear()
    → clear pixels, preserve current mode

scrollDown/Left/Right(...)
    → move backing pixels by physical units

reset()
    → clear pixels
    → restore the display specification's initial mode
```

The executor still owns the larger drawing collaboration:

```text
read Vx / Vy
read sprite bytes from Memory
resolve draw timing from quirks + display mode
resolve Dxy0 form from instruction-set semantics + display mode
call DisplayBuffer drawing operation
interpret SpriteDrawResult into VF
```

This split keeps graphical state-transition rules with the graphical state while leaving instruction-level compatibility policy with the executor.

### Vertical blank

`VerticalBlank` stores whether one display-synchronization opportunity is pending.

Its API is:

```text
signal()
consume()
reset()
isPending
```

Repeated signals do not accumulate:

```text
signal()
signal()
signal()
    ↓
one pending opportunity
```

This is a small but meaningful state machine, not merely an arbitrary boolean flag.

Draw timing remains an instruction/profile concern:

```text
Classic CHIP-8
    → vertical-blank gated

SUPER-CHIP 1.1
    LOW  → vertical-blank gated
    HIGH → immediate

SUPER-CHIP Modern
    → immediate in both modes
```

An immediate draw does not consume a pending `VerticalBlank`.

See [Runtime and timing architecture](./runtime-and-timing.md) for how opportunities are scheduled and how manual stepping interacts with them.

### Interpreter exit state

`ExitState` owns whether a SUPER-CHIP interpreter-exit condition has occurred.

Both supported SUPER-CHIP instruction sets provide explicit `00FD` exit. Historical SUPER-CHIP 1.1 also exits for the targeted `00C0` interpretation and when the shared `Fx1E` index-overflow quirk selects interpreter exit. Modern SUPER-CHIP treats `00C0` as a zero-row scroll and selects continued `Fx1E` execution instead.

It is ordinary resettable machine state:

```text
running
    ↓ 00FD / historical 00C0 / configured historical Fx1E overflow
exited
    ↓ machine initialization/reset
running
```

`Cpu.step()` checks this state before fetching memory. Once exited, additional CPU steps become no-ops until initialization resets the state.

Keeping exit as explicit state avoids coupling an emulated instruction to host callbacks, exceptions, or runtime pause policy.

### RPL flags

`RplFlags` owns the eight SUPER-CHIP user-flag bytes addressed by `Fx75` and `Fx85`:

```text
R0 R1 R2 R3 R4 R5 R6 R7
```

The storage is machine state, but its lifecycle differs from ordinary resettable state.

The supported SUPER-CHIP profiles share the same eight-byte RPL capability and reset contract. `MachineInitializer` deliberately does **not** clear it; the host decides the outer lifetime of the concrete `RplFlags` instance.

```text
ordinary resettable state
    Registers
    Timers
    DisplayBuffer
    ExitState
        ↓ initialize/reset
    restored

RplFlags
        ↓ initialize/reset
    preserved
```

This is not a reason to create a generic persistent-state registry. `RplFlags` is a focused component because SUPER-CHIP demonstrates one concrete state resource with distinct lifetime semantics.

## Focused Invariant Ownership

The state components follow one consistent principle:

| Component        | Owns                                                      | Does not own                                  |
| ---------------- | --------------------------------------------------------- | --------------------------------------------- |
| `Registers`      | sixteen `Byte` values and register access                 | instruction semantics                         |
| `ProgramCounter` | next instruction address and fixed-width advance          | memory fetch/decode                           |
| `IndexRegister`  | current `I` value                                         | meaning of instructions that modify `I`       |
| `Stack`          | return addresses, depth, capacity                         | call/return semantics                         |
| `Memory` / `Ram` | byte storage and concrete address bounds                  | ROM/font loading policy                       |
| `Timer`          | countdown state                                           | scheduling                                    |
| `DisplayBuffer`  | pixels, mode, geometry interpretation, drawing, scrolling | host rendering / draw-timing selection        |
| `VerticalBlank`  | one pending opportunity                                   | when opportunities occur                      |
| `ExitState`      | running/exited interpreter state                          | host pause/termination policy                 |
| `RplFlags`       | eight persistent SUPER-CHIP user-flag bytes               | host persistence beyond the composed lifetime |

The rule is:

> Put an invariant in the lowest component that has enough information to own it, while keeping multi-component semantic relationships in the coordinating layer.

For example:

```text
Stack
    → knows whether it is full

InstructionExecutor
    → knows that CALL pushes the already-advanced PC
```

and:

```text
DisplayBuffer
    → knows how XOR drawing changes pixels

InstructionExecutor
    → knows where sprite bytes come from and that collision updates VF
```

### Why not one giant state bag?

A compact alternative could look like:

```ts
interface MachineState {
  registers: number[];
  programCounter: number;
  indexRegister: number;
  stack: number[];
  stackPointer: number;
  memory: Uint8Array;
  delayTimer: number;
  soundTimer: number;
  pixels: Uint8Array;
  displayMode: "low" | "high";
  verticalBlankPending: boolean;
  exited: boolean;
  rplFlags: number[];
}
```

That describes storage location but not responsibility.

Any consumer could then:

```text
write invalid register values
overflow stack state manually
bypass memory bounds
advance PC incorrectly
mutate pixels without drawing rules
erase or accumulate vblank state incorrectly
```

Chip8NX instead prefers:

```text
focused state object
        +
focused API
        =
state + invariant ownership
```

The object graph contains more types, but each type has a reason to exist.

### Small classes can still be meaningful

Some state objects are intentionally tiny.

`IndexRegister` and `VerticalBlank` are examples.

Their value comes from giving one domain responsibility a clear owner, not from having many methods.

A small class is justified when it provides at least one meaningful:

- invariant boundary;
- domain-specific transition;
- lifecycle/reset semantic;
- collaboration role.

That is different from wrapping every primitive automatically.

Chip8NX also uses branded primitive types such as:

```text
Byte
Address
Opcode
RegisterIndex
```

when the problem is value validation rather than stateful behavior.

### Domain values and state objects complement each other

The architecture therefore uses both:

```text
domain value
    → validates what one value means

state component
    → owns how validated values persist and change
```

For example:

```text
Byte
    → valid 8-bit value

Registers
    → sixteen persistent Byte values
```

and:

```text
Address
    → structurally valid address value

ProgramCounter
    → persistent next-instruction Address

Ram
    → concrete address range in which an Address may be used
```

The layers reinforce rather than duplicate one another.

## State Observation Without Leaking Ownership

Tests, passive inspection tooling, future debuggers, and user interfaces need to observe mutable machine state.

Chip8NX prefers explicit observation APIs instead of exposing live backing collections.

Examples include:

```text
Registers.snapshot()
Stack.snapshot()
Cpu.snapshot()
```

`Cpu.snapshot()` produces an immutable `CpuState` containing selected state such as:

```text
registers
index register
program counter
stack contents
delay timer
sound timer
```

Collections are copied before being returned.

So:

```text
live mutable state
    ↓
snapshot()
    ↓
independent observation value
```

Later CPU execution cannot mutate an already-created snapshot.

### Snapshots are views, not second owners

`CpuState` is not an alternate place where machine state lives.

The ownership direction remains:

```text
Registers / Stack / Timers / PC / I
        ↓
live state
        ↓
Cpu.snapshot()
        ↓
CpuState
        ↓
test / Inspection consumer / future debugger / UI
```

Machine control still occurs through the real components and execution operations.

The broader rule is:

> State observation should copy or describe mutable state rather than leak ownership of that state.

## Capabilities and Services

Capabilities are roles instruction execution can ask to perform without depending on one concrete provider.

The current examples are:

```text
Keyboard
RandomNumberGenerator
Font
```

They are abstractions because their implementations genuinely vary, not because every dependency must be an interface.

### Narrow contracts describe consumer needs

A useful capability interface exposes only what its consumer requires.

`RandomNumberGenerator` exposes:

```ts
nextByte(): Byte;
```

because `Cxkk` needs one random byte.

It does not expose:

```text
seed
algorithm
entropy source
internal state
Math.random()
```

Likewise, `Font` exposes:

```ts
getSpriteAddress(value: Byte, size: FontSize): Address;
```

because `Fx29` and `Fx30` need sprite addresses for explicitly selected font sizes, not font rendering or loading operations.

The interface describes the role from the consumer's perspective.

## Keyboard: Host Adaptation vs CHIP-8 Semantics

`Keyboard` exposes:

```text
isPressed(key)
pollKeyRelease()
reset()
```

These are CHIP-8-facing operations, not host event APIs.

Core does not want to know about:

```text
DOM KeyboardEvent
terminal escape sequences
gamepad buttons
virtual keypad pointer events
```

The boundary is:

```text
host-specific input
        ↓
host adapter
        ↓
CHIP-8 Key press/release events
        ↓
KeyboardState
        ↓
Keyboard
        ↓
InstructionExecutor
```

The host maps physical/UI input to CHIP-8 keys.

`KeyboardState` owns the interpreter semantics required after that mapping.

### Stateful capability implementation

`KeyboardState` maintains state such as:

```text
currently pressed keys
whether an Fx0A wait is active
which key was latched
whether its release completed
```

This is necessary because `Fx0A` is not merely:

```text
which key is pressed now?
```

The current Classic behavior spans multiple calls:

```text
idle
  ↓
wait begins
  ↓
key is selected
  ↓
key is released
  ↓
completed release returned
  ↓
idle
```

So a capability interface can absolutely have a stateful implementation.

The distinction is one of responsibility, not mutability.

### Reset preserves externally driven pressed state

`Keyboard.reset()` clears transient interpreter wait state but preserves keys that remain physically/UI pressed.

```text
key A held
Fx0A wait active
    ↓
reset()
    ↓
Fx0A wait cleared
A still pressed
```

Only the input source knows whether a user released the key.

Machine reset must not fabricate that external event.

This gives a precise split:

```text
pressed state
    → driven by host input

Fx0A interpretation state
    → owned by KeyboardState
```

### Host input stays outside Core

`KeyboardState` does not listen to browsers, terminals, or devices directly.

Applications feed explicit:

```text
press(Key)
release(Key)
releaseAll()
```

events.

This lets the same Core keyboard semantics work with:

- terminal input;
- browser physical keyboard input;
- virtual keypads;
- future gamepad adapters;
- deterministic tests.

Hosts may combine multiple sources before they reach Core.

## Randomness: A Reproducible Capability

`RandomNumberGenerator` is one of the clearest substitution seams in the Core.

Normal execution may use:

```text
DefaultRandomNumberGenerator
    → Math.random()
```

while tests can use:

```text
TestRandomNumberGenerator
    → predetermined byte sequence
```

Instruction execution only depends on:

```ts
nextByte(): Byte;
```

For `Cxkk`:

```text
nextByte()
    ↓
AND instruction mask
    ↓
store in Vx
```

The executor does not know where the byte came from.

### Capability implementations may own internal state

A deterministic generator may store:

```text
configured values
current index
```

and advance the index on each call.

That is provider-owned state.

```text
InstructionExecutor
    → owns how the random byte affects CHIP-8 state

RandomNumberGenerator
    → owns how the next byte is produced
```

A future seeded PRNG could own its own seed/state without changing the executor.

### Deterministic substitution beats global patching

Because randomness is injected through a narrow capability, tests can use a deterministic implementation rather than patch global `Math.random()`.

```text
known sequence
    ↓
TestRandomNumberGenerator
    ↓
normal executor code
    ↓
deterministic result
```

The same principle appears in runtime timing with `Clock` / `TestClock`.

Those abstractions exist because controlled substitution has concrete value.

## Font: Layout Without Memory Ownership

`Font` answers one semantic question:

```text
For this CHIP-8 glyph value and requested font size,
where does its sprite begin?
```

The instruction collaboration is therefore:

```text
Fx29
    ↓
Font.getSpriteAddress(Vx, "small")
    ↓
IndexRegister

Fx30
    ↓
Font.getSpriteAddress(Vx, "large")
    ↓
IndexRegister
```

The executor does not calculate font memory layout directly.

### `ClassicFont` owns Classic small-font layout

The Classic implementation knows:

```text
16 small glyphs
5 bytes per glyph
low nibble selects glyph
configured small-font base address
```

It owns the mapping:

```text
glyph address =
small-font base address + digit × glyph size
```

A large-font request is rejected because Classic CHIP-8 does not provide that capability.

### `SuperChipFont` composes small and large layout rules

Both supported SUPER-CHIP targets use the Classic-style small font plus the same ten-byte large decimal font resource.

`SuperChipFont` therefore composes the existing small-font behavior with a second base address for large glyphs:

```text
small
    → ClassicFont mapping

large
    → SUPER-CHIP 10-byte glyph mapping
    → defined digits 0–9
```

The capability remains small because the demonstrated variation is still address lookup, not font rendering or memory ownership.

### Font layout and font bytes are separate

The design keeps these concepts distinct:

```text
font image
    → sprite bytes

font layout
    → glyph + size → address mapping

memory
    → installed bytes
```

In the current design:

```text
Chip8Profile.fonts.small
    → small-font static definition
    → image + base address

Chip8Profile.fonts.large
    → optional large-font static definition
    → image + base address

MachineInitializer
    → installs configured font images in Memory

ClassicFont / SuperChipFont
    → resolve glyph addresses
```

`Font` does not own memory, and `Fx29` / `Fx30` do not need to know how the bytes were loaded.

## Why These Roles Are Interfaces

The current capability abstractions have concrete reasons:

| Role                    | Demonstrated variation                                         |
| ----------------------- | -------------------------------------------------------------- |
| `Keyboard`              | terminal, browser, virtual keypad, tests, future input sources |
| `RandomNumberGenerator` | normal source vs deterministic test source                     |
| `Font`                  | font layout/location may vary by machine model/configuration   |
| `Memory`                | storage role can vary even though memory is mutable state      |

There is no equivalent demonstrated need for interfaces such as:

```text
RegistersProvider
ProgramCounterService
StackInterface
```

Creating them only to make `ExecutionContext` symmetrical would add ceremony without solving a current variation problem.

The project rule remains:

> Abstract demonstrated variation, not hypothetical variation.

### Dependency injection vs dependency inversion

These capabilities also illustrate two different ideas.

Supplying an externally constructed dependency is dependency injection:

```text
consumer does not construct dependency
```

Depending on a role rather than one concrete provider adds an abstraction boundary:

```text
RandomNumberGenerator
instead of
DefaultRandomNumberGenerator
```

So:

```text
concrete dependency injected
    → dependency injection

abstract role injected
    → dependency injection + abstraction
```

Chip8NX uses both patterns according to whether substitution is justified.

## Configuration Boundary

Machine definitions configure this state/capability graph without becoming part of it.

`Chip8Profile` supplies machine characteristics, instruction-set identity, and shared-instruction quirks to the application composition root. Different profile fields are consumed by the collaborators that own the corresponding responsibility:

```text
profile.memorySize
    → Ram

profile.display.specification
profile.quirks.spriteOverflow
    → DisplayBuffer

profile.fonts
    → Font composition + MachineInitializer

profile.instructionSet
profile.quirks
    → InstructionExecutor

profile.timerFrequency
profile.display.refreshFrequency
    → Chip8Runtime
```

`ExecutionContext` deliberately contains neither `Chip8Profile`, `Chip8InstructionSet`, nor `Chip8Quirks`. By the time instruction execution receives the context, composition has already selected and configured the machine.

Runtime-driving policy is a different axis. `Chip8RuntimeConfiguration` currently carries CPU frequency because CPU throughput is chosen by the host rather than being a fixed characteristic of the emulated machine target.

The full profile model—including `instructionSet` vs `quirks`, built-in profiles, composition examples, and extension rules—now has one canonical home: [Machine profiles and variation](./machine-profiles-and-variation.md).

## Lifecycle Boundaries

State ownership and state lifetime are related, but they are not identical. Different components can legitimately participate in different reset/lifetime rules.

The important state-level distinctions are:

```text
ordinary resettable machine state
    Registers
    ProgramCounter
    IndexRegister
    Stack
    Memory
    Timers
    DisplayBuffer
    VerticalBlank
    interpreter keyboard-wait state
    ExitState

longer-lived machine state
    RplFlags

provider-owned capability state
    RandomNumberGenerator internals

externally driven host/input state
    currently pressed keyboard keys
```

`MachineInitializer` establishes the defined starting state of the already-composed machine. It resets ordinary machine/interpreter state, rebuilds memory from the configured font/program definitions, and resets the display to its profile-defined initial mode. It deliberately preserves `RplFlags`.

That RPL exception is part of the modeled SUPER-CHIP resource semantics, not evidence for a generic persistent-state registry. The application owns the concrete `RplFlags` instance and therefore decides the outer lifetime across session replacement; initialization only defines that ordinary machine reset must not clear it.

Keyboard and randomness demonstrate two different boundaries. Keyboard reset clears interpreter-side `Fx0A` wait state without fabricating physical key releases, while RNG lifecycle remains provider/application-owned because the `RandomNumberGenerator` capability does not define reset or reseed semantics.

Pause is different again:

```text
pause
    → preserve machine state
    → suspend scheduled progression

reset / initialize
    → re-establish resettable machine state
    → preserve explicitly longer-lived state
```

The exact initialization order, validate-before-mutate guarantees, memory rebuild, and reset scope are documented in [Machine initialization](./machine-initialization.md). Construction, pause/resume, single stepping, reset sequencing, ROM replacement, and profile replacement are documented in [Machine lifecycle](./machine-lifecycle.md). Runtime scheduling behavior belongs in [Runtime and timing](./runtime-and-timing.md).

The state/capability rule retained here is:

> A component owns its local state and invariants; lifecycle coordinators decide when the component is reset, preserved, replaced, or merely paused according to the semantics of that resource.

## Design Summary

The machine-state and capability architecture follows a few stable rules:

1. **Persistent machine state lives in focused components.**\
   State survives because those components are mutated, not because the executor or runtime stores hidden execution history.

2. **State belongs with its invariants.**\
   Stack capacity, memory bounds, display geometry, timer countdown, RPL storage, and similar rules stay with the components that own the required information.

3. **Domain values and state objects solve different problems.**\
   `Byte`, `Address`, and `RegisterIndex` validate values; state components own persistence and transitions.

4. **Inspection should not leak mutable ownership.**\
   Snapshots and read APIs expose state without handing consumers live backing storage.

5. **Capabilities describe roles whose implementations genuinely vary.**\
   Keyboard input, randomness, font layout, and memory storage use abstraction boundaries for concrete reasons rather than symmetry.

6. **Capabilities may still be stateful.**\
   `KeyboardState` and deterministic RNG implementations can own internal state required to provide their roles.

7. **Configuration is not live state.**\
   `Chip8Profile` and runtime configuration shape composition while remaining outside `ExecutionContext`; profile semantics are documented in [Machine profiles and variation](./machine-profiles-and-variation.md).

8. **Different state can have different lifetimes.**\
   Most machine/interpreter state is restored by initialization, while historically longer-lived resources such as `RplFlags` are deliberately preserved.

9. **Lifecycle operations do not collapse into one reset concept.**\
   Construction, initialization, pause, reset, ROM replacement, and profile replacement have different owners and semantics; their sequencing is documented in the dedicated initialization/lifecycle documents.

10. **Application composition remains explicit.**\
    Core defines state components and capability roles without collapsing them into one universal `Chip8Machine` object or a generic state registry.

Together these rules keep the machine model modular and inspectable while giving each piece of state, behavior, and lifetime an explicit owner.
