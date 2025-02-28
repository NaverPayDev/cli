export class PackageJsonError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PackageJsonError'
    }
}

export class NoPackageJsonError extends PackageJsonError {
    constructor() {
        super('추가하려는 패키지에 package.json을 추가해주세요.')
        this.name = 'NoPackageJsonError'
    }
}

export class NoFilesFieldError extends PackageJsonError {
    constructor() {
        super('package.json에 file 필드가 필요합니다. 이 필드는 npm publish 시에 배포되는 파일 목록입니다.')
        this.name = 'NoFilesFieldError'
    }
}

export class NoMainFieldError extends PackageJsonError {
    constructor() {
        super('package.json에 main 필드를 추가해주세요.')
        this.name = 'NoMainFieldError'
    }
}

export class NoExportsFieldError extends PackageJsonError {
    constructor() {
        super(
            '더 나은 패키지 개발을 위해 package.json에 export map을 작성해주세요. 참고: https://nodejs.org/api/packages.html#exports',
        )
        this.name = 'NoExportsFieldError'
    }
}

export class NoSideEffectsFieldError extends PackageJsonError {
    constructor() {
        super('원활한 tree shaking을 위해, sideEffects 필드를 false 혹은 배열을 추가해주세요.')
        this.name = 'NoSideEffectsFieldError'
    }
}

export class DualPackageModuleFieldError extends PackageJsonError {
    constructor() {
        super('dual 패키지에서는 package.json에 module 필드를 추가해주세요.')
        this.name = 'DualPackageModuleFieldError'
    }
}

export class TypescriptTypesFieldError extends PackageJsonError {
    constructor() {
        super('tsconfig가 존재합니다. package.json에 types 필드를 적어주세요.')
        this.name = 'TypescriptTypesFieldError'
    }
}

export class TypescriptExportMapError extends PackageJsonError {
    constructor(message: string) {
        super(message)
        this.name = 'TypescriptExportMapError'
    }
}

export class InvalidExportPathError extends PackageJsonError {
    constructor(type: string) {
        super(`export map 하위에 ${type} 경로를 제대로 작성해주세요.`)
        this.name = 'InvalidExportPathError'
    }
}

export class MissingExportPathError extends PackageJsonError {
    constructor(type: string) {
        super(`export map 하위에 ${type} 파일이 위치할 경로를 추가해주세요.`)
        this.name = 'MissingExportPathError'
    }
}

export class InvalidFileExtensionError extends PackageJsonError {
    constructor(message: string) {
        super(message)
        this.name = 'InvalidFileExtensionError'
    }
}

export class InvalidModuleExtensionError extends Error {
    constructor() {
        super('module 필드의 파일 확장자는 .cjs가 될 수 없습니다.')
        this.name = 'InvalidModuleExtensionError'
    }
}

export class InvalidTypesFileError extends Error {
    constructor(field: string) {
        super(`${field}는 .d.ts 파일을 가리켜야 합니다.`)
        this.name = 'InvalidTypesFileError'
    }
}

export class InvalidExportError extends Error {
    constructor(message: string) {
        super(`Invalid export configuration: ${message}`)
        this.name = 'InvalidExportError'
    }
}

export class InvalidModuleTypeError extends PackageJsonError {
    constructor(message: string) {
        super(message)
        this.name = 'InvalidModuleTypeError'
    }
}

export class InvalidPathError extends PackageJsonError {
    constructor(path: string) {
        super(`파일 경로는 './'로 시작해야 합니다: ${path}`)
        this.name = 'InvalidPathError'
    }
}

export class MissingPackageJsonExportError extends Error {
    constructor() {
        super(
            'exports 필드에 "./package.json": "./package.json" 엔트리가 없습니다. 이 정보가 있어야 외부에서 해당 패키지의 메타데이터를 읽어올 수 있습니다.',
        )
        this.name = 'MissingPackageJsonExportError'
    }
}

export class UnknownPackageTypeError extends Error {
    constructor() {
        super('Unable to determine whether the package supports CJS, ESM, or dual formats.')
        this.name = 'UnknownPackageTypeError'
    }
}
