# @naverpay/commithelper-go

A Go-based CLI tool to assist your commit messages based on [husky](https://typicode.github.io/husky/) `commit-msg` hook.

## Performance Comparison with @naverpay/commit-helper

`@naverpay/commithelper-go` is a Go-based rewrite of `@naverpay/commit-helper` with significant performance improvements:

- **⚡ Speed**: 5-6x faster execution compared to Node.js version
- **📦 Memory**: Lower memory footprint due to compiled binary
- **🚀 Startup**: Instant startup time vs Node.js runtime initialization
- **🔧 Dependencies**: Zero runtime dependencies after installation

## Installation

```bash
npm install @naverpay/commithelper-go
```

Or install globally:

```bash
npm install -g @naverpay/commithelper-go
```

## How to use

### .husky/commit-msg

```bash
node node_modules/@naverpay/commithelper-go/bin/cli.js "$1"
```

> `@latest` is not necessary but this option always provides latest version of commithelper-go.

### .lefthook.yml

```yaml
commit-msg:
  commands:
    commithelper:
      run: node node_modules/@naverpay/commithelper-go/bin/cli.js {1}
```

> [!TIP]
>
> `npx` adds ~460ms of overhead even when the package is installed locally.
> Calling `node cli.js` directly takes ~76ms — **about 6x faster** than `npx`.
> For hooks that run on every commit, direct `node` invocation is recommended.

## What it does

### Tag related issue

> Automatically Add your related github issue number at your commit message through your branch name

```shell
➜  your-repo git:(feature/1) git add . &&  git commit -m ":memo: test"
ℹ No staged files match any configured task.
$ git branch --show-current
feature/1
[feature/1 1e70c244f] [#1] :memo: test
 1 file changed, 1 insertion(+)
```

Your issue number is automatically tagged based on your setting (`.commithelperrc.json`)

### Blocking commit

- Blocks direct commit toward `main`, `develop` `master` branch by throwing error on commit attempt.
- To block specific branches, add at `protect` field on `commithelperrc`.

## Configuration

### commithelperrc

This is Basic rule of `.commithelperrc.json`.

```json
{
    "protect": ["main", "master", "develop"],
    "rules": {
        "feature": null,
        "qa": "your-org/your-repo"
    }
}
```

#### $schema (optional — editor autocompletion)

Add a `$schema` reference so your editor offers autocompletion, inline docs, and validation while editing `.commithelperrc.json`. The schema ships inside the installed package, so a relative path works offline (no CDN, Nexus-friendly):

```json
{
    "$schema": "./node_modules/@naverpay/commithelper-go/schema.json",
    "rules": { "feature": null }
}
```

> Prefer the relative path above (resolved from the installed package) over a public CDN URL — consistent with this package shipping everything locally.

#### rules

- Key of rules field means branch prefix. By `feature` key, this rule is applied to branches named using the `feature/***` pattern.
- Value represents the repository to be tagged. For example, rule with value 'your-org/your-repo' tags 'your-org/your-repo#1'.
- A rule with a `null` value tags repository itself.

#### passthrough

For trackers whose issue key already contains the project (e.g. Jira/Linear `PROJ-123`), the branch carries the full key — there is nothing to look up. `passthrough` declares which keys are copied **verbatim** into the commit message, as opposed to `rules`, which translate a prefix into a repo reference.

- Array form — recognize only the listed project keys:

  ```json
  { "passthrough": ["PROJ", "OPS"] }
  ```

  A branch like `feature/PROJ-1871` is tagged `[PROJ-1871]`. `OPS-9` is tagged only if `OPS` is listed.

- `"uppercase"` — recognize **any** uppercase key shape, without listing projects:

  ```json
  { "passthrough": "uppercase" }
  ```

  Convenient, but it tags any `UPPERCASE-NUMBER` token, including non-tracker ones (e.g. a branch `chore/UTF-8-fix` becomes `[UTF-8]`).

- Omit the field to disable verbatim tagging (GitHub-style `rules` still apply).

Recognition rules (a key must be linkable by the tracker):

- The project part is uppercase letters/digits (`[A-Z][A-Z0-9]+`); the number is 1–7 digits.
- A key immediately followed by `_` or `-<digit>` is **not** recognized (e.g. `PROJ-1871_wip`, `PROJ-1871-20260101`) — use `-<letter>` for a description suffix (`PROJ-1871-add-login`).
- Array entries that are not valid key shapes (e.g. lowercase) are ignored with a warning. The all-mode is the string `"uppercase"`; a lowercase entry inside the array (e.g. `["uppercase"]`) is treated as an invalid key, not the all-mode.

`rules` (GitHub prefixes) take precedence over `passthrough` when a branch matches both.

#### protect

- Defines branches that are blocked from committing. Supports glob-style wildcard patterns.
  - `*` matches any sequence of characters except `/`
  - `?` matches any single character except `/`
  - `[...]` matches any character in the set
  - Note: `*` does not match across `/`, so `release/*` matches `release/1.0` but not `release/1.0/hotfix`. Use `release/*/*` for nested branches.

```json
{
    "protect": ["main", "master", "develop", "release/*", "epic/*"]
}
```

#### template

- Defines a custom format for commit messages using Go template syntax.
- If not specified, uses the default format: `[{{.Prefix}}] {{.Message}}`
- Available template variables:
  - `{{.Message}}`: Original commit message
  - `{{.Number}}`: Issue number extracted from branch name
  - `{{.Repo}}`: Repository name (empty string if not specified in rules)
  - `{{.Prefix}}`: Full reference (`#123`, `org/repo#123`, or a verbatim key like `PROJ-1871`)
- For `passthrough` (verbatim) branches, `{{.Prefix}}` is the key itself while `{{.Number}}` and `{{.Repo}}` are empty — prefer `{{.Prefix}}` for templates that must work with both styles.

##### Template Examples

**Example 1: Add issue reference at the end**

```json
{
    "rules": {
        "feature": null
    },
    "template": "{{.Message}}\n\nRef. [#{{.Number}}]"
}
```

Result:

```
:memo: Update documentation

Ref. [#123]
```

**Example 2: Custom format with repository**

```json
{
    "rules": {
        "qa": "your-org/your-repo"
    },
    "template": "{{.Message}}\n\nSee: {{.Prefix}}"
}
```

Result:

```
:bug: Fix login bug

See: your-org/your-repo#456
```

**Example 3: Conditional formatting**

```json
{
    "rules": {
        "feature": null
    },
    "template": "[{{.Prefix}}] {{.Message}}"
}
```

Result:

```
[#123] :sparkles: Add new feature
```

### Example

```json
// .commithelperrc.json
{
    "protect": ["epic"],
    "rules": {
        "feature": null,
        "qa": "your-org/your-repo"
    }
}
```

> For example as above,
>
> - commit on `feature/1` branch will be tagged as `[#1]`.
> - commit on `qa/1` branch will be tagged as `[your-org/your-repo#1]`.
> - direct commit attempt toward `main`, `master`, `develop`, `epic/*` branch will be blocked

## Platform Support

The appropriate platform-specific binary package is automatically installed via `optionalDependencies`.

- **macOS**: Intel (x64) and Apple Silicon (arm64)
- **Linux**: x64
- **Windows**: x64

## Q&A

- What happens if commit has already tagged issue like `[your-org/your-repo#1]`?
  - `commithelper-go` do not works. Already tagged issue remains unchanged
- How does commithelper-go behaves on `feature/1_xxx` `feature/1-xxx` patterned branch name?
  - It works same as `feature/1` branch.
- What's the difference between `@naverpay/commit-helper` and `@naverpay/commithelper-go`?
  - `commithelper-go` is a Go-based rewrite with significantly better performance and lower resource usage.

## License

MIT
