import {InvalidPathError, NoMainFieldError} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

export const verifyMain = (packageJSON: IPackageJson) => {
    if (!packageJSON.main) {
        throw new NoMainFieldError()
    }
    if (!packageJSON.main.startsWith('./')) {
        throw new InvalidPathError(packageJSON.main)
    }
}
