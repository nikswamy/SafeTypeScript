// Modified by N.Swamy, A.Rastogi (2014)

///<reference path='rtapi.ts'/>

module RT {
    declare var require: (m: string) => any;
    var WeakMap = require('weak-map');
    var tagHeap = new WeakMap();
    export var getRtti = (o: any) => {
        return o.__rtti__ || tagHeap.get(o);
    };
    var getTag = (o: any) => {
        return tagHeap.get(o);
    };

    export var setRtti = (o: any, t: any) => {
        tagHeap.set(o, t);
    }; 
    ////////////////////////////////////////////////////////////////////////////
    // Some utilities
    ////////////////////////////////////////////////////////////////////////////
    function assert(b: boolean, m: string) {
        if (!b) {
            //console.log("assert failure: " + m);
            throw new Error("assert failure: " + m);
        }
    }
    export function die(msg: string) {
        throw new Error(msg);
    }
    /*function check(b: boolean, m: string) {
        if (!b) {
            throw new Error("check failure: " + m);
        }
    }*/
    export interface Pair<S, T> {
        fst: S;
        snd: T
    }
    ////////////////////////////////////////////////////////////////////////////
    // Basic definitions for RTTI-related types
    ////////////////////////////////////////////////////////////////////////////
    export enum TT {               //TT is for Type Tag
        ANY,
        NUMBER,
        STRING,
        BOOLEAN,
        VOID,
        ARRAY,
        INSTANCE,
        INTERFACE,
        CLASS,
        INDEX_MAP,
        STRUCTURED_TYPE,
        JUST_TYPE
    }
    //The base interface for the representation of all runtime types
    export interface RTTI extends Virtual {
        tt: TT;
        fieldTable: FieldTable;
        methodTable: MethodTable;
    }
    //Array are nominal (since they extend the Array class)
    //They are handled specially by the runtime 
    export interface ArrayType extends RTTI {
        elt: RTTI;
    }
    //IndexMaps generalize arrays. 
    //They are purely structural (although invariant under subtyping)
    export interface IndexMapType extends RTTI {
        key: RTTI;
        value: RTTI;
    }
    //Named types have no immediate structure
    //Their structure is maintained in a separate "registry" 
    export interface NamedType extends RTTI {
        name: string;
        structuredType: StructuredType;

        //these fields are flattened from reprs
        extendsList?: string[];
        implementsList?: string[];
        functionObject?: any;
        constr?: ArrowType;
    }
    export interface JustType extends RTTI {
        base: RTTI;
    }
    export interface InstanceType extends NamedType { }
    export interface InterfaceType extends NamedType { }
    export interface ClassType extends NamedType { }
    export interface OptionalMap {
        [field: string]: boolean;
    }
    function eqOptionalMap(m1: OptionalMap, m2: OptionalMap): boolean {
        if (m1 === m2) {
            return true;
        }
        if (!(m1 && m2)) {
            return false;
        }
        for (var i in m1) {
            if (!(m1[i] === m2[i])) {
                return false;
            }
        }
        for (var i in m2) {
            if (!(m1[i])) {
                return false;
            }
        }
        return true;
    }
    //Structured types distinguish their methods from their fields
    export interface StructuredType extends RTTI {
        immutable?: boolean
    }
    export interface FieldTable extends Virtual {
        [fieldName: string]: RTTI;
    }
    export interface MethodTable extends Virtual {
        [methodName: string]: ArrowType;
    }
    export interface ArrowType extends Virtual {
        args: RTTI[]
        result: RTTI;
        varargs?: RTTI;//Functions may receive an arbitrary number of additional arguments of this type
        mandatoryArgs?: number;
    }

    function prettyprint_a(a: ArrowType): string {
        var s = "( ";
        for (var i = 0; i < a.args.length; ++i) {
            if (i > 0) {
                s += ", ";
            }
            s += prettyprint_t(a.args[i]);
            if (a.mandatoryArgs && i >= a.mandatoryArgs) {
                s += "?";
            }
        }
        if (a.varargs) {
            s += " , ..." + prettyprint_t(a.varargs);
        }
        s += " ) => " + prettyprint_t(a.result);
        return s;
    }
    export function prettyprint_t(t: RTTI): string {
        if (isZero(t)) {
            return "zero";
        }
        switch (t.tt) {
            case TT.ANY:
                return "any";
            case TT.ARRAY:
                return prettyprint_t((<ArrayType> t).elt) + "[]";
            case TT.BOOLEAN:
                return "boolean";
            case TT.CLASS:
                return (<ClassType> t).name + "_Class";
            case TT.INDEX_MAP:
                return "[_:" + prettyprint_t((<IndexMapType> t).key) + "] :" + prettyprint_t((<IndexMapType> t).value);
            case TT.INSTANCE:
                return (<InstanceType> t).name;
            case TT.INTERFACE:
                return (<InterfaceType> t).name;
            case TT.JUST_TYPE:
                return "dot " + prettyprint_t((<JustType> t).base);
            case TT.NUMBER:
                return "number";
            case TT.STRING:
                return "string";
            case TT.STRUCTURED_TYPE:
                var s = "{ ";
                var first = true;
                var methods: MethodTable = (<StructuredType> t).methodTable;
                for (var m in methods) {
                    if (!first) {
                        s += ", ";
                    } else {
                        first = false;
                    }
                    s += m + ":" + prettyprint_a(methods[m]);
                }
                var flds: FieldTable = (<StructuredType> t).fieldTable;
                first = true;
                s += ", ";
                for (var f in flds) {
                    if (!first) {
                        s += ", ";
                    } else {
                        first = false;
                    }
                    s += f + ":" + prettyprint_t(flds[f]);
                }
                return (s += " }");
            case TT.VOID:
                return "void";
        }
        throw new Error("Impossible");
    }

    //The representation of named types held in the registry
    export interface NamedTypeRepr extends Virtual {
        kind: TT;
        name: string;
        methods: MethodTable;
        fields: FieldTable;
        extendsList: string[];  //Representation is flattened, but we record the extension points for subtyping
    }
    export interface InstanceRepr extends NamedTypeRepr {
        functionObject: any;           //used for runtime type tests on class instances (using the instanceof operator)
        implementsList: string[];
    }
    export interface ClassRepr extends NamedTypeRepr {
        constr: ArrowType;
    }
    export interface InterfaceRepr extends NamedTypeRepr { }

    export function InstanceRepr(name: string, methods: MethodTable, fields: FieldTable, extendsList: string[], functionObject: any, implementsList: string[]): InstanceRepr {
        return { kind: TT.INSTANCE, name: name, methods: methods, fields: fields, extendsList: extendsList, functionObject: functionObject, implementsList: implementsList };
    }
    export function ClassRepr(name: string, methods: MethodTable, fields: FieldTable, extendsList: string[], constr: ArrowType): ClassRepr {
        return { kind: TT.CLASS, name: name, methods: methods, fields: fields, extendsList: extendsList, constr: constr };
    }
    export function InterfaceRepr(name: string, methods: MethodTable, fields: FieldTable, extendsList: string[], nominal: boolean= false): InterfaceRepr {
        return { kind: TT.INTERFACE, name: name, methods: methods, fields: fields, extendsList: extendsList };
    }

    //The type of the registrty
    interface NamedTypeTable extends Virtual {
        [name: string]: boolean;
    }
    //User-level objects that carry RTTI have the type WithRTTI
    export interface WithRTTI extends Virtual {
        __rtti__?: RTTI;
    }
    //A convenient annotation: Delta is the "difference" computed by differential subtyping
    export interface Delta extends RTTI { }

    ////////////////////////////////////////////////////////////////////////////
    // Named type registry: Each declaration of a class/interface registers the 
    //                      representation of the type with the runtime
    ////////////////////////////////////////////////////////////////////////////    

    var registry: NamedTypeTable = Object.create(null);
    export var objectMethods: MethodTable;

