# Chip8NX Documentation

This directory contains long-form documentation for the Chip8NX project.

Source-level API behavior should normally be documented with JSDoc close to the TypeScript implementation. Documentation here focuses on concepts that span multiple classes or modules, explains architectural reasoning, and provides task-oriented guides.

## Structure

```text
docs/
├── architecture/
├── guides/
├── reference/
└── decisions/
```

### Architecture

Architecture documents explain how the emulator is structured and how major components collaborate.

See [Architecture](./architecture/README.md).

Current topics include:

- the Core architecture and component relationships;
- CPU fetch/decode/execute flow;
- runtime, timer, and vertical-blank timing;
- machine lifecycle;
- disassembly, instruction inspection, and formatting boundaries;
- host composition across the Terminal and Web applications.

### Guides

Guides explain how to accomplish larger tasks using the emulator or how to understand host-level composition.

See [Guides](./guides/README.md).

Current topics include:

- embedding the CHIP-8 Core in an application;
- disassembling CHIP-8 programs and customizing instruction formatting;
- terminal composition levels and terminal component diagrams;
- continuous integration;
- the Web application and browser-host composition.

### Reference

Reference documents record stable implementation and conformance facts.

See [Reference](./reference/README.md).

Current topics include:

- Classic CHIP-8 opcode coverage audit.

### Decisions

Architecture Decision Records preserve significant design choices and their reasoning.

See [Architecture Decision Records](./decisions/README.md).

ADRs are historical records. New experiments such as the terminal layered-composition case study should not rewrite accepted ADRs until the project deliberately adopts a new architectural decision.

## API documentation

Generated API documentation is produced from the public package entrypoint:

```text
packages/core/mod.ts
```

Generate it with:

```bash
deno task docs:build
```

The generated site is written to:

```text
build/docs/api/
```

Generated documentation is a build artifact and should not be committed to source control.

Documentation diagnostics can be run with:

```bash
deno task docs:check
```

Documentation linting is treated as a public-API audit: exported symbols should either be intentionally public and documented or removed from the public package entrypoint.
