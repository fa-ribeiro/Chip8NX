# Tracing Architecture

Chip8NX tracing spans two reusable package responsibilities:

- `@chip8nx/core` owns CPU observation: producing structured facts about instruction attempts and exposing the minimal observer port;
- `@chip8nx/inspection` owns passive trace consumers such as bounded history and human-readable formatting.

Applications decide whether to compose those capabilities and own final presentation or other host-specific behavior.

At a high level:

```text
Core: Cpu.step()
      ↓
instruction attempt
      ↓
Core: InstructionTrace
      ↓
Core: InstructionTraceObserver
      ↓
Inspection consumers
    ├── InstructionTraceBuffer
    └── InstructionTraceFormatter
              ↓
        application presentation
```

The central rule is:

> Observation is purely passive. Enabling, disabling, storing, formatting, or failing to consume a trace must not change emulated machine behavior.

The package dependency remains one-way:

```text
@chip8nx/inspection
        ↓ depends on
@chip8nx/core
```

Core does not depend on Inspection.

Tracing therefore remains separate from:

- instruction execution semantics;
- runtime scheduling;
- execution-control policy;
- host output;
- debugger behavior such as breakpoints.

See also:

- [Architecture overview](./overview.md)
- [Instruction execution architecture](./instruction-execution.md)
- [Runtime and timing architecture](./runtime-and-timing.md)
- [Machine state and capabilities architecture](./machine-state-and-capabilities.md)
- [Disassembly architecture](./disassembly.md)

## Responsibility Model

One `InstructionTrace` represents one **CPU instruction attempt**.

That distinction is important because one CPU attempt does not necessarily mean one completed instruction.

Classic CHIP-8 instructions such as:

```text
Fx0A
Dxyn
```

may deliberately retry by restoring the program counter to the address of the current instruction.

Each retry is still a real CPU attempt and therefore produces its own trace.

The observation boundary is:

```text
CPU state before
      ↓
fetch
      ↓
decode
      ↓
execute
      ↓
CPU state after
      ↓
InstructionTrace
```

This boundary belongs to Core `Cpu.step()` because the CPU owns the complete fetch/decode/execute attempt.

`Chip8Runtime` determines **when** CPU attempts occur, but it does not own the semantics or observation of an individual attempt.

The distinction is:

```text
Chip8Runtime
    → when Cpu.step() occurs

Cpu
    → what one instruction attempt does
    → produces the observation

@chip8nx/inspection
    → passively retains or presents observations
```

Instruction observation is therefore available independently of normal scheduled execution. Manual runtime stepping and any future direct CPU consumers observe the same CPU-attempt boundary.

Neither the observer contract nor its Inspection consumers decide whether execution should continue, pause, retry, or stop. Those decisions remain execution or future debugger policy.

## Optional Observation

CPU observation is an optional Core dependency.

Conceptually:

```text
no observer
    ↓
normal CPU execution

observer attached
    ↓
normal CPU execution
    +
structured observations
```

When no `InstructionTraceObserver` is configured, `Cpu` does not create the `CpuState` snapshots required for an `InstructionTrace`.

The observation machinery therefore avoids trace-snapshot work when unused.

When an observer is configured, Core performs the additional work required to construct and deliver the trace. What happens after delivery depends on the consumer.

For example:

```text
Core
    create InstructionTrace
    deliver to observer
            ↓
Inspection
    InstructionTraceBuffer
        → bounded retention cost

    InstructionTraceFormatter
        → formatting cost

Application
        → rendering / console / UI cost
```

These costs are real host-side costs, but they must not alter emulated machine semantics.

The required invariant is:

```text
machine behavior without observation
    =
machine behavior with observation
```

except for the externally visible observations and the host resources consumed to produce or process them.

Observation is therefore **semantically non-interfering**, not computationally free.

## Non-Interference

`InstructionTraceObserver` is a diagnostic collaborator rather than an execution collaborator.

Its failure must never become a CPU execution failure.

If a successful CPU attempt is followed by an observer failure:

```text
CPU attempt succeeds
        ↓
trace produced
        ↓
observer throws
        ↓
Cpu.step() still succeeds
```

Likewise, if the CPU attempt itself fails:

```text
CPU raises original error
        ↓
failed trace produced
        ↓
observer may also throw
        ↓
original CPU error is rethrown
```

The observer cannot replace the original execution error with its own failure.

This is intentionally different from semantic collaborators such as:

```text
Memory
Decoder
InstructionExecutor
Stack
```

Failures from those collaborators may describe actual machine execution failure and therefore propagate normally.

An observer failure means only:

> The attempt could not be observed successfully.

It does not mean:

> The emulated instruction failed.

The Core guarantee can therefore be summarized as:

> Observation may fail; emulation must not fail because observation failed.

The same rule applies regardless of which passive consumer is attached. An Inspection buffer, formatter adapter, application logger, or future UI bridge may fail internally without acquiring authority over CPU semantics.

## Structured Data Before Presentation

Core CPU observation produces structured semantic records rather than formatted strings.

