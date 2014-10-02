// Modified by N.Swamy, A.Rastogi (2014)
///<reference path='../../references.ts' />
///<reference path='tcutil.ts' />
/***********************************************************************
 * Defines the abstract syntax of types used in the sound type-checker 
 * All these types derive from the type SoundType defined in ast.ts
 ***********************************************************************/
module TypeScript {
    function substType(s: Pair<TVar, SoundType>[], descend: boolean): (t: Pair<NamedType, AST>) => Pair<NamedType, AST> {
        return (t: Pair<NamedType, AST>) => pair(<NamedType>t.fst.subst(s, descend), t.snd);
    }
    export class TUVar extends SoundType {
        private resolved: SoundType;
        constructor() {
            super(TypeName.UVar);
        }
        public isResolved() {
            return this.resolved ? true : false;
        }
        public resolve(t: SoundType) {
            if (this.resolved) {
                throw new Error("Unification variable is already set");
            }
            this.resolved = t;
        }
        public unfold() {
            if (this.resolved) {
                return this.resolved.unfold();
            }
            return this;
        }
        public equals(u: SoundType) {
            if (this.isResolved()) {
                return this.resolved.equals(u);
            }
            return this === u;
        }
        public unFree(): boolean { //used in TS* mode
            if (this.resolved) {
                return this.resolved.unFree()
            }
            return false;
        }
        public toString(): string {  //for error messages
            return "UVAR";
        }
        public toRTTI() {
            console.log(TcUtil.Logger.pos() + ": uvar escapes to RTTI");
            return MkAST.stringConst("UVAR");
        }
    }
    export class TConstant extends SoundType {
        constructor(t: TypeName) {       //TypeName is an enum in ast.ts
            super(t);
        }
        public static Any = new TConstant(TypeName.Any);
        public static Number = new TConstant(TypeName.Number);
        public static Bool = new TConstant(TypeName.Bool);
        public static String = new TConstant(TypeName.String);
        public static Void = new TConstant(TypeName.Void);
        public static Un = new TConstant(TypeName.Un);
        public static Null = new TConstant(TypeName.Null);

        public equals(t: SoundType) {
            return this.typeName === t.unfold().typeName;
        }

        public unFree(): boolean {
            return this.typeName !== TypeName.Un;
        }

        public toString() {
            switch (this.typeName) {
                case TypeName.Any: return "any";
                case TypeName.Un: return "un";
                case TypeName.Number: return "number";
                case TypeName.Bool: return "boolean";
                case TypeName.String: return "string";
                case TypeName.Void: return "void";
                case TypeName.Null: return "null";
                default: return "unknown";
            }
        }

        public toRTTI(): AST {
            switch (this.typeName) {
                case TypeName.Any: return MkAST.fieldOfRT("Any");
                case TypeName.Number: return MkAST.fieldOfRT("Num");
                case TypeName.Bool: return MkAST.fieldOfRT("Bool");
                case TypeName.String: return MkAST.fieldOfRT("Str");
                case TypeName.Void: return MkAST.fieldOfRT("Void");
                case TypeName.Un: return MkAST.fieldOfRT("Un");        //only available in the RT for TS*
                case TypeName.Null: return MkAST.fieldOfRT("Null");        //only available in the RT for TS*
                default: throw "Unexpected type name";
            }
        }
    }
   
