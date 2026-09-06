# Tracing Architecture

Chip8NX tracing observes CPU instruction attempts without participating in
execution semantics.

At a high level:

```text
Cpu.step()
    ↓
instruction attempt
    ↓
InstructionTrace
    ↓
optional InstructionTraceObserver
    ├── formatting / console output
    └── bounded trace history
```

The central rule is:

> Tracing is purely observational. Enabling, disabling, or failing to observe a
> trace must not change emulated machine behavior.

Tracing therefore remains separate from:

- instruction execution;
- runtime scheduling;
- formatting;
- output;
- history presentation;
- debugger control such as breakpoints.

See also:

- [Architecture overview](./overview.md)
- [Instruction execution architecture](./instruction-execution.md)
- [Runtime and timing architecture](./runtime-and-timing.md)
- [Machine state and capabilities architecture](./machine-state-and-capabilities.md)
- [Disassembly architecture](./disassembly.md)

## Responsibility Model

Tracing observes one **CPU instruction attempt**.

That distinction is important because one CPU attempt does not necessarily mean
one completed instruction.

For example, Classic CHIP-8 instructions such as:

```text
Fx0A
Dxyn
```

may deliberately retry by restoring the program counter to the address of the
current instruction.

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

This boundary belongs at `Cpu.step()` because the CPU owns the complete
fetch/decode/execute attempt.

`Chip8Runtime` determines **when** CPU attempts occur, but it does not own the
semantics of those attempts.

The distinction is:

```text
Chip8Runtime
    → when Cpu.step() occurs

Cpu
    → what one instruction attempt does

Tracing
    → what was observed about that attempt
```

This also means instruction tracing is available independently of normal
scheduled execution. Manual stepping and any future direct CPU consumers observe
the same execution boundary.

## Optional Observation

Tracing is an optional CPU dependency.

Conceptually:

```text
tracing disabled
    ↓
normal CPU execution

tracing enabled
    ↓
normal CPU execution
    +
immutable observations
```

When no observer is configured, the CPU does not create trace snapshots.

Tracing therefore carries no trace-snapshot cost unless an observer is
configured. History storage adds cost only when a history observer such as
`InstructionTraceBuffer` is used.

The desired behavioral invariant is:

```text
machine behavior with tracing disabled
    =
machine behavior with tracing enabled
```

except for the externally visible trace observations themselves.

## Non-Interference

Trace observers are diagnostic collaborators rather than execution
collaborators.

If an observer throws while processing a trace, that failure is isolated and
must not become a CPU execution failure.

Likewise, when the CPU attempt itself fails:

```text
CPU throws original error
        ↓
failed trace is observed
        ↓
observer may itself fail
        ↓
original CPU error is still rethrown
```

This is intentionally different from semantic collaborators such as:

```text
Memory
Decoder
InstructionExecutor
Stack
```

Errors from those collaborators describe execution failure and therefore
propagate normally.

An observer failure describes only a failure to observe execution.

The rule is:

> Observation may fail; emulation must not fail because observation failed.

## Structured Data Before Presentation

Core tracing produces structured trace records rather than formatted strings.

```text
CPU attempt
    ↓
InstructionTrace
    ↓
formatter
    ↓
text
    ↓
console / UI / future output
```

The trace record contains semantic execution information.

It does not contain:

```text
formatted instruction text
terminal output
newlines
console behavior
UI state
```

Formatting and output remain downstream concerns.

This follows the same architectural principle used by disassembly:

> Preserve semantic information first; derive presentation from it afterward.

Trace consumers therefore never need to re-decode an opcode in order to
understand a successfully decoded instruction.

## Trace Data Model

One CPU attempt produces an `InstructionTrace`.

The trace model is a discriminated union:

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
    → CPU state immediately after the attempt returned or failed
```

The `outcome` discriminator lets consumers distinguish the variants without
casts or speculative optional-field checks:

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

"Successful" here means that the CPU attempt returned normally.

It does not necessarily mean that the instruction completed its semantic work.

For example, `Fx0A` and vblank-gated `Dxyn` may deliberately restore the program
counter and return so that the same instruction can be attempted again later.
Those retries are successful trace records because they are normal execution
outcomes rather than exceptions.

The decoded `Instruction` already retains its original `Opcode`, so successful
traces do not duplicate either:

```text
source address
    → before.programCounter

