import {defineConfig} from 'tsup'

export default defineConfig({
    entry: ['src/index.ts', 'bin/cli.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: true,
    target: 'node16',
    outDir: 'dist',
})
