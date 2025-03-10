export class PackageJsonError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PackageJsonError'
    }
}

export class NoPackageJsonError extends PackageJsonError {
    constructor() {
        super(`Please add a 'package.json'`)
        this.name = 'NoPackageJsonError'
    }
}

export class NoFilesFieldError extends PackageJsonError {
    constructor() {
        super(`The 'files' in 'package.json' is required to specify published files`)
        this.name = 'NoFilesFieldError'
    }
}

export class NoMainFieldError extends PackageJsonError {
    constructor() {
        super(`Please add the 'main' to 'package.json'`)
        this.name = 'NoMainFieldError'
    }
}

export class NoExportsFieldError extends PackageJsonError {
    constructor() {
        super(`For better package development, please define an 'exports' in package.json`)
        this.name = 'NoExportsFieldError'
    }
}

export class NoSideEffectsFieldError extends PackageJsonError {
    constructor() {
        super(`For tree shaking, set the 'sideEffects' to 'false' or an array`)
        this.name = 'NoSideEffectsFieldError'
    }
}

export class DualPackageModuleFieldError extends PackageJsonError {
    constructor() {
        super(`In a dual package, please add the 'module' to 'package.json'`)
        this.name = 'DualPackageModuleFieldError'
    }
}

export class TypescriptTypesFieldError extends PackageJsonError {
    constructor() {
        super(`A 'tsconfig' is present. Please add the 'types' to 'package.json'`)
        this.name = 'TypescriptTypesFieldError'
    }
}

export class TypescriptExportMapError extends PackageJsonError {
    constructor(message: string) {
        super(message)
        this.name = 'TypescriptExportMapError'
    }
}

export class MissingExportPathError extends PackageJsonError {
    constructor(type: string) {
        super(`Please add the path for ${type} files in the 'exports'`)
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
        super(`The extension of 'module' cannot be '.cjs'`)
        this.name = 'InvalidModuleExtensionError'
    }
}

export class InvalidTypesFileError extends Error {
    constructor(field: string) {
        super(`${field} must have a '.d.ts' extension`)
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
        super(`The file path must start with './': ${path}`)
        this.name = 'InvalidPathError'
    }
}

export class MissingPackageJsonExportError extends Error {
    constructor() {
        super(
            `The 'exports' is missing {"./package.json": "./package.json"}. This is required for external access to the package metadata`,
        )
        this.name = 'MissingPackageJsonExportError'
    }
}
