# Continuous Integration

Chip8NX keeps CI deliberately thin: the repository defines the validation logic, while the hosting service only provides a machine on which to run it.

The project-level contract is:

```bash
deno task ci
```

That task runs:

```text
deno task check
        |
        +--> deno check
        +--> deno fmt --check
        +--> deno lint

then

deno task test
        |
        +--> unit tests
        +--> integration tests
```

External conformance ROMs are intentionally not distributed with Chip8NX, so `deno task ci` does not run `test:conformance`. Conformance tests remain available locally after the documented third-party fixtures are installed.

## GitHub Actions

The GitHub workflow lives at:

```text
.github/workflows/ci.yml
```

It runs on both pushes and pull requests.

### Workflow structure

```yaml
name: CI

on:
  push:
  pull_request:
```

`name` is the label shown in GitHub's Actions interface.

The `on` section defines which repository events start the workflow. Here, every push and every pull-request update is validated.

```yaml
permissions:
  contents: read
```

The workflow only needs permission to read the repository. Declaring that explicitly keeps the default token permissions narrow.

```yaml
jobs:
  test:
    name: Deno 2.9.5
    runs-on: ubuntu-latest
```

A workflow contains one or more jobs. Chip8NX currently needs only one.

`runs-on: ubuntu-latest` asks GitHub to create a temporary Linux runner for the job.

The job name also records the Deno version used by CI. Pinning it to the development version keeps local and hosted validation aligned.

### Checkout

```yaml
- name: Check out repository
  uses: actions/checkout@v4
```

GitHub runners start without the repository contents. `actions/checkout` downloads the commit being tested into the runner workspace.

### Install Deno

```yaml
- name: Set up Deno
  uses: denoland/setup-deno@v2
  with:
    deno-version: v2.9.5
    cache: true
```

`denoland/setup-deno` installs Deno on the temporary runner.

The version is pinned to `2.9.5`, matching the current Chip8NX development environment.

`cache: true` preserves Deno's dependency cache between successful workflow runs. The cache is keyed using the lockfile, so dependency changes naturally invalidate it.

### Reproducible dependency installation

```yaml
- name: Install dependencies
  run: deno ci
```

`deno ci` installs exactly what the committed `deno.lock` describes and fails if the lockfile is missing or inconsistent with the project configuration.

This makes dependency resolution in CI reproducible instead of silently updating the lockfile.

### Run project validation

```yaml
- name: Check and test
  run: deno task ci
```

The hosting workflow does not duplicate formatting, linting, type-checking, or testing commands. It delegates those decisions back to the repository's `deno.json`.

That means the same validation can be reproduced locally with:

```bash
deno ci
deno task ci
```

## Why conformance tests are separate

The IBM Logo and future external test ROMs are not committed to the public repository.

If GitHub Actions ran `deno task test:conformance`, every public CI job would first need to download third-party binaries and make assumptions about their redistribution/licensing. Chip8NX instead keeps those fixtures explicit and local.

The public workflow still type-checks the conformance test source through `deno task check`; it simply does not execute tests that require absent third-party files.

See [Conformance Tests](../../packages/core/tests/conformance/README.md) for fixture setup.

## Forgejo Actions

Forgejo remains free to run its own workflow later.

Forgejo Actions uses a GitHub-Actions-like workflow format, but it is not a guarantee of complete GitHub Actions compatibility. Rather than forcing one workflow file to serve both systems, Chip8NX keeps the important contract forge-independent:

```text
GitHub Actions ----\
                    +--> deno task ci
Forgejo Actions ---/
```

When a Forgejo runner is configured, its workflow can be a small wrapper around the same command.

This keeps the validation rules in the project instead of making either hosting platform part of the build architecture.

## Further reading

- Deno: GitHub Actions — https://docs.deno.com/examples/deno_github_actions_tutorial/
- Deno: `deno ci` — https://docs.deno.com/runtime/reference/cli/ci/
- Forgejo Actions quick start — https://forgejo.org/docs/latest/user/actions/quick-start/
- Forgejo Actions and GitHub Actions differences — https://forgejo.org/docs/latest/user/actions/github-actions/
