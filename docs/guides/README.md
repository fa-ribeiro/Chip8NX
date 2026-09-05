# Guides

This directory contains task-oriented documentation for developers using, embedding, or extending Chip8NX.

Architecture documents explain how the system is structured. Guides instead explain how to accomplish a concrete task or how to choose among supported composition approaches.

## Current guides

- [Embedding the Core](./embedding-the-core.md) — manually assemble, initialize, and drive a CHIP-8 machine from an application.
- [Disassembling CHIP-8 programs](./disassembling-programs.md) — disassemble known instruction ranges, inspect individual instructions, customize formatting, handle disassembly errors, and use the exploratory whole-ROM CLI.
- [Terminal composition levels](./terminal-composition-levels.md) — compare component-level, standard-subsystem, and ready-to-use terminal composition with visual component diagrams and runnable examples.
- [Continuous integration](./continuous-integration.md) — understand and run the repository CI contract locally.
- [Web application](./web-application.md) — understand the browser host architecture, including Canvas presentation, physical and virtual input, multi-source keyboard composition, Web Audio, and runtime lifecycle.