```text
Core
    CPU attempt
        ↓
    InstructionTrace
        ↓
Inspection
    InstructionTraceFormatter
        ↓
Application
    console / terminal / UI / other presentation
```

An `InstructionTrace` contains facts about execution. It does not contain presentation policy such as:

```text
formatted assembly text
columns or padding
terminal output
newlines
console behavior
DOM state
UI styling
```

Those concerns belong downstream.

This follows the same architectural principle used by static disassembly:

> Preserve semantic information first; derive presentation from it afterward.

Successfully decoded traces retain the typed Core `Instruction`, so Inspection consumers do not need to decode the opcode again merely to understand or present the operation.

The resulting ownership is:

```text
@chip8nx/core
    Instruction
    CpuState
    InstructionTrace

@chip8nx/inspection
    InstructionFormatter
    InstructionTraceFormatter

applications
    output and interaction
```

## Trace Data Model

One CPU instruction attempt produces one `InstructionTrace`.

The Core trace model is a discriminated union:

```text
InstructionTrace
    ├── SuccessfulInstructionTrace
    └── FailedInstructionTrace
```

Both variants contain immutable CPU snapshots taken at the attempt boundary:

```text
before
    → CPU state immediately before the attempt

after
    → actual CPU state immediately after the attempt
       returned or failed
```

The `outcome` discriminator lets consumers narrow the union directly:

```ts
if (trace.outcome === "success") {
  // trace.instruction is available
} else {
  // trace.error is available
}
```

### Successful attempts

A successful trace represents an attempt whose execution path returned normally:

```text
SuccessfulInstructionTrace
├── outcome = "success"
├── instruction
├── before
└── after
```

“Successful” means that the CPU attempt returned normally. It does not necessarily mean that the instruction completed all of its semantic work.

For example, `Fx0A` and vblank-gated `Dxyn` may deliberately restore the current instruction address and return so that execution can retry later. Those attempts are successful trace records because retry is normal instruction behavior rather than an exception.

The decoded Core `Instruction` already retains its original `Opcode`, so successful traces do not duplicate facts merely for consumer convenience:

```text
source address
    → before.programCounter

opcode
    → instruction.opcode
```

### Failed attempts

A failed trace represents an attempt that raised an execution error:

```text
FailedInstructionTrace
├── outcome = "failure"
├── opcode?
├── instruction?
├── before
├── after
└── error
```

The optional `opcode` and `instruction` fields describe how far the attempt progressed:

```text
opcode absent
    → a complete opcode was not assembled

opcode present
instruction absent
    → fetch completed, decoding did not

instruction present
    → decoding completed and execution was reached
```

The model therefore does not need a separate:

```ts
"fetch" | "decode" | "execute";
```

stage field. The semantic data already expresses that information.

The `error` is the original error raised by the CPU attempt. Core observation does not wrap or replace it.

### `before` and `after` describe actual CPU state

CPU execution is not transactional.

For example, `Cpu.step()` advances the program counter before decoding:

```text
before.PC = 0x200
    ↓
fetch opcode
    ↓
advance PC
    ↓
decode fails
    ↓
after.PC = 0x202
```

A failed trace therefore records the real post-failure CPU state rather than pretending that execution rolled back.

The same principle applies to execution failures: if machine state changed before an exception occurred, `after` reflects the resulting CPU state.

This makes traces observations of what actually happened rather than reconstructions of what a successful instruction would have done.

### `CpuState` is intentionally CPU-focused

`CpuState` currently contains:

```text
V0–VF
I
PC
stack
delay timer
sound timer
```

Mutable collections are copied when the snapshot is created so later execution cannot mutate an existing observation.

`CpuState` is not a complete machine snapshot. It deliberately does not contain:

```text
Memory
DisplayBuffer
VerticalBlank
Keyboard
RandomNumberGenerator provider state
```

Therefore:

```text
trace.before
trace.after
```

mean:

> CPU state before and after the attempt.

They do **not** mean:

> Complete emulator state before and after the attempt.

For example, `CLS` may modify the display while its trace records only the corresponding CPU-state changes. `Fx55` may modify memory even though memory contents do not appear in `CpuState`.

The observation model should not grow into a complete machine snapshot merely to make instruction traces appear comprehensive. Memory, display, input, runtime-event, or other observation needs should be introduced only when a real consumer demonstrates them.

### Snapshot ownership

Trace snapshots contain observation values rather than references to live mutable CPU collections:

```text
live CPU state
    ↓
Cpu.snapshot()
    ↓
immutable CpuState
    ↓
InstructionTrace
```

That makes Core traces safe for passive consumers such as:

```text
Inspection formatting
bounded Inspection history
tests
future debugger presentation
```

without giving those consumers ownership of the running machine.

## Retry Semantics and Repeated Trace Lines

An `InstructionTrace` records a CPU **attempt**, not only an instruction that advances to a new program counter.

The same instruction address may therefore legitimately appear several times in succession.

The most visible current examples are:

```text
Dxyn
    → may wait for a vertical-blank opportunity

Fx0A
    → may wait for the required key press/release lifecycle
```

In both cases, retry is expressed by restoring the program counter to the current instruction address and returning normally from the executor.

