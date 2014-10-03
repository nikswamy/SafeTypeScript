// The ray tracer code in this file is written by Adam Burmister. It
// is available in its original form from:
//
//   http://labs.nz.co/raytracer/
//
// It has been modified slightly by Google to work as a standalone
// benchmark, but the all the computational code remains
// untouched. This file also contains a copy of parts of the Prototype
// JavaScript framework which is used by the ray tracer.

//var RayTrace = new BenchmarkSuite('RayTrace', 739989, [
//  new Benchmark('RayTrace', renderScene)
//]);

// Variable used to hold a number that can be used to verify that
// the scene was ray traced correctly.
///<reference path='rt.ts'/>
module VERSION {
    export module RayTracer {
        var checkNumber:number=0;
        export class Color {

            constructor(public red = 0.0, public green = 0.0, public blue= 0.0) {
            }

            public static add(c1:Color, c2:Color) {
                var result = new Color(0, 0, 0);

                result.red = c1.red + c2.red;
                result.green = c1.green + c2.green;
                result.blue = c1.blue + c2.blue;

                return result;
            }

            public static addScalar(c1:Color, s:number) {
                var result = new Color(0, 0, 0);

                result.red = c1.red + s;
                result.green = c1.green + s;
                result.blue = c1.blue + s;

                result.limit();

                return result;
            }


            public static subtract(c1:Color, c2:Color) {
                var result = new Color(0, 0, 0);

                result.red = c1.red - c2.red;
                result.green = c1.green - c2.green;
                result.blue = c1.blue - c2.blue;

                return result;
            }

            public static multiply(c1:Color, c2:Color) {
                var result = new Color(0, 0, 0);

                result.red = c1.red * c2.red;
                result.green = c1.green * c2.green;
                result.blue = c1.blue * c2.blue;

                return result;
            }

            public static multiplyScalar(c1:Color, f:number) {
                var result = new Color(0, 0, 0);

                result.red = c1.red * f;
                result.green = c1.green * f;
                result.blue = c1.blue * f;

                return result;
            }


            public static divideFactor(c1:Color, f:number) {
                var result = new Color(0, 0, 0);

                result.red = c1.red / f;
                result.green = c1.green / f;
                result.blue = c1.blue / f;

                return result;
            }

            public limit() {
                this.red = (this.red > 0.0) ? ((this.red > 1.0) ? 1.0 : this.red) : 0.0;
                this.green = (this.green > 0.0) ? ((this.green > 1.0) ? 1.0 : this.green) : 0.0;
                this.blue = (this.blue > 0.0) ? ((this.blue > 1.0) ? 1.0 : this.blue) : 0.0;
            }

            public distance(color:Color) {
                var d = Math.abs(this.red - color.red) + Math.abs(this.green - color.green) + Math.abs(this.blue - color.blue);
                return d;
            }

            public static blend(c1:Color, c2:Color, w:number) {
                var result = new Color(0, 0, 0);
                result = Color.add(
                    Color.multiplyScalar(c1, 1 - w),
                    Color.multiplyScalar(c2, w)
                );
                return result;
            }

            public brightness() {
                var r = Math.floor(this.red * 255);
                var g = Math.floor(this.green * 255);
                var b = Math.floor(this.blue * 255);
                return (r * 77 + g * 150 + b * 29) >> 8;
            }

            public toString() {
                var r = Math.floor(this.red * 255);
                var g = Math.floor(this.green * 255);
                var b = Math.floor(this.blue * 255);

                return "rgb(" + r + "," + g + "," + b + ")";
            }
        }

        export class Light {
            constructor(public position:Vector= null, public color:Color= null, public intensity= 10.0) {
            }

            public toString() {
                return 'Light [' + this.position.x + ',' + this.position.y + ',' + this.position.z + ']';
            }
        }

        export class Vector {
            constructor(public x= 0.0, public y= 0.0, public z= 0.0) {
            }

            public copy(vector:Vector) {
                this.x = vector.x;
                this.y = vector.y;
                this.z = vector.z;
            }

            public normalize() {
                var m = this.magnitude();
                return new Vector(this.x / m, this.y / m, this.z / m);
            }

