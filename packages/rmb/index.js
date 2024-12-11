#!/usr/bin/env node

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
        let mergeCommand = 'git branch'

        const mainExists = (await $`git show-ref --verify --quiet refs/remotes/origin/main`).exitCode === 0
        const masterExists = (await $`git show-ref --verify --quiet refs/remotes/origin/master`).exitCode === 0

        if (mainExists && masterExists) {
            mergeCommand = "git branch --merged origin/main --merged origin/master | sed 's/^[* ]*//'"
        } else if (mainExists) {
            mergeCommand = "git branch --merged origin/main | sed 's/^[* ]*//'"
        } else if (masterExists) {
            mergeCommand = "git branch --merged origin/master | sed 's/^[* ]*//'"
        }

        const branches = (await $`${mergeCommand}`).stdout
            .split('\n')
            .filter(Boolean)
            .filter((branch) => !defaultExclusions.includes(branch))

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
