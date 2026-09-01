# ADR 0003: Explicit CHIP-8 Domain Value Types

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

CHIP-8 contains values with different semantic ranges, notably 8-bit bytes and address values.

JavaScript and TypeScript's ordinary `number` type does not communicate these distinctions and does not prevent unrelated numeric values from being passed across domain boundaries.

## Decision

Represent important CHIP-8 domain values with explicit TypeScript domain types and validating construction functions, beginning with values such as `Byte` and `Address`.

These types should make intent visible at call sites and provide a boundary for rejecting invalid values.

Arithmetic may temporarily operate on ordinary numeric values where appropriate, but results should cross back through the relevant domain validation boundary.

## Rationale

The emulator contains many small numeric fields that look identical to TypeScript but mean different things to CHIP-8.

Explicit types make those semantics visible and allow invalid values to fail closer to their source.

## Consequences

### Positive

- Function signatures communicate CHIP-8 meaning more clearly.
- Invalid values can be rejected at domain boundaries.
- Accidental mixing of unrelated numeric concepts becomes harder.
- Tests can target value invariants independently.

### Negative

- Additional conversion and validation code is required.
- Arithmetic must consciously cross between raw numeric operations and domain values.

## Alternatives Considered

### Use `number` everywhere

Rejected because it provides no type-level distinction between semantically different CHIP-8 values and makes validation easy to omit.

## Related Decisions

- None currently.
