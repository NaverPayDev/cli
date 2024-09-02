import {
    NoFilesFieldError,
    NoMainFieldError,
    NoExportsFieldError,
    NoSideEffectsFieldError,
    InvalidPathError,
} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

function validatePath(filePath: string) {
    if (!filePath.startsWith('./')) {
        throw new InvalidPathError(filePath)
    }
}

export function verifyRequiredFields(packageJSON: IPackageJson): void {
    if (!packageJSON.files) {
        throw new NoFilesFieldError()
    }
    if (!packageJSON.main) {
        throw new NoMainFieldError()
    } else {
        validatePath(packageJSON.main)
    }
    if (!packageJSON.exports) {
        throw new NoExportsFieldError()
    }

    if (packageJSON.sideEffects === undefined) {
        throw new NoSideEffectsFieldError()
    }
}