    export class TArg {
        constructor(
            public name: string,
            public type: SoundType,
            public flags: PullElementFlags[]= [], //records optional arguments, property params. for constructors, accessibility, etc.
            public variadic: boolean= false) {
        }
        public toRTTI() {
            var args = [pair("type", this.type.toRTTI())];
            if (this.optional()) {
                args.push(pair("optional", MkAST.ttConst()));
            }
            return MkAST.mkObjLit(args);
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            return new TArg(this.name, this.type.subst(s, descend), this.flags, this.variadic);
        }
        public isField() {
            return hasModifier(this.flags, PullElementFlags.PropertyParameter);
        }
        public optional() {
            return hasModifier(this.flags, PullElementFlags.Optional);
        }
        private accessibility() {
            if (!hasModifier(this.flags, PullElementFlags.PropertyParameter)) {
                return "";
            }
            if (hasModifier(this.flags, PullElementFlags.Public)) {
                return "public";
            }
            if (hasModifier(this.flags, PullElementFlags.Private)) {
                return "private";
            }
            return "";
        }
        public toString() {
            return (this.variadic ? "..." : "")
                + this.accessibility()
                + " "
                + this.name
                + (this.optional() ? "?: " : ": ")
                + this.type.toString();
        }
    }
    export class TIndexMap extends SoundType {             //A pseudo-type, just like TArrow
        constructor(public indexType: SoundType, public elt: SoundType) {
            super(TypeName.IndexMap);
        }
        public isIndexable() { return true; }
        public toRTTI(): AST {
            return MkAST.callExpr(MkAST.fieldOfRT("IndexMapType"), [this.indexType.toRTTI(), this.elt.toRTTI()]);
        }
        public equals(t: SoundType) {
            t = t.unfold();
            if (t.typeName !== this.typeName) return false;
            var a = <TIndexMap> t;
            return this.indexType.equals(a.indexType) && this.elt.equals(a.elt);
        }
        public unFree() {
            return this.elt.unFree();
        }
        public toString() {
            return "{[x:" + this.indexType.toString() + "] : " + this.elt.toString() + "}";
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            return new TIndexMap(this.indexType.subst(s, descend), this.elt.subst(s, descend));
        }
    }
    export interface MethodOrField {
        name: string;
        type: SoundType;
        optional?: boolean;
        mutable?: boolean;
    }
    export interface Field extends MethodOrField { }
    export function Field(name: string, type: SoundType, optional: boolean= false): Field {
        return { name: name, type: type, optional: optional, mutable: true };
    }
    function substField(s: Pair<TVar, SoundType>[], descend: boolean= false): (f: Field) => Field {
        return (f: Field) => Field(f.name, f.type.subst(s, descend), f.optional);
    }
    var fieldToRtti = (f: Field) => {
        var field = [{ fst: "name", snd: MkAST.stringConst(f.name) }, { fst: "type", snd: f.type.toRTTI() }];
        if (f.optional) {
            field.push({ fst: "optional", snd: MkAST.ttConst() });
        }
        return MkAST.mkObjLit(field);
    }
    export var toFieldTable = (flds: Field[]) => MkAST.mkObjLit(flds.map((f) => pair(f.name, f.type.toRTTI())));

    //Although formally an arrow type is not actually a type, 
    //it is convenient to make it an instance of a SoundType rather than having a separate MethodType class
    export class TArrow extends SoundType {
        constructor(public args: TArg[], public result: SoundType) {
            super(TypeName.Arrow);
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean): SoundType {
            return new TArrow(this.args.map((a: TArg) => a.subst(s, descend)), this.result.subst(s, descend));
        }
        public toRTTI(): AST {
            var mandatory = 0;
            var args = MkAST.mkCleanArray(this.args.map((e: TArg) => {
                if (!e.optional()) mandatory++;
                return e.type.toRTTI();
            }));
            args.newLineMode = NewLineMode.Suppress;
            var elts = [args, this.result.toRTTI()];
            var varargs = this.args.filter((a) => a.variadic);
            if (varargs && varargs.length !== 0) {
                elts.push(varargs[0].toRTTI());
            } else {
                elts.push(MkAST.undefConst());
            }
            if (mandatory < this.args.length) {
                elts.push(MkAST.numberConst(mandatory));
            }
            return MkAST.callExpr(MkAST.fieldOfRT("ArrowType"), elts);
        }

        public equals(t: SoundType): boolean {
            t = t.unfold();
            if (t.typeName !== TypeName.Arrow) return false;
            var f = <TArrow>t;
            if (this.args.length !== f.args.length) return false;
            for (var i = 0; i < this.args.length; i++) {
                if (!this.args[i].type.equals(f.args[i].type)) return false;
            }
            return this.result.equals(f.result);
        }

        public unFree() {
            return this.result.unFree() &&
                this.args.every((t: TArg) => {
                    return t.type.unFree();
                });
        }

        public toString() {
            return "("
                + this.args.map((t: TArg) => {
                    return t.toString();
                }).join(", ")
                + ") => " + this.result.toString();
        }
    }
    export interface Method extends MethodOrField { }
    export function substMethod(s: Pair<TVar, SoundType>[], descend: boolean= false): (m: Method) => Method {
        return (m: Method) => Method(m.name, m.type.subst(s, descend));
    }
    export function Method(name: string, type: SoundType): Method {
        return { name: name, type: type };
    }
    var methodToRtti = (m: Method) => {
        var field = [{ fst: "name", snd: MkAST.stringConst(m.name) }, { fst: "type", snd: m.type.toRTTI() }];
        return MkAST.mkObjLit(field);
    }
    export var toMethodTable = (methods: Method[]) => {
        return MkAST.mkObjLit(methods.map((m) => pair(m.name, m.type.toRTTI())));
    };

