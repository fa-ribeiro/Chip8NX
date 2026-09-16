# SUPER-CHIP 1.1 Coverage Audit

This document records the historical SUPER-CHIP 1.1 behavior that Chip8NX intentionally targets for `v0.9.0`, the implementation boundaries that provide it, the focused automated evidence currently present in the repository, and the historical calculator details that are deliberately outside the milestone.

It is a coverage/reference document rather than a second architecture specification. Architecture ownership remains documented under [`docs/architecture`](../architecture/README.md).

## Target

The `SUPERCHIP_PROFILE` target is the calculator-era SUPER-CHIP 1.1 machine, sometimes called **legacy SUPER-CHIP** to distinguish it from simplified modern SCHIP behavior.

Primary historical references used by the project are:

- CHIP-8-KB SUPER-CHIP technical reference: <https://chip8kb.gulrak.net/reference/variants/superchip/>
- CHIP-8 extensions and compatibility research: <https://github.com/chip-8/extensions>
- Timendus CHIP-8 test suite, including legacy SUPER-CHIP modes: <https://github.com/Timendus/chip8-test-suite>

The goal is to model observable virtual-machine semantics useful to CHIP-8 programs. The goal is **not** cycle-accurate HP48 hardware emulation.

## Profile characteristics

`SUPERCHIP_PROFILE` currently defines:

```text
memory                 4096 bytes
program start          0x200
stack capacity         16
timer frequency        64 Hz
display refresh        64 Hz
small font             CHIP-48 / SUPER-CHIP font at 0x000
large font             SUPER-CHIP 1.1 8×10 digits at 0x0A0
initial display mode   low resolution
backing framebuffer    128×64
```

The profile reuses CHIP-48-compatible instruction behavior where SUPER-CHIP inherited CHIP-48 semantics, then overrides the dimensions where SUPER-CHIP 1.1 differs.

## Compatibility semantics

The profile selects these compatibility-sensitive behaviors:

| Behavior                               | SUPER-CHIP 1.1                         |
| -------------------------------------- | -------------------------------------- |
| `8xy6` / `8xyE` shift source           | `Vx`                                   |
| `8xy1` / `8xy2` / `8xy3` and `VF`      | leave `VF` unchanged                   |
| `Bxnn` offset source                   | encoded `Vx`                           |
| `Fx55` / `Fx65` effect on `I`          | unchanged                              |
| sprite overflow                        | clip                                   |
| low-resolution draw timing             | vertical-blank gated                   |
| high-resolution draw timing            | immediate                              |
| `00FD`                                 | exit interpreter                       |
| `Fx75` / `Fx85`                        | persistent RPL storage, `V0`–`V7` only |
| `Fx1E` leaving the 4 KiB address space | exit interpreter                       |
| `00C0`                                 | exit interpreter                       |

Classic CHIP-8 and CHIP-48 deliberately reject `00FD` and RPL transfers through profile compatibility rather than inheriting SUPER-CHIP support merely because `ExitState` and `RplFlags` exist in `ExecutionContext`.

## Display model

SUPER-CHIP uses one shared 128×64 backing framebuffer.

### Low-resolution mode

```text
logical resolution     64×32
backing resolution     128×64
logical pixel          2×2 backing pixels
```

Mode switching does not clear or transform the backing framebuffer.

`Dxyn` is synchronized to vertical blank in low-resolution mode.

`Dxy0` reads 16 bytes and draws an 8×16 logical sprite. Because one low-resolution logical pixel maps to a 2×2 backing block, the resulting backing representation remains compatible with the shared 128×64 store.

Collision reporting remains boolean in low-resolution mode.

### High-resolution mode

```text
logical resolution     128×64
backing resolution     128×64
logical pixel          one backing pixel
```

Drawing is immediate rather than vertical-blank gated.

`Dxy0` reads 32 bytes and draws a 16×16 sprite, two bytes per row, most-significant byte first.

For high-resolution drawing, `VF` reports the number of affected rows:

```text
collision rows + rows clipped below the bottom edge
```

## Display-control instructions

The implemented SUPER-CHIP display instructions are:

| Opcode | Behavior                                                  |
| ------ | --------------------------------------------------------- |
| `00Cn` | scroll backing framebuffer down by `n` physical rows      |
| `00FB` | scroll backing framebuffer right by four physical columns |
| `00FC` | scroll backing framebuffer left by four physical columns  |
| `00FE` | select low-resolution mode                                |
| `00FF` | select high-resolution mode                               |

Scrolling is expressed in physical backing coordinates, not logical low-resolution pixels. This permits half-logical-pixel scrolling in low-resolution mode, matching the historical shared-framebuffer model.

`00C0` is a special historical boundary case. The calculator SUPER-CHIP 1.1 reference describes it as invalid and ending the interpreter. Chip8NX therefore decodes the `00Cn` family uniformly but resolves the zero-row behavior from profile compatibility during execution.

## Interpreter exit

`00FD` marks `ExitState` as exited.

Subsequent `Cpu.step()` calls return before fetching memory, decoding, execution, or trace production. Machine initialization resets `ExitState` so execution can begin again.

Interpreter exit is not represented as:

- a JavaScript exception;
- an automatic `Chip8Runtime.pause()`;
- host process termination;
- a browser callback.

This keeps the machine semantic separate from host lifecycle policy.

The historical index-overflow behavior of `Fx1E` uses the same exit state. After adding `Vx`, if `I` is outside the configured memory address space, the interpreter exits. The wider `I` value is retained; the exit prevents later instruction fetches until reset/reinitialization.

## Fonts

The small font is the CHIP-48/SUPER-CHIP font installed at `0x000`.

The SUPER-CHIP 1.1 large font contains ten 10-byte glyphs for decimal digits `0` through `9` and is installed at `0x0A0`.

`Fx30` requests the large font through the `Font` capability.

Values above `9` are intentionally not masked to a hexadecimal digit. On the historical interpreter they address bytes beyond the defined ten large glyphs rather than selecting modern 0–F large-font data.

## Persistent RPL flags

`Fx75` stores `V0` through `Vx` in the eight RPL user flags.

`Fx85` loads `V0` through `Vx` from those flags.

Only `x <= 7` is a valid instruction encoding. The decoder rejects `Fx75` / `Fx85` with a larger endpoint before execution begins, which prevents partial mutation of the valid RPL range.

`RplFlags` deliberately has a longer lifetime than ordinary resettable machine state:

```text
MachineInitializer.initialize()
    ordinary machine state   reset
    ExitState                reset
    RplFlags                 preserved
```

In the Web host, the RPL store is owned above individual `WebMachineSession` objects and is reused across reset, ROM replacement, and profile recomposition for the lifetime of the page.

Persistence across browser reloads or application restarts is not currently part of the host contract.

## Focused automated evidence

The repository contains focused tests for the SUPER-CHIP implementation, including:

- profile characteristics and compatibility choices;
- shared backing geometry and initial low-resolution mode;
- mode switching without implicit framebuffer clear;
- physical vertical and horizontal scrolling;
- low-resolution 2×2 backing mapping;
- wide-sprite drawing;
- low-resolution and high-resolution `Dxy0` behavior;
- high-resolution affected-row `VF` behavior;
- low-resolution vertical-blank timing and high-resolution immediate drawing;
- large-font image contents and `Fx30` lookup;
- `00FD` exit state and pre-fetch CPU exit guard;
- `00C0` interpreter exit;
- `Fx1E` interpreter exit on address-space overflow;
- `Fx75` / `Fx85` transfers and decoder rejection above `V7`;
- preservation of RPL storage during machine initialization;
- public-API composition of the SUPER-CHIP profile, display, large font, and interpreter exit;
- Web rendering of the full physical backing framebuffer.

The public profile API test also verifies that Classic CHIP-8, CHIP-48, and SUPER-CHIP are all exposed through the reusable Core entrypoint.

## External conformance status

Chip8NX now includes automated external conformance coverage for its historical SUPER-CHIP 1.1 profile using the pinned Timendus CHIP-8 test suite fixtures.

The Timendus suite is pinned to:

```text
Release:  v4.2
Commit:   cb24d55
```

The SUPER-CHIP conformance coverage currently includes:

