declare type Booleanize<T> = {
    [K in keyof T]: T[K] extends object ? Booleanize<T[K]> : boolean
}
