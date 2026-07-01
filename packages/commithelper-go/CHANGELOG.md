# @naverpay/commithelper-go

## 1.4.0

### Minor Changes

-   bea4bcc: Add `passthrough` for verbatim Jira/Linear-style issue keys, plus two tagging fixes and a bundled JSON schema.

    -   **`passthrough`.** List the project keys to recognize (e.g. `"passthrough": ["PROJ", "OPS"]`); a branch like `feature/PROJ-1871` is tagged `[PROJ-1871]`. Key recognition matches Jigit (`<KEY>-<1–7 digit number>`, found anywhere in the branch), so a listed project links identically in commithelper and Jigit. Only listed projects are tagged, so unrelated `UPPERCASE-NUMBER` tokens (e.g. `UTF-8`) are not mistaken for issues. `rules` (GitHub prefixes) take precedence when a branch matches both.
    -   **Idempotent re-tagging.** A message is left unchanged when the branch's reference is already present as a whole token, so `git commit --amend` and hook re-runs never stack tags — including template tags placed in the message body.
    -   **Protected branches** are evaluated before the already-tagged check, so a pre-tagged message cannot bypass `protect`.
    -   **`schema.json`** is bundled in the package; reference it via `"$schema": "./node_modules/@naverpay/commithelper-go/schema.json"` for editor autocompletion and validation (works offline, no CDN).

## 1.3.1

### Patch Changes

-   860f7da: fix: branch prefix with hyphens not being matched

## 1.3.0

### Minor Changes

-   72a0a50: Split Go binaries into platform-specific npm packages

    Each platform now has a dedicated package (`@naverpay/commithelper-go-darwin-arm64`, `-darwin-x64`, `-linux-x64`, `-win32-x64`) declared as `optionalDependencies`. pnpm/npm automatically installs only the package matching the current OS and CPU.

    This removes the `postinstall` script that previously downloaded binaries via `curl` from GitHub Releases, which means:

    -   No more `onlyBuiltDependencies` registration required in consuming projects
    -   No more `--ignore-scripts` needed in CI
    -   Works in Nexus environments (binaries are bundled in the npm package, no external download)

## 1.2.0

### Minor Changes

-   becbe27: Support glob-style wildcard patterns in protect option

### Patch Changes

-   5e93334: Return error for invalid protect patterns instead of silently ignoring them

## 1.1.0

### Minor Changes

-   fa045c4: [commithelper-go] Add support for custom commit message templates

    PR: [[commithelper-go] Add support for custom commit message templates](https://github.com/NaverPayDev/cli/pull/50)

## 1.0.1

### Patch Changes

-   e5688ab: Modify Config struct to include Protect field and add branch protection check

    PR: [Modify Config struct to include Protect field and add branch protection check](https://github.com/NaverPayDev/cli/pull/44)

## 1.0.0

### Major Changes

-   171da67: Initial major release with core features.

### Patch Changes

-   7912854: Modify main.go to handle unchanged commit messages without modification

    PR: [Modify main.go to handle unchanged commit messages without modification](https://github.com/NaverPayDev/cli/pull/43)
