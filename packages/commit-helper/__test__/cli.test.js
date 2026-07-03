import {getCommitMessageByBranchName, isStringMatchingPatterns, resolveKey, alreadyHasRef} from '../bin/cli.js'
import {BRANCH_ISSUE_TAGGING_REGEX} from '../src/constant.js'

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
        [['main'], 'main', true],
        [['master'], 'master', true],
        [['develop'], 'develop', true],
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
        const output = isStringMatchingPatterns(branchName, patterns)
        expect(output).toBe(result)
    })
})

/**
 * @description passthrough 키 인식 (commithelper-go 의 resolveKey 와 동일 규칙).
 */
describe('resolveKey: passthrough 키 인식', () => {
    it.each([
        [['PROJ'], 'feature/PROJ-1871', 'PROJ-1871'], // 등록된 키
        [['PROJ'], 'PROJ-1871', 'PROJ-1871'], // prefix 없는 순수 키
        [['PROJ'], 'feature/PROJ-1871-add-login', 'PROJ-1871'], // 설명 suffix 무시
        [['PROJ'], 'feature/PROJ-1871-20260101', 'PROJ-1871'], // 날짜 suffix 인식 (Jigit 규칙)
        [['PROJ'], 'feature/PROJ-1871_wip', 'PROJ-1871'], // underscore 인식 (Jigit 규칙)
        [['PROJ'], 'feature/OPS-42', null], // 미등록 프로젝트
        [['PROJ'], 'feature/PROJ-12345678', null], // 8자리 숫자 거부
        [['PROJ'], 'XPROJ-123', null], // 더 긴 키 안에서는 프로젝트가 매칭되지 않음
        [['PROJ'], 'chore/UTF-8-PROJ-123', 'PROJ-123'], // 잡토큰 건너뛰고 등록된 키 선택
        [['proj'], 'feature/PROJ-1', null], // 소문자 목록은 매칭되지 않음
        [undefined, 'feature/PROJ-1871', null], // passthrough 없으면 비활성
        [[], 'feature/PROJ-1871', null], // 빈 목록도 비활성
    ])('resolveKey("%s", %o) === %s', (passthrough, branch, expected) => {
        expect(resolveKey(branch, passthrough)).toBe(expected)
    })
})

/**
 * @description Jigit 문서에 나오는 키 인식 케이스와 동일하게 동작하는지 (["ABC"] 기준).
 */
describe('resolveKey: Jigit 문서 케이스 패리티', () => {
    it.each([
        ['ABC-123', 'ABC-123'],
        ['feature/ABC-123', 'ABC-123'],
        ['feature_ABC-123', 'ABC-123'],
        ['feature/ABC-123-modal', 'ABC-123'],
        ['ABC-123_modal', 'ABC-123'],
        ['[ABC-123] feature', 'ABC-123'],
        ['release/test/ABC-123/fix', 'ABC-123'],
        ['ABC-123-4', 'ABC-123'],
        ['ABC-12345678', null],
        ['abc-123', null],
        ['Abc-123', null],
        ['ABC_123', null],
        ['ABC123', null],
        ['ABC-abc', null],
    ])('resolveKey("%s", ["ABC"]) === %s', (branch, expected) => {
        expect(resolveKey(branch, ['ABC'])).toBe(expected)
    })
})

/**
 * @description 멱등 태깅 경계 (commithelper-go 의 alreadyHasRef 와 동일).
 */
describe('alreadyHasRef: 멱등 태깅 경계', () => {
    it.each([
        ['[#123] fix', '#123', true], // 앞쪽 기본 태그
        ['[#1234] fix', '#123', false], // 더 긴 숫자는 매칭 아님
        ['fix\n\nRef. [#123]', '#123', true], // 본문 하단 참조 (template)
        ['[PROJ-1871] fix', 'PROJ-1871', true], // verbatim 키 존재
        ['[org/repo#123] fix', 'org/repo#123', true], // cross-repo 참조 존재
        ['fix login', '#123', false], // 없음
        ['see AB-1abc here', 'AB-1', false], // 참조 뒤에 글자가 오면 매칭 아님
        ['[MY-PROJ-1871] earlier', 'PROJ-1871', false], // 더 긴 하이픈 키 안에서는 매칭 아님
    ])('alreadyHasRef("%s", "%s") === %s', (message, ref, expected) => {
        expect(alreadyHasRef(message, ref)).toBe(expected)
    })
})

