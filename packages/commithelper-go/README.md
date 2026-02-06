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
npx --yes @naverpay/commithelper-go@latest "$1"
```

> `@latest` is not necessary but this option always provides latest version of commithelper-go.

### .lefthook.yml

```yaml
commit-msg:
  commands:
    commithelper:
      run: npx --yes @naverpay/commithelper-go@latest {1}
```

### Manual execution

```bash
npx @naverpay/commithelper-go "your commit message"
```

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

#### rules

- Key of rules field means branch prefix. By `feature` key, this rule is applied to branches named using the `feature/***` pattern.
- Value represents the repository to be tagged. For example, rule with value 'your-org/your-repo' tags 'your-org/your-repo#1'.
- A rule with a `null` value tags repository itself.

#### protect

- Defines branch prefixes that are blocked from committing. `main`, `master`, `develop` branch is blocked by default.

#### template

- Defines a custom format for commit messages using Go template syntax.
- If not specified, uses the default format: `[{{.Prefix}}] {{.Message}}`
- Available template variables:
  - `{{.Message}}`: Original commit message
  - `{{.Number}}`: Issue number extracted from branch name
  - `{{.Repo}}`: Repository name (empty string if not specified in rules)
  - `{{.Prefix}}`: Full prefix (`#123` or `org/repo#123`)

##### Template Examples

**Example 1: Add issue reference at the end**

```json
{
    "rules": {
        "feature": null
    },
    "template": "{{.Message}}\n\nRef. #{{.Number}}"
}
```

Result:

```
:memo: Update documentation

Ref. #123
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
> - direct commit attempt toward `main`, `master`, `develop`, `epic/***` branch will be blocked

## Environment Variables

### SKIP_COMMIT_HELPER_POSTINSTALL

You can skip the postinstall script (binary download) by setting the `SKIP_COMMIT_HELPER_POSTINSTALL` environment variable:

```bash
SKIP_COMMIT_HELPER_POSTINSTALL=1 npm install @naverpay/commithelper-go
```

This is useful in environments where:

- Network access is restricted
- You want to manage binary installation manually
- Running in CI/CD environments where postinstall scripts should be skipped

## Platform Support

The CLI automatically downloads the appropriate binary for your platform during installation:

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
