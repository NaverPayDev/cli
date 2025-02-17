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
            throw new InvalidExportError(
                `"${key}"에 대한 export가 올바르지 않습니다: export는 객체 또는 문자열이어야 합니다`,
            )
        }

        if (!value.import && !value.require && !value.default) {
            throw new InvalidExportError(
                `"${key}"에 대한 export는 "import", "require", "default" 중 하나 이상을 포함해야 합니다`,
            )
        }

        if (value.import && typeof value.import !== 'string' && typeof value.import !== 'object') {
            throw new InvalidExportError(`"${key}"에 대한 "import" 필드가 올바르지 않습니다`)
        }

        if (value.require && typeof value.require !== 'string' && typeof value.require !== 'object') {
            throw new InvalidExportError(`"${key}"에 대한 "require" 필드가 올바르지 않습니다`)
        }

        if (typeof value.import === 'object') {
            if (!value.import.default || typeof value.import.default !== 'string') {
                throw new InvalidExportError(`"${key}"에 대한 "import.default" 필드가 올바르지 않습니다`)
            }
            if (value.import.types && typeof value.import.types !== 'string') {
                throw new InvalidExportError(`"${key}"에 대한 "import.types" 필드가 올바르지 않습니다`)
            }
        }

        if (typeof value.require === 'object') {
            if (!value.require.default || typeof value.require.default !== 'string') {
                throw new InvalidExportError(`"${key}"에 대한 "require.default" 필드가 올바르지 않습니다`)
            }
            if (value.require.types && typeof value.require.types !== 'string') {
                throw new InvalidExportError(`"${key}"에 대한 "require.types" 필드가 올바르지 않습니다`)
            }
        }
    })
}
