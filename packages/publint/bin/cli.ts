#!/usr/bin/env node

import meow from 'meow'

import {verifyPackageJSON} from '../src/index.js'

const cli = meow(
    `
    Usage
      $ @naverpay/publint [directory]

    Examples
      $ @naverpay/publint
      $ @naverpay/publint ./my-project
`,
    {
        importMeta: import.meta,
        flags: {},
    },
)

const directory = cli.input[0] || '.'

try {
    const result = verifyPackageJSON({dir: directory})
    // eslint-disable-next-line no-console
    console.log('Package verification successful!')
    // eslint-disable-next-line no-console
    console.log('Verification results:')
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2))
} catch (error) {
    if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error(`Verification failed: ${error.message}`)
        process.exit(1)
    }
}