            public magnitude() {
                return Math.sqrt((this.x * this.x) + (this.y * this.y) + (this.z * this.z));
            }

            public cross(w:Vector) {
                return new Vector(
                        -this.z * w.y + this.y * w.z,
                    this.z * w.x - this.x * w.z,
                        -this.y * w.x + this.x * w.y);
            }

            public dot(w:Vector) {
                return this.x * w.x + this.y * w.y + this.z * w.z;
            }

            public static add(v:Vector, w:Vector) {
                return new Vector(w.x + v.x, w.y + v.y, w.z + v.z);
            }

            public static subtract(v:Vector, w:Vector) {
                if (!w || !v) throw 'Vectors must be defined [' + v + ',' + w + ']';
                return new Vector(v.x - w.x, v.y - w.y, v.z - w.z);
            }

            public static multiplyVector(v:Vector, w:Vector) {
                return new Vector(v.x * w.x, v.y * w.y, v.z * w.z);
            }

            public static multiplyScalar(v:Vector, w:number) {
                return new Vector(v.x * w, v.y * w, v.z * w);
            }

            public toString() {
                return 'Vector [' + this.x + ',' + this.y + ',' + this.z + ']';
            }
        }

        export class Ray {
            constructor(public position:Vector, public direction:Vector) {
            }

            public toString() {
                return 'Ray [' + this.position + ',' + this.direction + ']';
            }
        }

        export class Scene {
            public camera : Camera = null;
            public shapes : Shape[] = [];
            public lights : Light[] = [];
            public background : Background = null;

            constructor() {
                this.camera = new Camera(
                    new Vector(0, 0, -5),
                    new Vector(0, 0, 1),
                    new Vector(0, 1, 0)
                );
                this.shapes = new Array<Shape>(0);
                this.lights = new Array<Light>(0);
                this.background = new Background(new Color(0, 0, 0.5), 0.2);
            }
        }

        // module Material {

        export class BaseMaterial {
            constructor(public gloss = 2.0,             // [0...infinity] 0 = matt
                        public transparency = 0.0,      // 0=opaque
                        public reflection = 0.0,       // [0...infinity] 0 = no reflection
                        public refraction = 0.50,
                        public hasTexture = false) {
            }

            public getColor(u:number, v:number) : Color {
                throw "Abstract method";
            }

            public wrapUp(t:number) {
                t = t % 2.0;
                if (t < -1) t += 2.0;
                if (t >= 1) t -= 2.0;
                return t;
            }

            public toString() {
                return 'Material [gloss=' + this.gloss + ', transparency=' + this.transparency + ', hasTexture=' + this.hasTexture + ']';
            }
        }

        export class Solid extends BaseMaterial {
            constructor(public color:Color, reflection:number, refraction:number, transparency:number, gloss:number) {
                super(gloss, transparency, reflection, refraction);
            }

            public getColor(u:number, v:number) : Color {
                return this.color;
            }

            public toString() {
                return 'SolidMaterial [gloss=' + this.gloss + ', transparency=' + this.transparency + ', hasTexture=' + this.hasTexture + ']';
            }
        }

        export class Chessboard extends BaseMaterial {
            constructor(public colorEven:Color, public colorOdd:Color, 
                        reflection:number, 
                        transparency:number, 
                        gloss:number, 
                        public density= 0.5) {
                super(gloss, transparency, reflection, 0.50, true);
            }

            public getColor(u:number, v:number) : Color {
                var t = this.wrapUp(u * this.density) * this.wrapUp(v * this.density);

                if (t < 0.0)
                    return this.colorEven;
                else
                    return this.colorOdd;
            }

            public toString() {
                return 'ChessMaterial [gloss=' + this.gloss + ', transparency=' + this.transparency + ', hasTexture=' + this.hasTexture + ']';
            }
        }

        export class Shape {
            constructor(public position:Vector, public material:BaseMaterial) {
            }

            public intersect(ray:Ray) : IntersectionInfo {
                throw "Abstract method";
            }
        }

        export class Sphere extends Shape {
            constructor(position:Vector, public radius:number, material:BaseMaterial) {
                super(position, material);
            }

