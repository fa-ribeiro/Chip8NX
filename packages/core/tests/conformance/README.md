# Conformance Tests

Chip8NX uses external CHIP-8 ROMs as behavioral acceptance tests, but third-party ROM binaries are intentionally not committed to this repository.

The `roms/` directory is ignored by Git except for its `.gitkeep` file. Obtain each required fixture from its upstream source, place it at the documented path, and verify its checksum before running the corresponding conformance test.

## Running conformance tests

The normal project test command does not require third-party ROMs:

```bash
deno task test
```

Run external conformance tests explicitly with:

```bash
deno task test:conformance
```

To run both the normal test suite and locally installed conformance fixtures:

```bash
deno task test:all
```

## IBM Logo ROM

Expected path:

```text
packages/core/tests/conformance/roms/ibm-logo.ch8
```

The historical fixture used for the Chip8NX `v0.0.1` milestone has:

```text
Size:       132 bytes
SHA-256:   8bf3b46d8a64c2074e7538200f684a2eaced258404d3c7d3bd7a917c3d0143e5
MD5:       2dbace8066709ac9a264d23281820d32
```

A useful reference and download entry is the IBM Logo section of the Timendus CHIP-8 test suite:

<https://github.com/Timendus/chip8-test-suite#ibm-logo>

Timendus notes that the original author of the historical ROM is unknown. Chip8NX therefore records the fixture identity but does not redistribute the ROM or claim that it is covered by the Chip8NX MIT license.

On Linux, you can verify a downloaded fixture with:

```bash
sha256sum packages/core/tests/conformance/roms/ibm-logo.ch8
```

On macOS:

```bash
shasum -a 256 packages/core/tests/conformance/roms/ibm-logo.ch8
```

On PowerShell:

```powershell
Get-FileHash packages/core/tests/conformance/roms/ibm-logo.ch8 -Algorithm SHA256
```

## Future fixtures

The next planned external suite is the corax89 CHIP-8 test ROM:

<https://github.com/corax89/chip8-test-rom>

After that, relevant Classic CHIP-8 tests from the Timendus suite are planned:

<https://github.com/Timendus/chip8-test-suite>

When a new fixture becomes part of an automated conformance test, pin its expected filename and checksum here and document its upstream license/provenance in the repository-level [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md).