The runtime remains active and later CPU occurrences attempt the same instruction again.

Because Core observes attempts at the `Cpu.step()` boundary, each of those attempts produces its own `InstructionTrace`.

### Repeated `Dxyn` traces

Consider this trace presentation:

```text
0x25C D8B4 DRW V8, VB, 0x4   | PC:0x25C → 0x25E
0x25E A23E LD I, 0x23E       | I :0x216 → 0x23E; PC:0x25E → 0x260
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4
0x260 D9B4 DRW V9, VB, 0x4   | PC:0x260 → 0x262
```

The repeated lines do not mean that observation duplicated one event.

Each line represents a separate CPU attempt.

The first draw at `0x25C` consumes the currently available vertical-blank opportunity. The CPU then reaches the draw at `0x260` before another display opportunity is available.

Conceptually:

```text
attempt Dxyn
    ↓
vertical blank pending?
    ├── yes
    │     ↓
    │   consume opportunity
    │     ↓
    │   draw
    │     ↓
    │   continue
    │
    └── no
          ↓
        restore PC to current instruction
          ↓
        return normally
          ↓
        retry on a later CPU occurrence
```

While no opportunity is available, the retry leaves the traced `CpuState` unchanged:

```text
before.PC = 0x260
after.PC  = 0x260
```

An Inspection state-change formatter therefore has no CPU-state difference to append:

```text
0x260 D9B4 DRW V9, VB, 0x4
```

Eventually the runtime signals another vertical blank.

The next CPU attempt can consume it and complete the draw:

```text
before.PC = 0x260
after.PC  = 0x262
```

which may be presented as:

```text
0x260 D9B4 DRW V9, VB, 0x4   | PC:0x260 → 0x262
```

### Retry count is timing-dependent

The number of repeated attempts is not part of the `Dxyn` instruction semantics.

It depends on the relative timing and phase of:

```text
CPU frequency
display refresh frequency
```

Conceptually:

```text
CPU:       ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑ ↑
VBlank:    ↑                   ↑
```

If one draw consumes the current opportunity, later CPU attempts may retry several times before the next display boundary occurs.

Different CPU frequencies or scheduling phase relationships can therefore produce different numbers of repeated traces while preserving the same machine semantics.

Core observation exposes those attempts; it does not create them.

See [Runtime and timing architecture](./runtime-and-timing.md) for the deadline-driven scheduling model and vertical-blank production.

### `Fx0A` behaves similarly

The same observation principle applies to a key-wait instruction.

Inspection presentation may look conceptually like:

```text
0x300 F00A LD V0, K
0x300 F00A LD V0, K
0x300 F00A LD V0, K
0x300 F00A LD V0, K
0x300 F00A LD V0, K           | V0:0x00 → 0x0A; PC:0x300 → 0x302
```

While the required keyboard lifecycle is incomplete:

```text
before.PC = 0x300
after.PC  = 0x300
```

so the same instruction appears again on later CPU attempts.

Once the keyboard capability reports a completed key-release sequence, the instruction writes the key value and allows execution to advance.

The runtime itself never enters the paused lifecycle state merely because `Fx0A` is waiting.

See [Instruction execution architecture](./instruction-execution.md) for the retry control-flow semantics and [Machine state and capabilities architecture](./machine-state-and-capabilities.md) for keyboard-state ownership.

### Repetition is diagnostic information

Repeated observations are not noise by definition.

They can reveal:

```text
instruction-level waiting
runtime timing relationships
input dependencies
display synchronization behavior
unexpected retry loops
```

Presentation layers may choose to summarize consecutive equivalent attempts for readability, but that is presentation policy.

For example:

```text
0x260 D9B4 DRW V9, VB, 0x4   × 7
```

could represent seven retained attempts in a compact UI.

The underlying observation/history should still preserve all seven actual attempts when faithful execution history is required.

The distinction is:

```text
Core observation
    → faithfully reports CPU attempts

Inspection history
    → retains those attempts

presentation
    → may organize or summarize them
```

Presentation convenience must not change what Core observed.

## Formatting and Presentation Boundaries

Core observation produces structured execution facts.

Inspection decides how those facts are represented for people.

Applications decide where that representation is presented.

```text
Core
    InstructionTrace
        ↓
Inspection
    InstructionTraceFormatter
        ↓
    text
        ↓
Application
    terminal / browser / file / other output
```

This keeps three responsibilities independent:

```text
observation
    → what happened?

formatting
    → how should it be represented?

output
    → where should it go?
```

Core therefore has no dependency on:

```text
InstructionTraceFormatter
ClassicInstructionTraceFormatter
StateChangeInstructionTraceFormatter
console
terminal output
browser UI
file output
```

All trace formatting belongs to `@chip8nx/inspection`, while host presentation remains application-owned.

### Shared instruction formatting

Trace formatting should not reimplement CHIP-8 assembly syntax.

Successful traces already contain a typed Core `Instruction`, and instruction formatting is shared by static disassembly and runtime trace presentation.

Both capabilities therefore reuse the Inspection-owned `InstructionFormatter`:

