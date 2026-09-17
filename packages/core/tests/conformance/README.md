# Conformance Tests

This directory contains end-to-end conformance tests that run external CHIP-8 ROMs through the normal Chip8NX machine pipeline.

Third-party ROM images are **not distributed with Chip8NX**.

To run these tests locally, obtain the required ROMs from their upstream sources and place them in the documented paths below.

The repository-level [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) records provenance and licensing information for external test suites.

## Running conformance tests

From the repository root:

```bash
deno task test:conformance
```

Individual tests can also be run directly:

```bash
deno test --allow-read packages/core/tests/conformance/ibm-logo.test.ts
deno test --allow-read packages/core/tests/conformance/corax89.test.ts
deno test --allow-read packages/core/tests/conformance/timendus-corax-plus.test.ts
deno test --allow-read packages/core/tests/conformance/timendus-flags.test.ts
deno test --allow-read packages/core/tests/conformance/timendus-quirks.test.ts
deno test --allow-read packages/core/tests/conformance/timendus-keypad.test.ts
deno test --allow-read packages/core/tests/conformance/timendus-scrolling.test.ts
deno test --allow-read packages/core/tests/conformance/variant-detection.test.ts
```

The `roms/` directory is intended for local test fixtures and should not contain redistributed third-party ROMs in the public repository.

### IBM Logo ROM

Expected path:

```text
packages/core/tests/conformance/roms/ibm-logo.ch8
```

The IBM Logo ROM is a historical CHIP-8 test/program image used to verify basic end-to-end execution and drawing behavior.

Chip8NX does not redistribute this ROM.

Expected fixture identity:

```text
Filename: ibm-logo.ch8
Size:     132 bytes
MD5:      2dbace8066709ac9a264d23281820d32
SHA-256:  8bf3b46d8a64c2074e7538200f684a2eaced258404d3c7d3bd7a917c3d0143e5
```

The conformance test executes the ROM through the normal machine initialization, CPU, runtime, and scheduler pipeline and compares the resulting framebuffer against the expected IBM Logo output.

### corax89 CHIP-8 Test ROM

Expected path:

```text
packages/core/tests/conformance/roms/test_opcode.ch8
```

Obtain the ROM from the upstream repository:

<https://github.com/corax89/chip8-test-rom>

The expected fixture is:

```text
Filename: test_opcode.ch8
Size:     478 bytes
SHA-256:  67759cf9f5b27db66f0769ea8fd0b30ba220f46d6f19f8ba4fd4108d986ce0ab
```

Chip8NX does not redistribute this ROM.

The upstream corax89 project is MIT-licensed. See the repository-level [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) for provenance information.

### Timendus CHIP-8 test suite

The Timendus CHIP-8 test suite is a collection of ROM images designed to help developers create and test their own CHIP-8 interpreters or emulators. It includes various tests to validate the functionality and quirks of these systems, ensuring accurate implementation.

#### Timendus test suite version

Chip8NX pins Timendus CHIP-8 test-suite fixtures to:

```text
Release:  v4.2
Commit:   cb24d55
```

Pinning the upstream version is part of the conformance contract. Test ROM behavior, automation hooks, and expected output must not silently change because a newer upstream release becomes available.

The fixture checksums documented below identify the exact ROM images expected by the automated tests.

#### Timendus Corax+ Opcode Test

Expected path:

```text
packages/core/tests/conformance/roms/3-corax+.ch8
```

Obtain the ROM from the Timendus CHIP-8 test suite:

<https://github.com/Timendus/chip8-test-suite#corax-opcode-test>

The expected fixture is:

```text
Filename: 3-corax+.ch8
Size:     761 bytes
SHA-256:  1c7e14eae14d6d5e1e47693804110354cbc4081defe4e6e5d9167c25ffc7b4b0
```

The Timendus CHIP-8 test suite is licensed under GPL-3.0. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

The Corax+ test extends the original corax89 opcode test with additional coverage including call/return behavior, `8XY7`, `FX1E`, `FX65`, BCD edge cases, and 8-bit register width.

#### Timendus Flags Test

Expected path:

```text
packages/core/tests/conformance/roms/4-flags.ch8
```

Obtain the ROM from the Timendus CHIP-8 test suite:

<https://github.com/Timendus/chip8-test-suite#flags-test>

The expected fixture is:

