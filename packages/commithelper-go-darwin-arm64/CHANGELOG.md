# @naverpay/commithelper-go-darwin-arm64

## 1.3.0

### Minor Changes

-   72a0a50: Split Go binaries into platform-specific npm packages

    Each platform now has a dedicated package (`@naverpay/commithelper-go-darwin-arm64`, `-darwin-x64`, `-linux-x64`, `-win32-x64`) declared as `optionalDependencies`. pnpm/npm automatically installs only the package matching the current OS and CPU.

    This removes the `postinstall` script that previously downloaded binaries via `curl` from GitHub Releases, which means:

    -   No more `onlyBuiltDependencies` registration required in consuming projects
    -   No more `--ignore-scripts` needed in CI
    -   Works in Nexus environments (binaries are bundled in the npm package, no external download)