- the Timendus Quirks test in forced legacy SUPER-CHIP mode (`0x1FF = 4`);
- the Timendus Scrolling test in legacy low-resolution mode (`0x1FF = 2`);
- the Timendus Scrolling test in high-resolution mode (`0x1FF = 3`).

The Quirks test provides external evidence for compatibility-sensitive behavior including:

- logical-operation `VF` behavior;
- `Fx55` / `Fx65` index-register behavior;
- display synchronization;
- sprite clipping;
- shift-source behavior;
- jump-offset behavior.

The Scrolling test provides external evidence for:

- `00FB` horizontal scrolling;
- `00FC` horizontal scrolling;
- `00Cn` vertical scrolling;
- historical low-resolution scrolling in physical backing pixels;
- high-resolution scrolling;
- low/high display-mode behavior exercised through the normal machine pipeline.

These tests execute the third-party ROMs through Chip8NX's normal initialization, CPU, runtime, scheduler, timer, vertical-blank, and display collaborators rather than testing the individual instructions in isolation.

The exact fixture filenames, checksums, automation selections, upstream release, and licensing information are documented in [`packages/core/tests/conformance/README.md`](../../packages/core/tests/conformance/README.md) and the repository-level [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md).

Focused unit and integration tests remain the primary evidence for SUPER-CHIP behaviors not exercised by these external fixtures, including interpreter exit, RPL persistence, large-font behavior, wide-sprite collision semantics, and historical boundary cases such as `00C0` and overflowing `Fx1E`.

## Deliberate historical exclusions

Chip8NX targets useful observable SUPER-CHIP 1.1 virtual-machine behavior, not every consequence of the original HP48 implementation.

The following details are intentionally outside the `v0.9.0` target:

### Random/uninitialized RAM

The original calculator implementation could expose uninitialized/random RAM. Chip8NX initializes memory deterministically.

Deterministic memory is preferable for a reusable emulator core and test suite, and programs should not depend on unspecified startup garbage.

### Final-byte crash/off-by-one behavior

Historical implementations could fail when using the final RAM byte because of an implementation accident. Chip8NX models the declared 4 KiB address space normally rather than reproducing that crash.

### Exact HP48 execution speed

The calculator interpreter's exact instruction throughput is not part of the profile. CPU frequency remains host/runtime policy in Chip8NX.

The profile does retain the historical 64 Hz timer/display cadence.

### Calculator LCD geometry

The physical HP48 LCD had details beyond the 128×64 interpreter framebuffer. Chip8NX models the interpreter framebuffer, not unused physical LCD columns.

### Obscure low-resolution odd-row copy artifact

The calculator's exact low-resolution drawing routine could produce odd-row artifacts after particular high-to-low mode transitions. Chip8NX deliberately models low-resolution pixels as clean 2×2 backing blocks instead of reproducing that implementation artifact.

This is an explicit simplification. The shared 128×64 backing store, no-clear mode switching, half-pixel physical scrolling, and observable logical drawing semantics remain represented.

## Release criterion

For `v0.9.0`, the SUPER-CHIP foundation is considered complete when:

- the documented profile characteristics match the implementation;
- every implemented extended instruction has focused decoder/executor/display coverage;
- SUPER-CHIP-only instructions do not silently execute under Classic CHIP-8 or CHIP-48;
- RPL endpoint validation occurs before execution side effects;
- display-mode-dependent timing and collision semantics remain covered;
- `00C0` and `Fx1E` historical exit behavior remain covered;
- public package composition can construct and execute a SUPER-CHIP machine;
- Web presentation correctly renders the complete backing framebuffer and reports the active logical resolution;
- the normal CI, Classic/multi-profile conformance, documentation audit, and whitespace gates are green locally.

## Related documentation

- [Architecture overview](../architecture/overview.md)
- [Instruction execution](../architecture/instruction-execution.md)
- [Machine state and capabilities](../architecture/machine-state-and-capabilities.md)
- [Machine initialization](../architecture/machine-initialization.md)
- [Runtime and timing](../architecture/runtime-and-timing.md)
- [Web application guide](../guides/web-application.md)
- [Classic CHIP-8 opcode coverage audit](./classic-opcode-audit.md)
