export interface ExportMap {
    require?: string | ConditionalExport
    import?: string | ConditionalExport
    default?: string
}

interface ConditionalExport {
    types?: string
    default?: string
}

export interface IPackageJson {
    name: string
    version: string
    description?: string
    keywords?: string[]
    homepage?: string
    bugs?: {
        url?: string
        email?: string
    }
    license?: string
    author?:
        | string
        | {
              name: string
              email?: string
              url?: string
          }
    contributors?: (
        | string
        | {
              name: string
              email?: string
              url?: string
          }
    )[]
    files?: string[]
    main?: string
    browser?: string
    bin?: Record<string, string>
    man?: string | string[]
    directories?: {
        lib?: string
        bin?: string
        man?: string
        doc?: string
        example?: string
        test?: string
    }
    repository?: {
        type?: string
        url?: string
        directory?: string
    }
    scripts?: Record<string, string>
    config?: Record<string, unknown>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
    bundledDependencies?: string[]
    engines?: Record<string, string>
    os?: string[]
    cpu?: string[]
    private?: boolean
    publishConfig?: Record<string, unknown>
    workspaces?: string[] | {packages?: string[]; nohoist?: string[]}
    types?: string
    module?: string
    exports?: Record<string, string | ExportMap>
    type?: 'commonjs' | 'module'
    sideEffects?: boolean | string[]
}

export type PackageType = 'cjs' | 'esm' | 'dual'
