import {InvalidPathError, InvalidTypesFileError, TypescriptTypesFieldError} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

function endsWithDTs(filePath: string): boolean {
    return filePath.endsWith('.d.ts') || filePath.endsWith('.d.mts') || filePath.endsWith('.d.cts')
}

export const verifyTypes = (packageJSON: IPackageJson) => {
    if (!packageJSON.types) {
        throw new TypescriptTypesFieldError()
    }
    if (!endsWithDTs(packageJSON.types)) {
        throw new InvalidTypesFileError('types 필드')
    }
    if (!packageJSON.types.startsWith('./')) {
        throw new InvalidPathError(packageJSON.types)
    }
}
