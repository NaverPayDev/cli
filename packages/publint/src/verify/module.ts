import path from 'path'

import {DualPackageModuleFieldError, InvalidModuleExtensionError} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

export function verifyModule(packageJSON: IPackageJson, packageType: PackageType): void {
    const {module} = packageJSON

    if (packageType === 'dual') {
        if (!module) {
            throw new DualPackageModuleFieldError()
        }
    }
    if (module) {
        if (path.extname(module) === '.cjs') {
            throw new InvalidModuleExtensionError()
        }
    }
}
