function foo(hasOwnProperty:number): number { return hasOwnProperty + 1; }

function factorial(x:number): number {
    if(x === 0) {
	return 1;
    } else {
	return x * factorial(x - 1);
    }
}

interface Foo {
    x:number;
}

function bar(x:Foo) {
    return factorial(x.x);
}
