# @naverpay/commithelper-go

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
