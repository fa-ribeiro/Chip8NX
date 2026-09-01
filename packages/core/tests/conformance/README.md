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

Chip8NX does not redistribute this ROM.

The expected fixture is:

```text
Filename: test_opcode.ch8
Size:     478 bytes
SHA-256:  67759cf9f5b27db66f0769ea8fd0b30ba220f46d6f19f8ba4fd4108d986ce0ab
```

Chip8NX does not redistribute this ROM.

The upstream corax89 project is MIT-licensed. See the repository-level [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) for provenance information.

## Verifying the downloaded ROM

After downloading the file, calculate its SHA-256 checksum locally.

### Linux

```bash
sha256sum packages/core/tests/conformance/roms/test_opcode.ch8
```

### macOS

```bash
shasum -a 256 packages/core/tests/conformance/roms/test_opcode.ch8
```

### PowerShell

```powershell
Get-FileHash packages/core/tests/conformance/roms/test_opcode.ch8 -Algorithm SHA256
```

## Future Fixtures

After corax89, relevant Classic CHIP-8 tests from the Timendus suite are planned:

<https://github.com/Timendus/chip8-test-suite>

When a new fixture becomes part of an automated conformance test:

1. do not commit the third-party ROM unless its redistribution terms are explicitly understood and intentionally accepted;
2. document the expected local filename and path here;
3. pin a checksum for the exact fixture used by Chip8NX;
4. record upstream provenance and licensing in [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md).
