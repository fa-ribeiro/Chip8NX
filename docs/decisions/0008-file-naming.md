# ADR 0008: Lowercase Kebab-Case Filenames

- **Status:** Accepted
- **Date:** 2026-08-24

## Context

The project is developed on both Linux, where filenames are commonly case-sensitive, and Windows, where filesystems are commonly case-insensitive.

Inconsistent filename casing can therefore produce imports that work in one environment and fail in another.

## Decision

Use lowercase kebab-case for TypeScript filenames.

Examples:

```text
scheduler.ts
scheduler.test.ts
display-buffer.ts
random-number-generator.ts
machine-initializer.ts
```

Avoid filenames that differ only by case.

TypeScript class and type names remain PascalCase; this decision applies to filenames.

## Rationale

Consistent lowercase naming avoids cross-platform filesystem surprises and keeps import paths predictable.

## Consequences

### Positive

- Import paths follow one predictable convention.
- Cross-platform case-sensitivity problems are less likely.
- Filenames remain easy to scan.

### Negative

- Names containing several domain words can become relatively long.

## Alternatives Considered

### PascalCase filenames matching class names

Rejected because lowercase paths are less susceptible to case-only filesystem differences and fit the project's existing module naming convention.

## Related Decisions

- None currently.