```text
Core: Instruction
        ↓
Inspection: InstructionFormatter
        ├── used by Disassembler
        └── used by InstructionTraceFormatter
```

`ClassicInstructionFormatter` remains the single owner of the project's Classic CHIP-8 assembly representation.

For example:

```text
Core Instruction
    ↓
ClassicInstructionFormatter
    ↓
LD V0, 0x42
```

`ClassicInstructionTraceFormatter` then combines that instruction representation with trace-specific facts:

```text
source address
opcode
instruction text
```

to produce:

```text
0x200 6042 LD V0, 0x42
```

The trace formatter consumes semantic Core data rather than decoding opcode bit fields again.

This follows the project-wide rule:

> Decode uncertainty once; downstream consumers operate on semantic data.

### `ClassicInstructionTraceFormatter`

`ClassicInstructionTraceFormatter` belongs to `@chip8nx/inspection`.

It provides a compact human-readable representation of one complete `InstructionTrace`.

For a successful attempt:

```text
0x200 6042 LD V0, 0x42
```

the source address comes from:

```text
trace.before.programCounter
```

and the opcode comes from:

```text
trace.instruction.opcode
```

Those facts are not duplicated in the trace model merely for formatting convenience.

For failed attempts, the formatter uses whatever semantic information Core captured before failure.

Examples include:

```text
0x200 ???? <fetch failed> [RangeError: ...]
0x200 FFFF <decode failed> [InvalidOpcodeError: ...]
0x200 00EE RET [RangeError: ...]
```

These representations correspond naturally to the trace model:

```text
opcode absent
    → fetch did not complete

opcode present
instruction absent
    → decode did not complete

instruction present
    → execution was reached
```

The formatter does not alter, classify, or wrap the original Core execution error. It only renders the available observation for human consumption.

### State-change decoration

CPU-state differences are added by a separate Inspection formatter:

```text
base InstructionTraceFormatter
        ↓
StateChangeInstructionTraceFormatter
        ↓
base text + changed CpuState fields
```

For example:

```text
0x200 6042 LD V0, 0x42       | V0:0x00 → 0x42; PC:0x200 → 0x202
```

The decorator compares:

```text
trace.before
trace.after
```

and emits only changed fields represented by Core `CpuState`.

Current state-change presentation includes:

```text
V0–VF
I
PC
stack
delay timer
sound timer
```

It deliberately does not infer changes to:

```text
Memory
DisplayBuffer
Keyboard
VerticalBlank
other machine resources
```

because those values are not part of `CpuState`.

The formatter therefore respects the same observation boundary as Core rather than pretending an instruction trace is a complete machine snapshot.

### Composition rather than inheritance

`StateChangeInstructionTraceFormatter` wraps another `InstructionTraceFormatter` rather than subclassing `ClassicInstructionTraceFormatter`.

Conceptually:

```text
InstructionTraceFormatter
        ↑
        │ implements
ClassicInstructionTraceFormatter


InstructionTraceFormatter
        ↑
        │ implements
StateChangeInstructionTraceFormatter
        │
        └── wraps another InstructionTraceFormatter
```

This keeps two presentation decisions independent:

```text
How is the base trace represented?

How much CPU-state detail is appended?
```

The current detailed formatter is composed as:

```ts
const formatter = new StateChangeInstructionTraceFormatter(
  new ClassicInstructionTraceFormatter(new ClassicInstructionFormatter()),
);
```

A consumer that wants compact traces can use only:

```ts
new ClassicInstructionTraceFormatter(new ClassicInstructionFormatter());
```

No Core producer changes are required for either presentation.

This is composition around demonstrated variation rather than an inheritance hierarchy tied to one concrete formatter.

### Formatting owns text, not record framing

`InstructionTraceFormatter` returns the text representation of one logical trace record.

It does not own:

```text
trailing newlines
stdout buffering
file framing
terminal cursor behavior
DOM row insertion
UI scrolling
```

Those concerns belong to the output consumer.

For example:

```ts
console.log(formatter.format(trace));
```

lets the Terminal application's chosen output mechanism own line separation.

A browser UI can render the same formatted value inside a table or panel without changing the formatter.

Likewise, a future file-export consumer could choose its own record framing.

### Output remains application-owned

Inspection provides reusable presentation logic, but it does not provide host-specific output policy.

The current Terminal trace composition is conceptually:

```text
Core
    InstructionTrace
        ↓
Terminal observer
        ↓
Inspection formatter
        ↓
text
        ↓
console.log(...)
```

The Terminal application owns the final observer because it decides:

```text
which formatter to compose
where output goes
when trace mode is enabled
how trace output coexists with normal Terminal presentation
```

Neither Core nor Inspection provides a console-specific tracing component.

That is deliberate.

`console.log()` is a host technology, not a CHIP-8 machine or passive-inspection responsibility.

The same reusable observation and Inspection formatting can therefore support different hosts:

```text
Terminal application
    → line-oriented console output

Web application
    → debugger / inspection UI

future desktop application
    → native inspection view

tests
    → direct structured assertions

future export feature
    → file-oriented representation
```

without bringing host APIs into either reusable package.

### Terminal trace mode