    export interface MethodOrFieldMap {
        [fieldName: string]: MethodOrField[];
    }
    //StructuredType is the base type for a hierarchy including types for 
    //modules, enums, structural objects as well as named types
    export class StructuredType extends SoundType {
        public unfree: boolean = true;
        private typesMap: { [typeName: string]: Pair<SoundType, AST> } = RT.createEmptyMap<Pair<SoundType, AST>>(); //types map is for modules
        private fieldMap: { [fieldName: string]: Field[] } = RT.createEmptyMap<Field[]>();                          //fieldMap and        
        private methodMap: { [methodName: string]: Method[] } = RT.createEmptyMap<Method[]>();                      //methodMap for fast lookup; arrays for overloading
        constructor(tn: TypeName,
            private fields: Field[]= [],
            private methods: Method[]= [],
            private types: Pair<NamedType, AST>[]= []) {
            super(tn);
            this.types.forEach((t) => {
                this.typesMap[t.fst.name] = pair(<SoundType>t.fst, t.snd);
            });
            this.fields.forEach((f: Field) => this.addToFieldMap(f));
            this.methods.forEach((m: Method) => this.addToMethodMap(m));
            this.unfree =
            this.fields.every((f: Field) => f.type.unFree())
            && this.methods.every((f: Field) => f.type.unFree());
        }
        public exposeFields() { return this.fields; }
        public exposeMethods() { return this.methods; }
        public exposeTypes() { return this.types; }
        private addToFieldMap(f: Field) {
            if (this.fieldMap[f.name]) {
                this.fieldMap[f.name].push(f);
            } else {
                this.fieldMap[f.name] = [f];
            }
        }
        private addToMethodMap(m: Method) {
            if (this.methodMap[m.name]) {
                this.methodMap[m.name].push(m);
            } else {
                this.methodMap[m.name] = [m];
            }
        }
        public addField(f: Field) {
            this.addToFieldMap(f);
            this.fields.push(f);
            this.unfree = f.type.unFree() && this.unfree;
        }
        public addMethod(m: Method) {
            this.addToMethodMap(m);
            this.methods.push(m);
            this.unfree = m.type.unFree() && this.unfree;
        }
        private lookupMethodOrField(map: MethodOrFieldMap, f: string, overload: number= 0) {
            var x = map[f];
            if (x) {
                if (overload < 0) {
                    return x[x.length - 1];
                } else {
                    return x[overload];
                }
            }
            return undefined;
        }
        private lookupField(f: string, overload: number= 0) {
            return this.lookupMethodOrField(this.fieldMap, f, overload);
        }
        private lookupMethod(f: string, overload: number= 0) {
            return this.lookupMethodOrField(this.methodMap, f, overload);
        }
        public getField(f: string, overload: number= 0) {
            return this.lookupField(f, overload);
        }
        public hasField(f: string) {
            return this.getField(f, 0) ? true : false;
        }
        public getMethod(f: string, overload: number= 0) {
            var m = this.lookupMethod(f, overload);      //treating a field as a method is safe
            if (m) {
                return m;
            }
            var fld = this.getField(f, overload);
            if (fld && fld.type.typeName === TypeName.Arrow) {
                return <Method>fld;
            }
            return undefined;
        }
        public hasMethod(f: string) {
            return this.getMethod(f) ? true : false;
        }
        public getMethodType(m: string, overload= 0): SoundType {
            var meth = this.getMethod(m, overload);
            if (meth) {
                return meth.type;
            }
            return undefined;
        }
        public unFree() {
            return this.unfree;
        }
        private fieldsToString = (fields: Field[]) =>
            fields.map((f) => f.name + (f.optional ? "?" : "") + " : " + f.type.toString()).join("; ");
        public toString() {
            return "{ FIELDS= "
                + this.fieldsToString(this.fields)
                + (this.methods.length !== 0
                ? "; METHODS= " + this.fieldsToString(this.methods) : "")
                + "}";
        }
        public updateType(n: string, t: SoundType, ast: AST= null) {
            this.typesMap[n] = { fst: t, snd: ast };
        }
        public addType(n: string, t: SoundType, ast: AST= null) {
            if (this.typesMap[n]) {
                throw new Error("Type " + n + " is already defined in module " + this["name"]);
            }
            this.typesMap[n] = { fst: t, snd: ast };
        }
        public lookupType(n: string) {
            var t = this.typesMap[n];
            return t ? t.fst : null;
        }
        public lookupTypeDecl(n: string): AST {
            var t = this.typesMap[n];
            return t ? t.snd : null;
        }
        private getFieldType(f: string, overload: number) {
            var g = this.lookupField(f, overload);
            if (g) {
                return g.type;
            } else {
                return null;
            }
        }
        public callSignature(overload: number= 0): SoundType {
            var m = this.getMethod("<call>", overload);
            if (m) {
                return m.type;
            }
            return undefined;
        }
        public addCallSignature(t: SoundType) {
            this.addMethod(Method("<call>", t));
        }
        public indexSignature(overload: number= 0): TIndexMap {
            return <TIndexMap>this.getFieldType("<index>", overload);
        }
        public addIndexSignature(t: TIndexMap) {
            this.addField(Field("<index>", t, false));
        }
        public constructSignature(overload: number= 0): SoundType {
            return this.getMethodType("<new>", overload);
        }
        public addConstructSignature(t: SoundType) {
            this.addMethod(Method("<new>", t));
        }
        public substBase(s: Pair<TVar, SoundType>[], skel: StructuredType, descend: boolean) {
            var fields = this.fields.map(substField(s, descend));
            var methods = this.methods.map(substMethod(s, descend));
            var types = this.types.map(substType(s, descend));
            fields.forEach((f) => skel.addField(f));
            methods.forEach((f) => skel.addMethod(f));
            types.forEach((t) => skel.addType(t.fst.name, t.fst, t.snd));
            return skel;
        }
        public removeExtraneousFields() {
            if (this.indexSignature() && this instanceof TRecord) {
                var t = new TRecord([]);
                t.addIndexSignature(this.indexSignature());
                return t;
            }
            return this;
        }
    }
    export class JustType extends StructuredType {
        private structRepr: StructuredType;
        constructor(public repr: SoundType) {       //TypeName is an enum in ast.ts
            super(TypeName.Just);
            if (this.repr instanceof StructuredType) {
                this.structRepr = <StructuredType>this.repr;
            }
        }
        public equals(t: SoundType) {
            var t = t.unfold();
            return this.typeName === t.typeName && (this.repr.equals((<JustType>t).repr));
        }

