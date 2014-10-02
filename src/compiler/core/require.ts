// Modified by N.Swamy (2014)
///<reference path='references.ts' />

// Forward declarations of the variables we use from 'node'.
//declare var require: any;
//declare var module: any;

declare var require: {
    (id: string): any;
    resolve(id: string): string;
    cache: any;
    extensions: any;
    main: any;
};


declare var module: {
    exports: any;
    require(id: string): any;
    id: string;
    filename: string;
    loaded: boolean;
    parent: any;
    children: any[];
};