opcode
    → instruction.opcode
```

This keeps one authoritative representation of each fact.

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

The optional opcode and instruction describe how far the attempt progressed
before failing:

```text
opcode absent
    → a complete opcode was not assembled

opcode present
instruction absent
    → fetch completed, but decoding did not complete

instruction present
    → decoding completed and execution was reached
```

This avoids adding a separate `"fetch" | "decode" | "execute"` stage field when
the existing semantic data already expresses that distinction.

The stored `error` is the original error raised by the CPU attempt.

Tracing does not wrap or replace it.

### `before` and `after` describe actual CPU state

The trace snapshots record what the CPU state actually was at the two
observation points.

That matters because CPU execution is not transactional.

For example, the CPU advances the program counter before decoding:

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

A failed trace therefore preserves the real post-failure CPU state rather than
pretending that execution rolled back.

Likewise, an execution failure may occur after some state has already changed.
The `after` snapshot describes the resulting CPU state even though the attempt
ultimately threw.

### `CpuState` is intentionally CPU-focused

`CpuState` contains:

```text
V0–VF
I
PC
stack
delay timer
sound timer
```

Its mutable collections are copied when the snapshot is created, so later
machine execution cannot modify an existing trace snapshot.

However, `CpuState` is not a complete machine snapshot.

It deliberately does not contain:

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

They do not mean:

> Complete emulator state before and after the attempt.

For example, `CLS` may modify the display while producing no CPU-state change
other than normal program-counter advancement. `Fx55` may modify memory even
though memory contents are not represented in the trace snapshots.

The tracing model does not introduce a larger machine snapshot merely to make
instruction traces appear comprehensive. Memory, display, input, or runtime
event tracing are separate observability concerns and should be introduced only
when a real consumer requires them.

### Trace snapshot ownership

A trace owns immutable observation values rather than references to live mutable
CPU collections.

Conceptually:

```text
live CPU state
    ↓
Cpu.snapshot()
    ↓
immutable CpuState
    ↓
InstructionTrace
```

This makes a trace suitable for:

```text
formatting
bounded history
tests
future debugger presentation
```

without giving those consumers ownership of the running machine.

## Retry Semantics and Repeated Trace Lines

A trace records CPU **attempts**, not only instructions that advance to a new
program counter.

That means the same instruction address may legitimately appear several times
in succession.

The most visible current examples are:

```text
Dxyn
    → may wait for a vertical-blank opportunity

Fx0A
    → may wait for the required key press/release lifecycle
```

In both cases, retry is expressed by restoring the program counter to the
current instruction address and returning normally from the executor.

The runtime remains active and later CPU occurrences attempt the same
instruction again.

### Repeated `Dxyn` traces

Consider this real trace:

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

This does not mean the tracer duplicated one event.

Each line represents a separate CPU attempt.

The first draw at `0x25C` consumes the currently available vertical-blank
opportunity.

The CPU then reaches the draw at `0x260` before another display opportunity is
available.

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

While no opportunity is available, the retry leaves the traced `CpuState`
unchanged:

```text
before.PC = 0x260
after.PC  = 0x260
```

The state-change formatter therefore has nothing to append:

```text
0x260 D9B4 DRW V9, VB, 0x4
```

Eventually the runtime signals another vertical blank.

The next attempt can consume it and complete the draw:

```text
before.PC = 0x260
after.PC  = 0x262
```

which appears as:

```text
0x260 D9B4 DRW V9, VB, 0x4   | PC:0x260 → 0x262
```

### Retry count is timing-dependent

The number of repeated attempts is not part of the `Dxyn` instruction
semantics.

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

If one draw consumes the current opportunity, later CPU attempts may retry
several times before the next display boundary occurs.

Different CPU frequencies or different scheduling phase relationships can
therefore produce a different number of repeated trace lines while preserving
the same machine semantics.

Tracing exposes those attempts; it does not create them.

See [Runtime and timing architecture](./runtime-and-timing.md) for the
deadline-driven scheduling model and vertical-blank production.

### `Fx0A` behaves similarly

The same tracing principle applies to a key-wait instruction.

A trace may look conceptually like:

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

Once the keyboard capability reports a completed key-release sequence, the
instruction writes the key value and allows execution to advance.

The runtime itself never enters the paused lifecycle state merely because
`Fx0A` is waiting.

See [Instruction execution architecture](./instruction-execution.md) for the
retry control-flow semantics and
[Machine state and capabilities architecture](./machine-state-and-capabilities.md)
for keyboard-state ownership.

### Repetition is diagnostic information

Repeated trace lines are therefore not noise by definition.

They can reveal:

```text
instruction-level waiting
runtime timing relationships
input dependencies
display synchronization behavior
unexpected retry loops
```

A future debugger may summarize consecutive identical attempts for
readability, but that is a **presentation policy**. The underlying trace stream
should continue to preserve each actual CPU attempt so that observability
remains faithful to execution.

## Formatting and Presentation Boundaries

Tracing produces structured execution observations.

Formatting decides how those observations are represented for people.

Output decides where that representation goes.

The architecture therefore separates:

```text
InstructionTrace
    ↓
