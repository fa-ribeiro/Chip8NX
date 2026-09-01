# Third-Party Notices

Chip8NX source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party CHIP-8 ROM images and conformance suites are **not distributed with Chip8NX**. They remain subject to the rights, licenses, and provenance of their respective authors or distributors. References and checksums below identify external fixtures used during development; they do not place those files under the Chip8NX license.

## IBM Logo ROM

The historical IBM Logo ROM is not included in this repository.

Timendus' CHIP-8 test-suite documentation describes the classic IBM Logo ROM, provides a download/reference path, and notes that the original author is unknown. The suite's own reimplementation is published as part of the GPL-3.0-licensed `chip8-test-suite` repository.

- Reference: https://github.com/Timendus/chip8-test-suite#ibm-logo
- Expected local filename: `packages/core/tests/conformance/roms/ibm-logo.ch8`
- Expected size: `132` bytes
- Expected SHA-256: `8bf3b46d8a64c2074e7538200f684a2eaced258404d3c7d3bd7a917c3d0143e5`
- Historical MD5, for comparison with older references: `2dbace8066709ac9a264d23281820d32`

The checksums identify the exact historical fixture used for the Chip8NX `v0.0.1` IBM Logo milestone. They are not a statement about ownership or redistribution rights.

## corax89 CHIP-8 Test ROM

The corax89 opcode test is not included in this repository.

- Upstream repository: https://github.com/corax89/chip8-test-rom
- Upstream license: MIT
- Upstream ROM filename: `test_opcode.ch8`

Chip8NX plans to use this suite as the `v0.1.0` conformance milestone. A pinned local filename and checksum will be documented when that fixture is integrated into an automated conformance test.

## Timendus CHIP-8 Test Suite

The Timendus test suite is not included in this repository.

- Upstream repository: https://github.com/Timendus/chip8-test-suite
- Upstream license: GPL-3.0

Chip8NX intends to use relevant Classic CHIP-8 tests from this suite as a broader conformance target after the corax89 milestone.
