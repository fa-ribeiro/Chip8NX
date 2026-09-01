# ADR 0006: Keep CHIP-8 Timers Independent of Scheduling

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

CHIP-8 has delay and sound timers that decrement at a machine-defined frequency. The project also has a generic scheduling system responsible for deciding when periodic work runs.

If timers knew about clocks or schedulers themselves, countdown state and host-time orchestration would become coupled.

## Decision

Implement a generic `Timer` containing countdown state and a `tick()` operation.

The timer does not know about:

- clocks;
- schedulers;
- runtime orchestration;
- sound output.

Runtime orchestration schedules timer ticks externally.

Both the delay timer and sound timer use the same `Timer` implementation because their countdown semantics are identical.

Conceptually:

```text
Chip8Runtime
    |
    +--> Scheduler timer callback
             |
             +--> DelayTimer.tick()
             +--> SoundTimer.tick()
```

## Rationale

A timer represents machine state and countdown semantics. Scheduling represents the progression of emulated time. Keeping those responsibilities separate makes both easier to test and reuse.

## Consequences

### Positive

- Timers are trivial to unit test.
- The same timer implementation can be reused in different host environments.
- Scheduler and runtime changes do not require timer changes.
- Delay and sound timers share one implementation.

### Negative

- A higher-level runtime must coordinate timer scheduling explicitly.

Sound generation remains a separate concern. A host sound system can observe sound-timer state without making the timer responsible for producing audio.

## Alternatives Considered

### Give `Timer` its own clock or scheduling behavior

Rejected because it would mix machine state with runtime orchestration and create duplicate time ownership.

## Related Decisions

- [ADR 0011: Use a Deadline-Driven Scheduler](./0011-deadline-driven-scheduler.md)
- [ADR 0012: Application-Owned Composition](./0012-application-owned-composition.md)