```text
Filename: 4-flags.ch8
Size:     1041 bytes
SHA-256:  f00ddadd37bc878473de0c8f16faecf9985dea39036a3a796d551bc9fec47cfa
```

Chip8NX does not redistribute this ROM.

The Timendus CHIP-8 test suite is licensed under GPL-3.0. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

The Flags test verifies arithmetic and logical result values, VF flag behavior, carry and borrow cases, shifted-out bits, use of VF as an instruction operand, and Fx1E with both a normal register and VF.

#### Timendus Quirks Test

Expected path:

```text
packages/core/tests/conformance/roms/5-quirks.ch8
```

Obtain the ROM from the Timendus CHIP-8 test suite:

<https://github.com/Timendus/chip8-test-suite#quirks-test>

The expected fixture is:

```text
Filename: 5-quirks.ch8
Size:     3232 bytes
SHA-256:  d839350268a3e73c7a16562b3d23c85aa1b92a567f5f61bd6727b1ea44635679
```

Chip8NX does not redistribute this ROM.

The Timendus CHIP-8 test suite is licensed under GPL-3.0. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

Chip8NX uses the Timendus automation byte at address `0x1FF` to exercise more than one supported profile:

```text
1 = Classic CHIP-8
4 = legacy SUPER-CHIP
```

The Classic run uses `CLASSIC_CHIP8_PROFILE`. The legacy SUPER-CHIP run uses `SUPERCHIP_PROFILE` and finishes in low-resolution mode. Both execute through the normal machine initialization, CPU, runtime, scheduler, timer, vertical-blank, and display pipeline.

The ROM provides external evidence for these shared-instruction quirks:

- logical-operation handling of `VF`;
- `I` updates after `FX55` and `FX65`;
- sprite-draw synchronization behavior;
- sprite clipping / overflow behavior;
- `8XY6` and `8XYE` shift-source behavior;
- `BNNN` / `BXNN` jump-offset behavior.

These are modeled by `Chip8Quirks`: they describe how instructions shared by supported machine families behave. SUPER-CHIP-only instruction membership is modeled separately by `Chip8InstructionSet` and is not what this ROM is primarily testing.

#### Timendus Keypad Test

Expected path:

```text
packages/core/tests/conformance/roms/6-keypad.ch8
```

Obtain the ROM from the Timendus CHIP-8 test suite:

<https://github.com/Timendus/chip8-test-suite#keypad-test>

The expected fixture is:

```text
Filename: 6-keypad.ch8
Size:     913 bytes
SHA-256:  558902b0e406bb97dc808c16d55abf493706598246e3c77aea9d9401063169c9
```

Chip8NX does not redistribute this ROM.

The Timendus CHIP-8 test suite is licensed under GPL-3.0. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

The Keypad test exercises all three Classic CHIP-8 keyboard instructions:

- `EX9E` — skip when the key stored in `VX` is pressed;
- `EXA1` — skip when the key stored in `VX` is not pressed;
- `FX0A` — wait for a key press followed by release.

The ROM supports automated test selection by writing a value to address `0x1FF`:

1. selects `EX9E`;
2. selects `EXA1`;
3. selects `FX0A`.

The EX9E and EXA1 conformance tests drive `KeyboardState` directly. The FX0A test additionally verifies that execution remains blocked while waiting, CHIP-8 timers continue to advance, and execution resumes only after the selected key is released.

#### Timendus Scrolling Test

Expected path:

```text
packages/core/tests/conformance/roms/8-scrolling.ch8
```

Obtain the ROM from the pinned Timendus CHIP-8 test suite release:

<https://github.com/Timendus/chip8-test-suite#scrolling-test>

The expected fixture is:

```text
Filename: 8-scrolling.ch8
Size:     1330 bytes
SHA-256:  3f43507c45a949e5b014445853205dd1f36bb532cf25baa22209b7c300c596d7
```

Chip8NX does not redistribute this ROM.

The Timendus CHIP-8 test suite is licensed under GPL-3.0. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

The scrolling ROM provides automated selections at address `0x1FF`. Chip8NX currently exercises these two SUPER-CHIP paths:

```text
2 = legacy SUPER-CHIP low-resolution scrolling
3 = SUPER-CHIP high-resolution scrolling
```

Both automated tests use `SUPERCHIP_PROFILE` and therefore the `superchip-1.1` instruction-set semantics.

