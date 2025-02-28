import {UnknownPackageTypeError} from './errors.js'
import {IPackageJson, PackageType} from './types/packageJSON.js'

export function getPackageType({exports, type, main}: IPackageJson): PackageType {
    let hasCjs = false
    let hasEsm = false

    if (!exports && !type && main) {
        hasCjs = true
    } else if (type) {
        type === 'module' ? (hasEsm = true) : (hasCjs = true)
    }

    exports &&
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

    throw new UnknownPackageTypeError()
}
