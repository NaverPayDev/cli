import {NoSideEffectsFieldError} from '../errors.js'
import {IPackageJson} from '../types/packageJSON.js'

export const verifySideEffects = (packageJSON: IPackageJson) => {
    if (packageJSON.sideEffects === undefined) {
        throw new NoSideEffectsFieldError()
    }
}
