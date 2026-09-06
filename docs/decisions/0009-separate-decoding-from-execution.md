# ADR 0009: Separate Opcode Decoding from Instruction Execution Semantics

- **Status:** Accepted
- **Date:** 2026-08-26

## Context

The CHIP-8 emulator needs to translate raw 16-bit opcodes into a structured instruction representation.

CHIP-8 has several interpreter variants and historical quirks. Some instructions have different execution semantics between implementations while their opcode encoding remains the same. Examples include shift instructions and certain `FX` instructions.

The decoder is also intended to support more than CPU execution: future debugger and disassembler tooling should be able to consume the same decoded instruction representation.

Opcode decoding should therefore not become coupled to a particular CHIP-8 profile or to CPU execution behavior.

## Decision

The decoder is:

1. **Pure and stateless.**
   - Given an `Opcode`, it returns the corresponding `Instruction`.
   - It does not modify CPU or emulator state.

2. **Variant-independent.**
   - It identifies the instruction encoded by the opcode.
   - It does not apply interpreter-specific execution quirks.
3. **Separate from execution semantics.**
   - The CPU/execution layer determines how an instruction affects machine state.
   - Variant-specific behavior belongs in execution semantics and may later be driven by the selected `Chip8Profile`, not by the decoder.
4. **Reusable.**
   - The same decoder and instruction representation can be consumed by the CPU, debugger, disassembler, and future tooling.
5. **Based on domain types.**
   - Decoded opcode fields are converted into existing domain types where appropriate.

## Rationale

Opcode shape and execution policy are different responsibilities.

Keeping decoding semantic and variant-independent makes the decoder deterministic and reusable, while allowing execution behavior to evolve independently as additional CHIP-8 profiles are introduced.

## Consequences

### Positive

- The decoder remains simple and deterministic.
- Compatibility variants do not contaminate opcode parsing.
- Debugger and disassembler tooling can reuse decoded instructions without CPU state.
- Execution semantics can evolve independently from instruction encoding.
- Tests can separately verify decoding and execution.

### Negative

- Some behavior cannot be determined from `Instruction` alone.
- Execution must eventually consult the selected profile when multiple variant semantics are supported.
- The project has an explicit architectural boundary between decoding and execution.

## Example

For `8XY6`, the decoder identifies a shift-right register operation and extracts `X` and `Y`.

The decoder does not decide which source-register behavior a CHIP-8 variant uses.

That decision belongs to execution semantics.

## Alternatives Considered

### Put compatibility quirks directly into the decoder

Rejected because decoding would then depend on execution policy, making it harder to reuse for debugging, disassembly, and other tooling.

## Related Decisions

- [ADR 0003: Explicit CHIP-8 Domain Value Types](./0003-domain-value-types.md)
- [ADR 0010: Use a Unified CHIP-8 Profile](./0010-unified-chip8-profile.md)