InstructionTraceFormatter
    ↓
text
    ↓
application-owned output
```

This avoids coupling Core tracing to:

```text
console
terminal
file system
browser UI
debugger widgets
```

### Shared instruction formatting

A trace formatter should not reimplement CHIP-8 assembly syntax.

Successful traces already contain a decoded `Instruction`, and instruction
formatting is a concern shared by both disassembly and tracing.

The dependency direction is:

```text
ClassicInstructionTraceFormatter
        ↓
InstructionFormatter
        ↓
Instruction
```

This lets `ClassicInstructionFormatter` remain the single owner of Classic
instruction syntax.

For example:

```text
Instruction
    ↓
ClassicInstructionFormatter
    ↓
LD V0, 0x42
```

The trace formatter then composes that instruction text with execution-specific
context such as source address and opcode:

```text
0x200 6042 LD V0, 0x42
```

Trace formatting therefore consumes the typed instruction rather than
re-decoding opcode fields.

This follows the same rule used throughout the Core:

> Decode uncertainty once; downstream consumers operate on semantic data.

### Classic trace representation

`ClassicInstructionTraceFormatter` formats one complete trace record.

For a successful trace:

```text
0x200 6042 LD V0, 0x42
```

The source address comes from:

```text
trace.before.programCounter
```

and the opcode comes from:

```text
trace.instruction.opcode
```

Those facts are not duplicated in the trace model merely for formatting
convenience.

For failed attempts, the formatter uses whatever semantic information became
available before failure.

Examples include:

```text
0x200 ???? <fetch failed> [RangeError: ...]
0x200 FFFF <decode failed> [InvalidOpcodeError: ...]
0x200 00EE RET [RangeError: ...]
```

The representation reflects three different failure points:

```text
no opcode
    → fetch did not complete

opcode but no instruction
    → decode did not complete

instruction available
    → execution was reached
```

The formatter does not alter or wrap the stored execution error; it only
renders it for human consumption.

### State-change decoration

CPU-state differences are formatted by a separate decorator:

```text
base trace formatter
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

and emits only changed CPU-state fields.

Current state-change presentation includes:

```text
V0–VF
I
PC
stack
delay timer
sound timer
```

The formatter deliberately does not attempt to infer changes to memory,
display, keyboard, vertical blank, or other machine resources that are not part
of `CpuState`.

This is another consequence of the trace model being CPU-focused rather than a
complete machine snapshot.

### Composition rather than inheritance

The state-change formatter wraps another `InstructionTraceFormatter` rather
than subclassing `ClassicInstructionTraceFormatter`.

Conceptually:

```text
InstructionTraceFormatter
        ↑
        │
ClassicInstructionTraceFormatter

StateChangeInstructionTraceFormatter
        ↓
wraps any InstructionTraceFormatter
```

This keeps two presentation decisions independent:

```text
How is the base trace written?
How much CPU-state detail should be appended?
```

The result is formatter composition:

```ts
const formatter = new StateChangeInstructionTraceFormatter(
  new ClassicInstructionTraceFormatter(
    new ClassicInstructionFormatter(),
  ),
);
```

A compact trace can use only the base formatter.

A more detailed trace can decorate it.

No tracing producer changes are required.

### Formatting owns text, not record framing

A formatter returns one logical trace line as text.

It does not own:

```text
trailing newline
stdout buffering
file framing
terminal cursor behavior
UI row insertion
```

Those concerns belong to the output consumer.

For example:

```ts
console.log(formatter.format(trace));
```

lets `console.log()` own line separation.

A future file writer could choose its own framing convention without requiring
formatter changes.

### Output remains application-owned

The first tracing proof of concept lives in the Terminal application.

Its observer performs:

```text
trace
    ↓
traceFormatter.format(trace)
    ↓
console.log(...)
```

Core does not provide a console-specific trace observer.

That is deliberate.

`console.log()` is a host technology, not a CHIP-8 tracing responsibility.

Keeping it in the application means the same Core trace model and formatters can
later support:

```text
terminal output
debugger history
browser UI
file export
tests
other presentation layers
```

without introducing host APIs into `packages/core`.

### Terminal trace mode

The Terminal application's normal presentation uses stdout to render the
emulated framebuffer.

That conflicts with a readable line-oriented trace stream.

For the current `--trace` proof of concept, the application therefore replaces
the normal framebuffer presentation with a no-op presentation while keeping
emulation and keyboard input active.

Conceptually:

```text
normal Terminal mode
    → framebuffer presentation

--trace
    → no framebuffer drawing
    → trace lines on stdout
```

This is a host-level presentation choice.

It does not change:

```text
CPU frequency
timer frequency
display scheduling
keyboard semantics
instruction execution
trace production
```

The trace consumer merely chooses a different way to use the Terminal's output
surface.

### Presentation can summarize without changing observation

Formatting and UI layers may eventually choose to make trace output more compact.

For example, a debugger might visually summarize several identical retry
attempts as:

```text
0x260 D9B4 DRW V9, VB, 0x4   × 7
```

That would be valid presentation behavior as long as the underlying trace
history still contains all seven actual CPU attempts.

The distinction is:

```text
trace model
    → faithful execution observations

presentation
    → may organize or summarize those observations
```

Presentation convenience must not change what the tracer records.

## Bounded Trace History

Live trace output is useful for observing execution as it happens, but a debugger
also needs to inspect recent execution after the fact.

`InstructionTraceBuffer` provides that capability.

Its responsibility is deliberately narrow:

> Retain the most recent N immutable instruction traces in execution order.

Conceptually:

```text
InstructionTraceObserver
        ↑
InstructionTraceBuffer
        ↓
bounded chronological history
```

The buffer is both:

```text
observer
    → consumes InstructionTrace values

history store
    → exposes retained traces for later inspection
```

It does not format traces, control execution, or decide how history is presented.

### Why history is bounded

CPU tracing can produce observations indefinitely.

An unbounded history such as:

```text
traces.push(trace)
```

would make long-running tracing consume memory without limit.

That would be especially expensive because each instruction trace already owns:

```text
before CpuState
after CpuState
```

including copied register and stack collections.

The buffer therefore has a fixed positive capacity:

```text
capacity = maximum retained traces
```

Once full, observing a new trace discards the oldest one.

For capacity `3`:

```text
observe A
observe B
observe C

history:
[A, B, C]
```

then:

```text
observe D

history:
[B, C, D]
```

and:

```text
observe E

history:
[C, D, E]
```

This gives tracing predictable memory usage.

### Ring-buffer storage

The implementation uses ring-buffer semantics rather than shifting an array
every time the buffer is full.

When capacity is reached, the next observation overwrites the oldest physical
slot.

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

The physical array is no longer chronological, but observation remains cheap:

```text
observe()
    → O(1)
```

That matters because `observe()` runs on the CPU execution path whenever the
buffer is configured as a trace observer.

