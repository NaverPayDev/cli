#!/usr/bin/env node
const {spawnSync} = require('child_process')
const {platform, arch} = require('os')
const path = require('path')

const pkgMap = {
    'darwin-x64': '@naverpay/commithelper-go-darwin-x64',
    'darwin-arm64': '@naverpay/commithelper-go-darwin-arm64',
    'linux-x64': '@naverpay/commithelper-go-linux-x64',
    'win32-x64': '@naverpay/commithelper-go-win32-x64',
}

const key = `${platform()}-${arch()}`
const pkgName = pkgMap[key]

if (!pkgName) {
    // eslint-disable-next-line no-console
    console.error(`Unsupported platform: ${platform()} ${arch()}`)
    process.exit(1)
}

let binaryPath
try {
    const pkgDir = path.dirname(require.resolve(`${pkgName}/package.json`))
    const binaryName = platform() === 'win32' ? 'commithelper-go.exe' : 'commithelper-go'
    binaryPath = path.join(pkgDir, binaryName)
} catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Platform package ${pkgName} is not installed. Please reinstall @naverpay/commithelper-go.`)
    process.exit(1)
}

const args = process.argv.slice(2)
const result = spawnSync(binaryPath, args, {stdio: 'inherit'})

process.exit(result.status)
