import {DualPackageModuleFieldError} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

export function verifyPackageStructure(packageJSON: IPackageJson, packageType: PackageType): void {
    const {module} = packageJSON

    if (packageType === 'dual') {
        if (!module) {
            throw new DualPackageModuleFieldError()
        }
    }
}