Chronological reconstruction is deferred until somebody asks to inspect the
history.

### Chronological snapshots

`InstructionTraceBuffer.snapshot()` returns retained traces from oldest to
newest regardless of physical storage order.

For the physical example:

```text
[D, B, C]
```

the logical snapshot is:

```text
[B, C, D]
```

The operation is therefore:

```text
snapshot()
    → O(n)
```

This is an intentional trade-off:

> Recording should remain inexpensive; inspection may pay the cost of producing
> an ordered view.

A debugger normally inspects history far less frequently than the CPU records
individual attempts.

### History snapshot ownership

Each call to `snapshot()` returns a new array.

The caller therefore cannot mutate the buffer's internal storage by modifying
the returned container.

Conceptually:

```text
internal mutable ring storage
        ↓
snapshot()
        ↓
new chronological array
```

The contained `InstructionTrace` objects themselves are shared rather than
copied again.

That is safe because trace records are immutable observation values.

The ownership model is:

```text
snapshot array
    → copied container

InstructionTrace values
    → safely shared immutable records
```

This avoids duplicating the already-copied CPU snapshots stored inside every
trace.

### Clearing history

`clear()` removes all retained traces while preserving the configured capacity.

After:

```text
buffer.clear()
```

the state becomes:

```text
size = 0
capacity unchanged
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

It only changes the local state owned by the history buffer.

That makes it suitable for debugger operations such as:

```text
"clear trace history"
```

without affecting emulation.

### Successful and failed traces are retained identically

The history buffer stores the common `InstructionTrace` union.

It does not distinguish between:

```text
SuccessfulInstructionTrace
FailedInstructionTrace
```

for retention purposes.

A history may therefore naturally end with a failure:

```text
success
success
success
failure
```

which is often exactly the history a debugger needs when execution terminates
unexpectedly.

Failure interpretation belongs to consumers of the trace model, not to the
storage algorithm.

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

This preserves the same non-interference rule as every other tracing consumer:

> History may observe execution; history must not control execution.

### Capacity is local configuration

The buffer capacity is validated when the buffer is constructed and remains
fixed for that instance.

A positive safe integer is required.

The capacity is not part of:

```text
Chip8Profile
Chip8RuntimeConfiguration
machine state
```

because it describes debugger/observability storage policy rather than CHIP-8
machine semantics.

Different applications can therefore choose different history sizes without
changing the emulated machine.

## Testing and Verification

Tracing is verified at the boundary that owns each behavior.

The current test layers are:

```text
Cpu tracing tests
    → production of trace records
    → failure preservation
    → observer isolation
    → retry visibility

Trace formatter tests
    → human-readable representation
    → failure rendering
    → state-change decoration

InstructionTraceBuffer tests
    → bounded retention
    → chronological snapshots
    → clear semantics

Public API integration test
    → supported tracing composition through packages/core/mod.ts
```

This mirrors the architecture rather than testing every behavior through one
large end-to-end scenario.

### CPU tracing collaboration tests

CPU tracing tests verify the producer boundary at `Cpu.step()`.

They cover successful attempts and failed attempts separately.

For successful attempts, the tests verify that tracing captures:

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

> Tracing observes CPU attempts, not merely instructions that advance.

### Failure-stage coverage

CPU tracing tests verify failures at all three meaningful stages.

#### Fetch failure

A fetch failure occurs before a complete opcode can be assembled.

The expected failed trace contains:

```text
opcode      absent
instruction absent
before      available
after       available
error       original fetch error
```

This proves that partial fetch state is not misrepresented as a complete
instruction.

#### Decode failure

A decode failure occurs after the opcode is known but before an `Instruction`
exists.

The expected failed trace contains:

```text
opcode      present
instruction absent
```

and also verifies the current CPU ordering:

```text
before.PC = source address
after.PC  = source address + 2
```

because the CPU advances the program counter before decoding.

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

This is important because execution is not transactional; the `after` snapshot
must describe the actual resulting CPU state rather than an imagined rollback.

### Exact error preservation

One of the strongest tracing tests verifies object identity of the execution
error.

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

The test checks that the error returned from `Cpu.step()` is the exact same
object stored in the failed trace.

This protects two guarantees simultaneously:

```text
tracing does not wrap execution errors
observer errors cannot replace execution errors
```

### Observer non-interference

A separate CPU test verifies that an observer throwing during a successful
attempt does not turn that instruction into an execution failure.

The resulting machine state must match the state produced without the observer
failure.

This is direct evidence for the architectural invariant:

```text
tracing enabled
    =
