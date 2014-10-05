///<reference path='rt.ts'/>

var foo = function(x:any) :number { return x.f; }

console.log(foo({f:2}));
