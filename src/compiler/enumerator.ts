// Modified by N.Swamy (2014)
declare class Enumerator {
    public atEnd(): boolean;
    public moveNext(): boolean;
    public item(): any;
    constructor (o: any);
}