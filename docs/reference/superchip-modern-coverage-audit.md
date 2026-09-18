# SUPER-CHIP Modern Coverage Audit

This document records the modern SUPER-CHIP compatibility target implemented by `SUPERCHIP_MODERN_PROFILE`, the semantic differences from the historical `SUPERCHIP_PROFILE`, and the focused and external evidence currently present in Chip8NX.

It is a coverage/reference document rather than a second architecture specification. The canonical classification of machine characteristics, instruction-set semantics, and shared-instruction quirks remains in [Machine profiles and variation](../architecture/machine-profiles-and-variation.md).

## Target

`SUPERCHIP_MODERN_PROFILE` represents the modern SUPER-CHIP behavior targeted by Chip8NX. It is intentionally distinct from the calculator-era SUPER-CHIP 1.1 target documented in [SUPER-CHIP 1.1 coverage audit](./superchip-1.1-coverage-audit.md).

Primary references used for this target are:

- CHIP-8-KB SUPER-CHIP technical reference: <https://chip8kb.gulrak.net/reference/variants/superchip/>
- CHIP-8 extensions and compatibility research: <https://github.com/chip-8/extensions>
- Timendus CHIP-8 test suite v4.2, including Modern SUPER-CHIP automation modes: <https://github.com/Timendus/chip8-test-suite>

The goal is a coherent modern SUPER-CHIP compatibility profile, not XO-CHIP and not every emulator-specific extension.

## Profile characteristics

The profile reuses the structural SUPER-CHIP resources that remain applicable while selecting modern timing and overflow behavior:

```text
memory                 4096 bytes
program start          0x200
stack capacity         16
timer frequency        60 Hz
display refresh        60 Hz
small font             SUPER-CHIP-compatible small font
large font             ten 10-byte decimal glyphs 0–9
initial display mode   low resolution
backing framebuffer    128×64
instruction set        superchip-modern
```

Shared-instruction quirks are:

```text
shift source           Vx
logic VF               unchanged
Fx55 / Fx65 I          unchanged
Bxnn offset            encoded Vx
sprite overflow        clip
sprite draw timing     uniform immediate
Fx1E overflow          continue
```

## Instruction-set semantics

`SUPERCHIP_MODERN_PROFILE` selects:

```text
instructionSet.kind = "superchip-modern"
```

The opcode family is broadly shared with historical SUPER-CHIP, but the exact extension semantics are not identical.

| Instruction / behavior | SUPER-CHIP Modern semantics                      |
| ---------------------- | ------------------------------------------------ |
| `00Cn`                 | scroll down by `n` logical rows                  |
| `00C0`                 | zero-row scroll; no-op                           |
| `00FB`                 | scroll right by four logical pixels              |
| `00FC`                 | scroll left by four logical pixels               |
| `00FD`                 | exit interpreter                                 |
| `00FE`                 | select low mode and clear framebuffer            |
| `00FF`                 | select high mode and clear framebuffer           |
| `Fx30`                 | address the defined ten-glyph large decimal font |
| `Fx75` / `Fx85`        | transfer `V0`–`V7` to/from RPL storage           |
| low-resolution `Dxy0`  | 16×16 sprite, 32 source bytes                    |
| high-resolution `Dxy0` | 16×16 sprite, 32 source bytes                    |
| draw `VF`              | ordinary boolean collision in both modes         |

These meanings belong to `Chip8InstructionSet` because they vary inside the SUPER-CHIP extension family rather than across instructions shared by all supported machine families.

## Historical versus Modern deltas

The important modeled differences are:

| Area                     | SUPER-CHIP 1.1        | SUPER-CHIP Modern   |
| ------------------------ | --------------------- | ------------------- |
| mode change              | preserve framebuffer  | clear framebuffer   |
| `00Cn` low mode          | physical backing rows | logical rows        |
| `00FB` / `00FC` low mode | four backing pixels   | four logical pixels |
| `00C0`                   | exit interpreter      | no-op               |
| low `Dxy0`               | 8×16 logical          | 16×16 logical       |
| high `Dxy0`              | 16×16                 | 16×16               |
| high draw `VF`           | affected-row count    | boolean collision   |
| low draw timing          | vertical-blank gated  | immediate           |
| high draw timing         | immediate             | immediate           |
| `Fx1E` beyond 4 KiB      | exit interpreter      | continue            |
| timer/display cadence    | 64 Hz                 | 60 Hz               |

The shared 128×64 backing-store capability does not own these compatibility choices. `InstructionExecutor` resolves instruction-set and quirk semantics and delegates mechanical state changes to focused collaborators.

## Display model

Modern SUPER-CHIP uses the same switchable display structure:

```text
LOW
    logical 64×32
    backing 128×64
    one logical pixel = 2×2 backing pixels

HIGH
    logical 128×64
    backing 128×64
    one logical pixel = one backing pixel
```

`DisplayBuffer.setMode()` itself remains a mechanical mode change. For Modern `00FE` / `00FF`, execution performs the successful mode change and then clears the framebuffer.

Modern scroll instructions are defined in logical units. The executor translates those units into backing coordinates before calling the physical scroll operations:

```text
LOW 00C3
    3 logical rows
    → 6 backing rows

HIGH 00C3
    3 logical rows
    → 3 backing rows

LOW 00FB / 00FC
    4 logical pixels
    → 8 backing pixels

HIGH 00FB / 00FC
    4 logical pixels
    → 4 backing pixels
```

## Drawing semantics

Modern sprite drawing is uniformly immediate. It neither requires nor consumes `VerticalBlank` in low or high mode.

