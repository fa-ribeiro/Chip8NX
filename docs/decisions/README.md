# Architecture Decision Records

This directory records significant architectural decisions made during development.

The purpose is not to document every implementation detail. ADRs capture choices whose reasoning would otherwise be difficult to recover later.

## Conventions

Each ADR should contain:

- **Status** — `Proposed`, `Accepted`, `Superseded`, or `Rejected`;
- **Date** — the date the decision was made;
- **Context** — the problem and constraints;
- **Decision** — the chosen approach;
- **Rationale** — why it was selected;
- **Consequences** — important benefits and tradeoffs;
- **Alternatives Considered** — meaningful rejected options when relevant;
- **Related Decisions** — links to related or superseding ADRs when useful.

ADRs are historical records. If an architectural decision changes materially, prefer a new ADR that supersedes the old decision rather than silently rewriting history.

Small editorial updates that preserve the original decision are acceptable, such as correcting terminology, clarifying wording, or updating examples that became stale.

Use lowercase kebab-case filenames:

```text
0001-example-decision.md
0002-another-decision.md
```

Use [`0000-template.md`](./0000-template.md) when creating a new record.

## Decisions

| ADR                                                | Decision                                                      | Status         | Date       |
| -------------------------------------------------- | ------------------------------------------------------------- | -------------- | ---------- |
| [0001](./0001-modular-component-architecture.md)   | Modular component architecture                                | Accepted       | 2026-08-24 |
| [0002](./0002-vanilla-typescript.md)               | Vanilla TypeScript and minimal dependencies                   | Accepted       | 2026-08-24 |
| [0003](./0003-domain-value-types.md)               | Explicit CHIP-8 domain value types                            | Accepted       | 2026-08-24 |
| [0004](./0004-scheduler-and-periodic-task.md)      | Separate Scheduler from PeriodicTask                          | **Superseded** | 2026-08-24 |
| [0005](./0005-std-assert.md)                       | Use `@std/assert` for tests                                   | Accepted       | 2026-08-24 |
| [0006](./0006-timer-boundary.md)                   | Keep CHIP-8 timers independent of scheduling                  | Accepted       | 2026-08-24 |
| [0007](./0007-test-location.md)                    | Tests live beside their implementation                        | Accepted       | 2026-08-24 |
| [0008](./0008-file-naming.md)                      | Lowercase kebab-case filenames                                | Accepted       | 2026-08-24 |
| [0009](./0009-separate-decoding-from-execution.md) | Separate opcode decoding from instruction execution semantics | Accepted       | 2026-08-26 |
| [0010](./0010-unified-chip8-profile.md)            | Use a unified CHIP-8 profile                                  | Accepted       | 2026-08-31 |
| [0011](./0011-deadline-driven-scheduler.md)        | Use a deadline-driven scheduler                               | Accepted       | 2026-09-01 |
| [0012](./0012-application-owned-composition.md)    | Application-owned composition                                 | Accepted       | 2026-08-31 |

## Superseded decisions

ADR 0004 is preserved because it documents the scheduler design used during the project's early development. ADR 0011 replaces its elapsed-time/`PeriodicTask` model with a single deadline-driven scheduler that owns global temporal ordering.
