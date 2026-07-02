# @naverpay/commit-helper

## 2.0.0

### Major Changes

-   c0c01ef: Add `passthrough` for Jira/Linear-style issue keys, and make re-tagging match only your branch's own tag.

    **`passthrough`** — list your project keys, and branches that already contain the full key are tagged as-is. With `{ "passthrough": ["PROJ"] }`, branch `feature/PROJ-1871` becomes `[PROJ-1871]`. Only the keys you list are tagged, so unrelated text like `UTF-8` is never mistaken for an issue. Key detection matches [Jigit](https://marketplace.atlassian.com/apps/1217129), so a branch links the same way in Jira and here.

    **Breaking change** — commit-helper skips a commit that is already tagged, and what counts as "already tagged" changed. Before, _any_ `[#…]` tag in the message stopped it. Now, only _your current branch's own_ tag does. For example, on branch `feature/123`, a message you wrote as `[#999] fix` used to be left alone, but now becomes `[#123] [#999] fix`. Re-running the hook or `git commit --amend` still never adds your tag twice — this now includes verbatim keys like `[PROJ-1871]`, which the old check could not detect.

## 1.2.2

### Patch Changes

-   654bc32: [commithelper] fix: git worktree 환경에서 COMMIT_EDITMSG 절대 경로 처리

    PR: [[commithelper] fix: git worktree 환경에서 COMMIT_EDITMSG 절대 경로 처리](https://github.com/NaverPayDev/cli/pull/74)

## 1.2.1

### Patch Changes

-   90d2cbf: 🔥 remove 'develop' 'master' branch rules from DEFAULT_PROTECTED_BRANCHES

    PR: [📚 README 업데이트: 한국어 문서 추가 및 기능 설명 보강](https://github.com/NaverPayDev/cli/pull/46)

-   ab3410d: add files field in package.json

    PR: [files 에 꼭 필요한 파일만 추가](https://github.com/NaverPayDev/cli/pull/48)

## 1.2.0

### Minor Changes

-   e7acbf3: 🔧 fix: fallback to default protected branches if no custom patterns are provided

    PR: [🔧 fix: fallback to default protected branches if no custom patterns are provided](https://github.com/NaverPayDev/cli/pull/29)

### Patch Changes

-   9f491fe: protect 설정값의 undefined 에 대한 예외처리 추가

    PR: [protect 설정값의 undefined 에 대한 예외처리 추가](https://github.com/NaverPayDev/cli/pull/31)

## 1.1.0

### Minor Changes

-   c214be8: extends 문법 지원

## 1.0.0

### Major Changes

-   b7f6303: @naverpay/commit-helper 패키지를 제공합니다
