# RMB - Remove Merged Branches

`rmb` is a simple CLI tool for removing Git branches that have already been merged into `origin/main`.

## Features

- Deletes merged branches automatically.
- Supports excluding specific branches.
- Supports branch filtering with glob patterns.
- Interactive confirmation before deletion.

## Usage

```bash
npx rmb [excluded-branches|glob-pattern]
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

4. **Interactive Confirmation:**

   - You will be prompted to confirm each branch deletion.

## How It Works

1. Fetches updates from the remote repository and prunes deleted branches.
2. Lists all branches that are merged into `origin/main`.
3. Excludes specified branches or matches them using glob patterns.
4. Asks for confirmation before deletion.

## License

MIT License © 2024 Kim Yongchan

