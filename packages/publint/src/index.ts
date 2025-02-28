import fs from 'fs'
import path from 'path'

import {NoPackageJsonError} from './errors.js'
import {getPackageType} from './packageType.js'
import {IPackageJson} from './types/packageJSON.js'
import {verifyExports} from './verify/exports.js'
import {verifyFiles} from './verify/files.js'
import {verifyMain} from './verify/main.js'
import {verifyModule} from './verify/module.js'
import {verifySideEffects} from './verify/sideEffects.js'
import {verifyTypes} from './verify/types.js'

const PACKAGE_JSON = 'package.json'
const TSCONFIG_JSON = 'tsconfig.json'

interface PackageVerificationParams {
    dir: string
    option?: {
        /** 검사를 스킵할 필드 */
        skip?: Partial<Booleanize<IPackageJson>>
    }
}

interface PackageVerificationResult {
    writtenByTypescript: boolean
    packageJSON: IPackageJson
    isDualPackage: boolean
}

export function verifyPackageJSON({
    dir,
    option: {skip = {}} = {},
}: PackageVerificationParams): PackageVerificationResult {
    try {
        // package.json 존재 여부 확인
        const packageJSONPath = path.join(dir, PACKAGE_JSON)
        if (!fs.existsSync(packageJSONPath)) {
            throw new NoPackageJsonError()
        }
        const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8')) as IPackageJson
        // TypeScript 패키지인 경우 타입 정의 파일이 있는지 확인
        const writtenByTypescript = fs.existsSync(path.join(dir, TSCONFIG_JSON))
        // 패키지 타입 확인 후 각 타입에 맞는 구조를 가지고 있는지 확인
        const packageType = getPackageType(packageJSON)

        // main
        !skip.main && verifyMain(packageJSON)

        // types
        !skip.types && writtenByTypescript && verifyTypes(packageJSON)

        // sideEffects
        !skip.sideEffects && verifySideEffects(packageJSON)

        // files
        !skip.files && verifyFiles(packageJSON)

        // exports
        !skip.exports && verifyExports(packageJSON, packageType, writtenByTypescript)

        // module
        !skip.module && verifyModule(packageJSON, packageType)

        return {
            writtenByTypescript,
            packageJSON,
            isDualPackage: packageType === 'dual',
        }
    } catch (error) {
        if (error instanceof Error) {
            // eslint-disable-next-line no-console
            console.error(`Package.json 검증 실패: ${error.message}`)
        }
        throw error
    }
}
