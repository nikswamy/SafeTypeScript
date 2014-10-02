module RT {
    export interface Nominal { }
    export interface Virtual { }

    export function createEmptyMap<T>(): { [key: string]: T } {
        var o = {};
        (<any>o).__proto__ = null;
        return (<any>o);
    }

    export function __forceCheckedArray(c: any, t: RTTI): any {
        return RT.checkAndTag(c, RT.Any, RT.ArrayType(t));
    }

    //TODO: why is this not doing checkAndTag ?
    export function forceCheckedArray<T, S>(c: CheckedArray<T>): S[] {
        return <S[]>(<any>c);
    }
    export function applyVariadic<T>(o: Virtual, m: string, args: T[]): any {
        var f = o[m];
        return f.apply(o, args);
    }
    export function printTag<T>(o: T): void {
        console.log(RT.prettyprint_t(<RTTI> ((<any> o).__rtti__)));
    }
}
