/* eslint-disable no-console */
const {execSync} = require('child_process')
const {existsSync, mkdirSync, readFileSync} = require('fs')
const {platform, arch} = require('os')
const {join} = require('path')

const binaries = {
    'darwin-x64': 'commithelper-go-darwin-amd64',
    'darwin-arm64': 'commithelper-go-darwin-arm64',
    'linux-x64': 'commithelper-go-linux-amd64',
    'win32-x64': 'commithelper-go-windows-amd64.exe',
}

const key = `${platform()}-${arch()}`
const binary = binaries[key]

if (!binary) {
    console.error(`Unsupported platform: ${platform()} ${arch()}`)
    process.exit(1)
}

// Read version from package.json
const packageJsonPath = join(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

const url = `https://github.com/NaverPayDev/cli/releases/download/v${version}/${binary}`
const binDir = join(__dirname, '../bin')

if (!existsSync(binDir)) {
    mkdirSync(binDir)
}

const outputPath = join(binDir, binary)

console.log(`Downloading binary for ${key} from ${url}...`)
execSync(`curl -L ${url} -o ${outputPath} && chmod +x ${outputPath}`, {
    stdio: 'inherit',
})

console.log(`Binary downloaded to ${outputPath}`)
