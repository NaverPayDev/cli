import {NoExportsFieldError} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

export function verifyPackageType(exports: IPackageJson['exports']): PackageType {
    let hasCjs = false
    let hasEsm = false

    if (!exports) {
        throw new NoExportsFieldError()
    }

    Object.values(exports).forEach((exp) => {
        if (typeof exp === 'object' && exp !== null) {
            if (exp.require) {
                hasCjs = true
            }
            if (exp.import) {
                hasEsm = true
            }
        }
    })

    if (hasCjs && hasEsm) {
        return 'dual'
    }
    if (hasCjs) {
        return 'cjs'
    }
    if (hasEsm) {
        return 'esm'
    }

    throw new NoExportsFieldError()
}