    export function registerType(repr: NamedTypeRepr): void {
        var name = repr.name;

        if (registry[name]) {
            throw new Error("Named type " + repr.name + " is already defined");
        }
        if (name === "String") {
            Str.methodTable = repr.methods;
        } else if (name === "Object") {
            objectMethods = repr.methods;
        } else if (name === "Number") {
            Num.methodTable = repr.methods;
        } else {
            var named_type = namedTypesCache[name];
            if (!named_type) {
                if (repr.kind === TT.INTERFACE) {
                    named_type = InterfaceType(name);
                } else if (repr.kind === TT.CLASS) {
                    named_type = ClassType(name);
                } else if (repr.kind === TT.INSTANCE) {
                    named_type = InstanceType(name);
                }
            }
            named_type.fieldTable = repr.fields;
            named_type.methodTable = repr.methods;
            named_type.structuredType = StructuredType(repr.methods, repr.fields);
            named_type.structuredType.immutable = true;

            named_type.extendsList = repr.extendsList;

            if (repr.kind === TT.CLASS) {
                named_type.constr = (<ClassRepr> repr).constr;
            } else if (repr.kind === TT.INSTANCE) {
                named_type.implementsList = (<InstanceRepr> repr).implementsList;
                named_type.functionObject = (<InstanceRepr> repr).functionObject;
            }
        }
        registry[name] = true;
    }
    export function registerClass(className: string, methods: MethodTable, fields: FieldTable,
        extendsC: string, implementsI: string[], staticMethods: MethodTable, staticFields: FieldTable,
        constructorType: ArrowType, functionObject: any): RTTI {
        var instanceObject = InstanceRepr(className, methods, fields, (extendsC ? [extendsC] : []), functionObject, implementsI);
        var classObject = ClassRepr(className + "Class", staticMethods, staticFields, [], constructorType);
        registerType(instanceObject);
        registerType(classObject);
        return ClassType(className);
    }

    ////////////////////////////////////////////////////////////////////////////
    // RTTI builders
    ////////////////////////////////////////////////////////////////////////////

    //constants
    var emptyFieldTable: FieldTable = RT.createEmptyMap<RTTI>();

    var emptyMethodTable: MethodTable = RT.createEmptyMap<ArrowType>();

    export var Any: RTTI = {
        tt: TT.ANY,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable,
    };
    export var Num: RTTI = {
        tt: TT.NUMBER,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable,
    };
    export var Bool: RTTI = {
        tt: TT.BOOLEAN,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable,
    }
    export var Str: RTTI = {
        tt: TT.STRING,
        fieldTable: { "length": Num },
        methodTable: emptyMethodTable,
    }
    export var Void: RTTI = {
        tt: TT.VOID,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable,
    }

    var _: any;
    _ = (<any> Number.prototype).__rtti__  = Num;
    _ = (<any> Boolean.prototype).__rtti__ = Bool;
    _ = (<any> String.prototype).__rtti__  = Str;
//    _ = (<any> Object.prototype).__rtti__  = Any; /* Functions and Arrays inherit __rtti__ from Object.prototype, Object.create(..) may not */
                                                 

    var namedTypesCache: { [name: string]: NamedType } = {};
    function getNamedType(name: string, tt: TT): NamedType {
        if (namedTypesCache[name]) {
            return namedTypesCache[name];
        } else {
            return (namedTypesCache[name] = { tt: tt, name: name, fieldTable: emptyFieldTable, methodTable: emptyMethodTable, structuredType: undefined });
        }
    }

    //constructors
    export function InterfaceType(name: string): InterfaceType {
        return <InterfaceType> getNamedType(name, TT.INTERFACE);
    }
    export function InstanceType(name: string): InstanceType {
        return <InstanceType> getNamedType(name, TT.INSTANCE);
    }
    export function ClassType(name: string): ClassType {
        return <ClassType> getNamedType(name + "Class", TT.CLASS);
    }
    export function StructuredType(methods: MethodTable, fields: FieldTable): StructuredType {
        (<any> methods).__proto__ = null;
        (<any> fields).__proto__ = null;
        return { tt: TT.STRUCTURED_TYPE, methodTable: methods, fieldTable: fields };
    }
    export function JustType(t: RTTI): JustType {
        return { tt: TT.JUST_TYPE, base: t, fieldTable: emptyFieldTable, methodTable: emptyMethodTable };
    }
    export function IndexMapType(key: RTTI, value: RTTI): IndexMapType {
        return { tt: TT.INDEX_MAP, key: key, value: value, fieldTable: emptyFieldTable, methodTable: emptyMethodTable };
    }
    export function ArrayType(elt: RTTI): ArrayType {
        return { tt: TT.ARRAY, elt: elt, fieldTable: { "length": Num }, methodTable: emptyMethodTable };
    }
    export function ArrowType(args: RTTI[], result: RTTI, varargs?: RTTI, mandatoryArgs?: number) {
        var arrow: ArrowType = {
            args: args,
            result: result
        };
        if (varargs) {
            arrow.varargs = varargs;
        }
        if (!(mandatoryArgs === undefined)) {
            arrow.mandatoryArgs = mandatoryArgs;
        }
        return arrow;
    }
    export function LambdaType(arg: RTTI[], ret: RTTI, varargs?: RTTI, mandatoryArgs?: number): StructuredType {   //abbrev for StructuredType with one call method
        return StructuredType({ "<call>": ArrowType(arg, ret, varargs, mandatoryArgs) }, {});
    }
    export function RecordType(flds: FieldTable): StructuredType {     //abbrev for StructruedType with no methods and a field table
        return StructuredType({}, flds);
    }
    enum NameRelation {
        SUBTYPE,
        EQUALITY
    }
    interface NamedContext extends Virtual {
        [expr: string]: boolean;
    }
    function extendContext(cxt: NamedContext, t1: NamedType, t2: NamedType, reln: NameRelation): NamedContext {
        var n_cxt: NamedContext = {};
        for (var f in cxt) {
            n_cxt[f] = cxt[f];
        }
        var s: string = (reln === NameRelation.SUBTYPE) ? " <: " : " = ";
        n_cxt[t1.name + s + t2.name] = true;
        if (reln === NameRelation.EQUALITY) {
            n_cxt[t2.name + s + t1.name] = true; // reflexivity of equality
        }
        return n_cxt;
    }
    function inContext(cxt: NamedContext, t1: NamedType, t2: NamedType, reln: NameRelation): boolean {
        var s: string = (reln === NameRelation.SUBTYPE) ? " <: " : " = ";
        return cxt[t1.name + s + t2.name] === true;
    }

    interface NamedTypeRelationRegistry extends Virtual {
        [expr: string]: Delta;
    }
    var namedTypeRelationRegistry: NamedTypeRelationRegistry = (function (): NamedTypeRelationRegistry {
        var r: NamedTypeRelationRegistry = {};
        (<any> r).__proto__ = null;
        return r;
    })();
    function addToNamedTypeRelationRegistry(t1: NamedType, t2: NamedType, reln: NameRelation, d: Delta): void {
        var s: string = (reln === NameRelation.SUBTYPE) ? " <: " : " = ";
        namedTypeRelationRegistry[t1.name + s + t2.name] = d;
        if (reln === NameRelation.EQUALITY) {
            namedTypeRelationRegistry[t2.name + s + t1.name] = d; // reflexivity of equality
        }
    }
    function inNamedTypeRelationRegistry(t1: NamedType, t2: NamedType, reln: NameRelation): Pair<boolean, Delta> {
        var s: string = (reln === NameRelation.SUBTYPE) ? t1.name + " <: " + t2.name : t1.name + " = " + t2.name;
        return (namedTypeRelationRegistry[s] ? { fst: true, snd: namedTypeRelationRegistry[s] } : { fst: false, snd: zero });
    }

