export const ISSUE_TAGGING_MAP = {
    repo: null,
    feature: null,
} as const

export const BRANCH_ISSUE_TAGGING_REGEX = /[A-Za-z-]+\/\d{1,5}([-_a-zA-Z]+[0-9]*)*$/
export const PURE_BRANCH_ISSUE_TAGGING_REGEX = /[A-Za-z-]+\/\d{1,5}/
export const KEY_PATTERN = /([A-Z][A-Z0-9]+)-([0-9]+)/g
export const DEFAULT_PROTECTED_BRANCHES: Readonly<string[]> = ['main']