tracing disabled
```

with respect to emulated behavior.

The tests therefore verify non-interference rather than relying only on
documentation.

### Formatter tests

Formatter tests operate on already-constructed trace records.

They do not execute the CPU.

This keeps presentation verification independent from execution semantics.

`ClassicInstructionTraceFormatter` tests verify:

```text
successful instruction representation
fetch failure without opcode
decode failure with opcode
execution failure with decoded instruction
error rendering
```

The successful case also proves that instruction syntax is delegated through
`InstructionFormatter` rather than reimplemented inside tracing.

### State-change decorator tests

`StateChangeInstructionTraceFormatter` is tested with a small fake base
formatter.

That isolates its responsibility:

```text
compare before / after CpuState
        ↓
append only changed fields
```

Tests cover changes to:

```text
registers
I
PC
stack
delay timer
sound timer
```

and verify the current presentation conventions:

```text
aligned base column
" → " state-change separator
"; " between multiple changes
```

When no CPU-state field changes, the decorator must return the base formatter
output unchanged.

The decorator is also tested against failed traces, proving that state-change
presentation depends only on `before` and `after`, not on execution outcome.

### Trace-buffer tests

`InstructionTraceBuffer` is tested independently from `Cpu`.

The buffer contract begins at:

```text
observe(trace)
```

so constructing a complete emulator would make those tests broader than
necessary.

Current tests verify:

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

The identity assertions intentionally prove two different ownership rules:

```text
snapshot array
    → new object

InstructionTrace
    → same immutable object retained by buffer
```

### Public API integration

The tracing public-API integration test imports only from:

```text
packages/core/mod.ts
```

It composes:

```text
SuccessfulInstructionTrace
    ↓
InstructionTraceObserver
    ↓
InstructionTraceBuffer
    ↓
ClassicInstructionTraceFormatter
    ↓
StateChangeInstructionTraceFormatter
```

without importing internal `src/...` modules.

This protects the supported package surface rather than merely proving that
internal files can reference one another.

The test also exercises public branded-value factories such as:

```text
address()
byte()
opcode()
registerIndex()
```

when constructing typed trace fixtures.

That verifies that an external consumer can use the tracing model without
bypassing the Core's domain types.

### Test at the narrowest owning boundary

The overall verification rule is:

> Test trace production where CPU attempts happen, formatting where text is
> produced, storage where history is retained, and package composition through
> the public API.

Examples:

```text
before/after snapshots
    → Cpu tracing test

observer failure isolation
    → Cpu tracing test

decode-failure text
    → Classic trace formatter test

state-difference text
    → State-change formatter test

ring-buffer wraparound
    → InstructionTraceBuffer test

external composition
    → public API integration test
```

This keeps failures easy to diagnose and prevents the Terminal proof of concept
from becoming the only evidence that tracing works.

### Verification focus

Taken together, the tests protect four properties that matter most for tracing:

```text
fidelity
    → traces describe the attempts that actually occurred

non-interference
    → observation cannot change CPU behavior or replace execution errors

separation
    → production, formatting, storage, and package composition are tested at
      their owning boundaries

boundedness
    → retained history cannot grow without limit
