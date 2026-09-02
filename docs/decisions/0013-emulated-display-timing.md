# ADR 0013: Model Display Synchronization as Emulated Machine Timing

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

Classic CHIP-8 does not treat sprite drawing as an operation that can occur freely at arbitrary CPU speed.

`Dxyn` waits for the display's vertical-blank interval before drawing. In practice, this limits Classic CHIP-8 to at most one synchronized sprite draw per display frame.

Chip8NX therefore needs to represent a timing concept that is distinct from both:

- CPU execution frequency;
- CHIP-8 timer frequency;
- host rendering frequency.

The distinction matters because Chip8NX is intended to support multiple host applications.

A terminal frontend might redraw at one frequency, a browser might use `requestAnimationFrame`, and a desktop application might use another presentation mechanism entirely. None of those host mechanisms define the timing of the CHIP-8 machine being emulated.

The emulator already separates `DisplayBuffer`, which represents emulated display state, from host rendering. Display synchronization needs to preserve that same boundary.

It also needs to interact correctly with the deadline-driven scheduler. A display-frame boundary and a CPU instruction may occur at the same emulated instant, so their ordering must be deterministic.

Finally, paused single-step execution introduces a separate concern. Scheduled emulated time does not advance while stepping, but a debugger still needs to be able to complete a display-synchronized `Dxyn` instruction.

## Decision

Display synchronization is modeled as part of emulated machine timing, independently of host rendering.

`Chip8Profile` defines a display refresh frequency in addition to display geometry.

`Chip8Runtime` schedules display-frame boundaries through the same deadline-driven `Scheduler` that coordinates CPU execution and timer countdown.

A `VerticalBlank` component represents whether one display-synchronized drawing opportunity is currently available.

```text
Chip8Profile.display.refreshFrequency
              |
              v
        Chip8Runtime
              |
          Scheduler
              |
          signal()
              v
        VerticalBlank
              |
          consume()
              v
             Dxyn
              |
              v
        DisplayBuffer
```

A vertical-blank opportunity is non-accumulating.

If several display boundaries occur without a draw, they still represent only one pending opportunity. `VerticalBlank` therefore behaves as availability state rather than as a counter of unused frames.

Classic `Dxyn` must consume an available vertical-blank opportunity before modifying the display.

If no opportunity is available, the instruction performs no drawing side effects and rewinds the program counter so the CPU retries the same instruction later.

The runtime registers the vertical-blank scheduler task before the CPU task. Therefore, when a display boundary and CPU deadline occur at exactly the same emulated instant, the vertical blank becomes available before that CPU instruction executes.

Host renderers do not signal, consume, or otherwise control emulated vertical blank.

Paused `Chip8Runtime.step()` is treated as a debugging operation rather than advancement of scheduled emulated time.

When stepping with no vertical blank already pending, the runtime supplies one temporary opportunity so a `Dxyn` instruction can complete. If the stepped instruction does not consume that temporary opportunity, it is discarded afterward.

A genuine vertical-blank opportunity that was already pending before the step is preserved unless the stepped instruction consumes it.

Single stepping does not advance timer countdown or scheduled display time.

## Rationale

Display synchronization is behavior of the emulated CHIP-8 machine rather than behavior of the host display.

Making host rendering responsible for vertical blank would couple instruction semantics to a particular presentation technology and could make the same ROM behave differently depending on whether Chip8NX was embedded in a terminal, browser, desktop application, test harness, or debugger.

Keeping synchronization out of `DisplayBuffer` also preserves its focused responsibility: it stores and modifies display state but does not own clocks, scheduling, or execution policy.

Scheduling display boundaries through `Chip8Runtime` gives CPU execution, timer ticks, and display timing a common emulated timeline. The deadline-driven scheduler can therefore preserve deterministic ordering even when different periodic events share the same deadline.

Representing vertical blank as a separate state component keeps the executor independent of the scheduler. `Dxyn` only needs to know whether a drawing opportunity is available; it does not need to know how or when that opportunity was produced.