        public unFree(): boolean {
            return this.repr.unFree()
        }

        public toString() {
            return "Just<" + this.repr.toString() + ">";
        }
        public toRTTI(): AST {
            return MkAST.callRT("JustType", []);
        }
        public isVirtual() {
            return true;
        }
        public isNominal() {
            return this.nominal || this.repr.isNominal();
        }



        ////////////////////////////////////////////////////////////////////
        private impos(msg: string) : any {
            throw new Error(msg + " is not available on a JustType");
        }
        public exposeFields() {
            return this.structRepr ? this.structRepr.exposeFields() : [];
        }
        public exposeMethods() {
            return this.structRepr ? this.structRepr.exposeMethods() : [];
        }
        public exposeTypes() : Pair<NamedType, AST>[] {
            return this.impos("exposeTypes");
        }
        public addField(f: Field) {
            return this.impos("addField");
        }
        public addMethod(m: Method) {
            return this.impos("addMethod");
        }
        public getField(f: string, overload: number= 0) {
            if (this.structRepr) return this.structRepr.getField(f, overload);
            return undefined;
        }
        public hasField(f: string) {
            if (this.structRepr) return this.structRepr.hasField(f);
            return false;
        }
        public getMethod(f: string, overload: number= 0) {
            if (this.structRepr) return this.structRepr.getMethod(f, overload);
            return undefined;
        }
        public hasMethod(f: string) {
            if (this.structRepr) return this.structRepr.hasMethod(f);
            return false;
        }
        public getMethodType(m: string, overload= 0): SoundType {
            if (this.structRepr) return this.structRepr.getMethodType(m, overload);
            return undefined;
        }
        public updateType(n: string, t: NamedType, ast: AST= null) {
            return this.impos("updateType");
        }
        public addType(n: string, t: NamedType, ast: AST= null) {
            return this.impos("addType");
        }
        public lookupType(n: string) : NamedType {
            return this.impos("lookupType");
        }
        public lookupTypeDecl(n: string): AST {
            return this.impos("lookupTypeDecl");
        }
        public callSignature(overload: number= 0): SoundType {
            if (this.structRepr) return this.structRepr.callSignature(overload);
            return undefined;
        }
        public addCallSignature(t: SoundType) {
            return this.impos("addCallSignature");
        }
        public indexSignature(overload: number= 0): TIndexMap {
            if (this.structRepr) return this.indexSignature(overload);
            return undefined;
        }
        public addIndexSignature(t: TIndexMap) {
            this.addField(Field("<index>", t, false));
        }
        public constructSignature(overload: number= 0): SoundType {
            return this.getMethodType("<new>", overload);
        }
        public addConstructSignature(t: SoundType) {
            this.addMethod(Method("<new>", t));
        }
        public substBase(s: Pair<TVar, SoundType>[], skel: StructuredType, descend: boolean) {
            if (this.structRepr) {
                return this.structRepr.substBase(s, skel, descend);
            }
        }
    }


