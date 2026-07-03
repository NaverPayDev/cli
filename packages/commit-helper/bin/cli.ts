import {exec} from 'child_process'
import fs from 'fs/promises'
import {isAbsolute, join} from 'path'
import process from 'process'

import {cosmiconfigSync} from 'cosmiconfig'
import meow from 'meow'

import {
    ISSUE_TAGGING_MAP,
    BRANCH_ISSUE_TAGGING_REGEX,
    PURE_BRANCH_ISSUE_TAGGING_REGEX,
    KEY_PATTERN,
    DEFAULT_PROTECTED_BRANCHES,
} from '../src/constant.js'

async function getCurrentBranchName(): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('git branch --show-current', (err, stdout, stderr) => {
            if (err) {
                reject(err)
                return
            }
            if (stderr) {
                reject(new Error(stderr))
                return
            }
            resolve(stdout.trim() as string)
        })
    })
}

function resolvePrefix(branchName: string, issueMap: Record<string, string | null>): string | null {
    const foundedIssueTagging = branchName.match(BRANCH_ISSUE_TAGGING_REGEX)

    if (!foundedIssueTagging || foundedIssueTagging.length === 0) {
        return null
    }

    // 브랜치명에는 _fix 와 같은 추가정보가 있을 수 있으므로, 서비스 명을 추가로 뽑아낸다.
    const foundBranch = foundedIssueTagging[0].match(PURE_BRANCH_ISSUE_TAGGING_REGEX)

    if (!foundBranch) {
        // rebase 등으로 브랜치 없이 작업할 수 있음
        return null
    }

    const branchInfo = foundBranch[0]
    const serviceName = branchInfo.split('/')[0].toLowerCase()
    const issueNumber = branchInfo.split('/')[1]

    const repoName = issueMap[serviceName]

    // 사용자 설정에 있거나 내부상수에 정의된 경우
    if (repoName) {
        return `${repoName}#${issueNumber}`
    }
    // null 로 명시되었다는 것은 자기자신 (#123) 으로 태깅하겠다는 뜻
    if (repoName === null) {
        return `#${issueNumber}`
    }
    // undefined 는 못찾았다는 뜻
    return null
}

// passthrough 에 등록된 프로젝트 키만 인식한다 (Jigit 규칙: <KEY>-<1~7자리 숫자>).
export function resolveKey(branchName: string, passthrough?: string[]): string | null {
    if (!passthrough || passthrough.length === 0) {
        return null
    }

    const allowed = new Set(passthrough)

    for (const match of branchName.matchAll(KEY_PATTERN)) {
        const [full, project, issueNumber] = match
        if (issueNumber.length <= 7 && allowed.has(project)) {
            return full
        }
    }

    return null
}

function isKeyByte(char: string): boolean {
    return /[-\w]/.test(char)
}

// 재실행·amend 때 같은 태그가 중복으로 붙지 않도록, 이 참조가 메시지에 그대로 있는지 확인한다 ("#123" 은 "#1234" 에 매칭되지 않음).
export function alreadyHasRef(message: string, ref: string): boolean {
    if (ref === '') {
        return false
    }

    let from = 0
    while (from <= message.length) {
        const index = message.indexOf(ref, from)
        if (index < 0) {
            return false
        }

        const start = index
        const end = index + ref.length
        const beforeOK = start === 0 || !isKeyByte(message[start - 1])
        const afterOK = end >= message.length || !isKeyByte(message[end])

        if (beforeOK && afterOK) {
            return true
        }

        from = start + 1
    }

    return false
}

export function getCommitMessageByBranchName(
    branchName: string,
    originCommitMessage: string,
    externalConfig?: Record<string, string | null>,
    passthrough?: string[],
) {
    /**
     * @description 내부 상수를 후순위. 사용자 설정이 덮어쓴다.
     */
    const issueMap = {
        ...ISSUE_TAGGING_MAP,
        ...externalConfig,
    } as Record<string, string | null>

    const ref = resolvePrefix(branchName, issueMap) ?? resolveKey(branchName, passthrough)

    if (!ref) {
        return originCommitMessage
    }

    if (alreadyHasRef(originCommitMessage, ref)) {
        return originCommitMessage
    }

    return `[${ref}] ${originCommitMessage}`
}

interface Config {
    rules: Record<string, string | null>
    protect?: string[]
    passthrough?: string[]
}