            public intersect(ray:Ray) : IntersectionInfo {
                var info = new IntersectionInfo();
                info.shape = this;

                var dst = Vector.subtract(ray.position, this.position);

                var B = dst.dot(ray.direction);
                var C = dst.dot(dst) - (this.radius * this.radius);
                var D = (B * B) - C;

                if (D > 0) { // intersection!
                    info.isHit = true;
                    info.distance = (-B) - Math.sqrt(D);
                    info.position = Vector.add(
                        ray.position,
                        Vector.multiplyScalar(
                            ray.direction,
                            info.distance
                        )
                    );
                    info.normal = Vector.subtract(
                        info.position,
                        this.position
                    ).normalize();

                    info.color = this.material.getColor(0, 0);
                } else {
                    info.isHit = false;
                }
                return info;
            }

            public toString() {
                return 'Sphere [position=' + this.position + ', radius=' + this.radius + ']';
            }
        }

        export class Plane extends Shape {
            constructor(position:Vector, public d:number, material:BaseMaterial) {
                super(position, material);
            }

            public intersect(ray:Ray) : IntersectionInfo {
                var info = new IntersectionInfo();

                var Vd = this.position.dot(ray.direction);
                if (Vd == 0) return info; // no intersection

                var t = -(this.position.dot(ray.position) + this.d) / Vd;
                if (t <= 0) return info;

                info.shape = this;
                info.isHit = true;
                info.position = Vector.add(
                    ray.position,
                    Vector.multiplyScalar(
                        ray.direction,
                        t
                    )
                );
                info.normal = this.position;
                info.distance = t;

                if (this.material.hasTexture) {
                    var vU = new Vector(this.position.y, this.position.z, -this.position.x);
                    var vV = vU.cross(this.position);
                    var u = info.position.dot(vU);
                    var v = info.position.dot(vV);
                    info.color = this.material.getColor(u, v);
                } else {
                    info.color = this.material.getColor(0, 0);
                }

                return info;
            }

            public toString() {
                return 'Plane [' + this.position + ', d=' + this.d + ']';
            }
        }
        // }

        export class IntersectionInfo {

            constructor(public isHit= false,
                        public hitCount= 0,
                        public shape:Shape= null,
                        public position:Vector= null,
                        public normal:Vector= null,
                        public color:Color= null,
                        public distance:number= null) { }

            public initialize() {
                this.color = new Color(0, 0, 0);
            }

            public toString() {
                return 'Intersection [' + this.position + ']';
            }
        }

        export class Camera {
            public equator:Vector = null;
            public screen:Vector = null;

            constructor(public position:Vector = null,
                        public lookAt:Vector = null,
                        public up:Vector = null) {
                this.equator = this.lookAt.normalize().cross(this.up);
                this.screen = Vector.add(this.position, this.lookAt);
            }

            public getRay(vx:number, vy:number) {
                var pos = Vector.subtract(
                    this.screen,
                    Vector.subtract(
                        Vector.multiplyScalar(this.equator, vx),
                        Vector.multiplyScalar(this.up, vy)
                    )
                );
                pos.y = pos.y * -1;
                var dir = Vector.subtract(
                    pos,
                    this.position
                );

                var ray = new Ray(pos, dir.normalize());

                return ray;
            }
            
            public toString() {
                return 'Ray []';
            }
        }

        export class Background {
            constructor(public color:Color= null, public ambience= 0.0) { }
        }

	export interface Options {
	        canvasWidth: number;
                canvasHeight: number;
                pixelWidth: number;
                pixelHeight: number;
                renderDiffuse: boolean;
                renderHighlights: boolean;
                renderShadows: boolean;
                renderReflections: boolean;
                rayDepth: number;
	}

        function extend(dest:Options, src) {
            for (var p in src) {
                dest[p] = src[p];
            }
            return dest;
        }

        export class Engine {
            public canvas = null; /* 2d context we can render to */
            public options: Options = null;

            constructor(options:Options) {
                this.options = extend({
                    canvasHeight: 100,
                    canvasWidth: 100,
                    pixelWidth: 2,
                    pixelHeight: 2,
                    renderDiffuse: false,
                    renderShadows: false,
                    renderHighlights: false,
                    renderReflections: false,
                    rayDepth: 2
                }, options || {});

                this.options.canvasHeight /= this.options.pixelHeight;
                this.options.canvasWidth /= this.options.pixelWidth;

                /* TODO: dynamically include other scripts */
            }

