# Third-Party Notices

Chip8NX source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party CHIP-8 ROM images and conformance suites are **not distributed with Chip8NX**. They remain subject to the rights, licenses, and provenance of their respective authors or distributors. References and checksums below identify external fixtures used during development; they do not place those files under the Chip8NX license.

## IBM Logo ROM

The historical IBM Logo ROM is not included in this repository.

Timendus' CHIP-8 test-suite documentation describes the classic IBM Logo ROM, provides a download/reference path, and notes that the original author is unknown. The suite's own reimplementation is published as part of the GPL-3.0-licensed `chip8-test-suite` repository.

- Reference: <https://github.com/Timendus/chip8-test-suite#ibm-logo>
  - Expected local filename: `packages/core/tests/conformance/roms/ibm-logo.ch8`
  - Expected size: `132` bytes
  - Expected SHA-256: `8bf3b46d8a64c2074e7538200f684a2eaced258404d3c7d3bd7a917c3d0143e5`
  - Historical MD5, for comparison with older references: `2dbace8066709ac9a264d23281820d32`

The checksums identify the exact historical fixture used for the Chip8NX `v0.0.1` IBM Logo milestone. They are not a statement about ownership or redistribution rights.

## corax89 CHIP-8 Test ROM

The corax89 opcode test is not included in this repository.

- Upstream repository: <https://github.com/corax89/chip8-test-rom>
- Upstream license: MIT
- Upstream ROM filename: `test_opcode.ch8`
  - Expected local filename: `packages/core/tests/conformance/roms/test_opcode.ch8`
  - Expected size: `478` bytes
  - Expected SHA-256: `67759cf9f5b27db66f0769ea8fd0b30ba220f46d6f19f8ba4fd4108d986ce0ab`

The checksums identify the exact historical fixture used for the Chip8NX `v0.1.0` conformance milestone. They are not a statement about ownership or redistribution rights.

## Timendus CHIP-8 Test Suite

The Timendus CHIP-8 test suite is not included in this repository.

- Upstream repository: <https://github.com/Timendus/chip8-test-suite>
- Upstream license: GPL-3.0
- Corax+ upstream ROM filename: `3-corax+.ch8`
  - Expected local filename: `packages/core/tests/conformance/roms/3-corax+.ch8`
  - Expected size: `761` bytes
  - Expected SHA-256: `1c7e14eae14d6d5e1e47693804110354cbc4081defe4e6e5d9167c25ffc7b4b0`
- Flags upstream ROM filename: `4-flags.ch8`
  - Expected local filename: `packages/core/tests/conformance/roms/4-flags.ch8`
  - Flags expected size: `1041` bytes
  - Flags expected SHA-256: `f00ddadd37bc878473de0c8f16faecf9985dea39036a3a796d551bc9fec47cfa`
- Quirks upstream ROM filename: `5-quirks.ch8`
  - Expected local filename: `packages/core/tests/conformance/roms/5-quirks.ch8`
  - Expected size: `3232` bytes
  - Expected SHA-256: `d839350268a3e73c7a16562b3d23c85aa1b92a567f5f61bd6727b1ea44635679`

Chip8NX uses relevant Classic CHIP-8 tests from this suite as external conformance fixtures. These ROMs remain subject to the upstream GPL-3.0 license and are not distributed as part of Chip8NX.