The low-resolution run verifies historical scrolling in physical backing-buffer units while the display remains in low mode. The high-resolution run verifies the same SUPER-CHIP scrolling instructions in high mode. In both cases, the test checks the final arrow glyph regions produced by the ROM after `00FB`, `00FC`, and `00Cn` scrolling.

The tests run through the normal machine initialization, CPU, runtime, scheduler, timer, vertical-blank, and display pipeline rather than invoking display helpers directly.

### Gulrak Variant Detection Test

Expected path:

```text
packages/core/tests/conformance/roms/variant-detection-1.4.ch8
```

Obtain the ROM from Gulrak's Variant Detection Test:

<https://github.com/gulrak/cadmium/wiki/Variant-Detection-Test>

The expected fixture is:

```text
Filename: variant-detection-1.4.ch8
Size:     2192 bytes
SHA-256:  ed53823dd9e133c1a30ad5557eab54dc9f8252cf4016f5cf94cd948828ff03ca
```

Chip8NX does not redistribute this ROM.

The Variant Detection Test is published by Steffen Schümann (Gulrak) as part of the Cadmium project, which is MIT-licensed. The external ROM remains subject to its upstream license and is not covered by the Chip8NX MIT license.

The test identifies historical CHIP-8 variants and reports variant-sensitive shared-instruction behavior for:

- `VF` reset by `8XY1`, `8XY2`, and `8XY3`;
- `I` updates after `FX55` and `FX65`;
- `8XY6` and `8XYE` shift-source behavior;
- `BNNN` / `BXNN` jump-offset behavior;
- display synchronization behavior;
- sprite wrapping and clipping behavior.

Its memory test distinguishes all three index-register behaviors relevant to Chip8NX:

- `MEM1` — `I += X + 1`;
- `MEMX` — `I += X`;
- `MEM0` — `I` remains unchanged.

## Verifying the downloaded ROM

After downloading the file, calculate its SHA-256 checksum locally.

### Linux

```bash
sha256sum packages/core/tests/conformance/roms/ibm-logo.ch8
sha256sum packages/core/tests/conformance/roms/test_opcode.ch8
sha256sum packages/core/tests/conformance/roms/3-corax+.ch8
sha256sum packages/core/tests/conformance/roms/4-flags.ch8
sha256sum packages/core/tests/conformance/roms/5-quirks.ch8
sha256sum packages/core/tests/conformance/roms/6-keypad.ch8
sha256sum packages/core/tests/conformance/roms/8-scrolling.ch8
sha256sum packages/core/tests/conformance/roms/variant-detection-1.4.ch8
```

### macOS

```bash
shasum -a 256 packages/core/tests/conformance/roms/ibm-logo.ch8
shasum -a 256 packages/core/tests/conformance/roms/test_opcode.ch8
shasum -a 256 packages/core/tests/conformance/roms/3-corax+.ch8
shasum -a 256 packages/core/tests/conformance/roms/4-flags.ch8
shasum -a 256 packages/core/tests/conformance/roms/5-quirks.ch8
shasum -a 256 packages/core/tests/conformance/roms/6-keypad.ch8
shasum -a 256 packages/core/tests/conformance/roms/8-scrolling.ch8
shasum -a 256 packages/core/tests/conformance/roms/variant-detection-1.4.ch8
```

### PowerShell

```powershell
Get-FileHash packages/core/tests/conformance/roms/ibm-logo.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/test_opcode.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/3-corax+.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/4-flags.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/5-quirks.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/6-keypad.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/8-scrolling.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/variant-detection-1.4.ch8 -Algorithm SHA256
```

## Future Fixtures

Further Timendus fixtures may be added when they exercise behavior applicable to the supported Chip8NX machine profiles and when their automation and expected completion state can be made deterministic.

The Timendus Beep test exercises sound presentation rather than only Core timer state. It is therefore not currently part of this Core conformance suite; adding it would require an explicit conformance strategy for the host/audio boundary rather than treating browser or terminal audio as a Core machine requirement.

When a new fixture becomes part of an automated conformance test:

1. do not commit the third-party ROM unless its redistribution terms are explicitly understood and intentionally accepted;
2. document the expected local filename and path here;
3. pin a checksum for the exact fixture used by Chip8NX;
4. record upstream provenance and licensing in [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md).
