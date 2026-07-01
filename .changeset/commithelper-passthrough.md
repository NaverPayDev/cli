---
"@naverpay/commithelper-go": minor
---

Add `passthrough` for verbatim Jira/Linear-style issue keys, plus two tagging fixes and a bundled JSON schema.

- **`passthrough`.** List the project keys to recognize (e.g. `"passthrough": ["PROJ", "OPS"]`); a branch like `feature/PROJ-1871` is tagged `[PROJ-1871]`. Key recognition matches Jigit (`<KEY>-<1–7 digit number>`, found anywhere in the branch), so a listed project links identically in commithelper and Jigit. Only listed projects are tagged, so unrelated `UPPERCASE-NUMBER` tokens (e.g. `UTF-8`) are not mistaken for issues. `rules` (GitHub prefixes) take precedence when a branch matches both.
- **Idempotent re-tagging.** A message is left unchanged when the branch's reference is already present as a whole token, so `git commit --amend` and hook re-runs never stack tags — including template tags placed in the message body.
- **Protected branches** are evaluated before the already-tagged check, so a pre-tagged message cannot bypass `protect`.
- **`schema.json`** is bundled in the package; reference it via `"$schema": "./node_modules/@naverpay/commithelper-go/schema.json"` for editor autocompletion and validation (works offline, no CDN).
