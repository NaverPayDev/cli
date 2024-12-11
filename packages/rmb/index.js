/* eslint-disable no-console */
import chalk from 'chalk'
import {minimatch} from 'minimatch'
import {$, question} from 'zx'

const args = process.argv.slice(2)
const shouldDeleteAll = args.includes('--all')

const defaultExclusions = ['main', 'master']

function getExcludedBranches() {
    const exclusions = args
        .filter((arg) => arg !== '--all')
        .join(',')
        .split(',')
        .map((branch) => branch.trim())
        .filter(Boolean)
    return [...new Set([...defaultExclusions, ...exclusions])]
}

async function fetchAndPrune() {
    console.log(chalk.cyan('Fetching and pruning...'))
    await $`git fetch --prune`
}

async function getMergedBranches() {
    try {
        const branches = (await $`git branch --merged origin/main --merged origin/master | sed 's/^[* ]*//'`).stdout
            .split('\n')
            .filter(Boolean)
        return branches
    } catch (error) {
        console.error(chalk.red('Error fetching merged branches:'), error)
        return []
    }
}

function filterBranches(branches, patterns) {
    return branches.filter((branch) => !patterns.some((pattern) => minimatch(branch, pattern)))
}

async function deleteBranches(branches) {
    if (!branches.length) {
        console.log(chalk.yellow('No branches to delete.'))
        return
    }

    const deletedBranches = []

    for (const branch of branches) {
        try {
            if (shouldDeleteAll) {
                await $`git branch -d ${branch}`
                deletedBranches.push(branch)
            } else {
                const confirmation = (await question(chalk.magenta(`Delete branch ${branch}? (y/N): `)))
                    .trim()
                    .toLowerCase()
                if (confirmation === 'y') {
                    await $`git branch -d ${branch}`
                    deletedBranches.push(branch)
                } else {
                    console.log(chalk.blue(`Skipped branch: ${branch}`))
                }
            }
        } catch (error) {
            console.error(chalk.red(`Error deleting branch ${branch}:`), error)
        }
    }

    if (deletedBranches.length) {
        console.log(chalk.green('Deleted branches:'), deletedBranches.join(', '))
    } else {
        console.log(chalk.yellow('No branches were deleted.'))
    }
}

async function main() {
    const excludedPatterns = getExcludedBranches()
    await fetchAndPrune()
    const branches = await getMergedBranches()
    const branchesToDelete = filterBranches(branches, excludedPatterns)

    if (!branchesToDelete.length) {
        console.log(chalk.yellow('No branches to delete. All branches are either excluded or not merged.'))
        return
    }

    await deleteBranches(branchesToDelete)
}

main()
