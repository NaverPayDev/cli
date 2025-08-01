# @naverpay/commit-helper

> Automatically adds issue numbers to commit messages based on branch names and protects important branches

## Installation

```bash
npm install --save-dev @naverpay/commit-helper
# or
yarn add -D @naverpay/commit-helper
# or
pnpm add -D @naverpay/commit-helper
```

## Quick Start

### 1. Install Husky (if not already installed)

```bash
npm install --save-dev husky
npx husky init
```

### 2. Add commit-msg hook

```bash
echo 'npx --yes @naverpay/commit-helper@latest $1' > .husky/commit-msg
chmod +x .husky/commit-msg
```

### 3. Create a commit

```bash
git checkout -b feature/123-new-feature
git add .
git commit -m "Add new feature"
# Result: [#123] Add new feature
```

## Features

### 🏷️ Automatic Issue Tagging

Extracts issue numbers from branch names and adds them to commit messages:

- `feature/123` → `[#123] your message`
- `qa/456` → `[your-org/your-repo#456] your message`
- `hotfix/789-urgent` → `[#789] your message`

### 🛡️ Branch Protection

Prevents direct commits to protected branches:

- Default: `main`, `master`, `develop`
- Customizable via configuration

### ⚙️ Flexible Configuration

Supports custom rules and remote configuration inheritance.

## Configuration

Create `.commithelperrc.json` in your project root:

```json
{
    "protect": ["main", "master", "develop", "staging"],
    "rules": {
        "feature": null,
        "bugfix": null,
        "hotfix": null,
        "qa": "naverpay/qa-issues",
        "docs": "naverpay/documentation"
    }
}
```

### Configuration Options

#### `protect` (array)

List of branch names to protect from direct commits.

- Default: `["main", "master", "develop"]`

#### `rules` (object)

Mapping of branch prefixes to repository names.

- Key: Branch prefix (e.g., `"feature"`)
- Value: Repository name or `null` for current repo

#### `extends` (string)

URL to inherit configuration from:

```json
{
    "extends": "https://raw.githubusercontent.com/naverpay/standards/main/.commithelperrc.json"
}
```

## Examples

### Basic Feature Branch

```bash
git checkout -b feature/NP-1234-payment-integration
git commit -m "Implement payment gateway"
# Result: [#1234] Implement payment gateway
```

### External Repository Reference

With configuration:

```json
{
    "rules": {
        "qa": "naverpay/qa-tracker"
    }
}
```

```bash
git checkout -b qa/789-test-payment-flow
git commit -m "Add E2E tests for payment"
# Result: [naverpay/qa-tracker#789] Add E2E tests for payment
```

### Protected Branch

```bash
git checkout main
git commit -m "Direct commit"
# Error: ❌ Direct commits to protected branch 'main' are not allowed!
# Please create a feature branch and use pull request.
```

## Advanced Usage

### Lefthook Integration

If you prefer Lefthook over Husky:

```yaml
# lefthook.yml
commit-msg:
    scripts:
        'commit-helper':
            runner: npx --yes @naverpay/commit-helper@latest {1}
```

### CI/CD Integration

For commit message validation in CI:

```yaml
# .github/workflows/pr.yml
- name: Validate commit messages
  run: |
      git log --format=%s origin/main..HEAD | while read msg; do
        if ! echo "$msg" | grep -qE '^\[[#A-Za-z0-9-/]+\]'; then
          echo "Invalid commit message: $msg"
          exit 1
        fi
      done
```

## API

### CLI Usage

```bash
npx @naverpay/commit-helper <commit-msg-file>
```

- **Parameters**:
  - `commit-msg-file` (string): Path to commit message file (provided by git hook)
- **Returns**: Exit code 0 on success, 1 on failure
- **Throws**: Error message to stderr on invalid configuration or protected branch

## FAQ

**Q: Does it work with existing issue tags?**  
A: Yes, if your commit message already contains a tag like `[#123]`, commit-helper will skip it.

**Q: Can I use multiple issue numbers?**  
A: The branch name supports one issue number, but you can manually add more in your commit message.

**Q: What branch name formats are supported?**  
A: Any format with a number after slash: `feature/123`, `feature/123-description`, `feature/123_description`

**Q: How to temporarily bypass protection?**  
A: Use `--no-verify` flag: `git commit --no-verify -m "Emergency fix"`

## Troubleshooting

### Hook not executing

1. Check file permissions: `ls -la .husky/commit-msg`
2. Ensure Husky is installed: `npx husky install`

### Configuration not loading

1. Check file name: `.commithelperrc.json` (note the dot)
2. Validate JSON syntax
3. Run with debug: `DEBUG=commit-helper git commit`

## License

MIT
No newline at end of file
