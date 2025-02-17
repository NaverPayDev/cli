import fs from 'fs'
import path from 'path'

import {NoPackageJsonError} from './errors.js'
import {IPackageJson} from './types/packageJSON.js'
import {verifyExports} from './verify/exports.js'
import {verifyOutputPaths} from './verify/outputPaths.js'
import {verifyPackageStructure} from './verify/packageStructure.js'
import {verifyPackageType} from './verify/packageType.js'
import {verifyRequiredFields} from './verify/requiredFields.js'
import {verifyTypescriptPackage} from './verify/typescriptPackage.js'

const PACKAGE_JSON = 'package.json'
const TSCONFIG_JSON = 'tsconfig.json'

interface PackageVerificationResult {
    writtenByTypescript: boolean
    packageJSON: IPackageJson
    isDualPackage: boolean
}

export function verifyPackageJSON(packageDir: string): PackageVerificationResult {
    try {
        // packagae.json 존재 여부 확인
        const packageJSONPath = path.join(packageDir, PACKAGE_JSON)
        if (!fs.existsSync(packageJSONPath)) {
            throw new NoPackageJsonError()
        }

        const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8')) as IPackageJson

        // exports 필드 검증
        verifyExports(packageJSON.exports)

        // 필수 필드 확인
        verifyRequiredFields(packageJSON)

        // 패키지 타입 확인 후 각 타입에 맞는 구조를 가지고 있는지 확인
        const packageType = verifyPackageType(packageJSON)

        // dual package 면 `module` 필드를 갖도록 선언
        verifyPackageStructure(packageJSON, packageType)

        // TypeScript 패키지인 경우 타입 정의 파일이 있는지 확인
        const tsConfigPath = path.join(packageDir, TSCONFIG_JSON)
        const writtenByTypescript = fs.existsSync(tsConfigPath)

        if (writtenByTypescript) {
            verifyTypescriptPackage(packageJSON, packageType)
        }

        // exports 필드에 정의된 출력 경로가 올바른지 확인
        verifyOutputPaths(packageJSON, packageType, writtenByTypescript)

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