    export class TRecord extends StructuredType {
        constructor(fields: Field[], methods: Method[]= []) {
            super(TypeName.Record, fields, methods);
        }
        public toRTTI() {
            if (this.isVirtual()) {
                return MkAST.callRT("JustType", [MkAST.stringConst("record type")]);
            }
            var r = MkAST.callExpr(MkAST.fieldOfRT("StructuredType"), [toMethodTable(this.exposeMethods()), toFieldTable(this.exposeFields())]);
            return r;
        }
        public equals(t: SoundType) {
            if (this === t) return true;
            t = t.unfold();
            var checkFields = (fs1: Field[], fs2:Field[], flip: boolean) => {
                return fs1.every((f) => {
                    var gs = fs2.filter((f2) => f2.name === f.name);
                    return gs.some((g) => flip || (g.mutable === f.mutable && g.type.equals(f.type)));
                });
            };
            switch (t.typeName) {
                case TypeName.Record:
                    var tt = <TRecord>t;
                    var myFields = this.exposeFields();
                    var ttFields = tt.exposeFields();
                    var myMethods = this.exposeMethods();
                    var ttMethods = tt.exposeMethods();
                    return checkFields(myFields, ttFields,  false)
                        && checkFields(ttFields, myFields, true)
                        && checkFields(myMethods, ttMethods, false)
                        && checkFields(ttMethods, myMethods, true);
                default: return false;
            }
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            return this.substBase(s, new TRecord([], []), descend);
        }
    }
    export function getCallSignature(t: SoundType, overload=0) {
        if (t.typeName === TypeName.Record) {
            return (<TRecord>t).callSignature(overload);
        }
        return undefined;
    }
    export function functionType(t: SoundType /*TArrow or Poly*/) {
        var r = new TRecord([], []);
        r.addCallSignature(t);
        return r;
    }
    export function mkFunctionType(args: TArg[], result: SoundType) {
        return functionType(new TArrow(args, result));
    }
    export function isFunctionType(t: SoundType) {
        return t.typeName === TypeName.Record && ((<TRecord>t).callSignature() ? true : false);
    }
    export class NamedType extends StructuredType {
        //public definedType = false;
        constructor(tn: TypeName,
            public name: string,
            members: Field[]= [],
            methods: Field[]= [],
            types: Pair<NamedType, AST>[]= [],
            public extendsC: SoundType[]= [],
            public implementsI: SoundType[]= []) {
            super(tn, members, methods, types);
            if (!extendsC.every(isNamedType)) {
                throw new Error("Got heritage from a non-named types : " + extendsC.map((u) => u.toString()).join(", "));
            }
            this.unfree = this.unfree && this.extendsC ? this.extendsC.every((t) => t.unFree()) : true;
            this.unfree = this.unfree && this.implementsI ? this.implementsI.every((t) => t.unFree()) : true;
        }
        public toRecord(forRTTI:boolean = false): TRecord {
            var r = this.toRecordAux(forRTTI);
            var findDups = (mfs: MethodOrField[], msg: string) => {
                var dups: { [name: string]: MethodOrField[] } = RT.createEmptyMap<MethodOrField[]>();
                var hasDup = false;
                mfs.forEach((mf1, i) => {
                    if (!dups[mf1.name]) {
                        mfs.forEach((mf2, j) => {
                            if (i !== j && mf1.name === mf2.name) {
                                hasDup = true;
                                if (dups[mf1.name]) {
                                    dups[mf1.name].push(mf2);
                                }
                                else {
                                    dups[mf1.name] = [mf1, mf2];
                                }
                            }
                        });
                    }
                });
                if (hasDup) {
                    console.log(this.toString() + " has duplicate " + msg + "s");
                    for (var x in dups) {
                        console.log(msg + " " + x);
                        for (var i = 0; i < dups[x].length; i++) {
                            console.log("\t" + dups[x][i].type.toString());
                        }
                    }
                }
            };
            return r;
        }
        private toRecordAux(forRTTI:boolean=false): TRecord {
            var fields: Field[] = new Array<Field>().concat(this.exposeFields());
            var methods: Field[] = new Array<Field>().concat(this.exposeMethods());
            if (this.extendsC) {
                var supFields: Field[] = [];
                var supMethods: Field[] = [];
                for (var i = 0; i < this.extendsC.length; i++) {
                    var st = this.extendsC[i].unfold();
                    if (st instanceof NamedType) {
                        var rec = (<NamedType>st).toRecord(forRTTI);
                        supFields = supFields.concat(rec.exposeFields());
                        supMethods = supMethods.concat(rec.exposeMethods());
                    } else if (st instanceof StructuredType) {
                        var struct = <StructuredType>st;
                        supFields = supFields.concat(struct.exposeFields());
                        supMethods = supMethods.concat(struct.exposeMethods());
                    }
                    fields = fields.concat(supFields.filter((f) => fields.every((g) => g.name !== f.name)));
                    methods = methods.concat(supMethods.filter((m) => methods.every((n) => m.name !== n.name)));
                    supFields = [];
                    supMethods = [];
                }
                return new TRecord(fields, methods);
            } else {
                return new TRecord(fields, methods);
            }
        }
        public substBase(s: Pair<TVar, SoundType>[], skel: StructuredType, descend: boolean) {
            var res = <NamedType>super.substBase(s, skel, descend);
            res.extendsC = this.extendsC.map((t: SoundType) => t.subst(s, descend));
            res.implementsI = this.implementsI.map((t: SoundType) => t.subst(s, descend));
            return res;
        }
        public equals(t: SoundType) {
            t = t.unfold();
            return t.typeName === this.typeName && this.name === (<NamedType>t).name;
        }
        public addExtension(ext: SoundType) {
            if (this.extendsC.some((t) => t.equals(ext))) {
                return;
            }
            this.extendsC.push(ext);
            this.unfree = this.unfree && ext.unFree();
        }
        private getMethodOrField(meth:boolean, f: string, overload: number= 0): Field {
            var x = meth ? super.getMethod(f, overload) : super.getField(f, overload);
            if (!x && this.extendsC) {
                var g: MethodOrField = null;
                this.extendsC.some((t: SoundType) => {
                    var nt = <NamedType>t.unfold();
                    g = meth ? nt.getMethod(f, overload) : nt.getField(f, overload);
                    if (g) return true;
                    return false;
                });
                return g;
            }
            return x;
        }
        public getField(f: string, overload: number= 0): Field {
            return this.getMethodOrField(false, f, overload);
        }
        public getMethod(f: string, overload: number= 0): Method {
            return this.getMethodOrField(true, f, overload);
        }
        public isCircular(x: string) {
            return false;
        }
    }
    export function isNamedType(t: SoundType) {
        return t instanceof NamedType;
    }
    export class TModule extends NamedType {
        constructor(mname: string, fields: Field[]= [], methods: Field[]= [], types: Pair<NamedType, AST>[]= []) {
            super(TypeName.Module, mname, fields, methods, types);
            this.memberDeclMap = {};
        }
        public toString() {
            return "typeof " + this.name;
        }
        private memberDeclMap: { [name: string]: Pair<AST, boolean> };
        public addMemberDecl(name: string, a: AST, circular: boolean) {
            this.memberDeclMap[name] = { fst: a, snd: circular };
        }
        public getMemberDecl(name: string): Pair<AST, boolean> {
            return this.memberDeclMap[name];
        }
        public getMember(f: string, overload: number= 0, circularOk= false) {
            circularOk = circularOk || TcEnv.currentEnv.inFunctionScope();
            var g = super.getField(f, overload);
            if (g && !circularOk && this.isCircular(f)) {
                var md = this.getMemberDecl(f).fst;
                TcUtil.Logger.error(DiagnosticCode.SEC_Unsafe_circular_dependence_on_variable, [this.name + "." + f, TcUtil.Logger.pos(md)]);
            }
            return g;
        }
        public isCircular(x: string) {
            var md = this.getMemberDecl(x);
            return (md && md.snd);
        }
        public toRTTI() {
            return MkAST.callRT("JustType", [MkAST.stringConst(this.name)]);
        }
        public unFree(): boolean {
            return true;
        }
        public callSignature(): SoundType {
            return null;
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            if (descend) {
                var skel = new TModule(this.name);
                return this.substBase(s, skel, false);
            }
            return this;
        }
        public isVirtual() {
            return true;
        }
    }
    export class TEnum extends NamedType {
        constructor(name: string, public elements: string[]) {
            super(TypeName.Enum, name);
        }
        public toString() {
            return this.name;
        }
        public toRTTI() {
            return TConstant.Number.toRTTI();
        }
        public unFree(): boolean {
            return true;
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            if (descend) {
                var skel = new TEnum(this.name, this.elements);
                return this.substBase(s, skel, false);
            }
            return this;
        }
    }
    export class TObject extends NamedType {
        constructor(name: string, members: Field[]= [], methods: Field[]= [], extendsC: SoundType[]= [], implementsI: SoundType[]= []) {
            super(TypeName.Object, name, members, methods, [], extendsC, implementsI);
        }
        public toString() {
            var suffix = "";
            var ext = this.extendsC.map((t) => t.toString()).join(", ");
            var impl = this.implementsI.map((t) => t.toString()).join(", ");
            if (ext !== "") {
                suffix += " extends " + ext;
            }
            if (impl !== "") {
                suffix += " implements " + impl;
            }
            return this.name;
        }
        public isNominal() {
            return true;
        }
        public isVirtual() {
            return (this.virtual
                || this.extendsC.some((t) => t.isVirtual())
                || this.implementsI.some((t) => t.isVirtual()));
        }
        public toRTTI() {
            if (this.isVirtual()) {
                return MkAST.callRT("JustType", [MkAST.stringConst(this.name)]);
            }
            return MkAST.callExpr(MkAST.fieldOfRT("InstanceType"), [MkAST.stringConst(this.name)]);
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            if (descend) {
                var skel = new TObject(this.name);
                skel.virtual = this.virtual;
                return this.substBase(s, skel, false);
            }
            return this;
        }
        public getMethod(m: string, overload: number= 0) {
            return super.getMethod(m, overload);
        }
    }
    export class TInterface extends NamedType {
        private _isArray = false;
        private _isCheckedArray = false;
        constructor(name: string, members: Field[]= [], methods: Field[]= [], extendsC: SoundType[]= []) {
            super(TypeName.Interface
                , name
                , members
                , methods
                , []
                , extendsC
                , []);
            this._isArray = (this.name === "Array");
            this._isCheckedArray = (this.name === "CheckedArray");
        }
        public isNominal() {
            if (this.nominal) return true;
            if (this.name === "Nominal") {           //use a scoped name?
                return true;
            }
            return this.extendsC.some((t) => t.isNominal());
        }
        public isUn(): boolean {
            return this.name === "Un";
        }
        public isVirtual() {
            if (this.virtual || this.name === "Virtual") {           //use a scoped name?
                return true;
            }
            return this.extendsC.some((t) => t.isVirtual());
        }
        public isArray() {
            return this._isArray;
        }
        public isCheckedArray() {
            return this._isCheckedArray;
        }
        public arrayElementType(): SoundType {
            if (this.isArray() || this.isCheckedArray()) {
                return this.indexSignature().elt;
            }
            return null;
        }
        public toRecord(forRTTI: boolean = false) {
            if (forRTTI &&
                (this.isArray()
                || this.isCheckedArray()
                || this.name === "String"
                || this.name === "Object"
                || this.name === "Number"
                || this.name === "Boolean")) {
                return new TRecord([], []);
            }
            return super.toRecord(forRTTI);
        }
        public toString() {
            return this.name;
        }
        public toRTTI() {
            if (this.isArray()) {
                return MkAST.callRT("ArrayType", [this.arrayElementType().toRTTI()]);
            } else if (this.isVirtual()) {
                return MkAST.callRT("JustType", [MkAST.stringConst(this.name)]);
            } else if (this.instantiated) {
                return this.toRecord(true).toRTTI();
            } else {
                return MkAST.callExpr(MkAST.fieldOfRT("InterfaceType"), [MkAST.stringConst(this.name)]);
            }
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean): SoundType {
            if (descend) {
                var skel = new TInterface(this.name);
                skel.virtual = this.virtual;
                return this.substBase(s, skel, false);
            }
            return this;
        }
    }
    export class TClass extends NamedType {
        constructor(name: string, constr?: SoundType, staticMembers?: Field[]) {
            super(TypeName.Class, name, staticMembers);
            if (constr) this.addConstructSignature(constr);
        }
        public toString() {
            return this.name + ".class";
        }
        public toRTTI() {
            if (this.isVirtual()) {
                return MkAST.callRT("JustType", [MkAST.stringConst(this.name)]);
            }
            return MkAST.callRT("ClassType", [MkAST.stringConst(this.name)]);
        }
        public hasStaticField(f: string) {
            return this.hasField(f);
        }
        public getStaticField(f: string) {
            return this.getField(f);
        }
        public objectType() {
            var constr = this.constructSignature()
            switch (constr.typeName) {
                case TypeName.Arrow:
                    return (<TArrow>constr).result;
                case TypeName.Poly:
                    var pconstr = <TPoly>constr;
                    var result = (<TArrow>pconstr.body).result;
                    return new TPoly(pconstr.bvars, result);
                default:
                    throw new Error("Unexpected constructor type for class " + this.name + " :: " + constr.toString());
            }
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            if (descend) {
                var skel = new TClass(this.name);
                skel.virtual = this.virtual;
                return this.substBase(s, skel, false);
            }
            return this;
        }
        public constructSignature(overload: number= 0): SoundType {
            return super.constructSignature(overload);
        }
    }

