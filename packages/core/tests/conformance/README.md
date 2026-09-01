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

### Timendus Corax+ Opcode Test

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

## Verifying the downloaded ROM

After downloading the file, calculate its SHA-256 checksum locally.

### Linux

```bash
sha256sum packages/core/tests/conformance/ibm-logo.test.ts
sha256sum packages/core/tests/conformance/roms/test_opcode.ch8
sha256sum packages/core/tests/conformance/timendus-corax-plus.test.ts
```

### macOS

```bash
shasum -a 256 packages/core/tests/conformance/ibm-logo.test.ts
shasum -a 256 packages/core/tests/conformance/roms/test_opcode.ch8
shasum -a 256 packages/core/tests/conformance/timendus-corax-plus.test.ts
```

### PowerShell

```powershell
Get-FileHash packages/core/tests/conformance/ibm-logo.test.ts -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/roms/test_opcode.ch8 -Algorithm SHA256
Get-FileHash packages/core/tests/conformance/timendus-corax-plus.test.ts -Algorithm SHA256
```

## Future Fixtures

The next planned Classic CHIP-8 conformance target is the Timendus flags test:

<https://github.com/Timendus/chip8-test-suite#flags-test>

After that, the Timendus quirks test will be used to validate Classic CHIP-8 variant behavior explicitly.

When a new fixture becomes part of an automated conformance test:

1. do not commit the third-party ROM unless its redistribution terms are explicitly understood and intentionally accepted;
2. document the expected local filename and path here;
3. pin a checksum for the exact fixture used by Chip8NX;
4. record upstream provenance and licensing in [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md).
