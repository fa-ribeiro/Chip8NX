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
- [ ] Update architecture, guide, or documentation indexes when the release added or moved documentation.
- [ ] Check examples and command lines against the current repository.

Do not introduce version fields solely for release bookkeeping. Only update files that genuinely carry a project or package version.

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

`docs:check` is currently an audit rather than a release gate because the repository still contains historical `missing-jsdoc` diagnostics.

## 4. Review the release candidate

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

At this point the release candidate is ready to commit.

## 5. Complete the release

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