Using boolean availability rather than an accumulated frame count matches the required semantic model. Missing several display frames does not entitle a later instruction to perform several synchronized draws immediately.

The special single-step behavior intentionally favors useful debugger semantics. Without it, stepping a paused machine whose next instruction is `Dxyn` could repeatedly execute the same blocked instruction because scheduled display time never advances.

The temporary opportunity is scoped to that step so debugger behavior does not create persistent synthetic machine state.

## Consequences

### Positive

- Classic `Dxyn` display-wait behavior is modeled explicitly and passes the Timendus Quirks conformance test.
- Emulated display timing remains deterministic and independent of host rendering.
- Terminal, browser, desktop, and test applications can present the same `DisplayBuffer` without influencing CHIP-8 execution semantics.
- CPU, timer, and display events share the scheduler's chronological ordering guarantees.
- `DisplayBuffer` remains free of scheduling and timing responsibilities.
- `InstructionExecutor` does not depend directly on a clock or scheduler.
- Display refresh frequency becomes an explicit characteristic of the emulated machine profile.
- Paused single stepping remains useful for debugging display instructions without advancing timers or scheduled emulated time.
- The architecture leaves room for future CHIP-8-family profiles to define different display timing characteristics when concrete variant requirements justify them.

### Negative

- Machine composition requires an additional `VerticalBlank` component.
- `ExecutionContext` and `Chip8Runtime` both participate in wiring the same vertical-blank state.
- The runtime owns an additional scheduled task.
- Tests that previously assumed every CPU scheduling occurrence completed an instruction can require larger execution-time budgets because `Dxyn` may now stall while waiting for a display boundary.
- Single-step execution has deliberately different display-timing semantics from normally scheduled execution and therefore requires explicit documentation and tests.
- Exact scheduler registration order for display boundaries relative to CPU execution is now part of runtime correctness.

## Alternatives Considered

### Synchronize drawing with the host renderer

For example, a browser frontend could use `requestAnimationFrame`, while a terminal frontend could signal drawing whenever it refreshes its output.

Rejected because host presentation frequency is not emulated CHIP-8 timing.

This would make instruction behavior depend on the frontend and would prevent the reusable core from behaving consistently across environments.

### Put vertical-blank timing inside `DisplayBuffer`

`DisplayBuffer` could own a clock, delay drawing, or track frame intervals itself.

Rejected because `DisplayBuffer` represents display state. Giving it scheduling responsibility would mix machine state with temporal orchestration and make the component harder to test and replace independently.

### Make `InstructionExecutor` depend directly on the scheduler or clock

`Dxyn` could inspect time or register its own scheduling behavior.

Rejected because instruction execution should apply instruction semantics to machine state, not coordinate global runtime timing.

A separate `VerticalBlank` state boundary lets the runtime produce timing events while the executor only consumes their machine-visible effect.

### Accumulate unused vertical blanks

Vertical blank could be represented as a counter incremented for every display frame.

Rejected because vertical blank represents a synchronization opportunity, not a resource that accumulates for later use.

Allowing unused frames to accumulate could permit several later `Dxyn` instructions to execute back-to-back despite no intervening display boundaries.

### Do not provide special behavior for paused single stepping

`Chip8Runtime.step()` could execute one CPU attempt without supplying a display opportunity.

Rejected because a paused debugger would then be unable to complete a waiting `Dxyn` unless application code manually manipulated internal display-synchronization state.

That would make normal single-instruction debugging unnecessarily dependent on runtime internals.

## Related Decisions

- [ADR 0001: Modular Component Architecture](./0001-modular-component-architecture.md)
- [ADR 0006: Keep CHIP-8 Timers Independent of Scheduling](./0006-timer-boundary.md)
- [ADR 0010: Use a Unified CHIP-8 Profile](./0010-unified-chip8-profile.md)
- [ADR 0011: Use a Deadline-Driven Scheduler](./0011-deadline-driven-scheduler.md)
- [ADR 0012: Application-Owned Composition](./0012-application-owned-composition.md)
