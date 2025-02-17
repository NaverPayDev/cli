import {NoExportsFieldError} from '../errors.js'
import {IPackageJson, PackageType} from '../types/packageJSON.js'

export function verifyPackageType({exports, type}: IPackageJson): PackageType {
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
            if (!exp.import && !exp.require && type) {
                type === 'module' ? (hasEsm = true) : (hasCjs = true)
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
