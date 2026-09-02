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

See [Architecture](./architecture/README.md) for the architecture documentation index.

Current topics include:

- architecture overview;
- machine lifecycle.

### Guides

Guides explain how to accomplish larger tasks using the emulator core.

See [Guides](./guides/README.md) for the guides documentation index.

Current topics include:

- embedding the CHIP-8 core in an application;
- continuous integration.

### Reference

Reference documents record stable implementation and conformance facts.

See [Reference](./reference/README.md) for the reference documentation index.

Current topics include:

- Classic CHIP-8 opcode coverage audit.

### Decisions

Architecture Decision Records (ADRs) preserve important design choices and the reasoning behind them.

See [Architecture Decision Records](./decisions/README.md) for the decision index and ADR conventions.

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

Documentation linting is intentionally treated as a public-API audit: exported symbols should either be intentionally public and documented, or removed from the public package entrypoint.
