import {
    TypescriptTypesFieldError,
    TypescriptExportMapError,
    InvalidTypesFileError,
    InvalidPathError,
} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

function endsWithDTs(filePath: string): boolean {
    return filePath.endsWith('.d.ts') || filePath.endsWith('.d.mts') || filePath.endsWith('.d.cts')
}

function validatePath(filePath: string) {
    if (!filePath.startsWith('./')) {
        throw new InvalidPathError(filePath)
    }
}

export function verifyTypescriptPackage(packageJSON: IPackageJson, packageType: PackageType): void {
    if (!packageJSON.types) {
        throw new TypescriptTypesFieldError()
    }

    if (!endsWithDTs(packageJSON.types)) {
        throw new InvalidTypesFileError('types 필드')
    }

    validatePath(packageJSON.types)

    const mainExport = packageJSON.exports?.['.']
    if (typeof mainExport === 'object') {
        let cjsTypes: string | undefined
        let esmTypes: string | undefined

        if (typeof mainExport.require === 'string') {
            cjsTypes = packageJSON.types
        } else if (typeof mainExport.require === 'object') {
            cjsTypes = mainExport.require.types
        }

        if (typeof mainExport.import === 'string') {
            esmTypes = packageJSON.types
        } else if (typeof mainExport.import === 'object') {
            esmTypes = mainExport.import.types
        }

        // 만약 require나 import에 types가 명시되어 있지 않다면, 최상위 types 필드를 사용
        cjsTypes = cjsTypes || packageJSON.types
        esmTypes = esmTypes || packageJSON.types

        if (cjsTypes && !endsWithDTs(cjsTypes)) {
            throw new InvalidTypesFileError('exports["."].require.types 또는 최상위 types 필드')
        }
        if (esmTypes && !endsWithDTs(esmTypes)) {
            throw new InvalidTypesFileError('exports["."].import.types 또는 최상위 types 필드')
        }

        switch (packageType) {
            case 'cjs':
                if (!cjsTypes) {
                    throw new TypescriptExportMapError('CommonJS용 types 필드가 필요합니다.')
                }
                break
            case 'esm':
                if (!esmTypes) {
                    throw new TypescriptExportMapError('ESM용 types 필드가 필요합니다.')
                }
                break
            case 'dual':
                if (!(cjsTypes && esmTypes)) {
                    throw new TypescriptExportMapError('CommonJS와 ESM 모두를 위한 types 필드가 필요합니다.')
                }
                break
        }
    }
}