    export class TVar extends SoundType {
        constructor(public name: string, public ppname: string, public constraint?: SoundType) {
            super(TypeName.Variable);
        }
        public isVirtual() {
            return false;
        }
        public equals(t: SoundType) {
            return t.typeName === this.typeName && (<TVar>t).name === this.name;
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            var found = s.filter((xt) => xt.fst.name === this.name);
            if (found && found.length >= 1) {
                return found[0].snd;
            }
            return this;
        }
        public toString() {
            return this.name;
        }
        public unFree() {
            return true;
        }
        public toRTTI() {
            console.log(TcUtil.Logger.pos() + ": tvar escapes to RTTI");
            return MkAST.stringConst("TVAR");
        }
        public asBinder(fullName?: string[]): TcUtil.LocalTypeBinding {
            if (fullName && fullName.length !== 0) {
                return { fst: this.ppname, snd: <SoundType>new TVar(TcUtil.mkTypeParamName(fullName, this.ppname), this.ppname) };
            }
            return { fst: this.ppname, snd: <SoundType>this };
        }
        public getConstraint(): SoundType {
            return this.constraint;
        }
    }

    export class TPoly extends SoundType {
        //A __possibly open__ polymorphic type
        constructor(public bvars: TVar[], public body: SoundType, private qualifiedStubName?: string[]) {
            super(TypeName.Poly);
        }
        public isVirtual() {
            return true;
        }
        private resolveStub() {
            if (this.qualifiedStubName) {
                var t = TcEnv.currentEnv.lookupType({ fullName: this.qualifiedStubName });
                if (t && t.typeName === TypeName.Poly) {
                    return (<TPoly>t);
                } else {
                    throw new Error("Could not resolve type " + this.qualifiedStubName.join("."));
                }
            }
            return null;
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean): SoundType {
            var t = this.resolveStub();
            if (t) {
                return t.subst(s, descend);
            }
            var ss = s.filter((xt) => !this.bvars.some((y) => y.equals(xt.fst)));
            return new TPoly(this.bvars, this.body.subst(ss, false));
        }

