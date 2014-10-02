// Modified by N.Swamy (2014)
/// <reference path='references.ts' />

module TypeScript {
    export interface Iterator<T> {
        moveNext(): boolean;
        current(): T;
    }
}