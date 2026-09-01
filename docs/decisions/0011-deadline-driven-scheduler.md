# ADR 0011: Use a Deadline-Driven Scheduler

- **Status:** Accepted
- **Date:** 2026-09-01
- **Supersedes:** [ADR 0004: Separate Scheduler from PeriodicTask](./0004-scheduler-and-periodic-task.md)

## Context

The original scheduler distributed elapsed time independently to `PeriodicTask` instances.

Each task accumulated elapsed time and caught up its own callback executions.

That model cannot guarantee chronological ordering when several periodic processes share one simulated timeline.

For example:

```text
CPU     500 Hz
Timers   60 Hz
```

During 20 ms the correct chronological order is approximately:

```text
2 ms       CPU
4 ms       CPU
6 ms       CPU
8 ms       CPU
10 ms      CPU
12 ms      CPU
14 ms      CPU
16 ms      CPU
16.666...  timer
18 ms      CPU
20 ms      CPU
```

Independent task catch-up could instead execute:

```text
CPU x 10
timer
```

which can change emulator behavior.

An instruction executed at 18 ms could write the delay timer, after which the incorrectly delayed timer callback would immediately decrement the newly written value.

## Decision

The scheduler owns one global timeline.

Each periodic task is represented internally by its next exact deadline.

When the host calls `Scheduler.tick()`:

1. sample the current monotonic clock;
2. find the globally earliest due occurrence;
3. consume that occurrence;
4. execute its callback;
5. repeat until no deadline is due.

Deadlines are represented using rational `bigint` arithmetic.

There is no public `PeriodicTask` scheduling abstraction.

## Rationale

A frequency may not have an integral nanosecond period.

For example:

```text
60 Hz
=
1,000,000,000 / 60 nanoseconds
```

Repeatedly adding a rounded period such as:

```text
16,666,667 ns
```

would accumulate drift.

Exact rational deadlines preserve the intended frequency.

Comparing:

```text
aN / aD
bN / bD
```

uses cross multiplication:

```text
aN * bD < bN * aD
```

without floating-point arithmetic.

The scheduler becomes the single owner of temporal ordering instead of sharing scheduling responsibility with individual task objects.

## Equal Deadlines

When two exact deadlines are equal, tasks execute in stable registration order.

The scheduler does not currently implement a separate priority system because no demonstrated requirement justifies one.

## Suspension

Suspending a task discards its current scheduling progress.

Resuming schedules its next occurrence one complete period after the resume time.

Host time spent paused therefore creates no catch-up debt.

## Consequences

### Positive

- CPU and timer events remain chronologically ordered across irregular host ticks.
- Frequency scheduling uses exact rational arithmetic.
- There is one clear owner of temporal ordering.
- Pause/resume semantics are simpler.
- The scheduler remains independent of CHIP-8 concepts.

### Negative

- Scheduler internals are more sophisticated than a simple elapsed-time dispatcher.
- Catching up a long delay executes every due occurrence and may require many callback executions.
- Equal-time ordering relies on registration order until a real priority requirement appears.

## Alternatives Considered

### Retain `PeriodicTask` and coordinate elapsed-time catch-up

Rejected because two layers would continue to participate in scheduling and exact global event ordering would be harder to reason about.

### Use rounded integral nanosecond periods

Rejected because fractional frequencies would accumulate timing drift.

### Use floating-point timestamps

Rejected because exact integer/rational arithmetic is straightforward and avoids unnecessary precision concerns.

## Related Decisions

- [ADR 0004: Separate Scheduler from PeriodicTask](./0004-scheduler-and-periodic-task.md)
- [ADR 0006: Keep CHIP-8 Timers Independent of Scheduling](./0006-timer-boundary.md)