        public checkInstantiation(i: number, t: SoundType): boolean {
            if (i >= this.bvars.length) {
                return false;
            }
            var cons = this.bvars[i].getConstraint();
            return (cons ? TypeScript.TypeRelations.isSubtype(t, cons) : true);    
        }

        public instantiate(args: SoundType[], descend: boolean= true): SoundType {
            var tt = this.resolveStub();
            if (tt) {
                return tt.instantiate(args, descend);
            }
            if (args.length !== this.bvars.length) {
                throw new Error("Arity mismatch!");
            }
            var s: Pair<TVar, SoundType>[] = args.map((t, i) => ({ fst: this.bvars[i], snd: t }));
            var t: SoundType = this.body.subst(s, descend);
            if (t instanceof NamedType) {
                var n = <NamedType>t
                var body = <NamedType>this.body;
                n.name = body.name + "<" + args.map((t) => t.toString()).join(", ") + ">";
            }
            return t;
        }
        public unFree() {
            return this.body.unFree();
        }
        public toString() {
            return this.body.toString();
        }
        public toRecord(forRTTI:boolean=false) {
            return (<NamedType>this.body).toRecord(forRTTI);
        }
        public equals(t: SoundType) {
            if (t.typeName === this.typeName) {
                var q = <TPoly>t;
                return this.body.equals(q.body) && this.bvars.length === q.bvars.length && this.bvars.every((t, i) => t.equals(q.bvars[i]));
            }
            return false;
        }
        public toRTTI() {
            console.log(TcUtil.Logger.pos() + ": polytype escapes to RTTI");
            return MkAST.stringConst("PolyType");
        }
    }
    export class TInst extends SoundType {
        constructor(public t1: TPoly, public args: SoundType[]) {
            super(TypeName.Inst);
            if (this.t1.body.typeName === TypeName.Inst) {//collapse adjacent instantiations
                var inner = <TInst>this.t1.instantiate(this.args, false);
                if (inner.typeName === TypeName.Inst) {
                    this.t1 = inner.t1;
                    this.args = inner.args;
                } else {
                    throw new Error("Impossible");
                }
            }
        }
        public unfold() {
            var t = this.t1.instantiate(this.args, true);
            if (t.typeName === TypeName.Inst) {
                return t.unfold();
            }
            t.instantiated = true;
            return t;
        }
        public subst(s: Pair<TVar, SoundType>[], descend: boolean) {
            return new TInst(<TPoly>this.t1.subst(s, false), this.args.map((t) => t.subst(s, false)));
        }
        public unFree() {
            return this.t1.unFree() && this.args.every((a) => a.unFree());
        }
        public toString() {
            var inst = this.args.map((t) => t.toString()).join(", ");
            return this.t1.toString() + "<" + inst + ">";
        }
        public equals(t: SoundType) {
            if (t.typeName === this.typeName) {
                var s = <TInst>t;
                return this.t1.equals(s.t1) && this.args.length === s.args.length && this.args.every((t, i) => t.equals(s.args[i]));
            }
            var u = this.unfold();
            return u.typeName === t.typeName && u.equals(t);
        }
        public toRTTI() {
            return this.unfold().toRTTI();
        }
    }
    /////////////////////////////////////////
    // Some utilities
    /////////////////////////////////////////
    export function callSignature(tcenv: TcEnv, ast: AST, type: SoundType, overload= 0): SoundType {
        type = type.unfold();
        if (!type.isVirtual() && !TcUtil.isPrimitive(type)) {
            overload = -1;
        }
        switch (type.typeName) {
            case TypeName.Arrow: return type;
            case TypeName.Object:
                if (ast.kind() === SyntaxKind.SuperKeyword) {
                    var to = <NamedType>type;
                    var ct = <TClass>tcenv.lookup(to.name);
                    if (ct) {
                        return ct.constructSignature(overload);
                    }
                }
            default:
                return type.callSignature(overload);
        }
    }
}
