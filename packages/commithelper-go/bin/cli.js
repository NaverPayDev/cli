#!/usr/bin/env node
const {spawnSync} = require('child_process')
const {platform, arch} = require('os')
const path = require('path')

const binaries = {
    'darwin-x64': 'commithelper-go-darwin-amd64',
    'darwin-arm64': 'commithelper-go-darwin-arm64',
    'linux-x64': 'commithelper-go-linux-amd64',
    'win32-x64': 'commithelper-go-windows-amd64.exe',
}

const key = `${platform()}-${arch()}`
const binaryName = binaries[key]

if (!binaryName) {
    // eslint-disable-next-line no-console
    console.error(`Unsupported platform: ${platform()} ${arch()}`)
    process.exit(1)
}

const binaryPath = path.join(__dirname, binaryName)

const args = process.argv.slice(2)
const result = spawnSync(binaryPath, args, {stdio: 'inherit'})

process.exit(result.status)
