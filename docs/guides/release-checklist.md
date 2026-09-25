# Release Checklist

Chip8NX uses small milestone releases to record meaningful stages in the emulator's development.

This checklist keeps release preparation repeatable without introducing release automation before the project needs it.

The repository is the source of truth. A release should describe the state that is actually committed and verified, rather than changing implementation merely to satisfy release bookkeeping.

## 1. Confirm the release boundary

- [ ] Choose the version according to the project's Semantic Versioning policy.
- [ ] Choose a short milestone title.
- [ ] Review the changes since the previous release:

  ```bash
  git log <previous-tag>..HEAD --oneline
  git diff <previous-tag>...HEAD
  ```

- [ ] Confirm that the release contains no unfinished or unintended work.

During `0.x`, PATCH releases are maintenance changes that do not represent a new emulator capability milestone. MINOR releases represent meaningful capability or conformance milestones and may include public-API changes.

## 2. Reconcile release documentation

- [ ] Add the new release section to `CHANGELOG.md` and leave `Unreleased` ready for subsequent development.
- [ ] Update the root `README.md` current-release status.
- [ ] Update the README milestone history when the release represents a new project milestone.
- [ ] Reconcile future-work wording so completed capabilities are no longer described as future work.
- [ ] Update architecture, guide, reference, or documentation indexes when the release changes documented behavior or adds/moves documentation.
- [ ] Check examples and command lines against the current repository.
- [ ] Check documentation for stale assumptions invalidated by the milestone, especially constructor signatures, profile fields, profile lists, lifecycle rules, and responsibility boundaries.
- [ ] When profile semantics changed, verify that current-state documentation consistently distinguishes:

  ```text
  machine characteristics
      → memory / stack / display / timing / fonts

  instructionSet
      → which instruction semantics exist

  quirks
      → how shared instructions vary
  ```

- [ ] Check that extension-specific semantics are not accidentally documented as generic support/compatibility flags.
- [ ] Check that persistent-state lifetime is documented separately from instruction-set membership where relevant, especially for SUPER-CHIP `RplFlags`.

Do not introduce version fields solely for release bookkeeping. Only update files that genuinely carry a project or package version.

Historical milestone text and accepted ADRs should normally remain historical. Update current-state documentation without rewriting earlier decisions as though their later architecture already existed.

## 3. Run the repository validation contract

Install the exact locked dependencies and reproduce the normal CI contract:

```bash
deno ci
deno task ci
```

A release should not be tagged unless this passes.

The normal `ci` task intentionally does not run the external ROM conformance suite. When external conformance fixtures are installed and the release changes machine semantics, profiles, decoding/execution behavior, display behavior, timing, initialization, or conformance-sensitive code, also run:

```bash
deno task test:conformance
```

For the `v1.0.0` release, run the full conformance suite regardless of whether the final release-preparation diff itself changes machine semantics. `v1.0.0` establishes the stable supported-profile conformance contract, so that contract must be verified explicitly on the release candidate.

Treat this as a separate release-quality gate rather than silently assuming it was covered by `deno task ci`.

For releases that change a supported profile or its semantic model, review the relevant conformance targets explicitly. Current SUPER-CHIP coverage includes pinned Timendus v4.2 Quirks runs for legacy and Modern SUPER-CHIP, plus Scrolling runs for Modern low-resolution, legacy low-resolution, and high-resolution behavior documented in [`packages/core/tests/conformance/README.md`](../../packages/core/tests/conformance/README.md).

Review public-API documentation diagnostics:

```bash
deno task docs:check
```

`docs:check` currently reports an accepted baseline of `missing-jsdoc` diagnostics. Release preparation must distinguish those known diagnostics from newly introduced documentation problems.

A release should not introduce new documentation-lint diagnostics relative to the accepted baseline. Existing accepted `missing-jsdoc` diagnostics may remain until they are addressed deliberately in a bounded documentation pass.

Also check for simple textual/mechanical problems:

```bash
git diff --check
```

## 4. Verify profile and instruction-set boundaries

When a release changes profile semantics, extension support, or composition, verify that resources/capabilities do not accidentally grant instruction-set membership.

Typical checks include:

- [ ] Classic CHIP-8 still executes with the base `chip8` instruction set and its own shared-instruction quirks.
- [ ] CHIP-48 still executes with the base `chip8` instruction set and its own shared-instruction quirks.
- [ ] SUPER-CHIP 1.1 executes with `instructionSet.kind = "superchip-1.1"` and its intended shared-instruction quirks.
- [ ] SUPER-CHIP Modern executes with `instructionSet.kind = "superchip-modern"` and its intended 60 Hz, immediate-draw, and continued-index-overflow profile semantics.
- [ ] A SUPER-CHIP-capable `DisplayBuffer` does not make SUPER-CHIP-only instructions executable under Classic CHIP-8 or CHIP-48.
- [ ] `Fx30`, `Fx75`, `Fx85`, SUPER-CHIP display controls, and extended `Dxy0` remain gated by SUPER-CHIP instruction-set semantics rather than by resource presence alone.
- [ ] Historical-only semantics (physical scrolling, `00C0` exit, low 8×16 `Dxy0`, high affected-row `VF`) do not leak into Modern SUPER-CHIP, and Modern-only semantics (mode clear, logical scrolling, 16×16 low `Dxy0`) do not leak into historical SUPER-CHIP.
- [ ] Shared behaviors such as shifts, `Fx55` / `Fx65`, `Bnnn`, logic `VF`, sprite timing, sprite overflow, and `Fx1E` overflow follow the selected `Chip8Quirks` values.
- [ ] `MachineInitializer` resets ordinary state including `ExitState` but preserves `RplFlags`.

