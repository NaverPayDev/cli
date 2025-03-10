import {NoExportsFieldError, InvalidExportError, MissingPackageJsonExportError} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

// 새로운 에러 타입 추가

export function verifyExports(exports: IPackageJson['exports']): void {
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
}