/**
 * @description resolve 우선순위(prefix > passthrough)와 멱등성 end-to-end.
 */
describe('getCommitMessageByBranchName: 우선순위와 멱등', () => {
    const rules = {feature: null}
    const passthrough = ['ABC', 'PROJ']

    it.each([
        // prefix 해석 (JS 정규식 기준)
        ['my-team/11', '메시지', {'my-team': 'my-org/my-repo'}, undefined, '[my-org/my-repo#11] 메시지'],
        ['feature/42', '메시지', {feature: null}, undefined, '[#42] 메시지'],
        ['main', '메시지', {feature: null}, undefined, '메시지'],
        ['unknown/99', '메시지', {feature: null}, undefined, '메시지'],
        ['feature/PROJ-1', '메시지', {feature: null}, undefined, '메시지'], // prefix 모양 아님 + passthrough 없음
        // 우선순위
        ['feature/123', '메시지', rules, passthrough, '[#123] 메시지'], // github prefix
        ['feature/ABC-99', '메시지', rules, passthrough, '[ABC-99] 메시지'], // verbatim 키
        ['feature/12-ABC-34', '메시지', rules, passthrough, '[#12] 메시지'], // 둘 다 매칭 → prefix 우선
        ['wip', '메시지', rules, passthrough, '메시지'], // 둘 다 아님
        // 멱등 / verbatim
        ['feature/PROJ-1871', 'fix', {}, ['PROJ'], '[PROJ-1871] fix'], // verbatim 태깅
        ['feature/123', '[#123] fix', {feature: null}, undefined, '[#123] fix'], // 재실행 멱등
        ['feature/PROJ-1871', '[MY-PROJ-1871] earlier', {}, ['PROJ'], '[PROJ-1871] [MY-PROJ-1871] earlier'], // 임베디드 키는 태깅됨으로 보지 않음
        ['feature/PROJ-1', 'work on PROJ-1abc', {}, ['PROJ'], '[PROJ-1] work on PROJ-1abc'], // 뒤에 글자 오는 건 태깅됨 아님
        // behavior-change lock (major 사유): 다른 이슈 태그는 브랜치 참조 추가를 막지 않는다
        ['feature/123', '[#999] fix', {feature: null}, undefined, '[#123] [#999] fix'],
    ])('[%s] "%s" → "%s"', (branch, message, rulesMap, pass, expected) => {
        expect(getCommitMessageByBranchName(branch, message, rulesMap, pass)).toBe(expected)
    })
})

// ── extends: loadExtendsConfig ────────────────────────────────────────────────

import {loadExtendsConfig} from '../bin/cli.js'
import {writeFile, mkdtemp, rm} from 'fs/promises'
import {tmpdir} from 'os'
import {join} from 'path'

describe('loadExtendsConfig — local file path', () => {
    let dir

    beforeEach(async () => {
        dir = await mkdtemp(join(tmpdir(), 'commithelper-test-'))
    })

    afterEach(async () => {
        await rm(dir, {recursive: true, force: true})
    })

    it('로컬 파일의 rules, protect, passthrough를 파싱한다', async () => {
        const config = {
            rules: {plan: 'org/plan', qa: 'org/qa'},
            protect: ['main', 'master'],
            passthrough: ['PROJ'],
        }
        const filePath = join(dir, '.commithelperrc.json')
        await writeFile(filePath, JSON.stringify(config))

        const result = await loadExtendsConfig(filePath)
        expect(result.rules).toEqual(config.rules)
        expect(result.protect).toEqual(config.protect)
        expect(result.passthrough).toEqual(config.passthrough)
    })

    it('파일이 없으면 에러를 던진다', async () => {
        await expect(loadExtendsConfig(join(dir, 'not-exist.json'))).rejects.toThrow()
    })

    it('유효하지 않은 JSON이면 에러를 던진다', async () => {
        const filePath = join(dir, '.commithelperrc.json')
        await writeFile(filePath, 'not json')
        await expect(loadExtendsConfig(filePath)).rejects.toThrow()
    })
})