These checks should normally be protected by focused unit/integration tests. The release review verifies that the tests, public API, and documentation still describe the same boundary.

## 5. Perform application-level manual verification

Automated tests validate machine semantics and focused adapters, but they cannot prove that a complete host application presents the machine correctly.

For releases that change an interactive host, run that host and exercise the affected workflow manually.

For the Web application:

```bash
deno task web
```

Then verify the behavior relevant to the release. Typical checks include:

- [ ] a ROM can be loaded and starts normally;
- [ ] Start/Pause, Step, and Reset still behave as expected;
- [ ] physical and virtual keyboard input still work when relevant;
- [ ] audio presentation still behaves normally when relevant;
- [ ] inspection views continue to update without affecting execution;
- [ ] an enabled address breakpoint pauses **before** the instruction at that address executes;
- [ ] Continue resumes past the stopped breakpoint, including a retryable instruction such as a vblank-gated `DRW`;
- [ ] Step from a breakpoint performs one CPU attempt without immediately re-triggering the scheduled breakpoint gate;
- [ ] configured breakpoints survive ordinary Reset and profile recomposition, while loading another ROM clears them;
- [ ] Memory inspection remains passive, supports PC/I quick navigation and page navigation, and handles the end of memory without fabricating bytes;
- [ ] profile changes recompose the machine successfully when profile selection changed;
- [ ] changing profile while a ROM is loaded preserves the expected running/paused host state;
- [ ] reset retains the session's selected profile rather than substituting a default profile;
- [ ] SUPER-CHIP RPL contents survive reset/session recomposition according to the current Web lifetime contract when relevant;
- [ ] framebuffer presentation shows the complete physical backing framebuffer at the correct geometry when display behavior changed;
- [ ] SUPER-CHIP low mode presents the 64×32 logical machine over the shared 128×64 backing framebuffer correctly;
- [ ] SUPER-CHIP high mode presents 128×64 correctly;
- [ ] the visible resolution/mode status follows live `DisplayBuffer` state after `00FE` / `00FF` changes;
- [ ] appearance/theme changes alter presentation only and do not reset or otherwise modify machine state.

These checks deliberately remain application-owned. A presentation bug does not necessarily imply a Core semantic bug, and a green Core test suite does not prove that a host adapter interprets Core state correctly.

## 6. Review conformance claims

External ROM conformance and internal unit/integration coverage are different kinds of evidence.

Before release:

- [ ] confirm every conformance claim in README/reference/release notes corresponds to a test that actually exists;
- [ ] confirm the required third-party fixture is pinned/documented with the expected path, version/commit where applicable, checksum, provenance, and license;
- [ ] confirm the conformance suite was actually run locally when the release depends on that evidence;
- [ ] do not describe focused internal tests as external conformance;
- [ ] do not describe a fixture as future work once an automated test for it is part of the repository;
- [ ] do not claim a broader variant dialect than the machine profile actually targets.

Keep both SUPER-CHIP targets explicit. `SUPERCHIP_PROFILE` models the documented historical/legacy SUPER-CHIP 1.1 semantics used by the project, not a generic modern SCHIP dialect and not every HP48 implementation accident. `SUPERCHIP_MODERN_PROFILE` models the documented modern SUPER-CHIP compatibility behavior targeted by the project; it should not silently absorb unrelated XO-CHIP or emulator-specific extensions.

## 7. Review the release candidate

- [ ] Review the complete release diff.
- [ ] Check for whitespace errors:

  ```bash
  git diff --check
  ```

- [ ] Confirm the working tree contains only the intended release changes:

  ```bash
  git status --short
  ```

- [ ] Confirm README, changelog, documentation, implementation, tests, conformance evidence, and public API describe the same behavior.
- [ ] Confirm generated or temporary files are not accidentally included in the release commit.
- [ ] Confirm historical ADRs were not rewritten merely to match the current architecture; use current-state docs or later consequences/decisions instead.

At this point the release candidate is ready to commit.

## 8. Complete the release

After committing and pushing the release-preparation changes:

- [ ] Confirm hosted CI passes for the release commit.
- [ ] Confirm the working tree is clean.
- [ ] Create an annotated release tag:

  ```bash
  git tag -a vX.Y.Z -m "<release title>"
  ```

- [ ] Push the tag:

  ```bash
  git push origin vX.Y.Z
  ```

- [ ] Verify that the tag points to the intended release commit.

GitHub Release objects are not currently part of the Chip8NX release contract. They can be introduced later if the project develops a need for packaged release notes or downloadable release artifacts beyond Git tags.