The Terminal application's normal presentation uses stdout to render the emulated framebuffer.

That conflicts with a readable line-oriented trace stream.

For the current `--trace` proof of concept, the application therefore replaces normal framebuffer presentation with a no-op presenter while keeping emulation and keyboard input active.

Conceptually:

```text
normal Terminal mode
    → framebuffer presentation

--trace
    → no framebuffer drawing
    → trace lines on stdout
```

This is a host presentation policy.

It does not change:

```text
CPU frequency
timer frequency
display scheduling
keyboard semantics
instruction execution
Core observation
```

Only the way the Terminal application uses its output surface changes.

## Bounded Trace History

`InstructionTraceBuffer` belongs to `@chip8nx/inspection`.

It is a passive implementation of the Core `InstructionTraceObserver` contract:

```text
Core
    InstructionTraceObserver
            ↑
            │ implements
Inspection
    InstructionTraceBuffer
```

Its responsibility is intentionally narrow:

> Retain a bounded chronological history of observed instruction attempts.

It does not produce traces, schedule CPU work, format output, or control execution.

### Bounded retention

The buffer has a fixed positive capacity.

Once full, each newly observed trace replaces the oldest retained trace:

```text
capacity = 3

observe A
    [A]

observe B
    [A B]

observe C
    [A B C]

observe D
    [B C D]
```

This gives consumers predictable memory use even during long-running execution.

The buffer therefore avoids an unbounded:

```text
InstructionTrace[]
```

that would grow for the lifetime of the emulator.

Each retained instruction trace already owns:

```text
before CpuState
after CpuState
```

including copied register and stack collections, so boundedness is particularly important.

### Observation remains constant-time

`observe()` uses ring-buffer semantics.

Conceptually:

```text
next write slot
      ↓
replace / append trace
      ↓
advance write index modulo capacity
```

No retained history needs to be shifted when the buffer is full.

For example, with capacity `3`:

```text
physical storage:

[A, B, C]
 ↑
 next write wraps here
```

After observing `D`:

```text
[D, B, C]
    ↑
    next write
```

The physical storage is no longer chronological, but the intended complexity remains:

```text
observe(trace)
    → O(1)

snapshot()
    → O(n)
```

where `n` is the number of currently retained traces.

This is a useful fit for the observation path because synchronous observer work should remain small and predictable.

The trade-off is deliberate:

> Recording should remain inexpensive; inspection may pay the cost of producing an ordered view.

### Snapshot order

Consumers should not need to understand ring-buffer storage layout.

`snapshot()` therefore returns traces in chronological order:

```text
oldest
  ↓
...
  ↓
newest
```

For example, after:

```text
capacity = 3
observe A
observe B
observe C
observe D
```

the physical storage may be:

```text
[D, B, C]
```

while the logical snapshot is:

```text
[B, C, D]
```

### History snapshot ownership

Each call to `snapshot()` returns a fresh array.

Consumers may therefore retain, sort, or otherwise manipulate the returned collection without mutating the buffer's internal storage.

The traces themselves are not copied again:

```text
buffer storage
    ── trace object ──┐
                     ├── snapshot
                     └── later snapshot
```

This is safe because `InstructionTrace` values are structured as immutable observations and their `CpuState` snapshots do not expose live mutable CPU collections.

The ownership rule is:

```text
fresh collection
shared immutable trace values
```

This avoids duplicating the already-copied CPU snapshots stored inside every trace.

### Clearing history

`clear()` removes all retained trace references while preserving the configured capacity.

After:

```text
buffer.clear()
```

the state becomes:

```text
size = 0
capacity = unchanged
snapshot() = []
```

Clearing history has no machine-level meaning.

It does not:

```text
reset CPU state
reset runtime scheduling
reset memory
reset keyboard state
```

It only changes state owned by the Inspection buffer.

Releasing the old backing references also ensures that discarded trace history is not unnecessarily retained.

### Successful and failed traces are retained identically

The history buffer stores the common `InstructionTrace` union.

It does not distinguish between:

```text
SuccessfulInstructionTrace
FailedInstructionTrace
```

for retention purposes.

A history may therefore naturally end with:

```text
success
success
success
failure
```

Failure interpretation belongs to consumers of the trace model, not to the storage algorithm.

### The buffer remains purely observational

`InstructionTraceBuffer.observe()` does not feed information back into the CPU.

It does not:

```text
pause execution
request retries
change scheduler state
modify trace records
filter machine behavior
```

It merely retains the observation it receives.

The rule remains:

> History may observe execution; history must not control execution.

### Capacity is local Inspection configuration

The buffer capacity is validated when the buffer is constructed and remains fixed for that instance.

A positive safe integer is required.

Invalid examples include:

```text
0
-1
1.5
NaN
Infinity
Number.MAX_SAFE_INTEGER + 1
```

Capacity is not part of:

```text
Chip8Profile
Chip8RuntimeConfiguration
machine state
```

because it describes passive inspection storage policy rather than CHIP-8 machine semantics.

Different applications can therefore choose different history sizes without changing the emulated machine.

### Buffering is not debugger state

`InstructionTraceBuffer` is useful to a debugger UI, but bounded history alone is not debugger control state.

