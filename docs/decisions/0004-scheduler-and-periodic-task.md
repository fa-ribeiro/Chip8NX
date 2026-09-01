# ADR 0004: Separate Scheduler from PeriodicTask

- **Status:** Superseded
- **Date:** 2026-08-24
- **Superseded by:** [ADR 0011: Use a Deadline-Driven Scheduler](./0011-deadline-driven-scheduler.md)

## Context

The emulator needs several independent periodic activities: CPU execution, CHIP-8 timers, rendering, and potentially tracing or other output.

At this stage of the project, scheduling was modeled by distributing elapsed time to independent periodic tasks.

## Decision

Use two separate concepts:

- `Scheduler` obtains elapsed time from a `Clock` and advances registered tasks.
- `PeriodicTask` owns the frequency, accumulated timing state, and callback.

A callback does not receive elapsed time.

A task therefore has the conceptual relationship:

```text
elapsed time -> PeriodicTask -> callback
```

while the scheduler performs:

```text
Clock -> Scheduler -> PeriodicTask(s)
```

## Rationale

This design separated orchestration from per-task timing state and made periodic timing independently testable.

It also supported suspending individual tasks without stopping the entire scheduler.

## Suspension

Tasks can be independently suspended and resumed.

Suspension pauses that task's scheduling state rather than forcing the entire scheduler to stop.

Suspended tasks do not accumulate execution debt.

## Consequences

### Positive

- The scheduler remains generic.
- Periodic timing behavior can be tested independently.
- Individual tasks can be suspended.
- The scheduler does not need to know what callbacks represent.

### Negative

- Each `PeriodicTask` becomes a partial owner of scheduling semantics.
- Independent task catch-up cannot guarantee chronological ordering across tasks with different frequencies.

The second consequence became important once CHIP-8 CPU execution and the 60 Hz timers needed to share one simulated timeline.

## Supersession

The runtime design exposed that independently catching up each task can execute CPU and timer events in the wrong relative order after a long host tick.

ADR 0011 therefore replaces this model with a deadline-driven scheduler that is the single owner of temporal ordering.

The useful parts of this decision remain:

- the scheduler is generic;
- callbacks do not need CHIP-8-specific knowledge;
- suspension discards execution debt.

## Related Decisions

- [ADR 0006: Keep CHIP-8 Timers Independent of Scheduling](./0006-timer-boundary.md)
- [ADR 0011: Use a Deadline-Driven Scheduler](./0011-deadline-driven-scheduler.md)
