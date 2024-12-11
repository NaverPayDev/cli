/* eslint-disable no-console */
import {execSync} from 'child_process'

import minimatch from 'minimatch'

const args = process.argv.slice(2)

function getExcludedBranches() {
    return args.length
        ? args
              .join(',')
              .split(',')
              .map((branch) => branch.trim())
        : ['main', 'master']
}

function fetchAndPrune() {
    console.log('Fetching and pruning...')
    execSync('git fetch --prune', {stdio: 'inherit'})
}

function getMergedBranches() {
    const command = `git branch --merged origin/main | sed 's/^[* ]*//'`
    try {
        const branches = execSync(command, {encoding: 'utf-8'}).split('\n').filter(Boolean)
        return branches
    } catch (error) {
        console.error('Error fetching merged branches:', error.message)
        return []
    }
}

function filterBranches(branches, patterns) {
    return branches.filter((branch) => patterns.some((pattern) => minimatch(branch, pattern)))
}

function deleteBranches(branches) {
    if (!branches.length) {
        console.log('No branches to delete.')
        return
    }

    for (const branch of branches) {
        try {
            const confirmation = execSync(`read -p "Delete branch ${branch}? (y/N): " answer && echo $answer`, {
                shell: '/bin/bash',
                encoding: 'utf-8',
            })
                .trim()
                .toLowerCase()

            if (confirmation === 'y') {
                execSync(`git branch -d ${branch}`, {stdio: 'inherit'})
                console.log(`Deleted branch: ${branch}`)
            } else {
                console.log(`Skipped branch: ${branch}`)
            }
        } catch (error) {
            console.error(`Error deleting branch ${branch}:`, error.message)
        }
    }
}

function main() {
    const excludedPatterns = getExcludedBranches()
    fetchAndPrune()
    const branches = getMergedBranches()
    const branchesToDelete = branches.filter((branch) => !filterBranches([branch], excludedPatterns).length)
    deleteBranches(branchesToDelete)
}

main()
