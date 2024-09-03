import path from 'path'

import {
    InvalidFileExtensionError,
    MissingExportPathError,
    TypescriptExportMapError,
    InvalidModuleTypeError,
    InvalidPathError,
    InvalidModuleExtensionError,
} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

interface ExportPath {
    default?: string
    types?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

function validatePath(filePath: string): string {
    if (!filePath.startsWith('./')) {
        throw new InvalidPathError(filePath)
    }
    return filePath
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isExportPath(value: any): value is ExportPath {
    return typeof value === 'object' && value !== null
}

export function verifyOutputPaths(
    packageJSON: IPackageJson,
    packageType: PackageType,
    writtenByTypescript: boolean,
): void {
    const {exports, type, module} = packageJSON

    let cjsOutputPath: string | undefined
    let esmOutputPath: string | undefined
    let cjsTypes: string | undefined
    let esmTypes: string | undefined

    const isESM = type === 'module'

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
                    if (isESM) {
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
        if (path.extname(module) === '.cjs') {
            throw new InvalidModuleExtensionError()
        }
        esmOutputPath = validatePath(module)
    }

    if (typeof exports === 'string') {
        esmOutputPath = esmOutputPath || validatePath(exports)
    } else if (typeof exports === 'object' && exports !== null) {
        traverseExports(exports)
    }

    if (isESM && cjsOutputPath && !esmOutputPath) {
        throw new InvalidModuleTypeError('Package type is "module" but only CommonJS output is specified')
    }
    if (!isESM && esmOutputPath && !cjsOutputPath) {
        throw new InvalidModuleTypeError('Package type is "commonjs" but only ES module output is specified')
    }

    if (packageType === 'dual' && cjsOutputPath && esmOutputPath) {
        const cjsExt = path.extname(cjsOutputPath)
        const esmExt = path.extname(esmOutputPath)
        if (cjsExt === '.js' && esmExt === '.js') {
            throw new InvalidFileExtensionError(
                'Dual 패키지에서 CJS와 ESM 출력 파일은 서로 다른 확장자를 사용해야 합니다.',
            )
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
            throw new TypescriptExportMapError('CJS TypeScript 패키지는 export map에 require.types를 포함해야 합니다.')
        }
        if ((packageType === 'esm' || packageType === 'dual') && !esmTypes) {
            throw new TypescriptExportMapError('ESM TypeScript 패키지는 export map에 import.types를 포함해야 합니다.')
        }
    }
}
