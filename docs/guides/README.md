# Guides

This directory contains task-oriented documentation for developers using, embedding, or extending Chip8NX.

Architecture documents explain **how the system is structured**. Guides explain **how to accomplish a concrete task** or how to choose among supported host-level composition approaches.

## Current guides

- [Embedding the Core](./embedding-the-core.md) — manually assemble, initialize, and drive a CHIP-8 machine from an application.
- [Disassembling CHIP-8 programs](./disassembling-programs.md) — inspect known instruction ranges, customize formatting, handle errors, and use exploratory whole-ROM traversal.
- [Web application](./web-application.md) — understand the browser host, including the responsive play-and-inspection workspace, Canvas presentation, physical and virtual input, Web Audio, execution controls, passive CPU/disassembly/trace inspection, appearance themes, and ROM lifecycle.
- [Terminal composition levels](./terminal-composition-levels.md) — choose between component-level, standard-subsystem, and ready-to-use Terminal composition.
- [Continuous integration](./continuous-integration.md) — reproduce the repository CI contract locally and understand the separate documentation/conformance audits.
- [Release checklist](./release-checklist.md) — prepare, verify, and tag a Chip8NX milestone release using the repository's existing validation contract.

For design rationale and responsibility boundaries, see the [Architecture documentation](../architecture/README.md).
