# Classic CHIP-8 Opcode Coverage Audit

- **Status:** Complete
- **Audited:** 2026-09-02
- **Baseline:** CHIP-8-KB Classic CHIP-8 Technical Reference

## Purpose

This audit establishes whether the Chip8NX Classic CHIP-8 core has sufficient instruction coverage to stop treating additional opcode implementation and conformance ROMs as blockers for new feature development.

The audit compares the Classic CHIP-8 opcode set against:

- instruction decoding;
- instruction execution;
- unit-test coverage;
- external conformance coverage accumulated by the project.

It is a snapshot of the current Classic implementation. It should be revisited when instruction decoding, execution semantics, or supported machine profiles change materially.

## Result

Chip8NX recognizes all 35 opcode families listed by the Classic CHIP-8 reference.

Of those:

- 34 have executable CHIP-8 virtual-machine semantics;
- all 34 executable families have direct unit-test coverage;
- `0mmm` is recognized and decoded but intentionally rejected during execution because it transfers control to native CDP1802 machine code;
- no ordinary Classic CHIP-8 virtual-machine opcode remains unimplemented.

The current Classic opcode implementation is therefore considered complete enough that further conformance work does not need to block new feature development.

## Opcode matrix

| Opcode | Decode | Execute | Unit test | Status                                         |
| ------ | :----: | :-----: | :-------: | ---------------------------------------------- |
| `00E0` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `00EE` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `0mmm` |   ✓    |    —    |     ✓     | Native CDP1802 call; intentionally unsupported |
| `1mmm` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `2mmm` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `3xkk` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `4xkk` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `5xy0` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `6xkk` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `7xkk` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy0` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy1` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy2` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy3` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy4` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy5` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy6` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xy7` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `8xyE` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `9xy0` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Ammm` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Bmmm` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Cxkk` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Dxyn` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Ex9E` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `ExA1` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx07` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx0A` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx15` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx18` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx1E` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx29` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx33` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx55` |   ✓    |    ✓    |     ✓     | Complete                                       |
| `Fx65` |   ✓    |    ✓    |     ✓     | Complete                                       |

## `0mmm` native system calls

The original COSMAC VIP implementation allows `0mmm` to transfer execution to a native CDP1802 assembler subroutine.

That behavior crosses the boundary from the CHIP-8 virtual machine into the underlying host processor.

Chip8NX is a generic CHIP-8 emulator and does not emulate the COSMAC VIP's CDP1802 processor. The decoder therefore preserves `0mmm` as a distinct `system-call` instruction, while the instruction executor rejects it explicitly as unsupported.

This is intentional behavior rather than an incomplete CHIP-8 opcode implementation.

Supporting real `0mmm` execution would require an additional native-machine emulation layer and is outside the current Chip8NX Core scope.

## `Dxyn` with zero height

`Dxyn` includes the boundary case where `n` is zero.

For Classic CHIP-8 this means:

- the instruction still waits for a display-frame opportunity;
- the vertical-blank opportunity is consumed when execution proceeds;
- zero sprite rows are read;
- the framebuffer is unchanged;
- no collision occurs, so `VF` is cleared.

This must not be confused with later CHIP-8-family behavior where the same `Dxy0` encoding may acquire extended sprite semantics.

Chip8NX keeps the Classic zero-height behavior today. Alternate semantics should only be introduced when a second machine profile that requires them is intentionally supported.

## Classic behavior verified during conformance work

The audit includes the variant-sensitive Classic semantics already exercised by the test suite:

- logical `8xy1`, `8xy2`, and `8xy3` operations clear `VF`, with the flag write occurring last;
- `8xy6` and `8xyE` use `Vy` as the shift source and store the result in `Vx`;
- `Bmmm` uses `V0` as its offset;
- `Fx55` and `Fx65` increment `I` by `x + 1`;
- `Ex9E`, `ExA1`, and `Fx29` use only the low nibble of the relevant register value;
- `Fx0A` waits for a pressed key to be released;
- `Dxyn` uses Classic clipping behavior and waits for an emulated display-frame opportunity;
- `Fx1E` does not modify `VF` and does not force `I` back into the 12-bit address range.

## External acceptance coverage

The unit-level instruction audit is supplemented by end-to-end conformance tests using real CHIP-8 programs:

- IBM Logo;
- original corax89 opcode test;
- Timendus Corax+;
- Timendus Flags;
- Timendus Quirks in Classic CHIP-8 mode;
- Timendus Keypad.

These tests exercise combinations of decoder, executor, machine state, runtime scheduling, timers, display synchronization, and keyboard behavior through the normal Chip8NX execution pipeline.

External conformance tests complement rather than replace focused unit tests.

## Deferred Timendus tests

The remaining Timendus fixtures are not blockers for the Classic interpreter baseline:

- **Splash screen** provides less coverage than the existing IBM Logo and opcode conformance tests;
- **Beep** depends on host audio presentation, while Chip8NX Core currently models the sound timer without owning host audio output;
- **Scrolling** targets SUPER-CHIP and XO-CHIP behavior rather than the current Classic profile.

They may be revisited when their corresponding functionality becomes relevant.

## Exit criterion

The Classic opcode implementation baseline is considered complete when:

- every Classic opcode family is intentionally decoded;
- every CHIP-8 virtual-machine opcode has execution semantics;
- those semantics have direct unit coverage;
- native `0mmm` behavior has an explicit unsupported policy;
- the full regression and external conformance suites remain green.

At the time of this audit, those conditions are satisfied.

Further Classic conformance tests remain welcome when they provide useful new evidence, but they no longer block work on applications, public API refinement, or future machine profiles.