    function subtype(t1: RTTI, t2: RTTI, cxt: NamedContext): Pair<boolean, Delta> {
        var sub: Pair<boolean, Delta>;

        if (t1 === t2) {
            return { fst: true, snd: zero };
        }
        switch (t2.tt) {
            case TT.ANY:
                switch (t1.tt) {
                    case TT.NUMBER:
                    case TT.BOOLEAN:
                    case TT.STRING:                    
                    case TT.VOID:
                    case TT.INSTANCE:
                        return { fst: true, snd: zero };
                    case TT.INTERFACE:
                    case TT.STRUCTURED_TYPE:
                    case TT.ARRAY:
                    case TT.INDEX_MAP:
                    case TT.CLASS:
                        return { fst: true, snd: t1 };
                    default:
                        return { fst: false, snd: zero };
                }
            case TT.INSTANCE:
                if (t1.tt === TT.INSTANCE) {
                    return {
                        fst: (<NamedType> t1).functionObject.prototype instanceof (<NamedType> t2).functionObject, snd: zero
                    };
                } else {
                    return { fst: false, snd: zero };
                }
            case TT.VOID:
                return { fst: true, snd: zero };
            case TT.INTERFACE:
                switch (t1.tt) {
                    case TT.INTERFACE:
                        // in extends list
                        if ((<NamedType> t1).extendsList.indexOf((<NamedType> t2).name) !== -1) {
                            return { fst: true, snd: t1 };
                        }
                        // in relation registry
                        if ((sub = inNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE)) && sub.fst) {
                            return sub;
                        }
                        // from context
                        if (inContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE)) {
                            return { fst: true, snd: zero };
                        }
                        if (equalTypes(t1, t2, cxt)) {
                            return { fst: true, snd: zero };
                        }
                        // extend context and recur
                        sub = subtype((<NamedType> t1).structuredType, (<NamedType> t2).structuredType,
                            extendContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE));
                        if (sub.fst) {
                            addToNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE, sub.snd);
                        }
                        return sub;
                    case TT.STRUCTURED_TYPE:
                        return subtype(t1, (<NamedType> t2).structuredType, cxt);
                    case TT.INSTANCE:
                        // in implements list
                        if ((<NamedType> t1).implementsList.indexOf((<NamedType> t2).name) !== -1) {
                            return { fst: true, snd: zero };
                        }
                        // in relation registry
                        if ((sub = inNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE)) && sub.fst) {
                            return sub;
                        }
                        // from context
                        if (inContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE)) {
                            return { fst: true, snd: zero };
                        }
                        // extend context and recur
                        sub = subtype((<NamedType> t1).structuredType, (<NamedType> t2).structuredType, extendContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE));
                        if (sub.fst) {
                            addToNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE, sub.snd);
                        }
                        return sub;
                    default:
                        return { fst: false, snd: zero };

                }
            case TT.ARRAY:
                if (t1.tt === TT.ARRAY) {
                    return { fst: equalTypes((<ArrayType> t1).elt, (<ArrayType> t2).elt, cxt), snd: zero };
                } else {
                    return { fst: false, snd: zero };
                }
            case TT.INDEX_MAP:
                if (t1.tt === TT.INDEX_MAP) {
                    return { fst: equalTypes((<IndexMapType> t1).key, (<IndexMapType> t2).key, cxt) && equalTypes((<IndexMapType> t1).value, (<IndexMapType> t2).value, cxt), snd: zero };
                } else {
                    return { fst: false, snd: zero }
                }
            case TT.STRUCTURED_TYPE:
                switch (t1.tt) {
                    case TT.INTERFACE:
                        return subtype((<NamedType> t1).structuredType, t2, cxt);
                    case TT.INSTANCE:
                        return { fst: subtype((<NamedType> t1).structuredType, t2, cxt).fst, snd: zero };
                    case TT.STRUCTURED_TYPE:
                        var flds1 = (<StructuredType> t1).fieldTable;
                        var flds2 = (<StructuredType> t2).fieldTable;
                        var methods1 = (<StructuredType> t1).methodTable;
                        var methods2 = (<StructuredType> t2).methodTable;
                        for (var f in flds2) {
                            if (!flds1[f]) {
                                return { fst: false, snd: zero };
                            }
                            if (!(equalTypes(flds1[f], flds2[f], cxt))) {
                                return { fst: false, snd: zero };
                            }
                        }
                        for (var m in methods2) {
                            if (!methods1[m]) {
                                return { fst: false, snd: zero };
                            }
                            if (!(isArrowSubtype(methods1[m], methods2[m], cxt))) {
                                return { fst: false, snd: zero };
                            }
                        }
                        var forgotten_flds: FieldTable = {};
                        var optional_flds: OptionalMap = {};
                        var forgotten_methods: MethodTable = {};

                        var zero_delta = true;

                        for (var f in flds1) {
                            if (!flds2[f]) {
                                zero_delta = true;
                                forgotten_flds[f] = flds1[f];
                            }
                        }
                        for (var m in methods1) {
                            if (!methods2[m] || !isArrowEqual(methods1[m], methods2[m], cxt)) {
                                zero_delta = true;
                                forgotten_methods[m] = methods1[m];
                            }
                        }
                        if (zero_delta) {
                            return { fst: true, snd: zero };
                        } else {
                            return { fst: true, snd: StructuredType(forgotten_methods, forgotten_flds) };
                        }
                    default:
                        return { fst: false, snd: zero };
                }
            case TT.JUST_TYPE:
                return { fst: subtype(t1.tt === TT.JUST_TYPE ? (<JustType> t1).base : t1, (<JustType> t2).base, cxt).fst, snd: zero };
            default:

        }
        
        //s-primdot TODO: this is not inc. right now
        /*if (t1.tt === TT.JUST_TYPE && primitive((<JustType> t1).base) && (t2.tt === (<JustType> t1).base.tt || t2.tt === TT.ANY)) {
            return { fst: true, snd: zero };
        }*/
        //default
        return { fst: false, snd: zero };
    }

    function isZeroSubtype(t1: RTTI, t2: RTTI): boolean {
        var bd = subtype(t1, t2, {});
        return (bd.fst && isZero(bd.snd));
    }
    function isSubtype(t1: RTTI, t2: RTTI): boolean {
        return subtype(t1, t2, {}).fst;
    }
    function isArrowSubtype(t1: ArrowType, t2: ArrowType, cxt: NamedContext): boolean {
        if (!(t1.args.length === t2.args.length) || !(t1.mandatoryArgs === t2.mandatoryArgs)) {
            return false;
        }
        var sub: any;
        for (var i = t1.args.length; i--;) {
            sub = subtype(t2.args[i], t1.args[i], cxt);
            if (!(sub.fst && isZero(sub.snd))) {
                return false;
            }
        }
        sub = subtype(t1.result, t2.result, cxt);
        if (!(sub.fst && isZero(sub.snd))) {
            return false;
        }
        if (!((t1.varargs === undefined && t2.varargs === undefined) || (sub = subtype(t2.varargs, t1.varargs, cxt) && sub.fst && isZero(sub.snd)))) {
            return false;
        }
        return true;
    }
    function isArrowEqual(t1: ArrowType, t2: ArrowType, cxt: NamedContext): boolean {
        if (!(t1.args.length === t2.args.length) || !(t1.mandatoryArgs === t2.mandatoryArgs)) {
            return false;
        }
        for (var i = t1.args.length; i--;) {
            if (!(equalTypes(t1.args[i], t2.args[i], cxt))) {
                return false;
            }
        }
        if (!(equalTypes(t1.varargs, t2.varargs, cxt))) {
            return false;
        }
        if (!(equalTypes(t1.result, t2.result, cxt))) {
            return false;
        }
        return true;
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Main functionality of setting, propagating and checking tags
    // exports:   
    //   shallowTag:           (o: WithRTTI, t: Delta) => WithRTTI 
    //   checkAndTag:          (v: WithRTTI, from: RTTI, to: RTTI) => WithRTTI
    //   readField:            (o: WithRTTI, from: RTTI, f:any) => WithRTTI
    //   writeField:           (o: WithRTTI, from: RTTI, f:any, v:any, tv:RTTI) => WithRTTI 
    //   callMethod:           (o: WithRTTI, from: RTTI, m:any, args:WithRTTI[], argTypes:RTTI[]) => WithRTTI
    //   createArray:          (o: any[], t: RTTI) => WithRTTI
    //   createEmptyIndexMap : (k: RTTI, v: RTTI) => WithRTTI
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////    

    //We use the constant zero for Delta
    var zero: Delta = undefined;
    function isZero(d: Delta) {
        return d === zero;
    }

    // if t1 = t2 = undefined, it returns true --> some code relies on this fact
    function equalTypes(t1: RTTI, t2: RTTI, cxt: NamedContext): boolean {
        var eqflds = function (flds1: FieldTable, flds2: FieldTable) {
            for (var f in flds1) {
                if (!flds2[f]) {
                    return false;
                }
                if (!equalTypes(flds1[f], flds2[f], cxt)) {
                    return false;
                }
            }
            for (var f in flds2) {
                if (!(flds1[f])) {
                    return false;
                }
            }
            return true;
        };
        var eqmethods = function (methods1: MethodTable, methods2: MethodTable) {
            for (var m in methods1) {
                if (!methods2[m]) {
                    return false;
                }
                if (!isArrowEqual(methods1[m], methods2[m], cxt)) {
                    return false;
                }
            }
            for (var m in methods2) {
                if (!(methods1[m])) {
                    return false;
                }
            }
            return true;
        };

        if (t1 === t2) {
            return true;
        }
        if (!(t1.tt === t2.tt)) {
            return false;
        }
        switch (t1.tt) {
            case TT.ARRAY:
                return equalTypes((<ArrayType> t1).elt, (<ArrayType> t2).elt, cxt);
            case TT.INSTANCE:
            case TT.CLASS:
                return (<NamedType> t1).name === (<NamedType> t2).name;
            case TT.INTERFACE:
                if ((<NamedType> t1).name === (<NamedType> t2).name) {
                    return true;
                }
                if (inNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.EQUALITY).fst) {
                    return true;
                }
                if (inContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.EQUALITY)) {
                    return true;
                }
                // we know t1 is an interface, and since t1.tt === t2.tt, so is t2
                //var b = equalTypes(toStructuredType(t1), toStructuredType(t2), extendContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.EQUALITY));
                var b = equalTypes((<NamedType> t1).structuredType, (<NamedType> t2).structuredType,
                    extendContext(cxt, <NamedType> t1, <NamedType> t2, NameRelation.EQUALITY));
                if (b) {
                    addToNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.EQUALITY, zero);
                }
                return b;
            case TT.INDEX_MAP:
                return equalTypes((<IndexMapType> t1).key, (<IndexMapType> t1).key, cxt) && equalTypes((<IndexMapType> t1).value, (<IndexMapType> t1).value, cxt);
            case TT.JUST_TYPE:
                return equalTypes((<JustType> t1).base, (<JustType> t2).base, cxt);
            case TT.STRUCTURED_TYPE:
                return eqflds((<StructuredType> t1).fieldTable, (<StructuredType> t2).fieldTable)
                    && eqmethods((<StructuredType> t1).methodTable, (<StructuredType> t2).methodTable);
            default:
                throw new Error("Impossible");
        }
    }
    function primitive(t: RTTI): boolean {
        var k = t.tt;
        return k === TT.NUMBER || k === TT.STRING || k === TT.BOOLEAN || k === TT.VOID;
    } 
    function clone(t: StructuredType): StructuredType {
        var new_flds: FieldTable = {};
        var new_methods: MethodTable = {};

        var key: string;
        var keys: string[];

        keys = Object.getOwnPropertyNames(t.fieldTable);
        for (var i = keys.length; i--;) {
            key = keys[i];
            new_flds[key] = t.fieldTable[key];
        }

        keys = Object.getOwnPropertyNames(t.methodTable);
        for (var i = keys.length; i--;) {
            key = keys[i];
            new_methods[key] = t.methodTable[key];
        }
        return StructuredType(new_methods, new_flds);
    }

    // if t1 is immutable, it is cloned, else it is modified in place
    // callers should clone beforehand if want no mutation
    function combine(t1: RTTI, t2: RTTI): RTTI {
        // case when tag of an object is empty, and static type is most precise
        if (t1.tt === TT.ANY) {
            return t2;
        }
        
        switch (t2.tt) {
            case TT.BOOLEAN:
            case TT.STRING:
            case TT.NUMBER:
            case TT.VOID:
            case TT.INSTANCE:
            //assert(isZeroSubtype(t1, t2), "combine for primitive and instance types subtyping failure");
            //return t1; // comb(t, c)
            case TT.ANY:
            //return t1; // comb(t, any)
            case TT.CLASS:
            case TT.INDEX_MAP:
            case TT.ARRAY:
                //assert(equalTypes(t1, t2, {}), "combine for fixed types mismatch");
                return t1;
            case TT.INTERFACE:
                switch (t1.tt) {
                    case TT.INTERFACE:
                        var sub: Pair<boolean, Delta>;
                        if ((<NamedType> t1).name === (<NamedType> t2).name) {
                            return t1;
                        }
                        // in extends list
                        if ((<NamedType> t1).extendsList.indexOf((<NamedType> t2).name) !== -1) {
                            return t1;
                        }
                        //TODO: can this ever happen ?
                        /*if (!((<InstanceRepr> registry[(<NamedType> t2).name]).extendsList.indexOf((<NamedType> t1).name) === -1)) {
                            return t2;
                        }*/
                        // in relation registry
                        if ((sub = inNamedTypeRelationRegistry(<NamedType> t1, <NamedType> t2, NameRelation.SUBTYPE)) && sub.fst) {
                            return t1;
                        }
                        return combine((<NamedType> t1).structuredType, (<NamedType> t2).structuredType);
                    case TT.STRUCTURED_TYPE:
                        //return combine(t1, toStructuredType(t2));
                        return combine(t1, (<NamedType> t2).structuredType);
                    case TT.CLASS:
                    case TT.INSTANCE:
                        //assert(isZeroSubtype(t1, t2), "combine for interface type on fixed RTTI failure");
                        //return t1;
                    case TT.STRING:
                        //assert((<NamedType> t2).name === "String", "string can only be combined with strings");
                        return t1;
                    //case TT.BOOLEAN:
                    //case TT.NUMBER:
                    //case TT.ARRAY:
                    //case TT.INDEX_MAP:
                        //assert(false, "interface type " + (<NamedType>t2).name + " cannot be combined with prims, arrays, and index maps: " + prettyprint_t(t1));
                        //return t1;
                    //case TT.JUST_TYPE:
                    //case TT.VOID:
                        //assert(false, "RTTI cannot be dotted type or void");
                        //return t1;
                    //case TT.ANY: // has been checked at the beginning of the function
                        //return t2;
                    default:
                        throw new Error("Impossible");
                }
                throw new Error("Impossible");
            case TT.STRUCTURED_TYPE:
                switch (t1.tt) {
                    case TT.INSTANCE:
                    case TT.CLASS:
                        //assert(isZeroSubtype(t1, t2), "combine for structured type on fixed RTTI failure");
                        return t1; // comb(C, {M;F})
                    case TT.INTERFACE:
                        //return combine(toStructuredType(t1), t2); // comb(I, {M;F})
                        return combine((<NamedType> t1).structuredType, t2); // comb(I, {M;F})
                    case TT.STRUCTURED_TYPE:
                        if ((<StructuredType> t1).immutable) {
                            t1 = clone(<StructuredType> t1);
                        }
                        var f1 = (<StructuredType> t1).fieldTable;
                        var f2 = (<StructuredType> t2).fieldTable;

                        for (var f in f2) {
                            //if (f1[f]) {  // eliminate if in the final version
                                //assert(equalTypes(f1[f], f2[f], {}), "combine for structured types, invalid field overlapping");
                            //} else {
                                f1[f] = f2[f];
                            //}
                        }

                        var m1 = (<StructuredType> t1).methodTable;
                        var m2 = (<StructuredType> t2).methodTable;

                        for (var m in m2) {
                            if (m1[m]) { // cannot eliminate if, do away with the subtyping check in the final version
                                //assert(isArrowSubtype(m1[m], m2[m], {}), "combine for structured types, invalid method overlap");
                            } else {
                                m1[m] = m2[m];
                            }
                        }

                        return t1; //comb({M1;F1}, {M2;F2})
                    //case TT.NUMBER:
                    //case TT.STRING:
                    //case TT.VOID:
                    //case TT.BOOLEAN:
                        //assert(false, "combine structured type on a primtive type");
                        //return t1;
                    //case TT.ARRAY:
                    //case TT.INDEX_MAP:
                        //assert(false, "combine structured type on arrays or index maps");
                        //return t1;
                    //case TT.JUST_TYPE:
                    //case TT.ANY: // has been checked at the beginning of the function
                        //assert(false, "RTTI cannot be any/just type");
                        //return t1;
                    default:
                        throw new Error("Impossible");
                }

            //case TT.JUST_TYPE:
                //assert(false, "combine with just types is not defined");
                //return t1;
            default:
                throw new Error("Impossible");
        }
        throw new Error("Impossible"); // never reach here
    }
    export function shallowTagSwap(t: Delta, o: WithRTTI): WithRTTI {
        return shallowTag(o, t);
    }
    // called at each application of subtyping
    export function shallowTag(o: WithRTTI, t: Delta): WithRTTI {
        if (!o || !t) { //shallowTag (T, undefined, t) = T, undefined, o === null, o === 0, t === zero
            return o;
        }
        var t_o: RTTI;
        switch (t.tt) {
            case TT.ANY:
                //return o; // shallowTag(T, v, any)
            case TT.INSTANCE:
                //assert(isZeroSubtype(t_o, t), "shallowTag on instance types fails subtyping side-condition");
                //return o; // shallowTag(T, v, C)
            case TT.NUMBER:
            case TT.STRING:
            case TT.BOOLEAN:
            case TT.VOID:
                //assert(t_o.tt === t.tt, "shallowTag on primitive type mismatch");
                return o; // shallowTag(T, v, c)
            case TT.ARRAY:
            case TT.INDEX_MAP:
            case TT.CLASS:
                //t_o = o.__rtti__ || Any;
                //assert(t_o === Any || equalTypes(t_o, t, {}), "shallowTag on array and index map assumes no or same RTTI");
                //(t_o  !== Any) || (o.__rtti__ = t);
                setRtti(o, t);
                return o;
            case TT.INTERFACE:
            case TT.STRUCTURED_TYPE:
                t_o = o.__rtti__ || getTag(o) || Any;
                if (t_o.tt === TT.INSTANCE || t_o.tt === TT.INTERFACE) { // for class types, no change of tag
                    return o;
                }
                setRtti(o, combine(t_o, t));
                return o;
            //case TT.JUST_TYPE:
                //assert(false, "shallowTag with Just types not defined");
                //return o;
            default:
                throw new Error("Impossible");
        }
        throw new Error("Impossible"); // never reach here
    }

    export function checkInstance(v: WithRTTI, to: InstanceType): Pair<boolean, WithRTTI> {
        if (v === undefined || v === null) {
            return { fst: true, snd: v };
        }
        var t_v = v.__rtti__ || getTag(v) || Any;
        if ((<any> t_v).name == to.name) {
            return { fst: true, snd: v };
        }
        if (v instanceof to.functionObject) {
            return { fst: true, snd: v };
        }
        return { fst: false, snd: undefined };
    }

    export function checkAndTag(v: WithRTTI, from: RTTI, to: RTTI): WithRTTI { //the translation of a source cast <to> (o:from) + inserted by compiler elsewhere
        if (v === undefined || v === null) { // setTag(T, undefined, _, _)
            return v;
        }
        var t_v = v.__rtti__ || getTag(v) || Any;

        if (from.tt === TT.JUST_TYPE) {
            if (t_v.tt === TT.STRUCTURED_TYPE) {
                t_v = clone(<StructuredType> t_v);
            }
            if(!(isZeroSubtype(JustType(combine(t_v, (<JustType> from).base)), to))) {
                throw new Error("checkAndTag from dotted type subtyping failure: " + prettyprint_t(JustType(combine(t_v, (<JustType> from).base))) +
                    " </: " + prettyprint_t(to));
            }
            return v; // setTag(T, v, dot base, to)
        }
        // undotted from
        switch (to.tt) {
            case TT.BOOLEAN:
            case TT.NUMBER:
            case TT.STRING:
            case TT.VOID:
                if (t_v !== to) {
                    throw new Error("checkAndTag for primitive types mismatch: " + prettyprint_t(t_v) + " !== " + prettyprint_t(to));
                }
                return v; // setTag(T, v, _, c)
            case TT.ANY:
                if (from.tt === TT.JUST_TYPE) {
                    throw new Error("checkAndTag to any undotted from check failure: " + prettyprint_t(from)); // setTag(T, v, from, any);
                }
                return v;
            case TT.INSTANCE:
                if ((<any>t_v).name === (<NamedType>to).name) {
                    return v;
                }
                if (!(v instanceof (<NamedType> to).functionObject)) {
                    throw new Error("checkAndTag to instance type " + (<NamedType>to).name + " instanceof check failed, it's a " + prettyprint_t(t_v));
                }
                return v;
            case TT.ARRAY:
            case TT.CLASS:
            case TT.INDEX_MAP:
                t_v = t_v === Any ? from : t_v; // for these types one of tag or static is precise
                if (!(equalTypes(t_v, to, {}))) {
                    throw new Error("checkAndTag to fixed type failure: " + prettyprint_t(combine(t_v, from)) + " </: " + prettyprint_t(to));
                }
                return v;
            case TT.INTERFACE:
                switch (t_v.tt) {
                    // optimize just for instances and interfaces
                    case TT.INSTANCE:
                        if (!(isZeroSubtype(t_v, to))) {
                            throw new Error("checkAndTag to interface for a class instance must be subtype: " + prettyprint_t(t_v) + " </: " + prettyprint_t(to));
                        }
                        return v;
                    case TT.INTERFACE:
                        var sub: Pair<boolean, Delta>;
                        if ((<NamedType> t_v).name === (<NamedType> to).name) {
                            return v;
                        }
                        // in extends list
                        if ((<NamedType> t_v).extendsList.indexOf((<NamedType> to).name) !== -1) {
                            return v;
                        }
                        //TODO: can this ever happen ?
                        /*if (!((<InstanceRepr> registry[(<NamedType> t2).name]).extendsList.indexOf((<NamedType> t1).name) === -1)) {
                            return t2;
                        }*/
                        // in relation registry
                        if ((sub = inNamedTypeRelationRegistry(<NamedType> t_v, <NamedType> to, NameRelation.SUBTYPE)) && sub.fst) {
                            return v;
                        }
                        //return checkAndTag(v, from, toStructuredType(to)); // setTag(T, v, _, I)
                        return checkAndTag(v, from, (<NamedType> to).structuredType); // setTag(T, v, _, I)
                    default:
                        //return checkAndTag(v, from, toStructuredType(to)); // setTag(T, v, _, I)
                        return checkAndTag(v, from, (<NamedType> to).structuredType); // setTag(T, v, _, I)
                }
                throw new Error("Impossible");
            case TT.STRUCTURED_TYPE:
                var curr = t_v.tt === TT.STRUCTURED_TYPE ? combine(clone(<StructuredType> t_v), from) : combine(t_v, from); // clone first
                var sub = subtype(curr, to, {});
                if (sub.fst) { // setTag(T, v, t, {M;F}) when comb(tag_T(v), t) <: {M;F}
                    return shallowTag(v, sub.snd);
                }

                // go deep, will mutate tag of v, setTag(T, v, t, {M;F}), toStruct is defined for instances and classes too, so exclude them
                if ((t_v.tt === TT.INSTANCE) || (t_v.tt === TT.CLASS)) {
                    throw new Error("checkAndTag to structured type from a fixed type failure: " + prettyprint_t(t_v) + " being tagged to: " + prettyprint_t(to));
                }
                //var curr_st = toStructuredType(curr);
                var to_flds = (<StructuredType> to).fieldTable;
                var overlapping_flds: FieldTable = {};
                var new_flds: FieldTable = {};
                for (var f in to_flds) {
                    if (curr.fieldTable[f]) {
                        if (!(equalTypes(curr.fieldTable[f], to_flds[f], {}))) {
                            throw new Error("checkAndTag to structured type field overlapping failure: " + prettyprint_t(curr.fieldTable[f]) + " != " +
                                prettyprint_t(to_flds[f]));
                        }
                        overlapping_flds[f] = to_flds[f];
                    } else {
                        new_flds[f] = to_flds[f];
                    }
                }
                sub = subtype(curr, StructuredType(to.methodTable, overlapping_flds), {});
                if (!(sub.fst)) {
                    throw new Error("checkAndTag to structured type subtyping from combine failure: " + prettyprint_t(curr) + " </: " +
                        StructuredType((<StructuredType> to).methodTable, overlapping_flds));
                }
                shallowTag(v, sub.snd);
                setRtti(v, combine((v.__rtti__ || getTag(v) || Any) /* t_v is stale at this point */, StructuredType({}, new_flds))); // add new_flds in RTTI tentatively
                for (f in new_flds) { // go deep
                    checkAndTag(v[f], Any, new_flds[f]);
                }
                return v;
            case TT.JUST_TYPE:
                return checkAndTag(v, from, (<JustType> to).base);
            default:
                throw new Error("Impossible"); // never reach here
        }
    }

    export function getFieldTypeOptim(t: any /* RTTI or ArrowType or undefined */, o: WithRTTI, f: string): RTTI {
        if (t) {
            //t is not undefined, it better not be an arrow type
            if (t.tt === undefined || t.tt === TT.JUST_TYPE) {
                throw new Error("readFieldOptim reading a method or field with dot type: " + prettyprint_t(t));
            }
            return t;
        } else {
            //t is undefined, if o is an index map, need to return the elt type
            t = o.__rtti__ || getTag(o);
            if (t.tt === TT.INDEX_MAP) {
                if ((<IndexMapType> t).key.tt === TT.NUMBER) {
                    throw new Error("readFieldOptim index map index is number");
                } else {
                    t = (<IndexMapType> t).value;
                    if (t.tt === TT.JUST_TYPE) {
                        throw new Error("readFieldOptim index map value type dotted");
                    } else {
                        return t;
                    }
                }
            } else {
                return Any;
            }
        }
    }

    //the translation of a source dynamic read(o:t_o)[f]
    export function readField(o: WithRTTI, from: RTTI, f: any): WithRTTI {
        if (!o) { // this check will fail for 0 too, but read from 0 is not allowed nevertheless
            throw new Error("readField reading from undefined/null");
        }

        var t_o = o.__rtti__ || getTag(o) || Any;
        var tt: TT = t_o.tt;
        var t = tt === TT.ANY ? from : t_o;

        var t1: RTTI;

        var fname = f + "";

        switch (t.tt) {
            //CLAIM: For instance and interface, we need to lookup only t. Why ?
            //for instances, t_o is not Any, and so, t = t_o in which case, static type from cannot be any more informative
            //for interfaces, either t = t_o which if an interface is most precise, else, t_o = any and t = from, in which case t_o is already any, hence t is most precise
            case TT.INTERFACE:
            case TT.INSTANCE:
            case TT.CLASS:
                t1 = t.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("readField reading method (instance and interface)");
                    }
                    t1 = Any;
                } else if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("readField from interface / instance reading dot type field");
                }
                return shallowTag(o[fname], t1);
            case TT.STRING:
                if (fname === "length") {
                    return (<any> o).length;
                }
                throw new Error("reading a field other than length from string: " + fname);
            //CLAIM: For arrays and index maps, we only need to consider t (either their tag is Any and static is precise, or tag is precise)
            case TT.ARRAY:
                if (fname === "length") {
                    return (<any> o).length;
                }
                t1 = (<ArrayType> t).elt;
                if (t1.tt === TT.JUST_TYPE) { 
                    throw new Error("array readField elt type is dotted: " + prettyprint_t(t1));
                }
                return shallowTag(o[<number> checkAndTag(f, Any, Num)], t1);
            case TT.STRUCTURED_TYPE:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("readField struct types reading method");
                    }
                    t1 = Any;
                } else if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("readField from struct reading dot type field");
                }
                return shallowTag(o[fname], t1);
            case TT.ANY:
                return o[fname];
            case TT.INDEX_MAP:
                tt = (<IndexMapType> t).key.tt;
                t1 = (<IndexMapType> t).value;
                if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("indexMap readField value type not a subtype of any: " + prettyprint_t(t1));
                }
                if (tt === TT.NUMBER) {
                    return shallowTag(o[<any> checkAndTag(f, Any, Num)], t1);
                } else {
                    if (objectMethods[fname]) {
                        throw new Error("readField for indexMap reading Object method: " + fname);
                    }
                    return shallowTag(o[fname], t1);
                }
        }
        throw new Error("Impossible");
    }

    //the translation of a source dynamic write (o:t_o)[f] = (v:t_v)
    export function writeField(o: WithRTTI, from: RTTI, f: any, v: WithRTTI, tv: RTTI): WithRTTI {
        if (!o) { // this check will fail for 0 too, but write to 0 is not allowed nevertheless
            throw new Error("writeField writing to undefined/null");
        }

        var t_o = o.__rtti__ || getTag(o) || Any;
        var tt: TT = t_o.tt;
        var t = tt === TT.ANY ? from : t_o;

        var t1: RTTI;

        var fname = f + "";

        switch (t.tt) {
            //CLAIM: For instance and interface, we need to lookup only t. Why ?
            //for instances, t_o is not Any, and so, t = t_o in which case, static type from cannot be any more informative
            //for interfaces, either t = t_o which if an interface is most precise, else, t_o = any and t = from, in which case t_o is already any, hence t is most precise
            case TT.INTERFACE:
            case TT.INSTANCE:
            case TT.CLASS:
                t1 = t.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("writeField writing method (instance and interface)");
                    }
                    t1 = Any;
                    //TODO: no need to checkAndTag here as tv is undotted ... confirm
                } else if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("readField from interface / instance reading dot type field");
                } else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[fname] = v);
            case TT.ARRAY:
                if (fname === "length") {
                    return ((<any> o).length = v);
                }
                if (f === undefined || f === null || ((f.__rtti__ || getTag(f)) !== Num)) {
                    throw new Error("array writeField f can only be Num");
                }
                t1 = (<ArrayType> t).elt;
                if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("array writeField elt type is dotted: " + prettyprint_t(t1));
                } else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[<number> f] = v);
            case TT.STRUCTURED_TYPE:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("writeField struct types writing method");
                    }
                    t1 = Any;
                    //TODO: no need to checkAndTag here as tv is undotted ... confirm
                } else if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("writeField from struct writing dot type field");
                } else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[fname] = v);
            case TT.ANY:
                return (o[fname] = v);
            case TT.INDEX_MAP:
                tt = (<IndexMapType> t).key.tt;
                t1 = (<IndexMapType> t).value;
                if (t1.tt === TT.JUST_TYPE) {
                    throw new Error("indexMap writeField value type is dotted: " + prettyprint_t(t1));
                } else {
                    v = checkAndTag(v, tv, t1);
                }
                if (tt === TT.NUMBER) {
                    if (f === undefined || f === null || (f.__rtti__ || getTag(f) !== Num)) {
                        throw new Error("Indexmap writeField number index error");
                    }
                    return (o[f] = v);
                } else {
                    if (objectMethods[fname]) {
                        throw new Error("writeField for indexMap writing Object method: " + fname);
                    }
                    return (o[fname] = v);
                }
        }
        throw new Error("Impossible");
    }

    function resolveMethod(o: WithRTTI, from: RTTI, mname: string): ArrowType {
        if (!o && (o === null || o === undefined)) {
            throw new Error("resolveMethod for undefined/null");
        }
        var t_o = o.__rtti__ || getTag(o) || Any;
        return t_o.methodTable[mname] || objectMethods[mname] || from.methodTable[mname];
    }

    //the translation of a source dynamic method call (o:t_o)[m](args[]:t_args[])
    //assume args.length === argTypes.length
    export function callMethod(o: WithRTTI, from: RTTI, m: any, args: WithRTTI[], argTypes: RTTI[]): WithRTTI {
        //TODO: assume no callMethod on dotted type
        //assert(from.tt !== TT.JUST_TYPE, "RT does not handle callMethod from just types");
        if (!o && (o === null || o === undefined)) {
            throw new Error("callMethod calling from undefined/null");
        }

        //var undotted_from = from.tt === TT.JUST_TYPE ? (<JustType> from).base : from; // first strip dot from static type 
        var t_o = o.__rtti__ || getTag(o) || Any;
        // this variable checks for String, Array, and IndexMap, which have the property that either tag or static type is most precise
        var t = /*undotted_*/from.tt === TT.ANY ? t_o : /*undotted_*/from; // take the more precise one of tag and static

		var mname = m + "";
        var t1 = resolveMethod(o, from, mname);

        if (t1 === undefined) {
            return callFunction(readField(o, from, m), Any /* readField gives type Any */, args, argTypes);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
        //var sub = subtype(t1.result, Any, {});
        //if (!(sub.fst)) {
            throw new Error("callMethod return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) { // all arguments mandatory
            throw new Error("callMethod did not provide all mandatory arguments");
        } else if (args.length < t1.mandatoryArgs) {
             throw new Error("callMethod did not provide all mandatory arguments(2)");
        }
        var i: number;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]); // if args array overflows, it will be undefined whose checkAndTag will succeed
        }
        // check optional args
        if (args.length > i) {
            if (t1.varargs === undefined) {
                throw new Error("callMethod extra arguments provided to a non variadic method call");
            }
            for (; i < args.length; ++i) {
                checkAndTag(args[i], argTypes[i], t1.varargs);
            }
        }

        switch (args.length) {
            case 0:
                return shallowTag(o[mname](), t1.result);
            case 1:
                return shallowTag(o[mname](args[0]), t1.result);
            case 2:
                return shallowTag(o[mname](args[0], args[1]), t1.result);
            case 3:
                return shallowTag(o[mname](args[0], args[1], args[2]), t1.result);
            case 4:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3]), t1.result);
            case 5:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4]), t1.result);
            case 6:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4], args[5]), t1.result);
            case 7:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4], args[5], args[6]), t1.result);
            case 8:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]), t1.result);
            case 9:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]), t1.result);
            case 10:
                return shallowTag(o[mname](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]), t1.result);
            default:
                throw new Error("callMethod only defined for upto 10 arguments");
        }
        throw new Error("Impossible"); // unreachable
    }

    export function checkMethodArgs(o: WithRTTI, from: RTTI, m: string, args: WithRTTI[], argTypes: RTTI[]): RTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("checkMethodArgs calling from undefined/null");
        }

        var t1 = resolveMethod(o, from, m);

        if (t1 === undefined) {
            return checkFunctionArgs(readField(o, from, m), args, argTypes);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("checkMethodArgs return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) { // all arguments mandatory
            throw new Error("checkMethodArgs did not provide all mandatory arguments");
        } else if (args.length < t1.mandatoryArgs) {
            throw new Error("checkMethodArgs did not provide all mandatory arguments(2)");
        }
        var i: number;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]); // if args array overflows, it will be undefined whose checkAndTag will succeed
        }
        // check optional args
        if (args.length > i) {
            if (t1.varargs === undefined) {
                throw new Error("checkMethodArgs extra arguments provided to a non variadic method call");
            }
            for (; i < args.length; ++i) {
                checkAndTag(args[i], argTypes[i], t1.varargs);
            }
        }
        return t1.result;
    }

    export function checkMethodArgs0(o: WithRTTI, from: RTTI, m: string): RTTI {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs0(readField(o, from, m));
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("checkMethodArgs0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs) { // non-zero or not undefined
            throw new Error("checkMethodArgs0 did not provide all mandatory arguments");
        }
        return t1.result;
    }
    export function checkMethodArgs1(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, argType1: RTTI): RTTI {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs1(readField(o, from, m), arg1, argType1);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("checkMethodArgs1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 1) { //undefined > 1 = false
            throw new Error("checkMethodArgs1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        } else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("checkMethodArgs1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return t1.result;
    }
    export function checkMethodArgs2(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, arg2: WithRTTI, argType1: RTTI, argType2: RTTI): RTTI {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            //TODO: readField is reading from m, which means stateful toString on m might fail
            return checkFunctionArgs2(readField(o, from, m), arg1, arg2, argType1, argType2);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("checkMethodArgs2 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 2) { //undefined > 2 = false
            throw new Error("checkMethodArgs2 did not provide all mandatory arguments");
        }
        var varargs_t: RTTI;
        switch (t1.args.length) {
            case 0:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("checkMethodArgs2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, varargs_t);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 1:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("checkMethodArgs2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 2:
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                break;
            default:
                throw new Error("Impossible");
        }
        return t1.result;
    }
    export function checkMethodArgs3(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI): RTTI {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    export function checkMethodArgs4(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI): RTTI {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    export function checkMethodArgs5(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI): RTTI {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    export function checkMethodArgs6(o: WithRTTI, from: RTTI, m: string, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI, arg6: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI, argType6: RTTI): RTTI {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }

    export function checkFunctionArgs(o: WithRTTI, args: WithRTTI[], argTypes: RTTI[]): RTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("checkFunctionArgs calling from undefined/null");
        }
        var t_o = o.__rtti__ || getTag(o) || Any;
        var t1 = t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("checkFunctionArgs <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("checkFunctionArgs return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) { // all arguments mandatory
            throw new Error("checkFunctionArgs did not provide all mandatory arguments");
        } else if (args.length < t1.mandatoryArgs) {
            throw new Error("checkFunctionArgs did not provide all mandatory arguments(2)");
        }

        var i: number;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]); // if args array overflows, it will be undefined whose checkAndTag will succeed
        }
        // check optional args
        if (args.length > i) {
            if (t1.varargs === undefined) {
                throw new Error("checkFunctionArgs extra arguments provided to a non variadic method call");
            }
            for (; i < args.length; ++i) {
                checkAndTag(args[i], argTypes[i], t1.varargs);
            }
        }
        return t1.result;
    }

    export function checkFunctionArgs0(o: WithRTTI): RTTI {
        return checkFunctionArgs(o, [], []);
    }
    export function checkFunctionArgs1(o: WithRTTI, arg1: WithRTTI, argType1: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1], [argType1]);
    }
    export function checkFunctionArgs2(o: WithRTTI, arg1: WithRTTI, arg2: WithRTTI, argType1: RTTI, argType2: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1, arg2], [argType1, argType2]);
    }
    export function checkFunctionArgs3(o: WithRTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    export function checkFunctionArgs4(o: WithRTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    export function checkFunctionArgs5(o: WithRTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    export function checkFunctionArgs6(o: WithRTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI, arg6: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI, argType6: RTTI): RTTI {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }

    export function callMethod0(o: WithRTTI, from: RTTI, m: any): WithRTTI {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            //TODO: readField is reading from m, which means stateful toString on m might fail
            return callFunction0(readField(o, from, m), Any /* readField gives type Any */);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            //var sub = subtype(t1.result, Any, {});
            //if (!(sub.fst)) {
            throw new Error("callMethod0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs) { // non-zero or not undefined
            throw new Error("callMethod0 did not provide all mandatory arguments");
        }
        return shallowTag(o[mname](), t1.result);
        //return callMethod(o, from, m, [], []);
    }
    export function callMethod1(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, argType1: RTTI): WithRTTI {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            //TODO: readField is reading from m, which means stateful toString on m might fail
            return callFunction1(readField(o, from, m), Any /* readField gives type Any */, arg1, argType1);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            //var sub = subtype(t1.result, Any, {});
            //if (!(sub.fst)) {
            throw new Error("callMethod1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 1) { //undefined > 1 = false
            throw new Error("callMethod1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        } else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("callMethod1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return shallowTag(o[mname](arg1), t1.result);
        //return callMethod(o, from, m, [arg1], [argType1]);
    }
    export function callMethod2(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, arg2: WithRTTI, argType1: RTTI, argType2: RTTI): WithRTTI {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            //TODO: readField is reading from m, which means stateful toString on m might fail
            return callFunction2(readField(o, from, m), Any /* readField gives type Any */, arg1, arg2, argType1, argType2);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            //var sub = subtype(t1.result, Any, {});
            //if (!(sub.fst)) {
            throw new Error("callMethod2 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 2) { //undefined > 2 = false
            throw new Error("callMethod2 did not provide all mandatory arguments");
        }
        var varargs_t: RTTI;
        switch (t1.args.length) {
            case 0:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, varargs_t);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 1:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 2:
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                break;
            default:
                throw new Error("Impossible");
        }
        return shallowTag(o[mname](arg1, arg2), t1.result);
        //return callMethod(o, from, m, [arg1, arg2], [argType1, argType2]);
    }
    export function callMethod3(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI): WithRTTI {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            //TODO: readField is reading from m, which means stateful toString on m might fail
            return callFunction3(readField(o, from, m), Any /* readField gives type Any */, arg1, arg2, arg3, argType1, argType2, argType3);
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            //var sub = subtype(t1.result, Any, {});
            //if (!(sub.fst)) {
            throw new Error("callMethod3 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 3) { //undefined > 2 = false
            throw new Error("callMethod3 did not provide all mandatory arguments");
        }
        var varargs_t: RTTI;
        switch (t1.args.length) {
            case 0:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, varargs_t);
                checkAndTag(arg2, argType2, varargs_t);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 1:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, varargs_t);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 2:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 3:
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                checkAndTag(arg3, argType3, t1.args[2]);
                break;
            default:
                throw new Error("Impossible");
        }
        return shallowTag(o[mname](arg1, arg2, arg3), t1.result);
        //return callMethod(o, from, m, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    export function callMethod4(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI): WithRTTI {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    export function callMethod5(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI): WithRTTI {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    export function callMethod6(o: WithRTTI, from: RTTI, m: any, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI, arg6: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI, argType6: RTTI): WithRTTI {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }

    //the translation of a source dynamic call (o:t_o)(args[]:t_args[])
    export function callFunction(o: WithRTTI, t_o: RTTI, args: WithRTTI[], t_args: RTTI[]): WithRTTI {
        //TODO: assume no callFunction on dotted type
        //assert(from.tt !== TT.JUST_TYPE, "RT does not handle callFunction from just types");
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction calling from undefined/null");
        }

        //var undotted_t_o = t_o.tt === TT.JUST_TYPE ? (<JustType> t_o).base : t_o; // first strip dot from static type
        var rtti = o.__rtti__ || getTag(o);
        var t1 = (rtti && rtti.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
        //var sub = subtype(t1.result, Any, {});
        //if (!(sub.fst)) {
            throw new Error("callFunction return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) { // all arguments mandatory
            throw new Error("callFunction did not provide all mandatory arguments");
        } else if (args.length < t1.mandatoryArgs) {
            throw new Error("callFunction did not provide all mandatory arguments(2)");
        }

        var i: number;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], t_args[i], t1.args[i]); // if args array overflows, it will be undefined whose checkAndTag will succeed
        }
        // check optional args
        if (args.length > i) {
            if (t1.varargs === undefined) {
                throw new Error("callFunction extra arguments provided to a non variadic method call");
            }
            for (; i < args.length; ++i) {
                checkAndTag(args[i], t_args[i], t1.varargs);
            }
        }

        if (args.length == 0) {
            return shallowTag((<any>o)(), t1.result);
        } else if (args.length == 1) {
            return shallowTag((<any>o)(args[0]), t1.result);
        } else if (args.length == 2) {
            return shallowTag((<any>o)(args[0], args[1]), t1.result);
        } else if (args.length == 3) {
            return shallowTag((<any>o)(args[0], args[1], args[2]), t1.result);
        } else if (args.length == 4) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3]), t1.result);
        } else if (args.length == 5) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4]), t1.result);
        } else if (args.length == 6) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4], args[5]), t1.result);
        } else if (args.length == 7) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4], args[5], args[6]), t1.result);
        } else if (args.length == 8) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]), t1.result);
        } else if (args.length == 9) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]), t1.result);
        } else if (args.length == 10) {
            return shallowTag((<any>o)(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]), t1.result);
        } else {
            throw new Error("callFunction only defined for upto 10 arguments");
        }
        throw new Error("Impossible"); // unreachable
    }
    export function callFunction0(o: WithRTTI, t_o: RTTI): WithRTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }
	
	var t1 = o.__rtti__ || getTag(o);
        t1 = (t1 && t1.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction0 <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("callFunction0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs) { // non-zero or not undefined
            throw new Error("callFunction0 did not provide all mandatory arguments");
        }
        return shallowTag((<any> o)(), t1.result);
        //return callFunction(o, from, [], []);
    }
    export function callFunction1(o: WithRTTI, t_o: RTTI, arg1: WithRTTI, argType1: RTTI): WithRTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }

	var t1 = o.__rtti__ || getTag(o);
        t1 = (t1 && t1.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 1) { //undefined > 1 = false
            throw new Error("callFunction1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        } else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("callFunction1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return shallowTag((<any> o)(arg1), t1.result);
        //return callFunction(o, from, [arg1], [argType1]);
    }
    export function callFunction2(o: WithRTTI, t_o: RTTI, arg1: WithRTTI, arg2: WithRTTI, argType1: RTTI, argType2: RTTI): WithRTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }

	var t1 = o.__rtti__ || getTag(o);
        t1 = (t1 && t1.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 2) { //undefined > 2 = false
            throw new Error("callMethod2 did not provide all mandatory arguments");
        }
        var varargs_t: RTTI;
        switch (t1.args.length) {
            case 0:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callFunction2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, varargs_t);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 1:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callFunction2 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, varargs_t);
                break;
            case 2:
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                break;
            default:
                throw new Error("Impossible");
        }
        return shallowTag((<any> o)(arg1, arg2), t1.result);
        //return callFunction(o, from, [arg1, arg2], [argType1, argType2]);
    }
    export function callFunction3(o: WithRTTI, t_o: RTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI): WithRTTI {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }

	var t1 = o.__rtti__ || getTag(o);
        t1 = (t1 && t1.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === TT.JUST_TYPE) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        // check args
        if (t1.mandatoryArgs > 3) { //undefined > 2 = false
            throw new Error("callMethod3 did not provide all mandatory arguments");
        }
        var varargs_t: RTTI;
        switch (t1.args.length) {
            case 0:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, varargs_t);
                checkAndTag(arg2, argType2, varargs_t);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 1:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, varargs_t);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 2:
                varargs_t = t1.varargs;
                if (varargs_t === undefined) {
                    throw new Error("callMethod3 extra arguments provided to a non variadic method call");
                }
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                checkAndTag(arg3, argType3, varargs_t);
                break;
            case 3:
                checkAndTag(arg1, argType1, t1.args[0]);
                checkAndTag(arg2, argType2, t1.args[1]);
                checkAndTag(arg3, argType3, t1.args[2]);
                break;
            default:
                throw new Error("Impossible");
        }
        return shallowTag((<any> o)(arg1, arg2, arg3), t1.result);
        //return callFunction(o, from, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    export function callFunction4(o: WithRTTI, from: RTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI): WithRTTI {
        return callFunction(o, from, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    export function callFunction5(o: WithRTTI, from: RTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI): WithRTTI {
        return callFunction(o, from, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    export function callFunction6(o: WithRTTI, from: RTTI, arg1: WithRTTI, arg2: WithRTTI, arg3: WithRTTI, arg4: WithRTTI, arg5: WithRTTI, arg6: WithRTTI,
        argType1: RTTI, argType2: RTTI, argType3: RTTI, argType4: RTTI, argType5: RTTI, argType6: RTTI): WithRTTI {
        return callFunction(o, from, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }
    export function assignmentWithUnaryOp(op: string, o: WithRTTI, from: RTTI, f: any): WithRTTI {
        if (!o) {
            throw new Error("assignmentWithUnaryOp on null/undefined/0");
        }

        var t_o = o.__rtti__ || getTag(o) || Any;
        var tt = t_o.tt;
        var t = tt === TT.ANY ? from : t_o;

        var t1: RTTI;

        var fname: any = f + "";

        switch (t.tt) {
            case TT.ARRAY:
                if (fname === "length") {
                    t1 = Num;
                } else {
                    t1 = (<ArrayType> t).elt;
                    fname = checkAndTag(f, Any, Num);
                }
                break;
            case TT.INSTANCE:
            case TT.INTERFACE:
            case TT.CLASS:
                t1 = t[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp field is a method");
                    }
                    t1 = Any;
                }
                break;
            case TT.STRUCTURED_TYPE:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to structuredtype field is a method");
                    }
                    t1 = Any;
                }
                break;
            case TT.INDEX_MAP:
                tt = (<IndexMapType> t).key.tt;
                t1 = (<IndexMapType> t).value;
                if (tt === TT.NUMBER) {
                    fname = checkAndTag(f, Any, Num);
                } else {
                    if (objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to indexMap, field is a method");
                    }
                }
                break;
            default:
                throw new Error("Impossible");
        }

        if (!(t1 === Num || t1 === Any)) { //TODO: can be a dot any and dot num too
            throw new Error("assignmentWithUnaryOp field type is non-any and non-number");
        }

        switch (op) {
            case "PreIncrementExpression":
                return ++o[fname];
            case "PreDecrementExpression":
                return --o[fname];
            case "PostIncrementExpression":
                return o[fname]++;
            case "PostDecrementExpression":
                return o[fname]--;
            default:
                throw new Error("Impossible");
        }
    }

    export function assignmentWithOp(op: string, o: WithRTTI, from: RTTI, f: any, v: any): WithRTTI {
        if (!o) {
            throw new Error("assignmentWithUnaryOp on null/undefined/0");
        }

        var t_o = o.__rtti__ || getTag(o) || Any;
        var tt = t_o.tt;
        var t = tt === TT.ANY ? from : t_o;
        var t1: RTTI;

        var fname: any = f + "";

        switch (t.tt) {
            case TT.ARRAY:
                if (fname === "length") {
                    t1 = Num;
                } else {
                    t1 = (<ArrayType> t).elt;
                    fname = checkAndTag(f, Any, Num);
                }
                break;
            case TT.INSTANCE:
            case TT.INTERFACE:
            case TT.CLASS:
                t1 = t[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp field is a method");
                    }
                    t1 = Any;
                }
                break;
            case TT.STRUCTURED_TYPE:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to structuredtype field is a method");
                    }
                    t1 = Any;
                }
                break;
            case TT.INDEX_MAP:
                tt = (<IndexMapType> t).key.tt;
                t1 = (<IndexMapType> t).value;
                if (tt === TT.NUMBER) {
                    fname = checkAndTag(f, Any, Num);
                } else {
                    if (objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to indexMap, field is a method");
                    }
                }
                break;
            default:
                throw new Error("Impossible");
        }

        if (op === "AddAssignmentExpression") {
            var val: any = o[fname] + v;
            if (t1 === Num) {
                if ((val.__rtti__ || getTag(val)) !== Num) {
                    throw new Error("assignmentWithOp add error, expected a number");
                } else {
                    return (o[fname] = val);
                }
            } else if (t1 === Str || t1 === Any) {
                return (o[fname] = val);
            } else {
                throw new Error("assignmentWithOp add error, field not a number/any/string");
            }
        }

        if (!(t1 === Num || t1 === Any)) {
            throw new Error("assignmentWithOp non-add op field type is not any or number");
        }

        switch (op) {
            case "SubtractAssignmentExpression":
                return (o[fname] -= v);
            case "MultiplyAssignmentExpression":
                return (o[fname] *= v);
            case "DivideAssignmentExpression":
                return (o[fname] /= v);
            case "ModuloAssignmentExpression":
                return (o[fname] %= v);
            case "AndAssignmentExpression":
                return (o[fname] &= v);
            case "ExclusiveOrAssignmentExpression":
                return (o[fname] ^= v);
            case "OrAssignmentExpression":
                return (o[fname] |= v);
            case "LeftShiftAssignmentExpression":
                return (o[fname] <<= v);
            case "SignedRightShiftAssignmentExpression":
                return (o[fname] >>= v);
            case "UnsignedRightShiftAssignmentExpression":
                return (o[fname] >>>= v);
            default:
                throw new Error("assignmentExpression: unidentified op: " + op);
        }
    }

    export function setTag(v: WithRTTI, t: RTTI): WithRTTI {
        setRtti(v, t);
        return v;
    }
}