It does not know about:

```text
breakpoints
current selection
pause reasons
watch conditions
step-over state
execution-control commands
```

A Web inspection panel may, for example, compose:

```text
Core CPU observation
        ↓
Inspection InstructionTraceBuffer
        ↓
Web UI reads snapshot()
        ↓
render recent attempts
```

The buffer remains reusable because nothing in that flow makes it aware of the browser or of debugger policy.

### Why history belongs to Inspection

Core owns the signal because only `Cpu` can authoritatively describe the instruction attempt.

Retention is a different responsibility.

The machine does not require instruction history to execute correctly:

```text
Core without history
    → valid emulator

Core + Inspection history
    → same emulator
      + passive retained observations
```

That makes bounded history a consumer of machine semantics rather than part of the machine itself.

## Verification Strategy

Tracing is verified at the boundary that owns each behavior.

### Core CPU-observation tests

Core tests verify the semantics of producing an `InstructionTrace` from `Cpu.step()`.

They cover behavior such as:

- successful instruction attempts;
- fetch, decode, and execution failures;
- real `before` and `after` CPU state;
- preservation of the original execution error;
- retry-style instruction attempts;
- no trace snapshots when no observer is configured;
- observer failure isolation;
- the same CPU semantics with observation enabled or disabled.

These are Core responsibilities because they describe what the CPU observes and guarantees while executing an instruction attempt.

#### Successful and retry attempts

For successful attempts, tests verify that observation captures:

```text
decoded Instruction
before CpuState
after CpuState
```

and that the snapshots reflect the real attempt boundary.

Retry cases such as `Fx0A` are especially important.

A retry is expected to produce a normal successful trace even when:

```text
before.PC = current instruction
after.PC  = current instruction
```

because retry is normal control flow rather than an exception.

This protects the rule:

> Core observes CPU attempts, not merely instructions that advance.

#### Fetch failure

A fetch failure occurs before a complete opcode can be assembled.

The expected failed trace contains:

```text
opcode       absent
instruction  absent
before       available
after        available
error        original fetch error
```

This proves that partial fetch state is not misrepresented as a complete instruction.

#### Decode failure

A decode failure occurs after the opcode is known but before an `Instruction` exists.

The expected failed trace contains:

```text
opcode       present
instruction  absent
```

and verifies the current CPU ordering:

```text
before.PC = source address
after.PC  = source address + 2
```

because `Cpu.step()` advances the program counter before decoding.

#### Execution failure

An execution failure occurs after decoding succeeds.

The failed trace therefore retains:

```text
opcode
Instruction
before
after
error
```

This is important because execution is not transactional; the `after` snapshot must describe actual resulting CPU state rather than an imagined rollback.

#### Exact error preservation

One of the strongest observation tests verifies object identity of the execution error.

Conceptually:

```text
CPU raises error E
    ↓
FailedInstructionTrace.error = E
    ↓
observer throws another error
    ↓
Cpu.step() still throws E
```

The test checks that the error rethrown from `Cpu.step()` is the exact same object stored in the failed trace.

This protects two guarantees simultaneously:

```text
observation does not wrap execution errors
observer errors cannot replace execution errors
```

#### Observer non-interference

A separate CPU test verifies that an observer throwing during a successful attempt does not turn that instruction into an execution failure.

The resulting machine state must match the state produced without the observer failure.

This is direct evidence for the architectural invariant:

```text
observation enabled
    =
observation disabled
```

with respect to emulated behavior.

### Core public observation contract

`packages/core/tests/integration/instruction-observation-public-api.test.ts` verifies that an external consumer can use the public:

```text
InstructionTrace
InstructionTraceObserver
Cpu
```

observation contract without importing private Core implementation files.

The integration test intentionally remains narrow. Detailed trace semantics belong to the CPU unit tests rather than being duplicated through a large public-API composition test.

### Inspection trace-buffer tests

`InstructionTraceBuffer` is tested independently from `Cpu`.

The buffer contract begins at:

```text
observe(trace)
```

so constructing a complete emulator would make those tests broader than necessary.

Current coverage includes:

```text
invalid capacity rejected
size and capacity
oldest-to-newest snapshot order
oldest trace discarded when full
multiple wraparound writes
fresh snapshot arrays
shared immutable trace identities
clear() removes history
capacity survives clear()
success and failure retained identically
```

The identity assertions intentionally prove two ownership rules:

```text
snapshot array
    → new object

InstructionTrace
    → same immutable object retained by buffer
```

These are Inspection responsibilities because history is a consumer of observations rather than part of CPU execution.

### Inspection formatter tests

Trace formatter tests operate directly on structured Core trace values.

They do not execute the CPU.

`ClassicInstructionTraceFormatter` tests verify:

```text
successful instruction representation
fetch failure without opcode
decode failure with opcode
execution failure with decoded instruction
error rendering
```

The successful case also proves that instruction syntax is delegated through `InstructionFormatter` rather than reimplemented in trace formatting.

`StateChangeInstructionTraceFormatter` is tested with a small fake base formatter.

That isolates its responsibility:

```text
compare before / after CpuState
        ↓
append only changed fields
```

Tests cover:

```text
registers
I
PC
stack
delay timer
sound timer
```

and current presentation conventions such as:

```text
aligned base column
" → " state-change separator
"; " between multiple changes
```

When no CPU-state field changes, the decorator returns the base formatter output unchanged.

The decorator is also tested against failed traces, proving that state-change presentation depends on `before` and `after`, not on execution outcome.

### Public package composition

`packages/inspection/tests/integration/inspection-public-api.test.ts` proves runtime inspection through public package APIs:

```text
@chip8nx/core
    SuccessfulInstructionTrace
    InstructionTraceObserver
          ↓
@chip8nx/inspection
    InstructionTraceBuffer
    ClassicInstructionTraceFormatter
    StateChangeInstructionTraceFormatter
```

It also exercises public Core branded-value factories such as:

```text
address()
byte()
opcode()
registerIndex()
```

when constructing typed trace fixtures.

This proves that Inspection and external consumers can use Core's observation model without bypassing Core domain types or reaching into private source paths.

Together, the Core and Inspection integration tests protect the architectural rule:

```text
Core defines observation
        ↓
Inspection consumes observation

never:

Core
    ↓
Inspection implementation
```

### Application-level behavior

Host-specific trace behavior remains application-tested where appropriate.

For example, the Terminal application owns:

```text
--trace option handling
formatter composition
console output
framebuffer-presentation policy
```

Those concerns should not migrate into Core or Inspection tests merely because they consume reusable tracing capabilities.

### Test at the narrowest owning boundary

The overall verification rule is:

> Test observation production where CPU attempts happen, formatting where text is produced, storage where history is retained, and package composition through the public APIs.

Examples:

```text
before/after snapshots
    → Core Cpu observation test

observer failure isolation
    → Core Cpu observation test

decode-failure text
    → Inspection Classic trace formatter test

state-difference text
    → Inspection state-change formatter test

ring-buffer wraparound
    → Inspection InstructionTraceBuffer test

external Core observation contract
    → Core public API integration test

Core + Inspection composition
    → Inspection public API integration test
```

This keeps failures easy to diagnose and prevents the Terminal proof of concept from becoming the only evidence that tracing works.

Taken together, the tests protect four central properties:

```text
fidelity
    → traces describe the attempts that actually occurred

non-interference
    → observation cannot change CPU behavior or replace execution errors

separation
    → production, formatting, storage, and composition are tested at
      their owning boundaries

boundedness
    → retained history cannot grow without limit
```

## Design Summary

The tracing architecture follows these stable rules:

1. **One trace represents one CPU attempt.**
   `Cpu.step()` owns the fetch/decode/execute observation boundary; the runtime owns when scheduled attempts occur.

2. **Observation is optional and non-interfering.**
   Without an observer, the CPU creates no trace snapshots. Observer failures cannot alter machine behavior or replace execution errors.

3. **Trace records preserve semantic execution data.**
   Success and failure are explicit variants, decoded instructions are retained when available, and `before` / `after` describe actual CPU state rather than an imagined transactional rollback.

4. **CPU snapshots are intentionally scoped.**
   `CpuState` captures CPU-visible state, not complete memory, display, input, or runtime state.

5. **Core owns the probe and signal.**
   `InstructionTrace` and `InstructionTraceObserver` belong to `@chip8nx/core`.

6. **Passive consumers live in Inspection.**
   Formatting and bounded history belong to `@chip8nx/inspection`; Core has no dependency on those tools.

7. **Presentation remains application-owned.**
   Console output, DOM rendering, files, and other host presentation stay outside both reusable packages.

8. **History is bounded and observational.**
   `InstructionTraceBuffer` uses constant-time ring-buffer writes, produces chronological snapshots on demand, and never controls execution.

9. **Retries remain visible.**
   Waiting `Fx0A` and vblank-gated `Dxyn` attempts are preserved individually even when presentation later chooses to summarize them.

10. **Public boundaries are executable architecture.**
    Core observation and Core-plus-Inspection composition are verified separately through their public APIs.

Together these rules provide enough observability for diagnostics and interactive inspection without making tracing itself a debugger or execution controller.

## Deliberately Deferred Debugger Features

Tracing provides observation, not execution control.

Neither Core CPU observation nor the current Inspection package owns:

```text
breakpoints
watchpoints
pause conditions
step-over
step-out
conditional execution
pause reasons
debugger session state
```

Core already provides generic runtime mechanisms such as:

```text
pause()
resume()
step()
isPaused
```

Those mechanisms remain machine/runtime capabilities.

A future debugger would provide reusable policy that decides **when and why** those mechanisms should be used.

For example:

```text
InstructionTrace
      ↓
breakpoint policy
      ↓
should execution pause?
      ↓
Chip8Runtime.pause()
```

That policy does not exist yet, so Chip8NX does not create a debugger package merely to reserve a place for it.

The trigger for a reusable debugger layer should be demonstrated execution-control behavior that applications would otherwise duplicate.

Likely examples include:

```text
breakpoint evaluation
watch conditions
step-over / step-out semantics
shared pause-reason modeling
```

