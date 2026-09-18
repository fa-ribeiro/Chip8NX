# Guides

This directory contains task-oriented documentation for developers using, embedding, verifying, or extending Chip8NX.

Architecture documents explain **how the system is structured**. Guides explain **how to accomplish a concrete task** or how to choose among supported host-level composition approaches.

## Current guides

- [Embedding the Core](./embedding-the-core.md) — manually assemble, initialize, drive, reset, and recompose a CHIP-8 machine using the public Core API, including Classic CHIP-8, CHIP-48, historical SUPER-CHIP, and Modern SUPER-CHIP profiles, machine characteristics, `instructionSet`, shared-instruction `quirks`, display specifications, font resources, `ExitState`, and persistent `RplFlags`.
- [Disassembling CHIP-8 programs](./disassembling-programs.md) — inspect known instruction ranges, customize formatting, handle errors, and use exploratory whole-ROM traversal.
- [Web application](./web-application.md) — understand the browser host, including selectable Classic/CHIP-48/SUPER-CHIP 1.1/SUPER-CHIP Modern profiles, profile recomposition, shared SUPER-CHIP framebuffer presentation, host-owned RPL persistence, the responsive play-and-inspection workspace, physical and virtual input, Web Audio, execution controls, passive CPU/disassembly/trace inspection, appearance themes, configuration/status presentation, and ROM lifecycle.
- [Terminal composition levels](./terminal-composition-levels.md) — choose between component-level, standard-subsystem, and ready-to-use Terminal composition.
- [Continuous integration](./continuous-integration.md) — reproduce the repository CI contract locally and understand the separate documentation and conformance audits.
- [Release checklist](./release-checklist.md) — prepare, verify, manually exercise affected host behavior, review external conformance when applicable, and tag a Chip8NX milestone release using the repository's existing validation contract.

For design rationale and responsibility boundaries, see the [Architecture documentation](../architecture/README.md).
