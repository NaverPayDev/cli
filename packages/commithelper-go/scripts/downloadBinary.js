/* eslint-disable no-console */
const {execSync} = require('child_process')
const {existsSync, mkdirSync, readFileSync} = require('fs')
const {platform, arch} = require('os')
const {join} = require('path')

// Define the mapping of platform and architecture to the corresponding binary file names
const binaries = {
    'darwin-x64': 'commithelper-go-darwin-amd64',
    'darwin-arm64': 'commithelper-go-darwin-arm64',
    'linux-x64': 'commithelper-go-linux-amd64',
    'win32-x64': 'commithelper-go-windows-amd64.exe',
}

// Determine the current platform and architecture
const key = `${platform()}-${arch()}`
const binary = binaries[key]

// If the platform or architecture is not supported, exit with an error
if (!binary) {
    console.error(`Unsupported platform: ${platform()} ${arch()}`)
    process.exit(1)
}

// Read the version from the package.json file
const packageJsonPath = join(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

// Construct the URL to download the binary from the GitHub releases
const url = `https://github.com/NaverPayDev/cli/releases/download/v${version}/${binary}`

// Define the directory where the binary will be saved
const binDir = join(__dirname, '../bin')

// Create the bin directory if it does not exist
if (!existsSync(binDir)) {
    mkdirSync(binDir)
}

// Define the full path where the binary will be saved
const outputPath = join(binDir, binary)

// Log the download process
console.log(`Downloading binary for ${key} from ${url}...`)

// Download the binary using curl and make it executable
execSync(`curl -L ${url} -o ${outputPath} && chmod +x ${outputPath}`, {
    stdio: 'inherit',
})

// Log the successful download
console.log(`Binary downloaded to ${outputPath}`)