            public setPixel(x, y, color:Color) {
                var pxW, pxH;
                pxW = this.options.pixelWidth;
                pxH = this.options.pixelHeight;

                if (this.canvas) {
                    this.canvas.fillStyle = color.toString();
                    this.canvas.fillRect(x * pxW, y * pxH, pxW, pxH);
                } else {
                    if (x === y) {
                        checkNumber += color.brightness();
                    }
                    // print(x * pxW, y * pxH, pxW, pxH);
                }
            }

            public renderScene(scene:Scene, canvas) {
                checkNumber = 0;
                /* Get canvas */
                if (canvas) {
                    this.canvas = canvas.getContext("2d");
                } else {
                    this.canvas = null;
                }

                var canvasHeight = this.options.canvasHeight;
                var canvasWidth = this.options.canvasWidth;

                for (var y = 0; y < canvasHeight; y++) {
                    for (var x = 0; x < canvasWidth; x++) {
                        var yp = y * 1.0 / canvasHeight * 2 - 1;
                        var xp = x * 1.0 / canvasWidth * 2 - 1;

                        var ray = scene.camera.getRay(xp, yp);

                        var color = this.getPixelColor(ray, scene);

                        this.setPixel(x, y, color);
                    }
                }
                if (checkNumber !== 2321) {
                    throw new Error("Scene rendered incorrectly");
                }
            }

            public getPixelColor(ray:Ray, scene:Scene) {
                var info = this.testIntersection(ray, scene, null);
                if (info.isHit) {
                    var color = this.rayTrace(info, ray, scene, 0);
                    return color;
                }
                return scene.background.color;
            }

            public testIntersection(ray:Ray, scene:Scene, exclude:Shape) : IntersectionInfo {
                var hits = 0;
                var best = new IntersectionInfo();
                best.distance = 2000;

                for (var i = 0; i < scene.shapes.length; i++) {
                    var shape = scene.shapes[i];

                    if (shape != exclude) {
                        var info = shape.intersect(ray);
                        if (info.isHit && info.distance >= 0 && info.distance < best.distance) {
                            best = info;
                            hits++;
                        }
                    }
                }
                best.hitCount = hits;
                return best;
            }

            public getReflectionRay(P:Vector, N:Vector, V:Vector) {
                var c1 = -N.dot(V);
                var R1 = Vector.add(
                    Vector.multiplyScalar(N, 2 * c1),
                    V
                );
                return new Ray(P, R1);
            }

