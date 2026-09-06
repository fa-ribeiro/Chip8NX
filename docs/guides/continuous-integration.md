# Continuous Integration

Chip8NX keeps CI deliberately thin: the repository defines the validation contract, while the hosting service only provides a machine on which to run it.

The project-level command is:

```bash
deno task ci
```

It runs the repository's check, test, and Web production-build tasks rather than duplicating their individual commands in the hosting workflow.

## Repository validation contract

Conceptually:

```text
deno task ci
    ↓
deno task check
    ├── deno check
    ├── deno fmt --check
    └── deno lint
    ↓
deno task test
    ├── unit tests
    └── integration tests
    ↓
deno task web:build
    └── production Web bundle
```

External conformance ROMs are not distributed with Chip8NX, so `deno task ci` does not execute `test:conformance`.

Conformance test source is still type-checked by the normal repository checks; only execution requiring absent third-party fixtures is separate.

## Reproduce CI locally

Use the committed lockfile and then run the same project command as the hosted workflow:

```bash
deno ci
deno task ci
```

`deno ci` installs exactly what `deno.lock` describes and fails if the lockfile is missing or inconsistent with project configuration.

## GitHub Actions

The GitHub workflow lives at:

```text
.github/workflows/ci.yml
```

It runs on pushes and pull requests and delegates project validation back to `deno task ci`.

The important structure is:

```yaml
name: CI

on:
  push:
  pull_request:

permissions:
  contents: read
```

The workflow needs only repository read access.

### Runner and Deno version

The current workflow uses an Ubuntu runner and pins the project development Deno version:

```yaml
jobs:
  test:
    name: Deno 2.9.5
    runs-on: ubuntu-latest
```

Deno is installed with the official setup action and dependency caching enabled.

Pinning the version keeps local and hosted validation aligned.

### Checkout and dependencies

A hosted runner starts without repository contents, so the workflow first checks out the commit being tested, then installs the locked dependencies:

```yaml
- name: Check out repository
  uses: actions/checkout@v4

- name: Set up Deno
  uses: denoland/setup-deno@v2
  with:
    deno-version: v2.9.5
    cache: true

- name: Install dependencies
  run: deno ci
```

### Run the repository contract

The final project-validation step is intentionally small:

```yaml
- name: Check and test
  run: deno task ci
```

Formatting, linting, type-checking, and testing remain defined in `deno.json`, so contributors and hosted runners use the same entrypoint.

## Why conformance tests are separate

The IBM Logo and other external conformance ROMs are not committed to the public repository.

Running them in public CI would require downloading third-party binaries and making redistribution/licensing assumptions that the repository intentionally avoids.

Install the documented fixtures locally and run the conformance task when validating emulator compatibility.

See [Conformance Tests](../../packages/core/tests/conformance/README.md) for fixture setup.

## Documentation audit is also separate

Documentation diagnostics are available through:

```bash
deno task docs:check
```

This currently runs Deno's documentation linter against the public Core entrypoint and is treated as a **public-API documentation audit**, not as a CI/release gate.

The repository still has historical `missing-jsdoc` diagnostics. New or substantially changed public APIs should nevertheless receive useful JSDoc where contracts, semantics, invariants, or lifecycle are not obvious.

The long-term goal is to reduce that backlog without adding ceremonial comments merely to satisfy a percentage or gate.

## Forgejo Actions

Forgejo may use its own workflow later.

The important contract is hosting-platform independent:

```text
GitHub Actions ----\
                    +--> deno task ci
Forgejo Actions ---/
```

A future Forgejo workflow can remain a small wrapper around the same repository command rather than becoming a second source of validation policy.
