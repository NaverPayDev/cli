import path from 'path'

import {
    NoExportsFieldError,
    InvalidExportError,
    MissingPackageJsonExportError,
    InvalidTypesFileError,
    TypescriptExportMapError,
    InvalidPathError,
    InvalidModuleTypeError,
    InvalidFileExtensionError,
    MissingExportPathError,
} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

function endsWithDTs(filePath: string): boolean {
    return filePath.endsWith('.d.ts') || filePath.endsWith('.d.mts') || filePath.endsWith('.d.cts')
}

function validatePath(filePath: string): string {
    if (!filePath.startsWith('./')) {
        throw new InvalidPathError(filePath)
    }
    return filePath
}

interface ExportPath {
    default?: string
    types?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isExportPath(value: any): value is ExportPath {
    return typeof value === 'object' && value !== null
}

export function verifyExports(
    {exports, types, module}: IPackageJson,
    packageType: PackageType,
    writtenByTypescript: boolean,
): void {
    if (typeof exports !== 'object' || exports === null) {
        throw new NoExportsFieldError()
    }

    // package.json 엔트리 확인
    if (!exports['./package.json'] || exports['./package.json'] !== './package.json') {
        throw new MissingPackageJsonExportError()
    }

    Object.entries(exports).forEach(([key, value]) => {
        if (typeof value === 'string') {
            return
        }

        if (typeof value !== 'object' || value === null) {
            throw new InvalidExportError(`Export for the '${key}' is invalid. It must be an 'object' or a 'string'`)
        }

        if (!value.import && !value.require && !value.default) {
            throw new InvalidExportError(
                `Export for the '${key}' must include at least one of 'import', 'require', or 'default'`,
            )
        }

        if (value.import && typeof value.import !== 'string' && typeof value.import !== 'object') {
            throw new InvalidExportError(`The 'import' for '${key}' is invalid`)
        }

        if (value.require && typeof value.require !== 'string' && typeof value.require !== 'object') {
            throw new InvalidExportError(`The 'require' for '${key}' is invalid`)
        }

        if (typeof value.import === 'object') {
            if (!value.import.default || typeof value.import.default !== 'string') {
                throw new InvalidExportError(`The 'import.default' for '${key}' is invalid`)
            }
            if (value.import.types && typeof value.import.types !== 'string') {
                throw new InvalidExportError(`The 'import.types' for '${key}' is invalid`)
            }
        }

        if (typeof value.require === 'object') {
            if (!value.require.default || typeof value.require.default !== 'string') {
                throw new InvalidExportError(`The 'require.default' for '${key}' is invalid`)
            }
            if (value.require.types && typeof value.require.types !== 'string') {
                throw new InvalidExportError(`The 'require.types' for '${key}' is invalid`)
            }
        }
    })

    if (writtenByTypescript) {
        // typescript로 작성된 경우 exports.types 검증
        const mainExport = exports?.['.']
        if (typeof mainExport === 'object') {
            let cjsTypes: string | undefined
            let esmTypes: string | undefined

            // TODO: mainExport.types도 유효한 문법으로 봐도 될 것 같다.
            if (typeof mainExport.require === 'string') {
                cjsTypes = types
            } else if (typeof mainExport.require === 'object') {
                cjsTypes = mainExport.require.types
            }

            if (typeof mainExport.import === 'string') {
                esmTypes = types
            } else if (typeof mainExport.import === 'object') {
                esmTypes = mainExport.import.types
            }

            // 만약 require나 import에 types가 명시되어 있지 않다면, 최상위 types 필드를 사용
            cjsTypes = cjsTypes || types
            esmTypes = esmTypes || types

            if (cjsTypes && !endsWithDTs(cjsTypes)) {
                throw new InvalidTypesFileError(`'exports["."].require.types' or the 'types'`)
            }
            if (esmTypes && !endsWithDTs(esmTypes)) {
                throw new InvalidTypesFileError(`'exports["."].import.types' or the 'types'`)
            }

            switch (packageType) {
                case 'cjs':
                    if (!cjsTypes) {
                        throw new TypescriptExportMapError(`The 'types' for CJS is required`)
                    }
                    break
                case 'esm':
                    if (!esmTypes) {
                        throw new TypescriptExportMapError(`The 'types' for ESM is required`)
                    }
                    break
                case 'dual':
                    if (!(cjsTypes && esmTypes)) {
                        throw new TypescriptExportMapError(`The 'types' for both CJS and ESM is required`)
                    }
                    break
            }
        }
    }

    // exports 필드에 정의된 출력 경로가 올바른지 확인
    let cjsOutputPath: string | undefined
    let esmOutputPath: string | undefined
    let cjsTypes: string | undefined
    let esmTypes: string | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function traverseExports(obj: any) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                const validatedPath = validatePath(value)
                if (key === 'require') {
                    cjsOutputPath = cjsOutputPath || validatedPath
                } else if (key === 'import') {
                    esmOutputPath = esmOutputPath || validatedPath
                } else if (key === 'types' || key === 'typings') {
                    cjsTypes = cjsTypes || validatedPath
                    esmTypes = esmTypes || validatedPath
                } else if (!key.startsWith('.')) {
                    if (packageType === 'esm') {
                        esmOutputPath = esmOutputPath || validatedPath
                    } else {
                        cjsOutputPath = cjsOutputPath || validatedPath
                    }
                }
            } else if (isExportPath(value)) {
                if (key === 'require') {
                    cjsOutputPath = cjsOutputPath || (value.default ? validatePath(value.default) : undefined)
                    cjsTypes = cjsTypes || (value.types ? validatePath(value.types) : undefined)
                } else if (key === 'import') {
                    esmOutputPath = esmOutputPath || (value.default ? validatePath(value.default) : undefined)
                    esmTypes = esmTypes || (value.types ? validatePath(value.types) : undefined)
                } else {
                    traverseExports(value)
                }
            }
        }
    }

    if (module) {
        esmOutputPath = validatePath(module)
    }
    if (typeof exports === 'string') {
        esmOutputPath = esmOutputPath || validatePath(exports)
    } else if (typeof exports === 'object' && exports !== null) {
        traverseExports(exports)
    }

    if (packageType === 'esm' && cjsOutputPath && !esmOutputPath) {
        throw new InvalidModuleTypeError(`'type' is 'module' but only CJS output is specified`)
    }
    if (packageType !== 'esm' && esmOutputPath && !cjsOutputPath) {
        throw new InvalidModuleTypeError(`'type' is 'commonjs' but only ESM output is specified`)
    }

    if (packageType === 'dual' && cjsOutputPath && esmOutputPath) {
        const cjsExt = path.extname(cjsOutputPath)
        const esmExt = path.extname(esmOutputPath)
        if (cjsExt === '.js' && esmExt === '.js') {
            throw new InvalidFileExtensionError(`Dual package CJS and ESM output files must have different extensions`)
        }
    }

    if ((packageType === 'cjs' || packageType === 'dual') && !cjsOutputPath) {
        throw new MissingExportPathError('CJS')
    }
    if ((packageType === 'esm' || packageType === 'dual') && !esmOutputPath) {
        throw new MissingExportPathError('ESM')
    }

    if (writtenByTypescript) {
        if ((packageType === 'cjs' || packageType === 'dual') && !cjsTypes) {
            throw new TypescriptExportMapError(`CJS TypeScript packages must include 'require.types' in the 'exports'`)
        }
        if ((packageType === 'esm' || packageType === 'dual') && !esmTypes) {
            throw new TypescriptExportMapError(`ESM TypeScript packages must include 'import.types' in the 'exports'`)
        }
    }
}