```

The architectural rules themselves are summarized once below rather than
repeated as a second test checklist.

## Design Summary

The tracing architecture follows these stable rules:

1. **One trace represents one CPU attempt.**\
   `Cpu.step()` owns the fetch/decode/execute observation boundary; the runtime
   owns when scheduled attempts occur.

2. **Tracing is optional and non-interfering.**\
   Without an observer, the CPU creates no trace snapshots. Observer failures
   cannot alter machine behavior or replace execution errors.

3. **Trace records preserve semantic execution data.**\
   Success and failure are explicit variants, decoded instructions are retained
   when available, and `before`/`after` describe actual CPU state rather than an
   imagined transactional rollback.

4. **CPU snapshots are intentionally scoped.**\
   `CpuState` captures CPU-visible state, not complete memory, display, input, or
   runtime state.

5. **Presentation remains downstream.**\
   Tracing reuses `InstructionFormatter`; trace formatting is composable; console
   and UI output remain application-owned.

6. **History is bounded and observational.**\
   `InstructionTraceBuffer` uses O(1) ring-buffer writes, produces chronological
   snapshots on demand, and never controls execution.

7. **Retries remain visible.**\
   Waiting `Fx0A` and vblank-gated `Dxyn` attempts are preserved individually,
   even when presentation later chooses to summarize them.

8. **The tracing surface is a public Core contract.**\
   Consumers can compose tracing through `packages/core/mod.ts` without
   importing internal source modules.

Together these rules provide enough observability for diagnostics and future
debugger work without making tracing itself a debugger or execution controller.

## Deliberately Deferred Features

The current tracing Core is intentionally smaller than a full debugger.

Several plausible features remain deferred until a real consumer requires them.

### Breakpoints and execution control

Tracing currently observes execution.

It does not:

```text
pause on address
pause on opcode
pause on register value
pause on failure
continue from breakpoint
```

Those behaviors would cross from observation into execution control.

They should be designed as debugger/runtime capabilities rather than quietly
added to trace observers.

### Trace filtering

Core does not currently provide filters such as:

```text
only failures
only one address range
only drawing instructions
only register writes
```

A UI or application can filter an inspected trace snapshot today.

A reusable Core filtering abstraction should wait until multiple consumers need
the same filtering semantics.

### Observer fan-out

`Cpu` currently accepts one optional `InstructionTraceObserver`.

The architecture does not yet provide:

```text
CompositeInstructionTraceObserver
observer list
event bus
subscription registry
```

If a real debugger needs simultaneous consumers such as:

```text
history buffer
live console output
breakpoint detector
trace recorder
```

then fan-out will become demonstrated composition pressure.

Until then, one observer keeps the CPU dependency small.

### Timestamps and sequence numbers

Trace records currently describe CPU execution semantics.

They do not contain:

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

A sequence number is a different question: it could describe CPU-attempt order
without introducing time, but no current consumer requires that extra identity.

Both decisions should wait for a concrete use case, especially because CPU
tracing and runtime timing are separate architectural concerns.

### Memory and display tracing

`CpuState` does not snapshot:

```text
Memory
DisplayBuffer
VerticalBlank
Keyboard
```

The current tracer therefore cannot directly describe every machine-side effect
of instructions such as:

```text
CLS
DRW
Fx33
Fx55
```

Future debugger requirements may justify:

```text
memory access events
display mutation events
machine-state snapshots
resource-specific tracing
```

Those should be modeled as their own observability boundaries rather than
inflating every instruction trace with complete machine state.

### Persistent trace recording

The current history buffer is in-memory and bounded.

Core does not provide:

```text
trace files
JSON export
binary trace format
streaming persistence
```

Persistence introduces file format, compatibility, versioning, and possibly
asynchronous I/O concerns.

Those are separate from observing one CPU attempt.

### Search and history queries

`InstructionTraceBuffer` intentionally provides only:

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

A richer history-query API should appear only if debugger usage demonstrates
that those operations deserve a reusable Core abstraction.

### Retry summarization

Core preserves repeated retry attempts individually.

A UI may summarize consecutive attempts for readability, but the underlying
trace stream and history should continue to preserve the original observations.

### Trace-driven replay

Tracing is not currently intended to reproduce execution.

Trace records do not capture enough complete machine state or external inputs to
guarantee deterministic replay.

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

## Current Scope

The current subsystem is intentionally limited to optional CPU-attempt
observation, faithful success/failure records, CPU-state snapshots, composable
human-readable formatting, a Terminal console proof of concept, and bounded
in-memory history.

That is enough to support the next debugger/UI phase without pre-designing the
debugger itself.