            public rayTrace(info:IntersectionInfo, ray:Ray, scene:Scene, depth:number) {
                // Calc ambient
                var color = Color.multiplyScalar(info.color, scene.background.ambience);
                var oldColor = color;
                var shininess = Math.pow(10, info.shape.material.gloss + 1);

                for (var i = 0; i < scene.lights.length; i++) {
                    var light = scene.lights[i];

                    // Calc diffuse lighting
                    var v = Vector.subtract(
                        light.position,
                        info.position
                    ).normalize();

                    if (this.options.renderDiffuse) {
                        var L = v.dot(info.normal);
                        if (L > 0.0) {
                            color = Color.add(
                                color,
                                Color.multiply(
                                    info.color,
                                    Color.multiplyScalar(
                                        light.color,
                                        L
                                    )
                                )
                            );
                        }
                    }

                    // The greater the depth the more accurate the colours, but
                    // this is exponentially (!) expensive
                    if (depth <= this.options.rayDepth) {
                        // calculate reflection ray
                        if (this.options.renderReflections && info.shape.material.reflection > 0) {
                            var reflectionRay = this.getReflectionRay(info.position, info.normal, ray.direction);
                            var refl = this.testIntersection(reflectionRay, scene, info.shape);

                            if (refl.isHit && refl.distance > 0) {
                                refl.color = this.rayTrace(refl, reflectionRay, scene, depth + 1);
                            } else {
                                refl.color = scene.background.color;
                            }

                            color = Color.blend(
                                color,
                                refl.color,
                                info.shape.material.reflection
                            );
                        }

                        // Refraction
                        /* TODO */
                    }

                    /* Render shadows and highlights */

                    var shadowInfo = new IntersectionInfo();

                    if (this.options.renderShadows) {
                        var shadowRay = new Ray(info.position, v);

                        shadowInfo = this.testIntersection(shadowRay, scene, info.shape);
                        if (shadowInfo.isHit && shadowInfo.shape != info.shape /*&& shadowInfo.shape.type != 'PLANE'*/) {
                            var vA = Color.multiplyScalar(color, 0.5);
                            var dB = (0.5 * Math.pow(shadowInfo.shape.material.transparency, 0.5));
                            color = Color.addScalar(vA, dB);
                        }
                    }

                    // Phong specular highlights
                    if (this.options.renderHighlights && !shadowInfo.isHit && info.shape.material.gloss > 0) {
                        var Lv = Vector.subtract(
                            info.shape.position,
                            light.position
                        ).normalize();

                        var E = Vector.subtract(
                            scene.camera.position,
                            info.shape.position
                        ).normalize();

                        var H = Vector.subtract(
                            E,
                            Lv
                        ).normalize();

                        var glossWeight = Math.pow(Math.max(info.normal.dot(H), 0), shininess);
                        color = Color.add(
                            Color.multiplyScalar(light.color, glossWeight),
                            color
                        );
                    }
                }
                color.limit();
                return color;
            }
        }
        // }

        export function renderScene() {
            var scene = new Scene();

            scene.camera = new Camera(
                new Vector(0, 0, -15),
                new Vector(-0.2, 0, 5),
                new Vector(0, 1, 0)
            );

            scene.background = new Background(
                new Color(0.5, 0.5, 0.5),
                0.4
            );

            var sphere = new Sphere(
                new Vector(-1.5, 1.5, 2),
                1.5,
                new Solid(
                    new Color(0, 0.5, 0.5),
                    0.3,
                    0.0,
                    0.0,
                    2.0
                )
            );

            var sphere1 = new Sphere(
                new Vector(1, 0.25, 1),
                0.5,
                new Solid(
                    new Color(0.9, 0.9, 0.9),
                    0.1,
                    0.0,
                    0.0,
                    1.5
                )
            );

            var plane = new Plane(
                new Vector(0.1, 0.9, -0.5).normalize(),
                1.2,
                new Chessboard(
                    new Color(1, 1, 1),
                    new Color(0, 0, 0),
                    0.2,
                    0.0,
                    1.0,
                    0.7
                )
            );

            scene.shapes.push(plane);
            scene.shapes.push(sphere);
            scene.shapes.push(sphere1);

            var light = new Light(
                new Vector(5, 10, -1),
                new Color(0.8, 0.8, 0.8)
            );

            var light1 = new Light(
                new Vector(-3, 5, -15),
                new Color(0.8, 0.8, 0.8),
                100
            );

            scene.lights.push(light);
            scene.lights.push(light1);

            var imageWidth = 100; // $F('imageWidth');
            var imageHeight = 100; // $F('imageHeight');
            var pixelSize = [5,5];//"5,5".split(','); //  $F('pixelSize').split(',');
            var renderDiffuse = true; // $F('renderDiffuse');
            var renderShadows = true; // $F('renderShadows');
            var renderHighlights = true; // $F('renderHighlights');
            var renderReflections = true; // $F('renderReflections');
            var rayDepth = 2;//$F('rayDepth');

            var raytracer = new Engine(
                {
                    canvasWidth: imageWidth,
                    canvasHeight: imageHeight,
                    pixelWidth: pixelSize[0],
                    pixelHeight: pixelSize[1],
                    renderDiffuse: renderDiffuse,
                    renderHighlights: renderHighlights,
                    renderShadows: renderShadows,
                    renderReflections: renderReflections,
                    rayDepth: rayDepth
                }
            );
            raytracer.renderScene(scene, null);
        }

    }
}

var benchmark_fn = VERSION.RayTracer.renderScene;
var setup_fn = undefined;
var teardown_fn = undefined;
