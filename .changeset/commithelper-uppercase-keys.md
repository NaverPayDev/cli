---
"@naverpay/commithelper-go": minor
---

Add `passthrough` for verbatim issue-key tagging (Jira/Linear-style), and fix two tagging issues.

- **New `passthrough` option.** For trackers whose key already contains the project (e.g. `PROJ-1871`), the branch carries the full key, so it is copied verbatim — no repo lookup. Set `"passthrough": ["PROJ"]` to recognize specific project keys, or `"passthrough": "uppercase"` to recognize any uppercase `KEY-NUMBER` (which also tags non-tracker tokens like `UTF-8`). A branch `feature/PROJ-1871` is tagged `[PROJ-1871]`. Keys followed by `_` or `-<digit>` are not recognized (matching how the tracker links branches). GitHub-style `rules` take precedence when a branch matches both.
- **Fix double-tagging on amend.** Idempotency now checks whether the resolved reference is already present anywhere in the message, so custom templates that put the tag in the body (e.g. `Ref. [#123]`) no longer stack the reference on `git commit --amend` or hook re-runs.
- **Fix protected-branch bypass.** Branch protection is now evaluated before the "already tagged" short-circuit, so a pre-tagged commit message can no longer slip past `protect`.
- **Ship a JSON schema.** `schema.json` is now bundled in the package; reference it from `.commithelperrc.json` via `"$schema": "./node_modules/@naverpay/commithelper-go/schema.json"` for editor autocompletion and validation (works offline, no CDN).
