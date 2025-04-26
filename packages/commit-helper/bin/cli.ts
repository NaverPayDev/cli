import {exec} from 'child_process'
import fs from 'fs/promises'
import {join} from 'path'
import process from 'process'

import {cosmiconfigSync} from 'cosmiconfig'
import meow from 'meow'

import {
    ISSUE_TAGGING_MAP,
    BRANCH_ISSUE_TAGGING_REGEX,
    PURE_BRANCH_ISSUE_TAGGING_REGEX,
    DEFAULT_PROTECTED_BRANCHES,
    ISSUE_TAGGING_REGEX,
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

export function getCommitMessageByBranchName(
    branchName: string,
    originCommitMessage: string,
    externalConfig?: Record<string, string | null>,
) {
    let finalCommitMessage = ''

    // 커밋 메시지 내부에 이슈 태깅이 되어 있을 경우, 브랜치명을 확인하지 않고 그냥 보낸다.
    if (ISSUE_TAGGING_REGEX.test(originCommitMessage)) {
        finalCommitMessage = originCommitMessage
    }
    // 현재 브랜치명에서 이슈 태깅을 찾아서 커밋 메시지에 추가한다.
    else {
        const foundedIssueTagging = branchName.match(BRANCH_ISSUE_TAGGING_REGEX)

        // 브랜치 명이 정규식과 일치한다면
        if (foundedIssueTagging && foundedIssueTagging.length > 0) {
            // 브랜치명에는 _fx 와 같은 추가정보가 있을 수 있으므로, 서비스 명을 추가로 뽑아낸다.
            const foundBranch = foundedIssueTagging[0].match(PURE_BRANCH_ISSUE_TAGGING_REGEX)

            if (!foundBranch) {
                // rebase 등으로 브랜치 없이 작업할 수 있음
                return originCommitMessage
            }

            const branchInfo = foundBranch[0]

            const serviceName = branchInfo.split('/')[0].toLowerCase()
            const issueNumber = branchInfo.split('/')[1]

            /**
             * @description 내부 상수를 후순위. 사용자 설정이 덮어쓴다.
             */
            const issueMap = {
                ...ISSUE_TAGGING_MAP,
                ...externalConfig,
            } as Record<string, string | null>

            // 태깅 맵 객체에 맞는게 있는지 확인한다.
            const repoName = issueMap[serviceName]

            // 사용자 설정에 있거나 내부상수에 정의된 경우
            if (repoName) {
                finalCommitMessage = `[${repoName}#${issueNumber}] ${originCommitMessage}`
            }
            // null 로 명시되었다는 것은 자기자신 (#123) 으로 태깅하겠다는 뜻
            else if (repoName === null) {
                finalCommitMessage = `[#${issueNumber}] ${originCommitMessage}`
            }
            // undefined 는 못찾았다는 뜻. 커밋메시지를 그냥 돌려보낸다.
            else {
                finalCommitMessage = originCommitMessage
            }
        }
        // 맞는게 없다면 그냥 기존 메시지로 보낸다
        else {
            finalCommitMessage = originCommitMessage
        }
    }
    return finalCommitMessage
}

interface Config {
    rules: Record<string, string | null>
    protect?: string[]
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

    const extendsUrl = localConfig.extends
    if (typeof extendsUrl === 'string' && /^(http|https):\/\//.test(extendsUrl)) {
        try {
            const response = await fetch(extendsUrl)
            if (!response.ok) {
                throw new Error(`Failed to fetch extends config: ${response.status} ${response.statusText}`)
            }

            const extendsConfig = (await response.json()) as Partial<Config>

            if (extendsConfig.rules && typeof extendsConfig.rules === 'object') {
                Object.assign(mergedRules, extendsConfig.rules)
            }

            if (Array.isArray(extendsConfig.protect)) {
                mergedProtect = [...extendsConfig.protect, ...mergedProtect]
            }
        } catch (e) {
            throw new Error(`Failed to load external config from "${extendsUrl}": ${(e as Error).message}`)
        }
    }

    const result: Config = {
        rules: mergedRules,
    }

    if (mergedProtect.length > 0) {
        result.protect = [...new Set(mergedProtect)]
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

    const currentBranchName = (await getCurrentBranchName()).toLowerCase()

    const {rules = {}, protect} = await readExternalConfig()

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
    const commitFilePath = join(process.cwd(), commitMessagePath)
    const commitMessage = await fs.readFile(commitFilePath, 'utf8')

    if (!commitMessage) {
        throw new Error('Commit message is required.')
    }

    const isProtectedBranch = isStringMatchingPatterns(currentBranchName, protect)

    if (isProtectedBranch) {
        throw new Error(`You can't commit on this branch: ${currentBranchName}`)
    }

    const result = getCommitMessageByBranchName(currentBranchName, commitMessage, rules)

    await fs.writeFile(commitFilePath, result, {encoding: 'utf8'})
}
