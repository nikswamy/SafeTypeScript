/**
 * Copyright 2012 the V8 project authors. All rights reserved.
 * Copyright 2009 Oliver Hunt <http://nerget.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
///<reference path='rt.ts'/>
module NavierStokes {
    var solver:FluidField = null;
    var nsFrameCounter = 0;

    export function runNavierStokes()
    {
        solver.update();
        nsFrameCounter++;

        if(nsFrameCounter==15)
            checkResult(solver.getDens());
    }

    function checkResult(dens:number[]) {
    
        var result = 0;
        for (var i=7000;i<7100;i++) {
            result+=~~((dens[i]*10));
        }

        if (result!=74) {
            //expected to fail because of the bug fix
            //            console.log("checksum failed: " + result);
        }
    }

    export function setupNavierStokes()
    {
        solver = new FluidField(null);
        solver.setResolution(128, 128);
        solver.setIterations(20);
        solver.setDisplayFunction(function(f:Field){});
        solver.setUICallback(prepareFrame);
        solver.reset();
    }

    export function tearDownNavierStokes()
    {
        solver = null;
    }

    function addPoints(field:Field) {
        var n = 64;
        for (var i = 1; i <= n; i++) {
            field.setVelocity(i, i, n, n);
            field.setDensity(i, i, 5);
            field.setVelocity(i, n - i, -n, -n);
            field.setDensity(i, n - i, 20);
            field.setVelocity(128 - i, n + i, -n, -n);
            field.setDensity(128 - i, n + i, 30);
        }
    }

    var framesTillAddingPoints = 0;
    var framesBetweenAddingPoints = 5;

    function prepareFrame(field:Field)
    {
        if (framesTillAddingPoints == 0) {
            addPoints(field);
            framesTillAddingPoints = framesBetweenAddingPoints;
            framesBetweenAddingPoints++;
        } else {
            framesTillAddingPoints--;
        }
    }

    // Code from Oliver Hunt (http://nerget.com/fluidSim/pressure.js) starts here.
    export class FluidField {
        public update:() => void=null;
        public setDisplayFunction:(func:(field:Field) => void) => void =null;
        public iterations:() => number=null;
        public setIterations:(i:number) => void =null;
        public setUICallback:(fun:(f:Field)=>void) => void=null;
        public reset:() => void=null;
        public getDens:() => number[]=null;
        public setResolution:(hRes:number, wRes:number) => boolean=null;

        constructor(canvas) {
            var iterations = 10;
            var visc = 0.5;
            var dt = 0.1;
            var dens:number[] = null;
            var dens_prev:number []=null;
            var u:number[]=null;
            var u_prev:number[]=null;
            var v:number[]=null;
            var v_prev:number[]=null;
            var width=0;
            var height=0;
            var rowSize=0;
            var size=0;
            var displayFunc: (f:Field) => void = null;

            function addFields(x:number[], s:number[], dt:number)
            {
                for (var i=0; i<size ; i++ ) x[i] += dt*s[i];
            }

            function set_bnd(b:number, x:number[])
            {
                if (b===1) {
                    for (var i = 1; i <= width; i++) {
                        x[i] =  x[i + rowSize];
                        x[i + (height+1) *rowSize] = x[i + height * rowSize];
                    }
                    //Used to be:
                    //for (var j = 1; i <= height; i++) {
                    for (var j = 1; j <= height; j++) { //NS:scoping rules caught this bug; fixed in latest version of V8 octane benchmarks
                        x[j * rowSize] = -x[1 + j * rowSize];
                        x[(width + 1) + j * rowSize] = -x[width + j * rowSize];
                    }
                } else if (b === 2) {
                    for (var i = 1; i <= width; i++) {
                        x[i] = -x[i + rowSize];
                        x[i + (height + 1) * rowSize] = -x[i + height * rowSize];
                    }

                    for (var j = 1; j <= height; j++) {
                        x[j * rowSize] =  x[1 + j * rowSize];
                        x[(width + 1) + j * rowSize] =  x[width + j * rowSize];
                    }
                } else {
                    for (var i = 1; i <= width; i++) {
                        x[i] =  x[i + rowSize];
                        x[i + (height + 1) * rowSize] = x[i + height * rowSize];
                    }

                    for (var j = 1; j <= height; j++) {
                        x[j * rowSize] =  x[1 + j * rowSize];
                        x[(width + 1) + j * rowSize] =  x[width + j * rowSize];
                    }
                }
                var maxEdge = (height + 1) * rowSize;
                x[0]                 = 0.5 * (x[1] + x[rowSize]);
                x[maxEdge]           = 0.5 * (x[1 + maxEdge] + x[height * rowSize]);
                x[(width+1)]         = 0.5 * (x[width] + x[(width + 1) + rowSize]);
                x[(width+1)+maxEdge] = 0.5 * (x[width + maxEdge] + x[(width + 1) + height * rowSize]);
            }

            function lin_solve(b:number, x:number[], x0:number[], a:number, c:number)
            {
                if (a === 0 && c === 1) {
                    for (var j=1 ; j<=height; j++) {
                        var currentRow = j * rowSize;
                        ++currentRow;
                        for (var i = 0; i < width; i++) {
                            x[currentRow] = x0[currentRow];
                            ++currentRow;
                        }
                    }
                    set_bnd(b, x);
                } else {
                    var invC = 1 / c;
                    for (var k=0 ; k<iterations; k++) {
                        for (var j=1 ; j<=height; j++) {
                            var lastRow = (j - 1) * rowSize;
                            var currentRow = j * rowSize;
                            var nextRow = (j + 1) * rowSize;
                            var lastX = x[currentRow];
                            ++currentRow;
                            for (var i=1; i<=width; i++)
                                lastX = x[currentRow] = (x0[currentRow] + a*(lastX+x[++currentRow]+x[++lastRow]+x[++nextRow])) * invC;
                        }
                        set_bnd(b, x);
                    }
                }
            }

            function diffuse(b:number, x:number[], x0:number[], dt:number)
            {
                var a = 0;
                lin_solve(b, x, x0, a, 1 + 4*a);
            }

            function lin_solve2(x:number[], x0:number[], y:number[], y0:number[], a:number, c:number)
            {
                if (a === 0 && c === 1) {
                    for (var j=1 ; j <= height; j++) {
                        var currentRow = j * rowSize;
                        ++currentRow;
                        for (var i = 0; i < width; i++) {
                            x[currentRow] = x0[currentRow];
                            y[currentRow] = y0[currentRow];
                            ++currentRow;
                        }
                    }
                    set_bnd(1, x);
                    set_bnd(2, y);
                } else {
                    var invC = 1/c;
                    for (var k=0 ; k<iterations; k++) {
                        for (var j=1 ; j <= height; j++) {
                            var lastRow = (j - 1) * rowSize;
                            var currentRow = j * rowSize;
                            var nextRow = (j + 1) * rowSize;
                            var lastX = x[currentRow];
                            var lastY = y[currentRow];
                            ++currentRow;
                            for (var i = 1; i <= width; i++) {
                                lastX = x[currentRow] = (x0[currentRow] + a * (lastX + x[currentRow] + x[lastRow] + x[nextRow])) * invC;
                                lastY = y[currentRow] = (y0[currentRow] + a * (lastY + y[++currentRow] + y[++lastRow] + y[++nextRow])) * invC;
                            }
                        }
                        set_bnd(1, x);
                        set_bnd(2, y);
                    }
                }
            }

            function diffuse2(x:number[], x0:number[], y:number[], y0:number[], dt:number)
            {
                var a = 0;
                lin_solve2(x, x0, y, y0, a, 1 + 4 * a);
            }

            function advect(b:number, d:number[], d0:number[], u:number[], v:number[], dt:number)
            {
                var Wdt0 = dt * width;
                var Hdt0 = dt * height;
                var Wp5 = width + 0.5;
                var Hp5 = height + 0.5;
                for (var j = 1; j<= height; j++) {
                    var pos = j * rowSize;
                    for (var i = 1; i <= width; i++) {
                        var x:any = i - Wdt0 * u[++pos];
                        var y:any = j - Hdt0 * v[pos];
                        if (x < 0.5)
                            x = 0.5;
                        else if (x > Wp5)
                            x = Wp5;
                        var i0 = x | 0;
                        var i1 = i0 + 1;
                        if (y < 0.5)
                            y = 0.5;
                        else if (y > Hp5)
                            y = Hp5;
                        var j0 = y | 0;
                        var j1 = j0 + 1;
                        var s1 = x - i0;
                        var s0 = 1 - s1;
                        var t1 = y - j0;
                        var t0 = 1 - t1;
                        var row1 = j0 * rowSize;
                        var row2 = j1 * rowSize;
                        d[pos] = s0 * (t0 * d0[i0 + row1] + t1 * d0[i0 + row2]) + s1 * (t0 * d0[i1 + row1] + t1 * d0[i1 + row2]);
                    }
                }
                set_bnd(b, d);
            }

            function project(u:number[], v:number[], p:number[], div:number[])
            {
                var h = -0.5 / Math.sqrt(width * height);
                for (var j = 1 ; j <= height; j++ ) {
                    var row = j * rowSize;
                    var previousRow = (j - 1) * rowSize;
                    var prevValue = row - 1;
                    var currentRow = row;
                    var nextValue = row + 1;
                    var nextRow = (j + 1) * rowSize;
                    for (var i = 1; i <= width; i++ ) {
                        div[++currentRow] = h * (u[++nextValue] - u[++prevValue] + v[++nextRow] - v[++previousRow]);
                        p[currentRow] = 0;
                    }
                }
                set_bnd(0, div);
                set_bnd(0, p);

                lin_solve(0, p, div, 1, 4 );
                var wScale = 0.5 * width;
                var hScale = 0.5 * height;
                for (var k = 1; k<= height; k++ ) {
                    var prevPos = k * rowSize - 1;
                    var currentPos = k * rowSize;
                    var nextPos = k * rowSize + 1;
                    var prevRow = (k - 1) * rowSize;
                    var currentRow = k * rowSize;
                    var nextRow = (k + 1) * rowSize;

                    for (var i = 1; i<= width; i++) {
                        u[++currentPos] -= wScale * (p[++nextPos] - p[++prevPos]);
                        v[currentPos]   -= hScale * (p[++nextRow] - p[++prevRow]);
                    }
                }
                set_bnd(1, u);
                set_bnd(2, v);
            }

            function dens_step(x:number[], x0:number[], u:number[], v:number[], dt:number)
            {
                addFields(x, x0, dt);
                diffuse(0, x0, x, dt );
                advect(0, x, x0, u, v, dt );
            }

            function vel_step(u:number[], v:number[], u0:number[], v0:number[], dt:number)
            {
                addFields(u, u0, dt );
                addFields(v, v0, dt );
                var temp = u0; u0 = u; u = temp;
                // var
                temp = v0; v0 = v; v = temp;
                diffuse2(u,u0,v,v0, dt);
                project(u, v, u0, v0);
                // var
                temp = u0; u0 = u; u = temp;
                // var
                temp = v0; v0 = v; v = temp;
                advect(1, u, u0, u0, v0, dt);
                advect(2, v, v0, u0, v0, dt);
                project(u, v, u0, v0 );
            }
            var uiCallback = function(field:Field) {};

            function queryUI(d:number[], u:number[], v:number[])
            {
                for (var i = 0; i < size; i++)
                    u[i] = v[i] = d[i] = 0.0;
                uiCallback(new Field(rowSize, width, height, d, u, v));
            } 

            this.update = function () {
                queryUI(dens_prev, u_prev, v_prev);
                vel_step(u, v, u_prev, v_prev, dt);
                dens_step(dens, dens_prev, u, v, dt);
                displayFunc(new Field(rowSize, width, height, dens, u, v));
            }
            this.setDisplayFunction = function(func:(f:Field) => void) {
                displayFunc = func;
            }

            this.iterations = function() { return iterations; }
            this.setIterations = function(iters:number) {
                if (iters > 0 && iters <= 100)
                    iterations = iters;
            }
            this.setUICallback = function(callback:(f:Field) => void) {
                uiCallback = callback;
            }
            function reset()
            {
                rowSize = width + 2;
                size = (width+2)*(height+2);
                dens = new Array<number>(size);
                dens_prev = new Array<number>(size);
                u = new Array<number>(size);
                u_prev = new Array<number>(size);
                v = new Array<number>(size);
                v_prev = new Array<number>(size);
                for (var i = 0; i < size; i++)
                    dens_prev[i] = u_prev[i] = v_prev[i] = dens[i] = u[i] = v[i] = 0;
            }
            this.reset = reset;
            this.getDens = function()
            {
                return dens;
            }
            this.setResolution = function (hRes:number, wRes:number)
            {
                var res = wRes * hRes;
                if (res > 0 && res < 1000000 && (wRes != width || hRes != height)) {
                    width = wRes;
                    height = hRes;
                    reset();
                    return true;
                }
                return false;
            }
            this.setResolution(64, 64);
        }
    }
    export class Field {
        public setDensity : (x:number,y:number,d:number) => void = null;
        public getDensity : (x:number, y:number) => number = null;
        public setVelocity : (x:number, y:number, xv:number, yv:number) => void = null;
        public getXVelocity : (x:number, y:number) => number = null;
        public getYVelocity : (x:number, y:number) => number = null;
        public width : () => number = null;
        public height : () => number = null;
        
        constructor(rowSize:number, width:number, height:number, dens:number[], u:number[], v:number[]) {
            this.setDensity = function(x:number, y:number, d:number) {
                dens[(x + 1) + (y + 1) * rowSize] = d;
            }
            this.getDensity = function(x:number, y:number) {
                return dens[(x + 1) + (y + 1) * rowSize];
            }
            this.setVelocity = function(x:number, y:number, xv:number, yv:number) {
                u[(x + 1) + (y + 1) * rowSize] = xv;
                v[(x + 1) + (y + 1) * rowSize] = yv;
            }
            this.getXVelocity = function(x:number, y:number) {
                return u[(x + 1) + (y + 1) * rowSize];
            }
            this.getYVelocity = function(x:number, y:number) {
                return v[(x + 1) + (y + 1) * rowSize];
            }
            this.width = function() { return width; }
            this.height = function() { return height; }
        }
    }
}

var benchmark_fn = function () {
    NavierStokes.setupNavierStokes();
    NavierStokes.runNavierStokes();
    NavierStokes.tearDownNavierStokes();
};
var setup_fn;
var teardown_fn;

 
