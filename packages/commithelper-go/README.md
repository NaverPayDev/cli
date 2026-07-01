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

Tracker keys that already carry the project (Jira/Linear-style `PROJ-1871`) are supported too — see [passthrough](#passthrough).

### Blocking commit

- Blocks direct commit toward `main`, `develop` `master` branch by throwing error on commit attempt.
- To block specific branches, add at `protect` field on `commithelperrc`.

### Re-tagging (idempotency)

commithelper adds your current branch's reference **unless that exact reference is already in the message**, so re-running the hook or `git commit --amend` never duplicates the tag.

| Message already contains…                                 | Result                                                |
| --------------------------------------------------------- | ----------------------------------------------------- |
| the branch's reference (e.g. `[#123]`, or `#123` in body) | left unchanged                                        |
| only a _different_ issue's tag (e.g. `[#999]`)            | branch's reference is still added → `[#123] [#999] …` |
| no reference                                              | branch's reference is added                           |

Two consequences follow:

- commithelper only recognizes **its own resolved reference**, not other issue tags — a hand-written tag for a different issue does not stop it from adding the branch's reference.
- If the message body already mentions the branch's reference (e.g. `fixes #123` on `feature/123`), it is treated as already tagged and left as-is.

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

For trackers whose issue key already contains the project (e.g. Jira/Linear `PROJ-1871`), the branch carries the full key — there is nothing to look up. `passthrough` lists the project keys to copy **verbatim** into the commit message, as opposed to `rules`, which translate a prefix into a repo reference.

```json
{ "passthrough": ["PROJ", "OPS"] }
```

A branch like `feature/PROJ-1871` is tagged `[PROJ-1871]`. Only listed projects are recognized (`OPS-9` is tagged only if `OPS` is listed), so unrelated `UPPERCASE-NUMBER` tokens such as `UTF-8` are never mistaken for issues. Omit the field to disable verbatim tagging (`rules` still apply).

**How a key is recognized.** Recognition matches [Jigit](https://marketplace.atlassian.com/apps/1217129) (the Jira↔Git integration), so a listed project links the same way in commithelper and Jigit. A key is `<PROJECT>-<NUMBER>` found anywhere in the branch:

- `PROJECT` — an uppercase letter followed by uppercase letters/digits (**≥2 chars**: `PROJ`, `OPS`, `AB`, `ABC2`).
- `NUMBER` — 1–7 digits (an 8+ digit run is not a key).

| Branch (with `["PROJ"]`)      | Result        | Why                                        |
| ----------------------------- | ------------- | ------------------------------------------ |
| `feature/PROJ-1871`           | `[PROJ-1871]` | standard key                               |
| `feature/PROJ-1871-add-login` | `[PROJ-1871]` | trailing text after the number is ignored  |
| `feature/PROJ-1871-20260101`  | `[PROJ-1871]` | a `-<number>` (date) suffix is ignored too |
| `feature_PROJ-1871`           | `[PROJ-1871]` | the key may appear anywhere in the branch  |
| `feature/OPS-42`              | not tagged    | `OPS` is not listed                        |
| `feature/PROJ-12345678`       | not tagged    | the number has more than 7 digits          |
| `PROJECT/123`                 | not tagged    | keys use `-`, not `/` (that's a `rules` prefix) |

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
- For `passthrough` (verbatim) branches, `{{.Prefix}}` is the full key (e.g. `PROJ-123`) and `{{.Number}}` its number (`123`), while `{{.Repo}}` is empty — prefer `{{.Prefix}}` for templates that must work with both styles.
- Put the reference in your template as `{{.Prefix}}` for safe re-tagging: commithelper skips an already-tagged message by looking for that exact reference, so rendering it another way (e.g. `#{{.Number}}` for a repo-scoped or verbatim rule) can add it twice on `git commit --amend`.

##### Template Examples

**Example 1: Add issue reference at the end**

```json
{
    "rules": {
        "feature": null
    },
    "template": "{{.Message}}\n\nRef. [{{.Prefix}}]"
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

- What happens if the commit is already tagged?
  - If it already contains the reference for your current branch, it is left unchanged (safe on re-run / `git commit --amend`). A tag for a _different_ issue does **not** prevent your branch's reference from being added — see [Re-tagging](#re-tagging-idempotency).
- How does commithelper-go behaves on `feature/1_xxx` `feature/1-xxx` patterned branch name?
  - It works same as `feature/1` branch.
- What's the difference between `@naverpay/commit-helper` and `@naverpay/commithelper-go`?
  - `commithelper-go` is a Go-based rewrite with significantly better performance and lower resource usage.

## License

MIT
