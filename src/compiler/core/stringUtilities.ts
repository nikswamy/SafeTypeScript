// Modified by N.Swamy (2014)
///<reference path='references.ts' />

module TypeScript {
    export class StringUtilities {
        public static isString(value: any): boolean {
            return (typeof value === "string" || value instanceof String);
        }

        public static fromCharCodeArray(array: number[]): string {
            return RT.applyVariadic<number>(String, "fromCharCode", array);
            //return String.fromCharCode.apply(null, array);
        }

        public static endsWith(string: string, value: string): boolean {
            return string.substring(string.length - value.length, string.length) === value;
        }

        public static startsWith(string: string, value: string): boolean {
            return string.substr(0, value.length) === value;
        }

        public static copyTo(source: string, sourceIndex: number, destination: number[], destinationIndex: number, count: number): void {
            for (var i = 0; i < count; i++) {
                destination[destinationIndex + i] = source.charCodeAt(sourceIndex + i);
            }
        }

        public static repeat(value: string, count: number) {
            return new Array(count + 1).join(value);
        }

        public static stringEquals(val1: string, val2: string): boolean {
            return val1 === val2;
        }
    }
}