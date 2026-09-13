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
- [ ] Check documentation for stale assumptions that were invalidated by the milestone, especially constructor signatures, profile lists, lifecycle rules, and responsibility boundaries.

Do not introduce version fields solely for release bookkeeping. Only update files that genuinely carry a project or package version.

Historical milestone text should normally remain historical. Update current-state documentation without rewriting earlier releases as though their later architecture already existed.

## 3. Run the repository validation contract

Install the exact locked dependencies and reproduce the normal CI contract:

```bash
deno ci
deno task ci
```

A release should not be tagged unless this passes.

If the external conformance ROM fixtures are installed and the release changes emulator behavior or conformance-sensitive code, also run:

```bash
deno task test:conformance
```

Public-API documentation diagnostics can be reviewed with:

```bash
deno task docs:check
```

`docs:check` should be reviewed as part of release preparation. Historical `missing-jsdoc` diagnostics may still exist in the repository; distinguish those known diagnostics from newly introduced documentation problems rather than treating their mere presence as either a new failure or an automatic success.

## 4. Perform application-level manual verification

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
- [ ] profile changes recompose the machine successfully when profile selection changed;
- [ ] framebuffer presentation shows the complete emulated display at the correct geometry when display behavior changed.

For `v0.9.0`, explicitly verify:

- [ ] Classic CHIP-8 ROMs still run under the Classic profile;
- [ ] CHIP-48 ROMs still run under the CHIP-48 profile;
- [ ] selecting SUPER-CHIP 1.1 recomposes and restarts the current ROM successfully;
- [ ] a SUPER-CHIP ROM can use both 64×32 and 128×64 display modes;
- [ ] the full SUPER-CHIP framebuffer is visible in both modes rather than only a scaled top-left region;
- [ ] changing profiles while a ROM is loaded preserves the expected running/paused host state.

These checks deliberately remain application-owned. A presentation bug does not necessarily imply a Core semantic bug, and a green Core test suite does not prove that a host adapter interprets Core state correctly.

## 5. Review the release candidate

- [ ] Review the complete release diff.
- [ ] Check for whitespace errors:

  ```bash
  git diff --check
  ```

- [ ] Confirm the working tree contains only the intended release changes:

  ```bash
  git status --short
  ```

- [ ] Confirm README, changelog, documentation, implementation, tests, and public API describe the same behavior.
- [ ] Confirm generated or temporary files are not accidentally included in the release commit.

At this point the release candidate is ready to commit.

## 6. Complete the release

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
