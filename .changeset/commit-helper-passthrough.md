---
"@naverpay/commit-helper": major
---

Add `passthrough` for Jira/Linear-style issue keys, and make re-tagging match only your branch's own tag.

**`passthrough`** — list your project keys, and branches that already contain the full key are tagged as-is. With `{ "passthrough": ["PROJ"] }`, branch `feature/PROJ-1871` becomes `[PROJ-1871]`. Only the keys you list are tagged, so unrelated text like `UTF-8` is never mistaken for an issue. Key detection matches [Jigit](https://marketplace.atlassian.com/apps/1217129), so a branch links the same way in Jira and here.

**Breaking change** — commit-helper skips a commit that is already tagged, and what counts as "already tagged" changed. Before, *any* `[#…]` tag in the message stopped it. Now, only *your current branch's own* tag does. For example, on branch `feature/123`, a message you wrote as `[#999] fix` used to be left alone, but now becomes `[#123] [#999] fix`. Re-running the hook or `git commit --amend` still never adds your tag twice — this now includes verbatim keys like `[PROJ-1871]`, which the old check could not detect.