// loadExtendsConfig dispatches to HTTP fetch or local file read based on the extends value.
export async function loadExtendsConfig(extendsValue: string): Promise<Partial<Config>> {
    if (/^https?:\/\//.test(extendsValue)) {
        const response = await fetch(extendsValue)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }
        return response.json() as Promise<Partial<Config>>
    }
    // local file path — relative paths resolved from cwd (repo root)
    const filePath = isAbsolute(extendsValue) ? extendsValue : join(process.cwd(), extendsValue)
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as Partial<Config>
}

export async function readExternalConfig(): Promise<Config> {
    const explorerSync = cosmiconfigSync('commithelper')
    const searchedFor = explorerSync.search()

    if (!searchedFor) {
        return {rules: {}}
    }

    const localConfig = searchedFor.config as Partial<Config & {extends?: string}>

    const mergedRules: Record<string, string | null> = {...(localConfig.rules || {})}
    let mergedProtect: string[] = Array.isArray(localConfig.protect) ? [...localConfig.protect] : []
    let mergedPassthrough: string[] = Array.isArray(localConfig.passthrough) ? [...localConfig.passthrough] : []

    const extendsValue = localConfig.extends
    if (typeof extendsValue === 'string' && extendsValue.trim() !== '') {
        try {
            const extendsConfig = await loadExtendsConfig(extendsValue)

            if (extendsConfig.rules && typeof extendsConfig.rules === 'object') {
                Object.assign(mergedRules, extendsConfig.rules)
            }

            if (Array.isArray(extendsConfig.protect)) {
                mergedProtect = [...extendsConfig.protect, ...mergedProtect]
            }

            if (Array.isArray(extendsConfig.passthrough)) {
                mergedPassthrough = [...extendsConfig.passthrough, ...mergedPassthrough]
            }
        } catch (e) {
            throw new Error(`Failed to load extends config from "${extendsValue}": ${(e as Error).message}`)
        }
    }

    const result: Config = {
        rules: mergedRules,
    }

    if (mergedProtect.length > 0) {
        result.protect = [...new Set(mergedProtect)]
    }

    if (mergedPassthrough.length > 0) {
        result.passthrough = [...new Set(mergedPassthrough)]
    }

    return result
}

export function isStringMatchingPatterns(stringToCheck: string, patternsArray?: string[]) {
    const patterns = patternsArray || DEFAULT_PROTECTED_BRANCHES

    return patterns.some((pattern) => {
        if (pattern.endsWith('/*')) {
            const basePattern = pattern.slice(0, -1)
            const regex = new RegExp(`^${basePattern}.+$`)
            return regex.test(stringToCheck)
        } else {
            return pattern === stringToCheck
        }
    })
}

export async function run() {
    const cli = meow(`Tag issues to commit messages based on your current branch names.`, {
        importMeta: import.meta,
        flags: {help: {type: 'boolean', shortFlag: 'h'}, show: {type: 'boolean', shortFlag: 's'}},
    })

    const currentBranchName = await getCurrentBranchName()

    const {rules = {}, protect, passthrough} = await readExternalConfig()

    if (cli.flags.show) {
        /**
         * @description 내부 상수를 후순위. 사용자 설정이 덮어쓴다.
         */
        const issueMap = {
            ...ISSUE_TAGGING_MAP,
            ...rules,
        } as Record<string, string | null>

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(issueMap, null, 2))
        return
    }

    const commitMessagePath = cli.input[0]
    const commitFilePath = isAbsolute(commitMessagePath) ? commitMessagePath : join(process.cwd(), commitMessagePath)
    const commitMessage = await fs.readFile(commitFilePath, 'utf8')

    if (!commitMessage) {
        throw new Error('Commit message is required.')
    }

    // protect 매칭은 소문자화한 브랜치로(기존 동작 유지), 태깅은 원본 브랜치로(대문자 키 인식).
    const isProtectedBranch = isStringMatchingPatterns(currentBranchName.toLowerCase(), protect)

    if (isProtectedBranch) {
        throw new Error(`You can't commit on this branch: ${currentBranchName}`)
    }

    const result = getCommitMessageByBranchName(currentBranchName, commitMessage, rules, passthrough)

    await fs.writeFile(commitFilePath, result, {encoding: 'utf8'})
}
