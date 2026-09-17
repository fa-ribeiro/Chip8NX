# Machine Profiles and Variation

Chip8NX uses machine profiles to describe which historical CHIP-8-family machine an application is composing.

A profile is declarative data. It does not own mutable machine state, construct components, or drive the host lifecycle.

The profile model separates three concerns:

```text
Chip8Profile
    ├── machine characteristics / resources
    ├── instructionSet
    │   → which instruction semantics exist
    └── quirks
        → how shared instructions vary
```

The central rule is:

> Machine characteristics describe the target machine, instruction-set identity describes which instruction semantics belong to it, and quirks describe demonstrated variation in instructions shared by supported variants.

This document is the canonical architecture reference for profile semantics and CHIP-8-family variation.

See also:

- [Architecture overview](./overview.md)
- [Machine state and capabilities](./machine-state-and-capabilities.md)
- [Instruction execution](./instruction-execution.md)
- [Machine initialization](./machine-initialization.md)
- [Runtime and timing](./runtime-and-timing.md)
- [Host composition evaluation](./composition-evaluation.md)
- [ADR 0012 — Application-owned composition](../decisions/0012-application-owned-composition.md)

## In this document

- [Responsibility Model](#responsibility-model)
- [Machine Characteristics and Resources](#machine-characteristics-and-resources)
- [Instruction-Set Membership](#instruction-set-membership)
- [Shared-Instruction Quirks](#shared-instruction-quirks)
- [How Profiles Drive Composition](#how-profiles-drive-composition)
- [Definitions Are Not Live State](#definitions-are-not-live-state)
- [Runtime Configuration Is a Different Axis](#runtime-configuration-is-a-different-axis)
- [Built-In Historical Profiles](#built-in-historical-profiles)
- [Profiles Are Data, Not Factories or Settings Bags](#profiles-are-data-not-factories-or-settings-bags)
- [Extending the Profile Model](#extending-the-profile-model)
- [Design Summary](#design-summary)

## Responsibility Model

`Chip8Profile` answers:

> What machine is being emulated?

The application composition root answers:

> Which concrete objects implement that machine in this host?

Those responsibilities stay separate:

```text
Chip8Profile
    ↓
application composition
    ↓
state + capabilities + executor + runtime
```

Conceptually, the current profile shape contains:

```text
memorySize
programStartAddress
stackCapacity

display.specification
display.refreshFrequency

timerFrequency

fonts.small
    image
    baseAddress

fonts.large | null
    image
    baseAddress

instructionSet

quirks
    shiftSource
    memoryTransferIndex
    jumpOffsetSource
    logicFlag
    spriteOverflow
    spriteDrawTiming
    indexOverflow
```

The fields do not all mean the same kind of thing. That is why the three-way distinction matters.

## Machine Characteristics and Resources

Machine characteristics describe structural or machine-visible facts needed to construct and initialize the target machine.

Examples include:

```text
memorySize
programStartAddress
stackCapacity
display.specification
display.refreshFrequency
timerFrequency
fonts.small
fonts.large
```

These values configure different collaborators.

For example:

```text
profile.memorySize
    → Ram capacity

profile.stackCapacity
    → Stack capacity

profile.programStartAddress
    → initial PC
    → program installation address

profile.display.specification
    → DisplayBuffer structure / initial mode

profile.display.refreshFrequency
    → emulated display-boundary scheduling

profile.timerFrequency
    → delay/sound timer scheduling

profile.fonts.small
profile.fonts.large
    → font capability composition
    → font-image installation during initialization
```

The display specification describes structural geometry rather than mutable display state.

Conceptually:

```text
fixed display
    → one width / height

SUPER-CHIP display
    → shared backing width / height
    → initial logical mode
```

The current display mode and framebuffer pixels remain `DisplayBuffer` state.

Likewise, profile font definitions are static resources:

```text
profile.fonts.small
    image + baseAddress

profile.fonts.large
    image + baseAddress
    or null
```

The bytes currently present in RAM remain `Memory` state, while `ClassicFont` / `SuperChipFont` provide glyph-address lookup as execution capabilities.

A resource being present in the composed machine does not by itself grant instruction semantics. A SUPER-CHIP-capable display or a large-font resource can exist in a custom composition without making the base `chip8` instruction set execute SUPER-CHIP-only instructions.

That boundary is deliberate:

```text
resource / capability presence
    ≠
instruction-set membership
```

## Instruction-Set Membership

Instruction-set identity answers:

> Which instruction semantics belong to this machine?

The current type is intentionally small:

```ts
export type Chip8InstructionSet =
  | { readonly kind: "chip8" }
  | { readonly kind: "superchip-1.1" };
```

The discriminant represents semantic membership, not a display capability or generic feature flag.

Current meaning:

```text
chip8
    → base CHIP-8 instruction semantics modeled by Core

superchip-1.1
    → base semantics
    → plus the targeted SUPER-CHIP 1.1 extension semantics
```

SUPER-CHIP-only semantics currently include areas such as:

```text
00Cn / 00FB / 00FC display controls
00FE / 00FF display-mode controls
00FD interpreter exit
historical SUPER-CHIP 00C0 interpretation
Fx30 large-font addressing
Fx75 / Fx85 RPL transfers
extended Dxy0 forms
high-resolution affected-row VF interpretation
```

The detailed instruction contracts belong in [Instruction execution](./instruction-execution.md) and the historical coverage evidence belongs in the [SUPER-CHIP 1.1 coverage audit](../reference/superchip-1.1-coverage-audit.md).

### Absence is not a quirk

Earlier designs placed some extension support inside one compatibility object. The current model avoids values such as:

```text
supportsExitInstruction = false
rplFlags = unsupported
largeFontInstruction = unsupported
```

Those values would make the _absence of an instruction_ look like a behavioral variation of an instruction that every machine already has.

Instead:

```text
instruction exists
    → instructionSet

shared instruction behaves differently
    → quirks
```

This keeps `Chip8Quirks` focused and makes unsupported extension instructions fail at the semantic membership boundary.

### Prefer semantic discriminants over profile-name branching

Execution should normally ask:

```ts
this.instructionSet.kind === "superchip-1.1";
```

when SUPER-CHIP instruction-set membership matters.

It should not ask whether the selected profile object is specifically `SUPERCHIP_PROFILE`.

This preserves the distinction between:

```text
named profile
    → convenient coherent historical preset

instructionSet.kind
    → semantic fact required by execution
```

Tests and hosts may construct custom profile values without forcing execution code to recognize every named preset.

## Shared-Instruction Quirks

Quirks answer:

> When an instruction exists across supported machine families, which demonstrated historical behavior should this machine use?

The current `Chip8Quirks` fields are:

```text
shiftSource
memoryTransferIndex
jumpOffsetSource
logicFlag
spriteOverflow
spriteDrawTiming
indexOverflow
```

They use explicit semantic values rather than enabled/disabled booleans.

For example:

```text
shiftSource
    "vx"
    "vy"
```

communicates the actual source register used by `8xy6` / `8xyE`.

Likewise:

```text
memoryTransferIndex
    increment-by-count
    increment-by-x
    unchanged
```

describes the actual postcondition of `Fx55` / `Fx65` rather than asking readers to infer what a flag such as `loadStoreQuirk = true` means.

Other examples include:

```text
jumpOffsetSource
    → V0 or encoded Vx

logicFlag
    → reset VF or leave VF unchanged

spriteOverflow
    → clip or wrap

spriteDrawTiming
    → uniform timing or display-mode-dependent timing

indexOverflow
    → continue or use the targeted historical interpreter-exit behavior
```

The detailed instruction consequences belong in [Instruction execution](./instruction-execution.md). The profile layer's responsibility is only to select the semantic values.

### Quirk ownership can cross component boundaries

A quirk belongs in `Chip8Profile` because it describes the target machine, but the collaborator that enforces it depends on the responsibility involved.

For example:

```text
profile.quirks.shiftSource
    → InstructionExecutor

profile.quirks.memoryTransferIndex
    → InstructionExecutor

profile.quirks.spriteDrawTiming
    → InstructionExecutor + current DisplayBuffer mode

profile.quirks.spriteOverflow
    → DisplayBuffer construction
```

The profile centralizes the machine definition; it does not require one giant quirk manager to interpret every value at runtime.

## How Profiles Drive Composition

Applications use profile values when constructing a machine:

```ts
const memory = new Ram(profile.memorySize);

const stack = new Stack(profile.stackCapacity);

const displayBuffer = new DisplayBuffer(
  profile.display.specification,
  profile.quirks.spriteOverflow,
);

const font = profile.fonts.large === null
  ? new ClassicFont(profile.fonts.small.baseAddress)
  : new SuperChipFont(
    profile.fonts.small.baseAddress,
    profile.fonts.large.baseAddress,
  );

const executor = new InstructionExecutor(
  profile.instructionSet,
  profile.quirks,
);
```

Initialization then consumes the same profile definition:

```text
profile.memorySize
profile.programStartAddress
profile.display.specification
profile.fonts.small
profile.fonts.large
    ↓
MachineInitializer
    ↓
validated initial/reset state
```

Runtime timing consumes only the machine-visible frequencies it needs:

```text
profile.timerFrequency
profile.display.refreshFrequency
    ↓
Chip8Runtime
```

The important dependency direction is:

```text
profile
    ↓
composition / initialization
    ↓
focused collaborators
```

not:

```text
focused collaborators
    ↓
query global profile identity whenever behavior is needed
```

### `ExecutionContext` deliberately excludes profile configuration

`ExecutionContext` groups mutable state and semantic capabilities used by instruction execution.

It does not contain:

```text
Chip8Profile
Chip8InstructionSet
Chip8Quirks
```

`InstructionExecutor` receives `instructionSet` and `quirks` directly during construction because those values configure execution semantics. Other profile fields are distributed to the collaborators that own them.

This makes `ExecutionContext` an execution-state/capability boundary rather than a general service locator or settings bag.

## Definitions Are Not Live State

A profile remains unchanged while the machine executes.

For example:

```text
profile.programStartAddress = 0x200
```

can remain true while the current `ProgramCounter` later contains:

```text
0x300
```

Likewise:

```text
profile.display.specification
    → structural display definition

DisplayBuffer.mode
    → current mutable display mode
```

and:

```text
profile.fonts.small / large
    → static image/base-address definitions

Memory
    → current mutable bytes
```

Instruction-set identity and quirks are also definition values. They configure the machine but do not mutate as instructions execute.

This gives initialization a clean source-of-truth relationship:

```text
static definitions
    ↓
MachineInitializer
    ↓
current resettable state
```

See [Machine initialization](./machine-initialization.md) for the exact validate/reset/install contract.

## Runtime Configuration Is a Different Axis

Not every configurable value belongs in `Chip8Profile`.

`Chip8RuntimeConfiguration` currently contains CPU frequency.

That distinction is deliberate:

```text
profile.timerFrequency
profile.display.refreshFrequency
    → characteristics of the emulated historical machine

runtimeConfiguration.cpuFrequency
    → host/runtime policy for driving instruction execution
```

A browser, terminal host, benchmark, or future debugger may choose different CPU frequencies without claiming to emulate a different historical machine profile.

Likewise, values such as these remain host policy rather than profile data:

```text
trace-history capacity
inspection window size
browser animation-frame cadence
UI theme
rendering scale
audio presentation policy
```

The rule is:

> Put a value in the machine profile only when it describes the emulated machine target rather than the host's way of driving, observing, or presenting it.

See [Runtime and timing](./runtime-and-timing.md) for the scheduling boundary.

## Built-In Historical Profiles

Chip8NX currently provides three built-in historical presets:

```text
CLASSIC_CHIP8_PROFILE
CHIP48_PROFILE
SUPERCHIP_PROFILE
```

They are ordinary `Chip8Profile` values rather than subclasses in a machine inheritance hierarchy.

### Classic CHIP-8

Classic selects the base `chip8` instruction set together with Classic machine characteristics and shared-instruction quirks.

### CHIP-48 2.25

CHIP-48 currently also selects the base `chip8` instruction-set identity.

Its demonstrated differences from Classic are represented through machine characteristics and shared-instruction quirks rather than a separate extension instruction set.

This is a deliberate current simplification of the implementation model, not a claim that CHIP-48 and Classic CHIP-8 were historically identical machines.

### SUPER-CHIP 1.1

SUPER-CHIP selects:

```text
instructionSet.kind = "superchip-1.1"
```

and combines that extension identity with the display architecture, font resources, timing characteristics, and shared-instruction quirks required by the targeted historical SUPER-CHIP 1.1 machine.

It also demonstrates an important lifecycle distinction: the profile determines that RPL instructions exist, but the profile does not own the `RplFlags` values or their persistence lifetime.

### Presets remain coherent; the type remains composable

Built-in profiles should remain evidence-based coherent targets rather than arbitrary mix-and-match menus presented as historical machines.

The `Chip8Profile` type itself remains composable, however. Tests and hosts may deliberately construct custom combinations when they need to verify semantic isolation or another focused boundary.

This distinction supports tests such as:

```text
base chip8 instruction set
    + SUPER-CHIP-capable display
    ≠ SUPER-CHIP instruction semantics
```

without turning that custom combination into a named historical profile.

## Profiles Are Data, Not Factories or Settings Bags

A profile describes the machine. It does not construct:

```text
Ram
Registers
Stack
DisplayBuffer
Keyboard
Clock
Scheduler
Cpu
Chip8Runtime
```

The application owns those choices.

Likewise, a profile should not grow into a general bag containing every configurable application value.

Avoid adding host concerns such as:

```text
CPU speed preference
trace length
UI layout
renderer implementation
keyboard mapping
audio volume
browser persistence
```

unless a future machine target demonstrates that a similarly named value is genuinely part of the emulated machine semantics.

The profile also should not become a registry of callbacks, factories, or strategy objects for every quirk.

The current declarative model is intentionally simple:

```text
semantic data
    ↓
explicit composition
    ↓
focused objects
```

This preserves [application-owned composition](../decisions/0012-application-owned-composition.md).

## Extending the Profile Model

New profile structure should be introduced only when a supported machine creates demonstrated pressure.

A useful decision sequence is:

```text
Does the new target change a machine/resource characteristic?
    → add/extend the relevant descriptive profile data

Does it add instruction semantics absent from existing instruction sets?
    → extend Chip8InstructionSet

Does it vary the behavior of an instruction already shared by supported targets?
    → extend Chip8Quirks with an explicit semantic choice

Does it require new mutable state or a capability?
    → model that state/capability at its responsible boundary

Is it only host/runtime/presentation policy?
    → keep it outside Chip8Profile
```

This prevents two opposite mistakes:

```text
every difference becomes a quirk
```

and:

```text
every future variant gets a new object hierarchy
```

### No extension registry yet

The current built-in profiles can remain simple exported values.

There is no demonstrated need for:

```text
profile registry
capability graph
QuirkManager
CompatibilityStrategy hierarchy
supportsSuperChip boolean
generic variant plugin framework
```

A future machine such as XO-CHIP may create concrete new pressure around memory, planes, audio, color, or instruction-set structure. Those requirements should be modeled when that work begins rather than pre-built into today's profile system.

The project rule remains:

> Abstract demonstrated variation and demonstrated composition pressure, not hypothetical future needs.

## Design Summary

The profile architecture follows these rules:

1. **`Chip8Profile` describes the emulated machine; it does not own the machine.**\
   Applications remain the composition roots.

2. **Machine characteristics, instruction-set membership, and shared-instruction quirks are different concerns.**\
   Keeping them separate prevents resources, absence, and behavioral variation from collapsing into one compatibility bag.

3. **Instruction-set membership answers what semantics exist.**\
   Extension-only instructions and extension-specific meanings belong to `Chip8InstructionSet`.

4. **Quirks answer how shared instructions vary.**\
   `Chip8Quirks` uses explicit semantic choices rather than ambiguous booleans.

5. **Capabilities do not grant instruction membership.**\
   A SUPER-CHIP-capable display, large font, `ExitState`, or `RplFlags` resource cannot make a base instruction set execute SUPER-CHIP-only semantics.

6. **Profile data is distributed to the collaborator that owns the behavior.**\
   There is no global quirk manager or profile-aware service locator.

7. **Definitions are not live state.**\
   Profile values remain static while `ExecutionContext` components mutate.

8. **Runtime/host policy is a separate configuration axis.**\
   CPU frequency and presentation/debugging settings do not belong in the historical machine profile.

9. **Built-in named profiles remain coherent historical presets.**\
   Custom combinations are still useful in tests and focused host scenarios without becoming new named variants.

10. **New abstraction follows new evidence.**\
    The profile model should grow only when another supported target demonstrates a new kind of machine, instruction-set, quirk, state, or capability variation.

Together these rules let Chip8NX add historical machine variation without losing explicit composition or turning profile data into a universal feature framework.