When that need appears, its dependencies should be chosen from the actual behavior.

It may depend on Core alone, or it may also reuse Inspection capabilities. The project should not force a decorative:

```text
Core → Inspection → Debugger
```

layering model in advance.

The hard requirement remains:

```text
Core ──X──> debugger
```

Core machine semantics must not acquire debugger policy.

## Future Observation and Inspection Needs

The current model intentionally stops short of a general event/debugging framework.

### Trace filtering

Core does not currently provide filters such as:

```text
only failures
only one address range
only drawing instructions
only register writes
```

An application or UI can filter a chronological Inspection snapshot today.

If several consumers later need identical reusable filtering semantics, that would become demonstrated pressure for an Inspection-level capability.

Filtering should not become CPU behavior.

### Observer fan-out

`Cpu` currently accepts one optional `InstructionTraceObserver`.

The architecture does not yet provide:

```text
CompositeInstructionTraceObserver
observer list
event bus
subscription registry
```

If real consumers need simultaneous sinks such as:

```text
history buffer
live presentation
breakpoint evaluation
persistent recorder
```

fan-out will become demonstrated composition pressure.

Until then, one observer keeps the Core dependency small.

Whether reusable fan-out ultimately belongs in Core, Inspection, debugger tooling, or an application should be decided from the actual required semantics rather than from the generic usefulness of an event bus.

### Timestamps and sequence numbers

`InstructionTrace` currently describes CPU execution semantics.

It does not contain:

```text
wall-clock time
runtime timestamp
scheduler deadline
global sequence number
```

Adding timestamps would require deciding which timing model is meaningful:

```text
host time
scheduler time
emulated time
```

A sequence number is a different concern: it could describe CPU-attempt order without introducing time.

Neither is currently required.

CPU observation and runtime timing remain separate architectural concerns until a real consumer demonstrates a reason to join them.

### Memory and display observation

`CpuState` does not snapshot:

```text
Memory
DisplayBuffer
VerticalBlank
Keyboard
```

The current instruction observation therefore cannot directly describe every machine-side effect of instructions such as:

```text
CLS
DRW
Fx33
Fx55
```

Future inspection or debugger requirements may justify:

```text
memory access events
display mutation events
machine-state snapshots
resource-specific observation
```

Those should be modeled around the component that authoritatively owns the relevant event rather than inflating every `InstructionTrace` with complete machine state.

A useful first question is:

> Which component authoritatively owns the event being observed?

For example:

```text
CPU instruction attempt
    → Cpu observation

memory mutation
    → potentially Memory observation

runtime deadline occurrence
    → potentially runtime / scheduler observation
```

Separate observation seams may be more accurate than turning one instruction trace into a complete emulator-event model.

### Persistent trace recording

`InstructionTraceBuffer` is in-memory and bounded.

Neither Core nor Inspection currently provides:

```text
trace files
JSON export
binary trace format
streaming persistence
```

Persistence introduces file format, compatibility, versioning, lifecycle, and potentially asynchronous I/O concerns.

Those are separate from observing one CPU attempt or retaining a bounded in-memory history.

A future export feature would most naturally remain outside Core, with exact ownership determined by the required reuse.

### Search and history queries

`InstructionTraceBuffer` intentionally provides only a small history API:

```text
observe
size
capacity
snapshot
clear
```

It does not provide:

```text
latest()
find()
search()
range()
slice-by-address()
```

Consumers can perform ordinary array operations on the chronological snapshot.

A richer reusable query API should appear only if real inspection/debugger usage demonstrates that those operations deserve their own abstraction.

### Retry summarization

Core preserves repeated retry attempts individually.

Inspection history preserves those attempts individually.

A UI may summarize consecutive attempts for readability, but the underlying observation/history should continue to preserve the original attempts whenever faithful execution history is required.

### Trace-driven replay

Tracing is not intended to reproduce execution.

Current trace records do not capture enough complete machine state or external inputs to guarantee deterministic replay.

A replay system would need to define ownership of:

```text
keyboard events
RNG values
timing
memory mutations
display state
initial machine image
```

That is a substantially different feature from observational tracing.

## Evolution Guideline

When extending tracing and observation, prefer this order:

```text
real inspection / debugging need
        ↓
identify the authoritative producer
        ↓
emit the smallest useful semantic signal
        ↓
keep passive consumers outside the producer
        ↓
introduce reusable control policy only when demonstrated
```

The guiding rules are:

> Core owns the probe and the signal; everything that stores, interprets, displays, or acts on that signal lives outside Core.

and:

> Abstract demonstrated variation and demonstrated composition pressure, not hypothetical future needs.

These rules keep observation useful without allowing diagnostics to become a hidden dependency of machine execution.

## Current Scope

The current architecture is intentionally limited to:

```text
Core
    optional CPU-attempt observation
    faithful success / failure records
    CPU-state snapshots
    observer non-interference

Inspection
    composable human-readable formatting
    bounded in-memory trace history

Applications
    host-specific presentation
```

That is sufficient to support the next interactive inspection/UI phase without pre-designing the debugger itself.
