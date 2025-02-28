import path from 'path'

import {vi, describe, test, expect, beforeEach, afterEach} from 'vitest'

import {
    NoFilesFieldError,
    NoMainFieldError,
    NoExportsFieldError,
    NoSideEffectsFieldError,
    DualPackageModuleFieldError,
    TypescriptTypesFieldError,
    TypescriptExportMapError,
    InvalidFileExtensionError,
    InvalidModuleExtensionError,
    InvalidTypesFileError,
    PackageJsonError,
    MissingPackageJsonExportError,
} from '../src/errors.js'
import {verifyPackageJSON} from '../src/index.js'

/* eslint-disable no-console */
describe('verifyPackageJSON 함수 테스트', () => {
    const fixturesDir = path.join(__dirname, 'fixtures')
    const originalConsoleError = console.error

    beforeEach(() => {
        console.error = vi.fn()
    })

    afterEach(() => {
        console.error = originalConsoleError
    })

    const runTest = (fixtureName: string, ErrorType?: typeof PackageJsonError) => {
        const fixturePath = path.join(fixturesDir, fixtureName)

        if (ErrorType) {
            expect(() => verifyPackageJSON({dir: fixturePath})).toThrow(ErrorType)
        } else {
            expect(() => verifyPackageJSON({dir: fixturePath})).not.toThrow()
        }
    }

    const testCases = [
        {name: '유효한 package.json은 검증을 통과해야 함', fixture: 'valid-package'},
        {
            name: 'files 필드가 없으면 NoFilesFieldError를 발생시켜야 함',
            fixture: 'no-files-field',
            error: NoFilesFieldError,
        },
        {
            name: 'main 필드가 없으면 NoMainFieldError를 발생시켜야 함',
            fixture: 'no-main-field',
            error: NoMainFieldError,
        },
        {
            name: 'exports 필드가 없으면 NoExportsFieldError를 발생시켜야 함',
            fixture: 'no-exports-field',
            error: NoExportsFieldError,
        },
        {
            name: 'sideEffects 필드가 없으면 NoSideEffectsFieldError를 발생시켜야 함',
            fixture: 'no-side-effects-field',
            error: NoSideEffectsFieldError,
        },
        {
            name: 'dual 패키지에서 module 필드가 없으면 DualPackageModuleFieldError를 발생시켜야 함',
            fixture: 'dual-package-no-module',
            error: DualPackageModuleFieldError,
        },
        {
            name: 'TypeScript 패키지에서 types 필드가 없으면 TypescriptTypesFieldError를 발생시켜야 함',
            fixture: 'typescript-no-types',
            error: TypescriptTypesFieldError,
        },
        {
            name: 'Dual 패키지에서 CJS와 ESM 출력 파일이 모두 .js 확장자를 사용하면 InvalidFileExtensionError를 발생시켜야 함',
            fixture: 'dual-package-invalid-extensions',
            error: InvalidFileExtensionError,
        },
        {
            name: 'Dual 패키지에서 CJS와 ESM 출력 파일이 서로 다른 확장자를 사용하면 에러가 발생하지 않아야 함',
            fixture: 'dual-package-valid-extensions',
        },
        {
            name: 'CJS TypeScript 패키지에서 require.types가 없으면 TypescriptExportMapError를 발생시켜야 함',
            fixture: 'cjs-typescript-no-require-types',
            error: TypescriptExportMapError,
        },
        {
            name: 'ESM TypeScript 패키지에서 import.types가 없으면 TypescriptExportMapError를 발생시켜야 함',
            fixture: 'esm-typescript-no-import-types',
            error: TypescriptExportMapError,
        },
        {
            name: 'Dual TypeScript 패키지에서 require.types 또는 import.types가 없으면 TypescriptExportMapError를 발생시켜야 함',
            fixture: 'dual-typescript-missing-types',
            error: TypescriptExportMapError,
        },
        {name: '올바른 TypeScript 패키지 구성에서는 에러가 발생하지 않아야 함', fixture: 'valid-typescript-package'},
        {
            name: 'module 필드에 .cjs 확장자가 사용되면 InvalidModuleExtensionError를 발생시켜야 함',
            fixture: 'invalid-module-extension',
            error: InvalidModuleExtensionError,
        },
        {
            name: '유효하지 않은 types 필드 확장자는 InvalidTypesFileError를 발생시켜야 함',
            fixture: 'invalid-types-field-extension',
            error: InvalidTypesFileError,
        },
        {
            name: 'CJS TypeScript 패키지에서 유효한 require.types는 검증을 통과해야 함',
            fixture: 'valid-cjs-typescript-package',
        },
        {
            name: 'CJS TypeScript 패키지에서 유효하지 않은 require.types 확장자는 InvalidTypesFileError를 발생시켜야 함',
            fixture: 'invalid-cjs-typescript-types-extension',
            error: InvalidTypesFileError,
        },
        {
            name: 'ESM TypeScript 패키지에서 유효한 import.types는 검증을 통과해야 함',
            fixture: 'valid-esm-typescript-package',
        },
        {
            name: 'ESM TypeScript 패키지에서 유효하지 않은 import.types 확장자는 InvalidTypesFileError를 발생시켜야 함',
            fixture: 'invalid-esm-typescript-types-extension',
            error: InvalidTypesFileError,
        },
        {
            name: 'Dual TypeScript 패키지에서 유효한 require.types와 import.types는 검증을 통과해야 함',
            fixture: 'valid-dual-typescript-package',
        },
        {
            name: 'Dual TypeScript 패키지에서 유효하지 않은 require.types 확장자는 InvalidTypesFileError를 발생시켜야 함',
            fixture: 'invalid-dual-typescript-require-types-extension',
            error: InvalidTypesFileError,
        },
        {
            name: 'Dual TypeScript 패키지에서 유효하지 않은 import.types 확장자는 InvalidTypesFileError를 발생시켜야 함',
            fixture: 'invalid-dual-typescript-import-types-extension',
            error: InvalidTypesFileError,
        },
        {
            name: 'exports 에 ./package.json 이 없으면 에러가 발생함',
            fixture: 'no-package-json-exports',
            error: MissingPackageJsonExportError,
        },
    ]

    testCases.forEach(({name, fixture, error}) => {
        test(name, () => {
            runTest(fixture, error)
        })
    })
})
