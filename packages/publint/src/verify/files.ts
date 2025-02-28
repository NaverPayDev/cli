import {NoFilesFieldError} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

export const verifyFiles = (packageJSON: IPackageJson) => {
    if (!packageJSON.files) {
        throw new NoFilesFieldError()
    }
}
