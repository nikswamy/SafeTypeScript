module Test1 {
    function spaces(// s: string,
        index: number): number {
            //     if (String_at(s, index) === " ") {
            return spaces(// s,
                index + 1);
            //     } else {
            //         return index;
            //     }
        }
 
    export function f(x:any) {
        /* here's a comment */
        /* and another one */
        return <{f:number}>{f:0,g:x};
        /* and yet another one */
    }      

    var g = function (x:any) { 
        var y = x;
        { 
            var z = 17;
            x.g = 18;
        }
        {
            var z = 18; //re-introducing a name in a block is ok
        }
        z = 18; //TS*: block scope violation
        return x.f;  
    } 

    var gg = function gg(x:any) { 
        var y = x;
        return x.f;  
    } 

    var ggg = (x:any) => { 
        var y = x;
        return x.f;  
    } 

    function h(x:any,y:un) : {f:any} { 
        return {f:x,g:y};  //TS*: subtyping error 
    }

    function i(x:{f:number}) : number {
        return x.f;
    }

    function j(x:{f:number}) : any {
        return x["g"]; 
    }

    function k(n:number) {
        return j({f:n});
    }

    function l(n:number) {
        return (<any>j)(0);
    }

    function m(n:un) {
        return (<any>j)(n); //TS*: dynamic application error
    }

    function n(x:boolean) : any {
        if (x) { return 0; }
        else { return "hi"; }
    }

    //Testing mutual recursive scope for function declarations
    function is_even(x:number)  {
        if (x === 0) return true;
        else return is_odd(x + 1 - 2);
    }
    function is_odd(x:number) : boolean {
        return (x === 0) ? false : is_even(x - 1);
    }

}
