import {getCommitMessageByBranchName, isStringMatchingPatterns} from '../bin/cli.js'
import {ISSUE_TAGGING_REGEX, BRANCH_ISSUE_TAGGING_REGEX} from '../src/constant.js'

describe('커밋 메시지내 이슈를 찾는 정규식 테스트', () => {
    it.each([
        ['일반적인 메시지', false],
        ['naverpay/cli#1', false],
        ['naverpay/cli#1]', false],
        ['naverpay/cli#1] 결제는 네이버페이로', false],
        ['[naverpay/cli#1', false],
        ['[naverpay/cli#1 결제는 네이버페이로', false],
        ['[naverpay/cli#1]', true],
        ['[naverpay/cli#1] 결제는 네이버페이로', true],
        ['[naverpay/cli#12345] 결제는 네이버페이로', true],
        ['[naverpay/cli#123456] 결제는 네이버페이로', false],
        ['[#12345] 결제는 네이버페이로', true],
        ['[#123] 결제는 네이버페이로', true],
        ['[#123456] 결제는 네이버페이로', false],
    ])('커밋 메시지 "%s"는 내부에 이슈 태깅이 있다 => (%s)', (message, result) => {
        const output = message.match(ISSUE_TAGGING_REGEX) !== null
        expect(output).toBe(result)
    })
})

describe('브랜치가 commithelper 형식에 맞는지 확인하는 정규식', () => {
    it.each([
        ['main', false],
        ['master', false],
        ['develop', false],
        ['main', false],
        ['repo', false],
        ['cli', false],
        ['cli/123', true],
        ['cli/123456', false],
        ['cli/123_fix', true],
        ['cli/123_test', true],
        ['cli/123_wtf_bug_fix', true],
        ['cli/123_FIX_BUG', true],
        ['cli/123_FIX_BUG_TEST_OH_YEAH', true],
        ['cli/123fixbug', true],
    ])('브랜치 명 "%s"는 태깅할 수 있는 브랜치다 => (%s)', (message, result) => {
        const output = message.match(BRANCH_ISSUE_TAGGING_REGEX) !== null
        expect(output).toBe(result)
    })
})

/**
 * @description 이 테스트는 ISSUE_TAGGING_MAP 와 강결합되어 있습니다.
 */
describe('원하는 대로 커밋메시지를 잘 변조하는지 확인.', () => {
    it.each([
        ['repo/123', '안녕하세요.', '[#123] 안녕하세요.'],
        ['repo/123_fix', '안녕하세요.', '[#123] 안녕하세요.'],
        ['repo/123-fix', '안녕하세요.', '[#123] 안녕하세요.'],
        ['repo/123-fix_bug', '안녕하세요.', '[#123] 안녕하세요.'],
        ['feature/123', '안녕하세요.', '[#123] 안녕하세요.'],
        /**
         * @description ISSUE_TAGGING_MAP 에 정의되지 않은 브랜치명은 그대로 반환한다.
         */
        ['epic/123', '안녕하세요.', '안녕하세요.'],
        ['develop', '안녕하세요.', '안녕하세요.'],
    ])('브랜치명 [%s] 에서 커밋메시지 "%s"는 "%s"다.', (branch, commitMessage, finalCommitMessage) => {
        const output = getCommitMessageByBranchName(branch, commitMessage)
        expect(output).toBe(finalCommitMessage)
    })
})

describe('', () => {
    it.each([
        [[], 'main', true],
        [[], 'master', true],
        [[], 'develop', true],
        [['release/*'], 'release/123456', true],
        [['release/*'], 'release/123456', true],
        [['release/*'], 'release', false],
        [['release/*'], 'release_123456', false],
        [['epic/*'], 'epic/naverpay', true],
        [['epic/*'], 'epic/naverpay_1234', true],
        [['epic/*'], 'epic/naverpay_yes', true],
        [['epic/*'], 'epic_naverpay_yes', false],
        [['epic/*'], 'epic', false],
    ])('브랜치명 패턴 %s 에 "%s" 브랜치 매칭 여부 %s', (patterns, branchName, result) => {
        const output = isStringMatchingPatterns(patterns, branchName)
        expect(output).toBe(result)
    })
})
