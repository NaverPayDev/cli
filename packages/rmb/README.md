# RMB - Remove Merged Branches

`rmb` is a simple CLI tool for removing Git branches that have already been merged into `origin/main`.

## Features

- Deletes merged branches automatically.
- Supports excluding specific branches.
- Supports branch filtering with glob patterns.
- Interactive confirmation before deletion.
- Automatic deletion without confirmation using the `--all` flag.

## Usage

```bash
npx rmb [excluded-branches|glob-pattern] [--all]
```

### Examples

1. **Delete all merged branches except `main` and `master`:**

   ```bash
   npx rmb
   ```

2. **Exclude custom branches:**

   ```bash
   npx rmb develop,canary
   ```

3. **Use Glob Patterns:**

   ```bash
   npx rmb 'feature/*'
   ```

4. **Automatic Deletion Without Confirmation:**

   ```bash
   npx rmb --all
   ```

5. **Interactive Confirmation:**

   - You will be prompted to confirm each branch deletion unless `--all` is specified.

## How It Works

1. Fetches updates from the remote repository and prunes deleted branches.
2. Lists all branches that are merged into `origin/main`.
3. Excludes specified branches or matches them using glob patterns.
4. Deletes branches automatically or prompts for confirmation based on the `--all` flag.

## License

MIT License © 2024 Naver Financial