`Dxy0` is 16×16 in both modes and reads 32 bytes, two bytes per row.

Collision reporting uses ordinary boolean semantics:

```text
no erased pixel
    → VF = 0

one or more erased pixels
    → VF = 1
```

Rows clipped below the display are not added to `VF`, and multiple collision rows do not turn the flag into a row count.

This explicitly differs from historical SUPER-CHIP 1.1 high-resolution affected-row semantics.

## Fonts and RPL flags

Modern SUPER-CHIP reuses the project’s defined ten-glyph large decimal font. `Fx30` continues to calculate:

```text
largeFontBase + Vx × 10
```

Values above `9` are not masked or rejected and therefore address bytes beyond the defined ten glyphs. Chip8NX does not silently add Octo-specific large hexadecimal `A`–`F` glyphs to this SCHIP-MODERN target.

`Fx75` and `Fx85` use the same eight-byte `RplFlags` capability as historical SUPER-CHIP. Endpoints above `V7` remain invalid encodings.

RPL lifetime is separate from instruction-set identity: `MachineInitializer` preserves `RplFlags`, and the Web host owns the concrete store above individual machine sessions.

## Interpreter exit and index overflow

`00FD` exits through `ExitState` in both supported SUPER-CHIP dialects.

Modern `00C0` does not exit; it is a zero-distance scroll.

Modern `Fx1E` selects:

```text
indexOverflow = "continue"
```

so moving `I` beyond the 4 KiB memory address space does not trigger historical interpreter exit. The wider `I` value remains available to subsequent semantics, subject to the normal bounds of operations that actually access memory.

## Focused automated evidence

The repository contains focused tests for Modern SUPER-CHIP covering:

- profile resources and 60 Hz timer/display frequencies;
- `instructionSet.kind = "superchip-modern"`;
- shared quirks including immediate drawing and continued `Fx1E` overflow;
- SUPER-CHIP family membership for extension instructions;
- framebuffer clearing on `00FE` and `00FF`;
- logical vertical scrolling in low and high modes;
- logical horizontal scrolling in low and high modes;
- Modern `00C0` as a no-op;
- 16×16 `Dxy0` in low and high modes;
- boolean collision `VF` with multiple collision rows;
- clipped-bottom rows not contributing to `VF`;
- low-resolution drawing without a vertical blank;
- preservation of an already-pending vertical blank during immediate drawing;
- continued execution after `Fx1E` moves `I` beyond 4 KiB;
- `Fx30` behavior above digit `9`;
- public API exposure of `SUPERCHIP_MODERN_PROFILE` and `superchip-modern`;
- Web-host profile selection and recomposition.

These tests deliberately keep historical and Modern semantics isolated rather than broadening historical conditions mechanically.

## External conformance evidence

Chip8NX uses the pinned Timendus CHIP-8 test suite:

```text
Release:  v4.2
Commit:   cb24d55
```

Modern SUPER-CHIP currently has automated external evidence from:

```text
Timendus Quirks
    automation byte 0x1FF = 2
    → modern SUPER-CHIP behavior

Timendus Scrolling
    automation byte 0x1FF = 1
    → modern low-resolution scrolling
```

The Quirks run exercises the composed shared behavior for logic flags, memory transfer, draw synchronization, clipping, shifts, and jump offsets.

The Scrolling run specifically validates the Modern low-resolution interpretation of `00FB`, `00FC`, and `00Cn` in logical pixels.

Both execute through the normal machine initialization, CPU, runtime, scheduler, timer, vertical-blank, and display pipeline rather than invoking instruction helpers directly.

Fixture identity, checksums, licensing, and all Timendus selector values used by Chip8NX are documented in [`packages/core/tests/conformance/README.md`](../../packages/core/tests/conformance/README.md).

## Deliberate scope limits

The SCHIP-MODERN profile does not claim to implement:

- XO-CHIP;
- expanded memory or four-byte instructions;
- display planes or color-plane selection;
- programmable XO audio patterns/pitch;
- Octo-specific extensions that are not part of the selected SCHIP-MODERN behavior;
- every accidental behavior of historical HP48 SUPER-CHIP.

In particular, XO-CHIP remains intentionally outside the project completion target. The current architecture aims not to prevent such future work, but no XO capability graph, profile registry, expanded-memory abstraction, or plane model is introduced preemptively.

## Completion criterion

For the SCHIP-MODERN milestone, the Core semantic target is considered implemented when:

- the Modern profile is exposed through the public Core API;
- all documented historical-vs-modern deltas above have focused regression coverage;
- Classic CHIP-8 and CHIP-48 remain isolated from SUPER-CHIP-only semantics;
- historical SUPER-CHIP behavior remains unchanged;
- Timendus Modern Quirks and Modern low-resolution Scrolling conformance runs pass;
- the Web host can select and recompose a Modern SUPER-CHIP machine;
- architecture and host documentation distinguish historical and Modern semantics explicitly.

At commit `a010b98`, the implementation and automated behavior described above form the clean SCHIP-MODERN code baseline; this documentation reconciliation records that state without treating the milestone as a released version number.

## Related documentation

- [Machine profiles and variation](../architecture/machine-profiles-and-variation.md)
- [Instruction execution](../architecture/instruction-execution.md)
- [Runtime and timing](../architecture/runtime-and-timing.md)
- [Machine state and capabilities](../architecture/machine-state-and-capabilities.md)
- [Web application guide](../guides/web-application.md)
- [Conformance test fixtures](../../packages/core/tests/conformance/README.md)
- [SUPER-CHIP 1.1 coverage audit](./superchip-1.1-coverage-audit.md)
