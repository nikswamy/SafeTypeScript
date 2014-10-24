var RT;
(function (RT) {
    function getEmptyArray() {
        return [];
    }
    RT.getEmptyArray = getEmptyArray;
    function createEmptyMap() {
        var o = {};
        o.__proto__ = null;
        return o;
    }
    RT.createEmptyMap = createEmptyMap;
    function __forceCheckedArray(c, t) {
        return RT.checkAndTag(c, RT.Any, RT.ArrayType(t));
    }
    RT.__forceCheckedArray = __forceCheckedArray;
    function forceCheckedArray(c) {
        return c;
    }
    RT.forceCheckedArray = forceCheckedArray;
    function applyVariadic(o, m, args) {
        var f = o[m];
        return f.apply(o, args);
    }
    RT.applyVariadic = applyVariadic;
    function printTag(o) {
        console.log(RT.prettyprint_t((o.__rtti__)));
    }
    RT.printTag = printTag;
})(RT || (RT = {}));
var RT;
(function (RT) {
    function assert(b, m) {
        if (!b) {
            throw new Error("assert failure: " + m);
        }
    }
    function die(msg) {
        throw new Error(msg);
    }
    RT.die = die;
    (function (TT) {
        TT[TT["ANY"] = 0] = "ANY";
        TT[TT["NUMBER"] = 1] = "NUMBER";
        TT[TT["STRING"] = 2] = "STRING";
        TT[TT["BOOLEAN"] = 3] = "BOOLEAN";
        TT[TT["VOID"] = 4] = "VOID";
        TT[TT["ARRAY"] = 5] = "ARRAY";
        TT[TT["INSTANCE"] = 6] = "INSTANCE";
        TT[TT["INTERFACE"] = 7] = "INTERFACE";
        TT[TT["CLASS"] = 8] = "CLASS";
        TT[TT["INDEX_MAP"] = 9] = "INDEX_MAP";
        TT[TT["STRUCTURED_TYPE"] = 10] = "STRUCTURED_TYPE";
        TT[TT["JUST_TYPE"] = 11] = "JUST_TYPE";
        TT[TT["UN"] = 12] = "UN";
    })(RT.TT || (RT.TT = {}));
    var TT = RT.TT;
    function eqOptionalMap(m1, m2) {
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
    function prettyprint_a(a) {
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
    function prettyprint_t(t) {
        if (isZero(t)) {
            return "zero";
        }
        switch (t.tt) {
            case 12 /* UN */:
                return "Un";
            case 0 /* ANY */:
                return "any";
            case 5 /* ARRAY */:
                return prettyprint_t(t.elt) + "[]";
            case 3 /* BOOLEAN */:
                return "boolean";
            case 8 /* CLASS */:
                return t.name + "_Class";
            case 9 /* INDEX_MAP */:
                return "[_:" + prettyprint_t(t.key) + "] :" + prettyprint_t(t.value);
            case 6 /* INSTANCE */:
                return t.name;
            case 7 /* INTERFACE */:
                return t.name;
            case 11 /* JUST_TYPE */:
                return "dot " + prettyprint_t(t.base);
            case 1 /* NUMBER */:
                return "number";
            case 2 /* STRING */:
                return "string";
            case 10 /* STRUCTURED_TYPE */:
                var s = "{ ";
                var first = true;
                var methods = t.methodTable;
                for (var m in methods) {
                    if (!first) {
                        s += ", ";
                    }
                    else {
                        first = false;
                    }
                    s += m + ":" + prettyprint_a(methods[m]);
                }
                var flds = t.fieldTable;
                first = true;
                s += ", ";
                for (var f in flds) {
                    if (!first) {
                        s += ", ";
                    }
                    else {
                        first = false;
                    }
                    s += f + ":" + prettyprint_t(flds[f]);
                }
                return (s += " }");
            case 4 /* VOID */:
                return "void";
        }
        throw new Error("Impossible");
    }
    RT.prettyprint_t = prettyprint_t;
    function InstanceRepr(name, methods, fields, extendsList, functionObject, implementsList) {
        return { kind: 6 /* INSTANCE */, name: name, methods: methods, fields: fields, extendsList: extendsList, functionObject: functionObject, implementsList: implementsList };
    }
    RT.InstanceRepr = InstanceRepr;
    function ClassRepr(name, methods, fields, extendsList, constr) {
        return { kind: 8 /* CLASS */, name: name, methods: methods, fields: fields, extendsList: extendsList, constr: constr };
    }
    RT.ClassRepr = ClassRepr;
    function InterfaceRepr(name, methods, fields, extendsList, nominal) {
        if (nominal === void 0) { nominal = false; }
        return { kind: 7 /* INTERFACE */, name: name, methods: methods, fields: fields, extendsList: extendsList };
    }
    RT.InterfaceRepr = InterfaceRepr;
    var registry = Object.create(null);
    RT.objectMethods;
    function registerType(repr) {
        var name = repr.name;
        if (registry[name]) {
            throw new Error("Named type " + repr.name + " is already defined");
        }
        if (name === "String") {
            RT.Str.methodTable = repr.methods;
        }
        else if (name === "Object") {
            RT.objectMethods = repr.methods;
        }
        else if (name === "Number") {
            RT.Num.methodTable = repr.methods;
        }
        else {
            var named_type = namedTypesCache[name];
            if (!named_type) {
                if (repr.kind === 7 /* INTERFACE */) {
                    named_type = InterfaceType(name);
                }
                else if (repr.kind === 8 /* CLASS */) {
                    named_type = ClassType(name);
                }
                else if (repr.kind === 6 /* INSTANCE */) {
                    named_type = InstanceType(name);
                }
            }
            named_type.fieldTable = repr.fields;
            named_type.methodTable = repr.methods;
            named_type.structuredType = StructuredType(repr.methods, repr.fields);
            named_type.structuredType.immutable = true;
            named_type.extendsList = repr.extendsList;
            if (repr.kind === 8 /* CLASS */) {
                named_type.constr = repr.constr;
            }
            else if (repr.kind === 6 /* INSTANCE */) {
                named_type.implementsList = repr.implementsList;
                named_type.functionObject = repr.functionObject;
            }
        }
        registry[name] = true;
    }
    RT.registerType = registerType;
    function registerClass(className, methods, fields, extendsC, implementsI, staticMethods, staticFields, constructorType, functionObject) {
        var instanceObject = InstanceRepr(className, methods, fields, (extendsC ? [extendsC] : []), functionObject, implementsI);
        var classObject = ClassRepr(className + "Class", staticMethods, staticFields, [], constructorType);
        registerType(instanceObject);
        registerType(classObject);
        return ClassType(className);
    }
    RT.registerClass = registerClass;
    var emptyFieldTable = RT.createEmptyMap();
    var emptyMethodTable = RT.createEmptyMap();
    RT.Un = {
        tt: 12 /* UN */,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable
    };
    RT.Any = {
        tt: 0 /* ANY */,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable
    };
    RT.Num = {
        tt: 1 /* NUMBER */,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable
    };
    RT.Bool = {
        tt: 3 /* BOOLEAN */,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable
    };
    RT.Str = {
        tt: 2 /* STRING */,
        fieldTable: { "length": RT.Num },
        methodTable: emptyMethodTable
    };
    RT.Void = {
        tt: 4 /* VOID */,
        fieldTable: emptyFieldTable,
        methodTable: emptyMethodTable
    };
    var _;
    _ = Number.prototype.__rtti__ = RT.Num;
    _ = Boolean.prototype.__rtti__ = RT.Bool;
    _ = String.prototype.__rtti__ = RT.Str;
    _ = Object.prototype.__rtti__ = RT.Any;
    var namedTypesCache = {};
    function getNamedType(name, tt) {
        if (namedTypesCache[name]) {
            return namedTypesCache[name];
        }
        else {
            return (namedTypesCache[name] = { tt: tt, name: name, fieldTable: emptyFieldTable, methodTable: emptyMethodTable, structuredType: undefined });
        }
    }
    function InterfaceType(name) {
        return getNamedType(name, 7 /* INTERFACE */);
    }
    RT.InterfaceType = InterfaceType;
    function InstanceType(name) {
        return getNamedType(name, 6 /* INSTANCE */);
    }
    RT.InstanceType = InstanceType;
    function ClassType(name) {
        return getNamedType(name + "Class", 8 /* CLASS */);
    }
    RT.ClassType = ClassType;
    function StructuredType(methods, fields) {
        methods.__proto__ = null;
        fields.__proto__ = null;
        return { tt: 10 /* STRUCTURED_TYPE */, methodTable: methods, fieldTable: fields };
    }
    RT.StructuredType = StructuredType;
    function JustType(t) {
        return { tt: 11 /* JUST_TYPE */, base: t, fieldTable: emptyFieldTable, methodTable: emptyMethodTable };
    }
    RT.JustType = JustType;
    function IndexMapType(key, value) {
        return { tt: 9 /* INDEX_MAP */, key: key, value: value, fieldTable: emptyFieldTable, methodTable: emptyMethodTable };
    }
    RT.IndexMapType = IndexMapType;
    function ArrayType(elt) {
        return { tt: 5 /* ARRAY */, elt: elt, fieldTable: { "length": RT.Num }, methodTable: emptyMethodTable };
    }
    RT.ArrayType = ArrayType;
    function ArrowType(args, result, varargs, mandatoryArgs) {
        var arrow = {
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
    RT.ArrowType = ArrowType;
    function LambdaType(arg, ret, varargs, mandatoryArgs) {
        return StructuredType({ "<call>": ArrowType(arg, ret, varargs, mandatoryArgs) }, {});
    }
    RT.LambdaType = LambdaType;
    function RecordType(flds) {
        return StructuredType({}, flds);
    }
    RT.RecordType = RecordType;
    var NameRelation;
    (function (NameRelation) {
        NameRelation[NameRelation["SUBTYPE"] = 0] = "SUBTYPE";
        NameRelation[NameRelation["EQUALITY"] = 1] = "EQUALITY";
    })(NameRelation || (NameRelation = {}));
    function extendContext(cxt, t1, t2, reln) {
        var n_cxt = {};
        for (var f in cxt) {
            n_cxt[f] = cxt[f];
        }
        var s = (reln === 0 /* SUBTYPE */) ? " <: " : " = ";
        n_cxt[t1.name + s + t2.name] = true;
        if (reln === 1 /* EQUALITY */) {
            n_cxt[t2.name + s + t1.name] = true;
        }
        return n_cxt;
    }
    function inContext(cxt, t1, t2, reln) {
        var s = (reln === 0 /* SUBTYPE */) ? " <: " : " = ";
        return cxt[t1.name + s + t2.name] === true;
    }
    var namedTypeRelationRegistry = (function () {
        var r = {};
        r.__proto__ = null;
        return r;
    })();
    function addToNamedTypeRelationRegistry(t1, t2, reln, d) {
        var s = (reln === 0 /* SUBTYPE */) ? " <: " : " = ";
        namedTypeRelationRegistry[t1.name + s + t2.name] = d;
        if (reln === 1 /* EQUALITY */) {
            namedTypeRelationRegistry[t2.name + s + t1.name] = d;
        }
    }
    function inNamedTypeRelationRegistry(t1, t2, reln) {
        var s = (reln === 0 /* SUBTYPE */) ? t1.name + " <: " + t2.name : t1.name + " = " + t2.name;
        return (namedTypeRelationRegistry[s] ? { fst: true, snd: namedTypeRelationRegistry[s] } : { fst: false, snd: zero });
    }
    function subtype(t1, t2, cxt) {
        var sub;
        if (t1 === t2) {
            return { fst: true, snd: zero };
        }
        switch (t2.tt) {
            case 0 /* ANY */:
                switch (t1.tt) {
                    case 1 /* NUMBER */:
                    case 3 /* BOOLEAN */:
                    case 2 /* STRING */:
                    case 4 /* VOID */:
                    case 6 /* INSTANCE */:
                        return { fst: true, snd: zero };
                    case 7 /* INTERFACE */:
                    case 10 /* STRUCTURED_TYPE */:
                    case 5 /* ARRAY */:
                    case 9 /* INDEX_MAP */:
                    case 8 /* CLASS */:
                        return { fst: true, snd: t1 };
                    default:
                        return { fst: false, snd: zero };
                }
            case 6 /* INSTANCE */:
                if (t1.tt === 6 /* INSTANCE */) {
                    return {
                        fst: t1.functionObject.prototype instanceof t2.functionObject,
                        snd: zero
                    };
                }
                else {
                    return { fst: false, snd: zero };
                }
            case 4 /* VOID */:
                return { fst: true, snd: zero };
            case 7 /* INTERFACE */:
                switch (t1.tt) {
                    case 7 /* INTERFACE */:
                        if (t1.extendsList.indexOf(t2.name) !== -1) {
                            return { fst: true, snd: t1 };
                        }
                        if ((sub = inNamedTypeRelationRegistry(t1, t2, 0 /* SUBTYPE */)) && sub.fst) {
                            return sub;
                        }
                        if (inContext(cxt, t1, t2, 0 /* SUBTYPE */)) {
                            return { fst: true, snd: zero };
                        }
                        if (equalTypes(t1, t2, cxt)) {
                            return { fst: true, snd: zero };
                        }
                        sub = subtype(t1.structuredType, t2.structuredType, extendContext(cxt, t1, t2, 0 /* SUBTYPE */));
                        if (sub.fst) {
                            addToNamedTypeRelationRegistry(t1, t2, 0 /* SUBTYPE */, sub.snd);
                        }
                        return sub;
                    case 10 /* STRUCTURED_TYPE */:
                        return subtype(t1, t2.structuredType, cxt);
                    case 6 /* INSTANCE */:
                        if (t1.implementsList.indexOf(t2.name) !== -1) {
                            return { fst: true, snd: zero };
                        }
                        if ((sub = inNamedTypeRelationRegistry(t1, t2, 0 /* SUBTYPE */)) && sub.fst) {
                            return sub;
                        }
                        if (inContext(cxt, t1, t2, 0 /* SUBTYPE */)) {
                            return { fst: true, snd: zero };
                        }
                        sub = subtype(t1.structuredType, t2.structuredType, extendContext(cxt, t1, t2, 0 /* SUBTYPE */));
                        if (sub.fst) {
                            addToNamedTypeRelationRegistry(t1, t2, 0 /* SUBTYPE */, sub.snd);
                        }
                        return sub;
                    default:
                        return { fst: false, snd: zero };
                }
            case 5 /* ARRAY */:
                if (t1.tt === 5 /* ARRAY */) {
                    return { fst: equalTypes(t1.elt, t2.elt, cxt), snd: zero };
                }
                else {
                    return { fst: false, snd: zero };
                }
            case 9 /* INDEX_MAP */:
                if (t1.tt === 9 /* INDEX_MAP */) {
                    return { fst: equalTypes(t1.key, t2.key, cxt) && equalTypes(t1.value, t2.value, cxt), snd: zero };
                }
                else {
                    return { fst: false, snd: zero };
                }
            case 10 /* STRUCTURED_TYPE */:
                switch (t1.tt) {
                    case 7 /* INTERFACE */:
                        return subtype(t1.structuredType, t2, cxt);
                    case 6 /* INSTANCE */:
                        return { fst: subtype(t1.structuredType, t2, cxt).fst, snd: zero };
                    case 10 /* STRUCTURED_TYPE */:
                        var flds1 = t1.fieldTable;
                        var flds2 = t2.fieldTable;
                        var methods1 = t1.methodTable;
                        var methods2 = t2.methodTable;
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
                        var forgotten_flds = {};
                        var optional_flds = {};
                        var forgotten_methods = {};
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
                        }
                        else {
                            return { fst: true, snd: StructuredType(forgotten_methods, forgotten_flds) };
                        }
                    default:
                        return { fst: false, snd: zero };
                }
            case 11 /* JUST_TYPE */:
                return { fst: subtype(t1.tt === 11 /* JUST_TYPE */ ? t1.base : t1, t2.base, cxt).fst, snd: zero };
            default:
        }
        return { fst: false, snd: zero };
    }
    function isZeroSubtype(t1, t2) {
        var bd = subtype(t1, t2, {});
        return (bd.fst && isZero(bd.snd));
    }
    function isSubtype(t1, t2) {
        return subtype(t1, t2, {}).fst;
    }
    function isArrowSubtype(t1, t2, cxt) {
        if (!(t1.args.length === t2.args.length) || !(t1.mandatoryArgs === t2.mandatoryArgs)) {
            return false;
        }
        var sub;
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
    function isArrowEqual(t1, t2, cxt) {
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
    var zero = undefined;
    function isZero(d) {
        return d === zero;
    }
    function equalTypes(t1, t2, cxt) {
        var eqflds = function (flds1, flds2) {
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
        var eqmethods = function (methods1, methods2) {
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
            case 5 /* ARRAY */:
                return equalTypes(t1.elt, t2.elt, cxt);
            case 6 /* INSTANCE */:
            case 8 /* CLASS */:
                return t1.name === t2.name;
            case 7 /* INTERFACE */:
                if (t1.name === t2.name) {
                    return true;
                }
                if (inNamedTypeRelationRegistry(t1, t2, 1 /* EQUALITY */).fst) {
                    return true;
                }
                if (inContext(cxt, t1, t2, 1 /* EQUALITY */)) {
                    return true;
                }
                var b = equalTypes(t1.structuredType, t2.structuredType, extendContext(cxt, t1, t2, 1 /* EQUALITY */));
                if (b) {
                    addToNamedTypeRelationRegistry(t1, t2, 1 /* EQUALITY */, zero);
                }
                return b;
            case 9 /* INDEX_MAP */:
                return equalTypes(t1.key, t1.key, cxt) && equalTypes(t1.value, t1.value, cxt);
            case 11 /* JUST_TYPE */:
                return equalTypes(t1.base, t2.base, cxt);
            case 10 /* STRUCTURED_TYPE */:
                return eqflds(t1.fieldTable, t2.fieldTable) && eqmethods(t1.methodTable, t2.methodTable);
            default:
                throw new Error("Impossible");
        }
    }
    function primitive(t) {
        var k = t.tt;
        return k === 1 /* NUMBER */ || k === 2 /* STRING */ || k === 3 /* BOOLEAN */ || k === 4 /* VOID */;
    }
    function clone(t) {
        var new_flds = {};
        var new_methods = {};
        var key;
        var keys;
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
    function combine(t1, t2) {
        if (t1.tt === 0 /* ANY */) {
            return t2;
        }
        switch (t2.tt) {
            case 3 /* BOOLEAN */:
            case 2 /* STRING */:
            case 1 /* NUMBER */:
            case 4 /* VOID */:
            case 6 /* INSTANCE */:
            case 0 /* ANY */:
            case 8 /* CLASS */:
            case 9 /* INDEX_MAP */:
            case 5 /* ARRAY */:
                return t1;
            case 7 /* INTERFACE */:
                switch (t1.tt) {
                    case 7 /* INTERFACE */:
                        var sub;
                        if (t1.name === t2.name) {
                            return t1;
                        }
                        if (t1.extendsList.indexOf(t2.name) !== -1) {
                            return t1;
                        }
                        if ((sub = inNamedTypeRelationRegistry(t1, t2, 0 /* SUBTYPE */)) && sub.fst) {
                            return t1;
                        }
                        return combine(t1.structuredType, t2.structuredType);
                    case 10 /* STRUCTURED_TYPE */:
                        return combine(t1, t2.structuredType);
                    case 8 /* CLASS */:
                    case 6 /* INSTANCE */:
                    case 2 /* STRING */:
                        return t1;
                    default:
                        throw new Error("Impossible");
                }
                throw new Error("Impossible");
            case 10 /* STRUCTURED_TYPE */:
                switch (t1.tt) {
                    case 6 /* INSTANCE */:
                    case 8 /* CLASS */:
                        return t1;
                    case 7 /* INTERFACE */:
                        return combine(t1.structuredType, t2);
                    case 10 /* STRUCTURED_TYPE */:
                        if (t1.immutable) {
                            t1 = clone(t1);
                        }
                        var f1 = t1.fieldTable;
                        var f2 = t2.fieldTable;
                        for (var f in f2) {
                            f1[f] = f2[f];
                        }
                        var m1 = t1.methodTable;
                        var m2 = t2.methodTable;
                        for (var m in m2) {
                            if (m1[m]) {
                            }
                            else {
                                m1[m] = m2[m];
                            }
                        }
                        return t1;
                    default:
                        throw new Error("Impossible");
                }
            default:
                throw new Error("Impossible");
        }
        throw new Error("Impossible");
    }
    function shallowTagSwap(t, o) {
        return shallowTag(o, t);
    }
    RT.shallowTagSwap = shallowTagSwap;
    function shallowTag(o, t) {
        if (!o || !t) {
            return o;
        }
        var t_o;
        switch (t.tt) {
            case 0 /* ANY */:
            case 6 /* INSTANCE */:
            case 1 /* NUMBER */:
            case 2 /* STRING */:
            case 3 /* BOOLEAN */:
            case 4 /* VOID */:
                return o;
            case 5 /* ARRAY */:
            case 9 /* INDEX_MAP */:
            case 8 /* CLASS */:
                o.__rtti__ = t;
                return o;
            case 7 /* INTERFACE */:
            case 10 /* STRUCTURED_TYPE */:
                t_o = o.__rtti__ || RT.Any;
                if (t_o.tt === 6 /* INSTANCE */ || t_o.tt === 7 /* INTERFACE */) {
                    return o;
                }
                o.__rtti__ = combine(t_o, t);
                return o;
            default:
                throw new Error("Impossible");
        }
        throw new Error("Impossible");
    }
    RT.shallowTag = shallowTag;
    function checkInstance(v, to) {
        if (v === undefined || v === null) {
            return { fst: true, snd: v };
        }
        var t_v = v.__rtti__ || RT.Any;
        if (t_v.name == to.name) {
            return { fst: true, snd: v };
        }
        if (v instanceof to.functionObject) {
            return { fst: true, snd: v };
        }
        return { fst: false, snd: undefined };
    }
    RT.checkInstance = checkInstance;
    function checkAndTag(v, from, to) {
        if (v === undefined || v === null) {
            return v;
        }
        var t_v = v.__rtti__ || RT.Any;
        if (from.tt === 11 /* JUST_TYPE */ || from.tt === 12 /* UN */) {
            throw new Error("checkAndTag from dot or un");
        }
        switch (to.tt) {
            case 3 /* BOOLEAN */:
            case 1 /* NUMBER */:
            case 2 /* STRING */:
            case 4 /* VOID */:
                if (t_v !== to) {
                    throw new Error("checkAndTag for primitive types mismatch: " + prettyprint_t(t_v) + " !== " + prettyprint_t(to));
                }
                return v;
            case 0 /* ANY */:
                if (from.tt === 11 /* JUST_TYPE */) {
                    throw new Error("checkAndTag to any undotted from check failure: " + prettyprint_t(from));
                }
                return v;
            case 6 /* INSTANCE */:
                if (t_v.name === to.name) {
                    return v;
                }
                if (!(v instanceof to.functionObject)) {
                    throw new Error("checkAndTag to instance type " + to.name + " instanceof check failed, it's a " + prettyprint_t(t_v));
                }
                return v;
            case 5 /* ARRAY */:
            case 8 /* CLASS */:
            case 9 /* INDEX_MAP */:
                t_v = t_v === RT.Any ? from : t_v;
                if (!(equalTypes(t_v, to, {}))) {
                    throw new Error("checkAndTag to fixed type failure: " + prettyprint_t(combine(t_v, from)) + " </: " + prettyprint_t(to));
                }
                return v;
            case 7 /* INTERFACE */:
                switch (t_v.tt) {
                    case 6 /* INSTANCE */:
                        if (!(isZeroSubtype(t_v, to))) {
                            throw new Error("checkAndTag to interface for a class instance must be subtype: " + prettyprint_t(t_v) + " </: " + prettyprint_t(to));
                        }
                        return v;
                    case 7 /* INTERFACE */:
                        var sub;
                        if (t_v.name === to.name) {
                            return v;
                        }
                        if (t_v.extendsList.indexOf(to.name) !== -1) {
                            return v;
                        }
                        if ((sub = inNamedTypeRelationRegistry(t_v, to, 0 /* SUBTYPE */)) && sub.fst) {
                            return v;
                        }
                        return checkAndTag(v, from, to.structuredType);
                    default:
                        return checkAndTag(v, from, to.structuredType);
                }
                throw new Error("Impossible");
            case 10 /* STRUCTURED_TYPE */:
                var curr = t_v.tt === 10 /* STRUCTURED_TYPE */ ? combine(clone(t_v), from) : combine(t_v, from);
                var sub = subtype(curr, to, {});
                if (sub.fst) {
                    return shallowTag(v, sub.snd);
                }
                if ((t_v.tt === 6 /* INSTANCE */) || (t_v.tt === 8 /* CLASS */)) {
                    throw new Error("checkAndTag to structured type from a fixed type failure: " + prettyprint_t(t_v) + " being tagged to: " + prettyprint_t(to));
                }
                var to_flds = to.fieldTable;
                var overlapping_flds = {};
                var new_flds = {};
                for (var f in to_flds) {
                    if (curr.fieldTable[f]) {
                        if (!(equalTypes(curr.fieldTable[f], to_flds[f], {}))) {
                            throw new Error("checkAndTag to structured type field overlapping failure: " + prettyprint_t(curr.fieldTable[f]) + " != " + prettyprint_t(to_flds[f]));
                        }
                        overlapping_flds[f] = to_flds[f];
                    }
                    else {
                        new_flds[f] = to_flds[f];
                    }
                }
                sub = subtype(curr, StructuredType(to.methodTable, overlapping_flds), {});
                if (!(sub.fst)) {
                    throw new Error("checkAndTag to structured type subtyping from combine failure: " + prettyprint_t(curr) + " </: " + prettyprint_t(StructuredType(to.methodTable, overlapping_flds)));
                }
                shallowTag(v, sub.snd);
                v.__rtti__ = combine((v.__rtti__ || RT.Any), StructuredType({}, new_flds));
                for (f in new_flds) {
                    checkAndTag(v[f], RT.Any, new_flds[f]);
                }
                return v;
            case 11 /* JUST_TYPE */:
                return checkAndTag(v, from, to.base);
            default:
                throw new Error("Impossible");
        }
    }
    RT.checkAndTag = checkAndTag;
    function getFieldTypeOptim(t, o, f) {
        if (t) {
            if (t.tt === undefined || t.tt === 11 /* JUST_TYPE */) {
                throw new Error("readFieldOptim reading a method or field with dot type: " + prettyprint_t(t));
            }
            return t;
        }
        else {
            t = o.__rtti__;
            if (t.tt === 9 /* INDEX_MAP */) {
                if (t.key.tt === 1 /* NUMBER */) {
                    throw new Error("readFieldOptim index map index is number");
                }
                else {
                    t = t.value;
                    if (t.tt === 11 /* JUST_TYPE */) {
                        throw new Error("readFieldOptim index map value type dotted");
                    }
                    else {
                        return t;
                    }
                }
            }
            else {
                return RT.Any;
            }
        }
    }
    RT.getFieldTypeOptim = getFieldTypeOptim;
    function readField(o, from, f) {
        if (!o) {
            throw new Error("readField reading from undefined/null");
        }
        var t_o = o.__rtti__ || RT.Any;
        var tt = t_o.tt;
        var t = tt === 0 /* ANY */ ? from : t_o;
        var t1;
        var fname = f + "";
        switch (t.tt) {
            case 7 /* INTERFACE */:
            case 6 /* INSTANCE */:
            case 8 /* CLASS */:
                t1 = t.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("readField reading method (instance and interface)");
                    }
                    t1 = RT.Any;
                }
                else if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("readField from interface / instance reading dot type/un field");
                }
                return shallowTag(o[fname], t1);
            case 2 /* STRING */:
                if (fname === "length") {
                    return o.length;
                }
                throw new Error("reading a field other than length from string: " + fname);
            case 5 /* ARRAY */:
                if (fname === "length") {
                    return o.length;
                }
                t1 = t.elt;
                if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("array readField elt type is dotted/un: " + prettyprint_t(t1));
                }
                return shallowTag(o[checkAndTag(f, RT.Any, RT.Num)], t1);
            case 10 /* STRUCTURED_TYPE */:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("readField struct types reading method");
                    }
                    t1 = RT.Any;
                }
                else if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("readField from struct reading dot/un type field");
                }
                return shallowTag(o[fname], t1);
            case 0 /* ANY */:
                return o[fname];
            case 9 /* INDEX_MAP */:
                tt = t.key.tt;
                t1 = t.value;
                if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("indexMap readField value type not a subtype of any: " + prettyprint_t(t1));
                }
                if (tt === 1 /* NUMBER */) {
                    return shallowTag(o[checkAndTag(f, RT.Any, RT.Num)], t1);
                }
                else {
                    if (RT.objectMethods[fname]) {
                        throw new Error("readField for indexMap reading Object method: " + fname);
                    }
                    return shallowTag(o[fname], t1);
                }
        }
        throw new Error("Impossible");
    }
    RT.readField = readField;
    function writeField(o, from, f, v, tv) {
        if (!o) {
            throw new Error("writeField writing to undefined/null");
        }
        var t_o = o.__rtti__ || RT.Any;
        var tt = t_o.tt;
        var t = tt === 0 /* ANY */ ? from : t_o;
        var t1;
        var fname = f + "";
        switch (t.tt) {
            case 7 /* INTERFACE */:
            case 6 /* INSTANCE */:
            case 8 /* CLASS */:
                t1 = t.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("writeField writing method (instance and interface)");
                    }
                    t1 = RT.Any;
                }
                else if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("readField from interface / instance reading dot/un type field");
                }
                else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[fname] = v);
            case 5 /* ARRAY */:
                if (fname === "length") {
                    return (o.length = v);
                }
                if (f === undefined || f === null || f.__rtti__ !== RT.Num) {
                    throw new Error("array writeField f can only be Num");
                }
                t1 = t.elt;
                if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("array writeField elt type is dotted/un: " + prettyprint_t(t1));
                }
                else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[f] = v);
            case 10 /* STRUCTURED_TYPE */:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("writeField struct types writing method");
                    }
                    t1 = RT.Any;
                }
                else if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("writeField from struct writing dot/un type field");
                }
                else {
                    v = checkAndTag(v, tv, t1);
                }
                return (o[fname] = v);
            case 0 /* ANY */:
                return (o[fname] = v);
            case 9 /* INDEX_MAP */:
                tt = t.key.tt;
                t1 = t.value;
                if (t1.tt === 11 /* JUST_TYPE */ || t1.tt === 12 /* UN */) {
                    throw new Error("indexMap writeField value type is dotted/un: " + prettyprint_t(t1));
                }
                else {
                    v = checkAndTag(v, tv, t1);
                }
                if (tt === 1 /* NUMBER */) {
                    if (f === undefined || f === null || f.__rtti__ !== RT.Num) {
                        throw new Error("Indexmap writeField number index error");
                    }
                    return (o[f] = v);
                }
                else {
                    if (RT.objectMethods[fname]) {
                        throw new Error("writeField for indexMap writing Object method: " + fname);
                    }
                    return (o[fname] = v);
                }
        }
        throw new Error("Impossible");
    }
    RT.writeField = writeField;
    function resolveMethod(o, from, mname) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("resolveMethod for undefined/null");
        }
        var t_o = o.__rtti__ || RT.Any;
        return t_o.methodTable[mname] || RT.objectMethods[mname] || from.methodTable[mname];
    }
    function callMethod(o, from, m, args, argTypes) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callMethod calling from undefined/null");
        }
        var t_o = o.__rtti__ || RT.Any;
        var t = from.tt === 0 /* ANY */ ? t_o : from;
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            return callFunction(readField(o, from, m), RT.Any, args, argTypes);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callMethod return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) {
            throw new Error("callMethod did not provide all mandatory arguments");
        }
        else if (args.length < t1.mandatoryArgs) {
            throw new Error("callMethod did not provide all mandatory arguments(2)");
        }
        var i;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]);
        }
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
        throw new Error("Impossible");
    }
    RT.callMethod = callMethod;
    function checkMethodArgs(o, from, m, args, argTypes) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("checkMethodArgs calling from undefined/null");
        }
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs(readField(o, from, m), args, argTypes);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("checkMethodArgs return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) {
            throw new Error("checkMethodArgs did not provide all mandatory arguments");
        }
        else if (args.length < t1.mandatoryArgs) {
            throw new Error("checkMethodArgs did not provide all mandatory arguments(2)");
        }
        var i;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]);
        }
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
    RT.checkMethodArgs = checkMethodArgs;
    function checkMethodArgs0(o, from, m) {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs0(readField(o, from, m));
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("checkMethodArgs0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs) {
            throw new Error("checkMethodArgs0 did not provide all mandatory arguments");
        }
        return t1.result;
    }
    RT.checkMethodArgs0 = checkMethodArgs0;
    function checkMethodArgs1(o, from, m, arg1, argType1) {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs1(readField(o, from, m), arg1, argType1);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("checkMethodArgs1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 1) {
            throw new Error("checkMethodArgs1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        }
        else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("checkMethodArgs1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return t1.result;
    }
    RT.checkMethodArgs1 = checkMethodArgs1;
    function checkMethodArgs2(o, from, m, arg1, arg2, argType1, argType2) {
        var t1 = resolveMethod(o, from, m);
        if (t1 === undefined) {
            return checkFunctionArgs2(readField(o, from, m), arg1, arg2, argType1, argType2);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("checkMethodArgs2 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 2) {
            throw new Error("checkMethodArgs2 did not provide all mandatory arguments");
        }
        var varargs_t;
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
    RT.checkMethodArgs2 = checkMethodArgs2;
    function checkMethodArgs3(o, from, m, arg1, arg2, arg3, argType1, argType2, argType3) {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    RT.checkMethodArgs3 = checkMethodArgs3;
    function checkMethodArgs4(o, from, m, arg1, arg2, arg3, arg4, argType1, argType2, argType3, argType4) {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    RT.checkMethodArgs4 = checkMethodArgs4;
    function checkMethodArgs5(o, from, m, arg1, arg2, arg3, arg4, arg5, argType1, argType2, argType3, argType4, argType5) {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    RT.checkMethodArgs5 = checkMethodArgs5;
    function checkMethodArgs6(o, from, m, arg1, arg2, arg3, arg4, arg5, arg6, argType1, argType2, argType3, argType4, argType5, argType6) {
        return checkMethodArgs(o, from, m, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }
    RT.checkMethodArgs6 = checkMethodArgs6;
    function checkFunctionArgs(o, args, argTypes) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("checkFunctionArgs calling from undefined/null");
        }
        var t_o = o.__rtti__ || RT.Any;
        var t1 = t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("checkFunctionArgs <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("checkFunctionArgs return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) {
            throw new Error("checkFunctionArgs did not provide all mandatory arguments");
        }
        else if (args.length < t1.mandatoryArgs) {
            throw new Error("checkFunctionArgs did not provide all mandatory arguments(2)");
        }
        var i;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], argTypes[i], t1.args[i]);
        }
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
    RT.checkFunctionArgs = checkFunctionArgs;
    function checkFunctionArgs0(o) {
        return checkFunctionArgs(o, [], []);
    }
    RT.checkFunctionArgs0 = checkFunctionArgs0;
    function checkFunctionArgs1(o, arg1, argType1) {
        return checkFunctionArgs(o, [arg1], [argType1]);
    }
    RT.checkFunctionArgs1 = checkFunctionArgs1;
    function checkFunctionArgs2(o, arg1, arg2, argType1, argType2) {
        return checkFunctionArgs(o, [arg1, arg2], [argType1, argType2]);
    }
    RT.checkFunctionArgs2 = checkFunctionArgs2;
    function checkFunctionArgs3(o, arg1, arg2, arg3, argType1, argType2, argType3) {
        return checkFunctionArgs(o, [arg1, arg2, arg3], [argType1, argType2, argType3]);
    }
    RT.checkFunctionArgs3 = checkFunctionArgs3;
    function checkFunctionArgs4(o, arg1, arg2, arg3, arg4, argType1, argType2, argType3, argType4) {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    RT.checkFunctionArgs4 = checkFunctionArgs4;
    function checkFunctionArgs5(o, arg1, arg2, arg3, arg4, arg5, argType1, argType2, argType3, argType4, argType5) {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    RT.checkFunctionArgs5 = checkFunctionArgs5;
    function checkFunctionArgs6(o, arg1, arg2, arg3, arg4, arg5, arg6, argType1, argType2, argType3, argType4, argType5, argType6) {
        return checkFunctionArgs(o, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }
    RT.checkFunctionArgs6 = checkFunctionArgs6;
    function callMethod0(o, from, m) {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            return callFunction0(readField(o, from, m), RT.Any);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callMethod0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs) {
            throw new Error("callMethod0 did not provide all mandatory arguments");
        }
        return shallowTag(o[mname](), t1.result);
    }
    RT.callMethod0 = callMethod0;
    function callMethod1(o, from, m, arg1, argType1) {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            return callFunction1(readField(o, from, m), RT.Any, arg1, argType1);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callMethod1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 1) {
            throw new Error("callMethod1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        }
        else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("callMethod1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return shallowTag(o[mname](arg1), t1.result);
    }
    RT.callMethod1 = callMethod1;
    function callMethod2(o, from, m, arg1, arg2, argType1, argType2) {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            return callFunction2(readField(o, from, m), RT.Any, arg1, arg2, argType1, argType2);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callMethod2 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 2) {
            throw new Error("callMethod2 did not provide all mandatory arguments");
        }
        var varargs_t;
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
    }
    RT.callMethod2 = callMethod2;
    function callMethod3(o, from, m, arg1, arg2, arg3, argType1, argType2, argType3) {
        var mname = m + "";
        var t1 = resolveMethod(o, from, mname);
        if (t1 === undefined) {
            return callFunction3(readField(o, from, m), RT.Any, arg1, arg2, arg3, argType1, argType2, argType3);
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callMethod3 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 3) {
            throw new Error("callMethod3 did not provide all mandatory arguments");
        }
        var varargs_t;
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
    }
    RT.callMethod3 = callMethod3;
    function callMethod4(o, from, m, arg1, arg2, arg3, arg4, argType1, argType2, argType3, argType4) {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    RT.callMethod4 = callMethod4;
    function callMethod5(o, from, m, arg1, arg2, arg3, arg4, arg5, argType1, argType2, argType3, argType4, argType5) {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    RT.callMethod5 = callMethod5;
    function callMethod6(o, from, m, arg1, arg2, arg3, arg4, arg5, arg6, argType1, argType2, argType3, argType4, argType5, argType6) {
        return callMethod(o, from, m, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }
    RT.callMethod6 = callMethod6;
    function callFunction(o, t_o, args, t_args) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction calling from undefined/null");
        }
        var t1 = (o.__rtti__ && o.__rtti__.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callFunction return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs === undefined && args.length !== t1.args.length) {
            throw new Error("callFunction did not provide all mandatory arguments");
        }
        else if (args.length < t1.mandatoryArgs) {
            throw new Error("callFunction did not provide all mandatory arguments(2)");
        }
        var i;
        var length = t1.args.length;
        for (i = 0; i < length; ++i) {
            checkAndTag(args[i], t_args[i], t1.args[i]);
        }
        if (args.length > i) {
            if (t1.varargs === undefined) {
                throw new Error("callFunction extra arguments provided to a non variadic method call");
            }
            for (; i < args.length; ++i) {
                checkAndTag(args[i], t_args[i], t1.varargs);
            }
        }
        if (args.length == 0) {
            return shallowTag(o(), t1.result);
        }
        else if (args.length == 1) {
            return shallowTag(o(args[0]), t1.result);
        }
        else if (args.length == 2) {
            return shallowTag(o(args[0], args[1]), t1.result);
        }
        else if (args.length == 3) {
            return shallowTag(o(args[0], args[1], args[2]), t1.result);
        }
        else if (args.length == 4) {
            return shallowTag(o(args[0], args[1], args[2], args[3]), t1.result);
        }
        else if (args.length == 5) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4]), t1.result);
        }
        else if (args.length == 6) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4], args[5]), t1.result);
        }
        else if (args.length == 7) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4], args[5], args[6]), t1.result);
        }
        else if (args.length == 8) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]), t1.result);
        }
        else if (args.length == 9) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]), t1.result);
        }
        else if (args.length == 10) {
            return shallowTag(o(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]), t1.result);
        }
        else {
            throw new Error("callFunction only defined for upto 10 arguments");
        }
        throw new Error("Impossible");
    }
    RT.callFunction = callFunction;
    function callFunction0(o, t_o) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }
        var t1 = (o.__rtti__ && o.__rtti__.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction0 <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callFunction0 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs) {
            throw new Error("callFunction0 did not provide all mandatory arguments");
        }
        return shallowTag(o(), t1.result);
    }
    RT.callFunction0 = callFunction0;
    function callFunction1(o, t_o, arg1, argType1) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }
        var t1 = (o.__rtti__ && o.__rtti__.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 1) {
            throw new Error("callFunction1 did not provide all mandatory arguments");
        }
        if (t1.args.length > 0) {
            checkAndTag(arg1, argType1, t1.args[0]);
        }
        else {
            var varargs_t = t1.varargs;
            if (varargs_t === undefined) {
                throw new Error("callFunction1 extra arguments provided to a non variadic method call");
            }
            checkAndTag(arg1, argType1, varargs_t);
        }
        return shallowTag(o(arg1), t1.result);
    }
    RT.callFunction1 = callFunction1;
    function callFunction2(o, t_o, arg1, arg2, argType1, argType2) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }
        var t1 = (o.__rtti__ && o.__rtti__.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 2) {
            throw new Error("callMethod2 did not provide all mandatory arguments");
        }
        var varargs_t;
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
        return shallowTag(o(arg1, arg2), t1.result);
    }
    RT.callFunction2 = callFunction2;
    function callFunction3(o, t_o, arg1, arg2, arg3, argType1, argType2, argType3) {
        if (!o && (o === null || o === undefined)) {
            throw new Error("callFunction0 calling from undefined/null");
        }
        var t1 = (o.__rtti__ && o.__rtti__.methodTable["<call>"]) || t_o.methodTable["<call>"];
        if (t1 === undefined) {
            throw new Error("callFunction1 <call> method not found");
        }
        if (t1.result.tt === 11 /* JUST_TYPE */ || t1.result.tt === 12 /* UN */) {
            throw new Error("callFunction1 return type is not a subtype of any: " + prettyprint_t(t1.result));
        }
        if (t1.mandatoryArgs > 3) {
            throw new Error("callMethod3 did not provide all mandatory arguments");
        }
        var varargs_t;
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
        return shallowTag(o(arg1, arg2, arg3), t1.result);
    }
    RT.callFunction3 = callFunction3;
    function callFunction4(o, from, arg1, arg2, arg3, arg4, argType1, argType2, argType3, argType4) {
        return callFunction(o, from, [arg1, arg2, arg3, arg4], [argType1, argType2, argType3, argType4]);
    }
    RT.callFunction4 = callFunction4;
    function callFunction5(o, from, arg1, arg2, arg3, arg4, arg5, argType1, argType2, argType3, argType4, argType5) {
        return callFunction(o, from, [arg1, arg2, arg3, arg4, arg5], [argType1, argType2, argType3, argType4, argType5]);
    }
    RT.callFunction5 = callFunction5;
    function callFunction6(o, from, arg1, arg2, arg3, arg4, arg5, arg6, argType1, argType2, argType3, argType4, argType5, argType6) {
        return callFunction(o, from, [arg1, arg2, arg3, arg4, arg5, arg6], [argType1, argType2, argType3, argType4, argType5, argType6]);
    }
    RT.callFunction6 = callFunction6;
    function assignmentWithUnaryOp(op, o, from, f) {
        if (!o) {
            throw new Error("assignmentWithUnaryOp on null/undefined/0");
        }
        var t_o = o.__rtti__ || RT.Any;
        var tt = t_o.tt;
        var t = tt === 0 /* ANY */ ? from : t_o;
        var t1;
        var fname = f + "";
        switch (t.tt) {
            case 5 /* ARRAY */:
                if (fname === "length") {
                    t1 = RT.Num;
                }
                else {
                    t1 = t.elt;
                    fname = checkAndTag(f, RT.Any, RT.Num);
                }
                break;
            case 6 /* INSTANCE */:
            case 7 /* INTERFACE */:
            case 8 /* CLASS */:
                t1 = t[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp field is a method");
                    }
                    t1 = RT.Any;
                }
                break;
            case 10 /* STRUCTURED_TYPE */:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to structuredtype field is a method");
                    }
                    t1 = RT.Any;
                }
                break;
            case 9 /* INDEX_MAP */:
                tt = t.key.tt;
                t1 = t.value;
                if (tt === 1 /* NUMBER */) {
                    fname = checkAndTag(f, RT.Any, RT.Num);
                }
                else {
                    if (RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to indexMap, field is a method");
                    }
                }
                break;
            default:
                throw new Error("Impossible");
        }
        if (!(t1 === RT.Num || t1 === RT.Any)) {
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
    RT.assignmentWithUnaryOp = assignmentWithUnaryOp;
    function assignmentWithOp(op, o, from, f, v) {
        if (!o) {
            throw new Error("assignmentWithUnaryOp on null/undefined/0");
        }
        var t_o = o.__rtti__ || RT.Any;
        var tt = t_o.tt;
        var t = tt === 0 /* ANY */ ? from : t_o;
        var t1;
        var fname = f + "";
        switch (t.tt) {
            case 5 /* ARRAY */:
                if (fname === "length") {
                    t1 = RT.Num;
                }
                else {
                    t1 = t.elt;
                    fname = checkAndTag(f, RT.Any, RT.Num);
                }
                break;
            case 6 /* INSTANCE */:
            case 7 /* INTERFACE */:
            case 8 /* CLASS */:
                t1 = t[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp field is a method");
                    }
                    t1 = RT.Any;
                }
                break;
            case 10 /* STRUCTURED_TYPE */:
                t1 = t.fieldTable[fname] || from.fieldTable[fname];
                if (t1 === undefined) {
                    if (t.methodTable[fname] || from.methodTable[fname] || RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to structuredtype field is a method");
                    }
                    t1 = RT.Any;
                }
                break;
            case 9 /* INDEX_MAP */:
                tt = t.key.tt;
                t1 = t.value;
                if (tt === 1 /* NUMBER */) {
                    fname = checkAndTag(f, RT.Any, RT.Num);
                }
                else {
                    if (RT.objectMethods[fname]) {
                        throw new Error("assignmentWithUnaryOp to indexMap, field is a method");
                    }
                }
                break;
            default:
                throw new Error("Impossible");
        }
        if (op === "AddAssignmentExpression") {
            var val = o[fname] + v;
            if (t1 === RT.Num) {
                if (val.__rtti__ !== RT.Num) {
                    throw new Error("assignmentWithOp add error, expected a number");
                }
                else {
                    return (o[fname] = val);
                }
            }
            else if (t1 === RT.Str || t1 === RT.Any) {
                return (o[fname] = val);
            }
            else {
                throw new Error("assignmentWithOp add error, field not a number/any/string");
            }
        }
        if (!(t1 === RT.Num || t1 === RT.Any)) {
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
    RT.assignmentWithOp = assignmentWithOp;
    function setTag(v, t) {
        v.__rtti__ = t;
        return v;
    }
    RT.setTag = setTag;
    var WeakMap = require('weak-map');
    function callUn1(un_f, un_arg1) {
        var stub = function (b) {
            if (b) {
                return stub(false);
            }
            else {
                return un_f(un_arg1);
            }
        };
        return stub(true);
    }
    var upArrow1 = function (arg1, ret, seen) {
        var down_arg = wrapFrom(arg1, seen);
        var up_ret = wrapTo(ret, seen);
        return function (un_f) {
            return function (safe_x) {
                return up_ret(callUn1(un_f, down_arg(safe_x)));
            };
        };
    };
    var downArrow1 = function (arg, ret, seen) {
        var up_arg = wrapTo(arg, seen);
        var down_ret = wrapFrom(ret, seen);
        return function (safe_f) {
            return function (un_x) {
                return down_ret(safe_f(up_arg(un_x)));
            };
        };
    };
    var upString = function (un_x) {
        return callUn1(function () {
            return un_x + "";
        }, undefined);
    };
    var downString = function (x) {
        return x;
    };
    var upNumber = function (un_x) {
        return callUn1(function () {
            return +un_x;
        }, undefined);
    };
    var downNumber = downString;
    var upBoolean = function (un_x) {
        return callUn1(function () {
            if (un_x)
                return true;
            else
                return false;
        }, undefined);
    };
    var downBoolean = downString;
    var upVoid = function (un_x) {
        return undefined;
    };
    var downVoid = function (safe_x) {
        return undefined;
    };
    var upStructure = function (t, seen) {
        return function (un_x) {
            if (un_x === undefined) {
                return undefined;
            }
            var seen_val = seen.get(un_x);
            if (seen_val) {
                if (equalTypes(seen_val.at_type, t, {})) {
                    return seen_val.mapped_to;
                }
                else {
                    throw new Error("seen value at a different type");
                }
            }
            var fn_type = t.methodTable["<call>"];
            var r;
            if (fn_type) {
                assert(fn_type.args.length === 1 && fn_type.varargs === undefined, "");
                r = upArrow1(fn_type.args[0], fn_type.result, seen)(un_x);
            }
            else {
                assert(Object.keys(t.methodTable).length === 0, "");
                r = {};
            }
            seen.set(un_x, { at_type: t, mapped_to: r });
            var fields = t.fieldTable;
            for (var f in fields) {
                callUn1(function () {
                    r[f] = wrapTo(fields[f])(un_x[f]);
                }, undefined);
            }
            return r;
        };
    };
    var downStructure = function (t, seen) {
        return function (safe_x) {
            if (safe_x === undefined) {
                return undefined;
            }
            var seen_value = seen.get(safe_x);
            if (seen_value) {
                return seen_value.mapped_to;
            }
            var fn_type = t.methodTable["<call>"];
            var r;
            if (fn_type) {
                assert(fn_type.args.length === 1 && fn_type.varargs === undefined, "");
                r = downArrow1(fn_type.args[0], fn_type.result, seen)(safe_x);
            }
            else {
                assert(Object.keys(t.methodTable).length === 0, "");
                r = {};
            }
            seen.set(safe_x, { at_type: t, mapped_to: r });
            var fields = t.fieldTable;
            for (var f in fields) {
                r[f] = wrapFrom(fields[f])(safe_x[f]);
            }
            return r;
        };
    };
    var upArray = function (t, seen) {
        return function (un_x) {
            if (un_x === undefined) {
                return undefined;
            }
            var a = [];
            var wrapper = wrapTo(t.elt, seen);
            callUn1(function () {
                var len = un_x.length;
                for (var i = 0; i < len; ++i) {
                    a[len] = wrapper(un_x[i]);
                }
            }, undefined);
            return a;
        };
    };
    var downArray = function (t, seen) {
        return function (safe_x) {
            if (safe_x === undefined) {
                return undefined;
            }
            var a = [];
            var wrapper = wrapFrom(t.elt, seen);
            var len = safe_x.length;
            for (var i = 0; i < len; ++i) {
                a[i] = wrapper(safe_x[i]);
            }
            return a;
        };
    };
    var upJust = function (t, seen) {
        return wrapTo(t.base, seen);
    };
    var downJust = function (t, seen) {
        return wrapFrom(t.base, seen);
    };
    var upInterface = function (t, seen) {
        return wrapTo(t.structuredType, seen);
    };
    var downInterface = function (t, seen) {
        return wrapFrom(t.structuredType, seen);
    };
    var upIndexMap = function (t, seen) {
        return function (un_x) {
            var r = {};
            callUn1(function () {
                for (var f in un_x) {
                    r[(wrapTo(t.key, seen)(f))] = wrapTo(t.value, seen)(un_x[f]);
                }
            }, undefined);
            return r;
        };
    };
    var downIndexMap = function (t, seen) {
        return function (safe_x) {
            var r = {};
            for (var f in safe_x) {
                r[(wrapFrom(t.key, seen)(f))] = wrapFrom(t.value, seen)(safe_x[f]);
            }
            return r;
        };
    };
    var wrapTo = function (t, seen) {
        switch (t.tt) {
            case 8 /* CLASS */:
            case 6 /* INSTANCE */:
            case 0 /* ANY */:
                assert(false, "");
            case 9 /* INDEX_MAP */:
                return upIndexMap(t, seen);
            case 7 /* INTERFACE */:
                return upInterface(t, seen);
            case 5 /* ARRAY */:
                return upArray(t, seen);
            case 3 /* BOOLEAN */:
                return upBoolean;
            case 11 /* JUST_TYPE */:
                return upJust(t, seen);
            case 1 /* NUMBER */:
                return upNumber;
            case 2 /* STRING */:
                return upString;
            case 10 /* STRUCTURED_TYPE */:
                return upStructure(t, seen);
            case 12 /* UN */:
                return function (x) {
                    return x;
                };
            case 4 /* VOID */:
                return upVoid;
        }
    };
    var wrapFrom = function (t, seen) {
        switch (t.tt) {
            case 8 /* CLASS */:
            case 6 /* INSTANCE */:
            case 0 /* ANY */:
                assert(false, "");
            case 9 /* INDEX_MAP */:
                return downIndexMap(t, seen);
            case 7 /* INTERFACE */:
                return downInterface(t, seen);
            case 5 /* ARRAY */:
                return downArray(t, seen);
            case 3 /* BOOLEAN */:
                return downBoolean;
            case 11 /* JUST_TYPE */:
                return downJust(t, seen);
            case 1 /* NUMBER */:
                return downNumber;
            case 2 /* STRING */:
                return downString;
            case 10 /* STRUCTURED_TYPE */:
                return downStructure(t, seen);
            case 12 /* UN */:
                return function (x) {
                    return x;
                };
            case 4 /* VOID */:
                return downVoid;
        }
    };
    RT.wrapToUn = function (x, t) {
        return wrapFrom(t, new WeakMap())(x);
    };
    RT.wrapFromUn = function (x, t) {
        return wrapTo(t, new WeakMap())(x);
    };
})(RT || (RT = {}));
var ts;
(function (ts) {
    function __trustedcast__(a) {
        return a;
    }
    ts.__trustedcast__ = __trustedcast__;
    function forEach(array, callback) {
        var result;
        if (array) {
            for (var i = 0, len = array.length; i < len; i++) {
                if (result = callback(array[i]))
                    break;
            }
        }
        return result;
    }
    ts.forEach = forEach;
    function contains(array, value) {
        if (array) {
            var len = array.length;
            for (var i = 0; i < len; i++) {
                if (array[i] === value) {
                    return true;
                }
            }
        }
        return false;
    }
    ts.contains = contains;
    function indexOf(array, value) {
        if (array) {
            var len = array.length;
            for (var i = 0; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
        }
        return -1;
    }
    ts.indexOf = indexOf;
    function filter(array, f) {
        var result;
        if (array) {
            result = [];
            for (var i = 0, len = array.length; i < len; i++) {
                var item = array[i];
                if (f(item)) {
                    result.push(item);
                }
            }
        }
        return result;
    }
    ts.filter = filter;
    function map(array, f) {
        var result;
        if (array) {
            result = [];
            var len = array.length;
            for (var i = 0; i < len; i++) {
                result.push(f(array[i]));
            }
        }
        return result;
    }
    ts.map = map;
    function concatenate(array1, array2) {
        if (!array2.length)
            return array1;
        if (!array1.length)
            return array2;
        return array1.concat(array2);
    }
    ts.concatenate = concatenate;
    function sum(array, prop) {
        var result = 0;
        for (var i = 0; i < array.length; i++) {
            result += array[i][prop];
        }
        return result;
    }
    ts.sum = sum;
    function binarySearch(array, value) {
        var low = 0;
        var high = array.length - 1;
        while (low <= high) {
            var middle = low + ((high - low) >> 1);
            var midValue = array[middle];
            if (midValue === value) {
                return middle;
            }
            else if (midValue > value) {
                high = middle - 1;
            }
            else {
                low = middle + 1;
            }
        }
        return ~low;
    }
    ts.binarySearch = binarySearch;
    function hasProperty(map, key) {
        return map.hasOwnProperty(key);
    }
    ts.hasProperty = hasProperty;
    function getProperty(map, key) {
        return map.hasOwnProperty(key) ? map[key] : undefined;
    }
    ts.getProperty = getProperty;
    function isEmpty(map) {
        for (var id in map) {
            return false;
        }
        return true;
    }
    ts.isEmpty = isEmpty;
    function clone(object) {
        var result = {};
        for (var id in object) {
            result[id] = object[id];
        }
        return result;
    }
    ts.clone = clone;
    function forEachValue(map, callback) {
        var result;
        for (var id in map) {
            if (result = callback(map[id]))
                break;
        }
        return result;
    }
    ts.forEachValue = forEachValue;
    function mapToArray(map) {
        var result = [];
        for (var id in map) {
            result.push(map[id]);
        }
        return result;
    }
    ts.mapToArray = mapToArray;
    function formatStringFromArgs(text, args, baseIndex) {
        baseIndex = baseIndex || 0;
        return text.replace(/{(\d+)}/g, function (match, index) { return args[+index + baseIndex]; });
    }
    ts.localizedDiagnosticMessages = undefined;
    function getLocaleSpecificMessage(message) {
        if (ts.localizedDiagnosticMessages) {
            message = ts.localizedDiagnosticMessages[message];
        }
        Debug.assert(message, "Diagnostic message does not exist in locale map.");
        return message;
    }
    function createFileDiagnostic(file, start, length, message) {
        var args = [];
        for (var _i = 4; _i < arguments.length; _i++) {
            args[_i - 4] = arguments[_i];
        }
        var text = getLocaleSpecificMessage(message.key);
        if (args.length > 0) {
            text = formatStringFromArgs(text, args);
        }
        return {
            file: file,
            start: start,
            length: length,
            messageText: text,
            category: message.category,
            code: message.code
        };
    }
    ts.createFileDiagnostic = createFileDiagnostic;
    function createCompilerDiagnostic(message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var text = getLocaleSpecificMessage(message.key);
        if (args.length > 0) {
            text = formatStringFromArgs(text, args);
        }
        return {
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: text,
            category: message.category,
            code: message.code
        };
    }
    ts.createCompilerDiagnostic = createCompilerDiagnostic;
    function chainDiagnosticMessages(details, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var text = getLocaleSpecificMessage(message.key);
        if (args.length > 0) {
            text = formatStringFromArgs(text, args);
        }
        return {
            messageText: text,
            category: message.category,
            code: message.code,
            next: details
        };
    }
    ts.chainDiagnosticMessages = chainDiagnosticMessages;
    function flattenDiagnosticChain(file, start, length, diagnosticChain) {
        var code = diagnosticChain.code;
        var category = diagnosticChain.category;
        var messageText = "";
        var indent = 0;
        while (diagnosticChain) {
            if (indent) {
                messageText += sys.newLine;
                for (var i = 0; i < indent; i++) {
                    messageText += "  ";
                }
            }
            messageText += diagnosticChain.messageText;
            indent++;
            diagnosticChain = diagnosticChain.next;
        }
        return {
            file: file,
            start: start,
            length: length,
            code: code,
            category: category,
            messageText: messageText
        };
    }
    ts.flattenDiagnosticChain = flattenDiagnosticChain;
    function compareValues(a, b) {
        if (a === b)
            return 0;
        if (a === undefined)
            return -1;
        if (b === undefined)
            return 1;
        return a < b ? -1 : 1;
    }
    function getDiagnosticFilename(diagnostic) {
        return diagnostic.file ? diagnostic.file.filename : undefined;
    }
    function compareDiagnostics(d1, d2) {
        return compareValues(getDiagnosticFilename(d1), getDiagnosticFilename(d2)) || compareValues(d1.start, d2.start) || compareValues(d1.length, d2.length) || compareValues(d1.code, d2.code) || compareValues(d1.messageText, d2.messageText) || 0;
    }
    ts.compareDiagnostics = compareDiagnostics;
    function deduplicateSortedDiagnostics(diagnostics) {
        if (diagnostics.length < 2) {
            return diagnostics;
        }
        var newDiagnostics = [diagnostics[0]];
        var previousDiagnostic = diagnostics[0];
        for (var i = 1; i < diagnostics.length; i++) {
            var currentDiagnostic = diagnostics[i];
            var isDupe = compareDiagnostics(currentDiagnostic, previousDiagnostic) === 0;
            if (!isDupe) {
                newDiagnostics.push(currentDiagnostic);
                previousDiagnostic = currentDiagnostic;
            }
        }
        return newDiagnostics;
    }
    ts.deduplicateSortedDiagnostics = deduplicateSortedDiagnostics;
    function normalizeSlashes(path) {
        return path.replace(/\\/g, "/");
    }
    ts.normalizeSlashes = normalizeSlashes;
    function getRootLength(path) {
        if (path.charCodeAt(0) === 47 /* slash */) {
            if (path.charCodeAt(1) !== 47 /* slash */)
                return 1;
            var p1 = path.indexOf("/", 2);
            if (p1 < 0)
                return 2;
            var p2 = path.indexOf("/", p1 + 1);
            if (p2 < 0)
                return p1 + 1;
            return p2 + 1;
        }
        if (path.charCodeAt(1) === 58 /* colon */) {
            if (path.charCodeAt(2) === 47 /* slash */)
                return 3;
            return 2;
        }
        return 0;
    }
    ts.getRootLength = getRootLength;
    ts.directorySeparator = "/";
    function getNormalizedParts(normalizedSlashedPath, rootLength) {
        var parts = normalizedSlashedPath.substr(rootLength).split(ts.directorySeparator);
        var normalized = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part !== ".") {
                if (part === ".." && normalized.length > 0 && normalized[normalized.length - 1] !== "..") {
                    normalized.pop();
                }
                else {
                    normalized.push(part);
                }
            }
        }
        return normalized;
    }
    function normalizePath(path) {
        var path = normalizeSlashes(path);
        var rootLength = getRootLength(path);
        var normalized = getNormalizedParts(path, rootLength);
        return path.substr(0, rootLength) + normalized.join(ts.directorySeparator);
    }
    ts.normalizePath = normalizePath;
    function getDirectoryPath(path) {
        return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(ts.directorySeparator)));
    }
    ts.getDirectoryPath = getDirectoryPath;
    function isUrl(path) {
        return path && !isRootedDiskPath(path) && path.indexOf("://") !== -1;
    }
    ts.isUrl = isUrl;
    function isRootedDiskPath(path) {
        return getRootLength(path) !== 0;
    }
    ts.isRootedDiskPath = isRootedDiskPath;
    function normalizedPathComponents(path, rootLength) {
        var normalizedParts = getNormalizedParts(path, rootLength);
        return [path.substr(0, rootLength)].concat(normalizedParts);
    }
    function getNormalizedPathComponents(path, currentDirectory) {
        var path = normalizeSlashes(path);
        var rootLength = getRootLength(path);
        if (rootLength == 0) {
            path = combinePaths(normalizeSlashes(currentDirectory), path);
            rootLength = getRootLength(path);
        }
        return normalizedPathComponents(path, rootLength);
    }
    ts.getNormalizedPathComponents = getNormalizedPathComponents;
    function getNormalizedPathFromPathCompoments(pathComponents) {
        if (pathComponents && pathComponents.length) {
            return pathComponents[0] + pathComponents.slice(1).join(ts.directorySeparator);
        }
    }
    ts.getNormalizedPathFromPathCompoments = getNormalizedPathFromPathCompoments;
    function getNormalizedPathComponentsOfUrl(url) {
        var urlLength = url.length;
        var rootLength = url.indexOf("://") + "://".length;
        while (rootLength < urlLength) {
            if (url.charCodeAt(rootLength) === 47 /* slash */) {
                rootLength++;
            }
            else {
                break;
            }
        }
        if (rootLength === urlLength) {
            return [url];
        }
        var indexOfNextSlash = url.indexOf(ts.directorySeparator, rootLength);
        if (indexOfNextSlash !== -1) {
            rootLength = indexOfNextSlash + 1;
            return normalizedPathComponents(url, rootLength);
        }
        else {
            return [url + ts.directorySeparator];
        }
    }
    function getNormalizedPathOrUrlComponents(pathOrUrl, currentDirectory) {
        if (isUrl(pathOrUrl)) {
            return getNormalizedPathComponentsOfUrl(pathOrUrl);
        }
        else {
            return getNormalizedPathComponents(pathOrUrl, currentDirectory);
        }
    }
    function getRelativePathToDirectoryOrUrl(directoryPathOrUrl, relativeOrAbsolutePath, currentDirectory, isAbsolutePathAnUrl) {
        var pathComponents = getNormalizedPathOrUrlComponents(relativeOrAbsolutePath, currentDirectory);
        var directoryComponents = getNormalizedPathOrUrlComponents(directoryPathOrUrl, currentDirectory);
        if (directoryComponents.length > 1 && directoryComponents[directoryComponents.length - 1] === "") {
            directoryComponents.length--;
        }
        for (var joinStartIndex = 0; joinStartIndex < pathComponents.length && joinStartIndex < directoryComponents.length; joinStartIndex++) {
            if (directoryComponents[joinStartIndex] !== pathComponents[joinStartIndex]) {
                break;
            }
        }
        if (joinStartIndex) {
            var relativePath = "";
            var relativePathComponents = pathComponents.slice(joinStartIndex, pathComponents.length);
            for (; joinStartIndex < directoryComponents.length; joinStartIndex++) {
                if (directoryComponents[joinStartIndex] !== "") {
                    relativePath = relativePath + ".." + ts.directorySeparator;
                }
            }
            return relativePath + relativePathComponents.join(ts.directorySeparator);
        }
        var absolutePath = getNormalizedPathFromPathCompoments(pathComponents);
        if (isAbsolutePathAnUrl && isRootedDiskPath(absolutePath)) {
            absolutePath = "file:///" + absolutePath;
        }
        return absolutePath;
    }
    ts.getRelativePathToDirectoryOrUrl = getRelativePathToDirectoryOrUrl;
    function getBaseFilename(path) {
        var i = path.lastIndexOf(ts.directorySeparator);
        return i < 0 ? path : path.substring(i + 1);
    }
    ts.getBaseFilename = getBaseFilename;
    function combinePaths(path1, path2) {
        if (!(path1 && path1.length))
            return path2;
        if (!(path2 && path2.length))
            return path1;
        if (path2.charAt(0) === ts.directorySeparator)
            return path2;
        if (path1.charAt(path1.length - 1) === ts.directorySeparator)
            return path1 + path2;
        return path1 + ts.directorySeparator + path2;
    }
    ts.combinePaths = combinePaths;
    function fileExtensionIs(path, extension) {
        var pathLen = path.length;
        var extLen = extension.length;
        return pathLen > extLen && path.substr(pathLen - extLen, extLen) === extension;
    }
    ts.fileExtensionIs = fileExtensionIs;
    function getCanonicalFileName(fileName) {
        return sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
    }
    ts.getCanonicalFileName = getCanonicalFileName;
    var SymbolC = (function () {
        function SymbolC(flags, name) {
            this.flags = flags;
            this.name = name;
        }
        return SymbolC;
    })();
    var TypeC = (function () {
        function TypeC(checker, flags) {
            this.flags = flags;
        }
        return TypeC;
    })();
    var SignatureC = (function () {
        function SignatureC(checker) {
        }
        return SignatureC;
    })();
    ts.objectAllocator = {
        getNodeConstructor: function (kind) {
            function Node() {
            }
            Node.prototype = {
                kind: kind,
                pos: 0,
                end: 0,
                flags: 0,
                parent: undefined
            };
            return Node;
        },
        getSymbolConstructor: function () { return SymbolC; },
        getTypeConstructor: function () { return TypeC; },
        getSignatureConstructor: function () { return SignatureC; }
    };
    (function (AssertionLevel) {
        AssertionLevel[AssertionLevel["None"] = 0] = "None";
        AssertionLevel[AssertionLevel["Normal"] = 1] = "Normal";
        AssertionLevel[AssertionLevel["Aggressive"] = 2] = "Aggressive";
        AssertionLevel[AssertionLevel["VeryAggressive"] = 3] = "VeryAggressive";
    })(ts.AssertionLevel || (ts.AssertionLevel = {}));
    var AssertionLevel = ts.AssertionLevel;
    (function (Debug) {
        var currentAssertionLevel = 0 /* None */;
        function assert(expression, message, verboseDebugInfo) {
            if (!expression) {
                var verboseDebugString = "";
                if (verboseDebugInfo) {
                    verboseDebugString = "\r\nVerbose Debug Information: " + verboseDebugInfo();
                }
                throw new Error("Debug Failure. False expression: " + (message || "") + verboseDebugString);
            }
        }
        Debug.assert = assert;
        function fail(message) {
            Debug.assert(false, message);
        }
        Debug.fail = fail;
    })(ts.Debug || (ts.Debug = {}));
    var Debug = ts.Debug;
})(ts || (ts = {}));
var ts;
(function (ts) {
    var textToToken = {
        "any": 101 /* AnyKeyword */,
        "boolean": 102 /* BooleanKeyword */,
        "break": 56 /* BreakKeyword */,
        "case": 57 /* CaseKeyword */,
        "catch": 58 /* CatchKeyword */,
        "class": 59 /* ClassKeyword */,
        "continue": 61 /* ContinueKeyword */,
        "const": 60 /* ConstKeyword */,
        "constructor": 103 /* ConstructorKeyword */,
        "debugger": 62 /* DebuggerKeyword */,
        "declare": 104 /* DeclareKeyword */,
        "default": 63 /* DefaultKeyword */,
        "delete": 64 /* DeleteKeyword */,
        "do": 65 /* DoKeyword */,
        "else": 66 /* ElseKeyword */,
        "enum": 67 /* EnumKeyword */,
        "export": 68 /* ExportKeyword */,
        "extends": 69 /* ExtendsKeyword */,
        "false": 70 /* FalseKeyword */,
        "finally": 71 /* FinallyKeyword */,
        "for": 72 /* ForKeyword */,
        "function": 73 /* FunctionKeyword */,
        "get": 105 /* GetKeyword */,
        "if": 74 /* IfKeyword */,
        "implements": 92 /* ImplementsKeyword */,
        "import": 75 /* ImportKeyword */,
        "in": 76 /* InKeyword */,
        "instanceof": 77 /* InstanceOfKeyword */,
        "interface": 93 /* InterfaceKeyword */,
        "let": 94 /* LetKeyword */,
        "module": 106 /* ModuleKeyword */,
        "new": 78 /* NewKeyword */,
        "null": 79 /* NullKeyword */,
        "number": 108 /* NumberKeyword */,
        "package": 95 /* PackageKeyword */,
        "private": 96 /* PrivateKeyword */,
        "protected": 97 /* ProtectedKeyword */,
        "public": 98 /* PublicKeyword */,
        "require": 107 /* RequireKeyword */,
        "return": 80 /* ReturnKeyword */,
        "set": 109 /* SetKeyword */,
        "static": 99 /* StaticKeyword */,
        "string": 110 /* StringKeyword */,
        "super": 81 /* SuperKeyword */,
        "switch": 82 /* SwitchKeyword */,
        "this": 83 /* ThisKeyword */,
        "throw": 84 /* ThrowKeyword */,
        "true": 85 /* TrueKeyword */,
        "try": 86 /* TryKeyword */,
        "typeof": 87 /* TypeOfKeyword */,
        "var": 88 /* VarKeyword */,
        "void": 89 /* VoidKeyword */,
        "while": 90 /* WhileKeyword */,
        "with": 91 /* WithKeyword */,
        "yield": 100 /* YieldKeyword */,
        "{": 5 /* OpenBraceToken */,
        "}": 6 /* CloseBraceToken */,
        "(": 7 /* OpenParenToken */,
        ")": 8 /* CloseParenToken */,
        "[": 9 /* OpenBracketToken */,
        "]": 10 /* CloseBracketToken */,
        ".": 11 /* DotToken */,
        "...": 12 /* DotDotDotToken */,
        ";": 13 /* SemicolonToken */,
        ",": 14 /* CommaToken */,
        "<": 15 /* LessThanToken */,
        ">": 16 /* GreaterThanToken */,
        "<=": 17 /* LessThanEqualsToken */,
        ">=": 18 /* GreaterThanEqualsToken */,
        "==": 19 /* EqualsEqualsToken */,
        "!=": 20 /* ExclamationEqualsToken */,
        "===": 21 /* EqualsEqualsEqualsToken */,
        "!==": 22 /* ExclamationEqualsEqualsToken */,
        "=>": 23 /* EqualsGreaterThanToken */,
        "+": 24 /* PlusToken */,
        "-": 25 /* MinusToken */,
        "*": 26 /* AsteriskToken */,
        "/": 27 /* SlashToken */,
        "%": 28 /* PercentToken */,
        "++": 29 /* PlusPlusToken */,
        "--": 30 /* MinusMinusToken */,
        "<<": 31 /* LessThanLessThanToken */,
        ">>": 32 /* GreaterThanGreaterThanToken */,
        ">>>": 33 /* GreaterThanGreaterThanGreaterThanToken */,
        "&": 34 /* AmpersandToken */,
        "|": 35 /* BarToken */,
        "^": 36 /* CaretToken */,
        "!": 37 /* ExclamationToken */,
        "~": 38 /* TildeToken */,
        "&&": 39 /* AmpersandAmpersandToken */,
        "||": 40 /* BarBarToken */,
        "?": 41 /* QuestionToken */,
        ":": 42 /* ColonToken */,
        "=": 43 /* EqualsToken */,
        "+=": 44 /* PlusEqualsToken */,
        "-=": 45 /* MinusEqualsToken */,
        "*=": 46 /* AsteriskEqualsToken */,
        "/=": 47 /* SlashEqualsToken */,
        "%=": 48 /* PercentEqualsToken */,
        "<<=": 49 /* LessThanLessThanEqualsToken */,
        ">>=": 50 /* GreaterThanGreaterThanEqualsToken */,
        ">>>=": 51 /* GreaterThanGreaterThanGreaterThanEqualsToken */,
        "&=": 52 /* AmpersandEqualsToken */,
        "|=": 53 /* BarEqualsToken */,
        "^=": 54 /* CaretEqualsToken */
    };
    var unicodeES3IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1610, 1649, 1747, 1749, 1749, 1765, 1766, 1786, 1788, 1808, 1808, 1810, 1836, 1920, 1957, 2309, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2784, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3294, 3294, 3296, 3297, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3424, 3425, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3805, 3840, 3840, 3904, 3911, 3913, 3946, 3976, 3979, 4096, 4129, 4131, 4135, 4137, 4138, 4176, 4181, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6067, 6176, 6263, 6272, 6312, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8319, 8319, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12346, 12353, 12436, 12445, 12446, 12449, 12538, 12540, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65138, 65140, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500];
    var unicodeES3IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 543, 546, 563, 592, 685, 688, 696, 699, 705, 720, 721, 736, 740, 750, 750, 768, 846, 864, 866, 890, 890, 902, 902, 904, 906, 908, 908, 910, 929, 931, 974, 976, 983, 986, 1011, 1024, 1153, 1155, 1158, 1164, 1220, 1223, 1224, 1227, 1228, 1232, 1269, 1272, 1273, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1441, 1443, 1465, 1467, 1469, 1471, 1471, 1473, 1474, 1476, 1476, 1488, 1514, 1520, 1522, 1569, 1594, 1600, 1621, 1632, 1641, 1648, 1747, 1749, 1756, 1759, 1768, 1770, 1773, 1776, 1788, 1808, 1836, 1840, 1866, 1920, 1968, 2305, 2307, 2309, 2361, 2364, 2381, 2384, 2388, 2392, 2403, 2406, 2415, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2492, 2494, 2500, 2503, 2504, 2507, 2509, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2562, 2562, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2649, 2652, 2654, 2654, 2662, 2676, 2689, 2691, 2693, 2699, 2701, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2784, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2870, 2873, 2876, 2883, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2913, 2918, 2927, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 2997, 2999, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3031, 3031, 3047, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3134, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3168, 3169, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3262, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3297, 3302, 3311, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3368, 3370, 3385, 3390, 3395, 3398, 3400, 3402, 3405, 3415, 3415, 3424, 3425, 3430, 3439, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3805, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3946, 3953, 3972, 3974, 3979, 3984, 3991, 3993, 4028, 4038, 4038, 4096, 4129, 4131, 4135, 4137, 4138, 4140, 4146, 4150, 4153, 4160, 4169, 4176, 4185, 4256, 4293, 4304, 4342, 4352, 4441, 4447, 4514, 4520, 4601, 4608, 4614, 4616, 4678, 4680, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4742, 4744, 4744, 4746, 4749, 4752, 4782, 4784, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4814, 4816, 4822, 4824, 4846, 4848, 4878, 4880, 4880, 4882, 4885, 4888, 4894, 4896, 4934, 4936, 4954, 4969, 4977, 5024, 5108, 5121, 5740, 5743, 5750, 5761, 5786, 5792, 5866, 6016, 6099, 6112, 6121, 6160, 6169, 6176, 6263, 6272, 6313, 7680, 7835, 7840, 7929, 7936, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8255, 8256, 8319, 8319, 8400, 8412, 8417, 8417, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8497, 8499, 8505, 8544, 8579, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12346, 12353, 12436, 12441, 12442, 12445, 12446, 12449, 12542, 12549, 12588, 12593, 12686, 12704, 12727, 13312, 19893, 19968, 40869, 40960, 42124, 44032, 55203, 63744, 64045, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65056, 65059, 65075, 65076, 65101, 65103, 65136, 65138, 65140, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65381, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500];
    var unicodeES5IdentifierStart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 880, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1568, 1610, 1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775, 1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957, 1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069, 2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2208, 2208, 2210, 2220, 2308, 2361, 2365, 2365, 2384, 2384, 2392, 2401, 2417, 2423, 2425, 2431, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529, 2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654, 2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929, 2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3133, 3160, 3161, 3168, 3169, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261, 3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3389, 3406, 3406, 3424, 3425, 3450, 3455, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760, 3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3807, 3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138, 4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198, 4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000, 6016, 6067, 6103, 6103, 6108, 6108, 6176, 6263, 6272, 6312, 6314, 6314, 6320, 6389, 6400, 6428, 6480, 6509, 6512, 6516, 6528, 6571, 6593, 6599, 6656, 6678, 6688, 6740, 6823, 6823, 6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7098, 7141, 7168, 7203, 7245, 7247, 7258, 7293, 7401, 7404, 7406, 7409, 7413, 7414, 7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11502, 11506, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11823, 11823, 12293, 12295, 12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539, 42560, 42606, 42623, 42647, 42656, 42735, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43009, 43011, 43013, 43015, 43018, 43020, 43042, 43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259, 43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442, 43471, 43471, 43520, 43560, 43584, 43586, 43588, 43595, 43616, 43638, 43642, 43642, 43648, 43695, 43697, 43697, 43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714, 43739, 43741, 43744, 43754, 43762, 43764, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44002, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500];
    var unicodeES5IdentifierPart = [170, 170, 181, 181, 186, 186, 192, 214, 216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750, 768, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908, 910, 929, 931, 1013, 1015, 1153, 1155, 1159, 1162, 1319, 1329, 1366, 1369, 1369, 1377, 1415, 1425, 1469, 1471, 1471, 1473, 1474, 1476, 1477, 1479, 1479, 1488, 1514, 1520, 1522, 1552, 1562, 1568, 1641, 1646, 1747, 1749, 1756, 1759, 1768, 1770, 1788, 1791, 1791, 1808, 1866, 1869, 1969, 1984, 2037, 2042, 2042, 2048, 2093, 2112, 2139, 2208, 2208, 2210, 2220, 2276, 2302, 2304, 2403, 2406, 2415, 2417, 2423, 2425, 2431, 2433, 2435, 2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482, 2486, 2489, 2492, 2500, 2503, 2504, 2507, 2510, 2519, 2519, 2524, 2525, 2527, 2531, 2534, 2545, 2561, 2563, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608, 2610, 2611, 2613, 2614, 2616, 2617, 2620, 2620, 2622, 2626, 2631, 2632, 2635, 2637, 2641, 2641, 2649, 2652, 2654, 2654, 2662, 2677, 2689, 2691, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736, 2738, 2739, 2741, 2745, 2748, 2757, 2759, 2761, 2763, 2765, 2768, 2768, 2784, 2787, 2790, 2799, 2817, 2819, 2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867, 2869, 2873, 2876, 2884, 2887, 2888, 2891, 2893, 2902, 2903, 2908, 2909, 2911, 2915, 2918, 2927, 2929, 2929, 2946, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970, 2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001, 3006, 3010, 3014, 3016, 3018, 3021, 3024, 3024, 3031, 3031, 3046, 3055, 3073, 3075, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123, 3125, 3129, 3133, 3140, 3142, 3144, 3146, 3149, 3157, 3158, 3160, 3161, 3168, 3171, 3174, 3183, 3202, 3203, 3205, 3212, 3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3260, 3268, 3270, 3272, 3274, 3277, 3285, 3286, 3294, 3294, 3296, 3299, 3302, 3311, 3313, 3314, 3330, 3331, 3333, 3340, 3342, 3344, 3346, 3386, 3389, 3396, 3398, 3400, 3402, 3406, 3415, 3415, 3424, 3427, 3430, 3439, 3450, 3455, 3458, 3459, 3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526, 3530, 3530, 3535, 3540, 3542, 3542, 3544, 3551, 3570, 3571, 3585, 3642, 3648, 3662, 3664, 3673, 3713, 3714, 3716, 3716, 3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743, 3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3769, 3771, 3773, 3776, 3780, 3782, 3782, 3784, 3789, 3792, 3801, 3804, 3807, 3840, 3840, 3864, 3865, 3872, 3881, 3893, 3893, 3895, 3895, 3897, 3897, 3902, 3911, 3913, 3948, 3953, 3972, 3974, 3991, 3993, 4028, 4038, 4038, 4096, 4169, 4176, 4253, 4256, 4293, 4295, 4295, 4301, 4301, 4304, 4346, 4348, 4680, 4682, 4685, 4688, 4694, 4696, 4696, 4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789, 4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880, 4882, 4885, 4888, 4954, 4957, 4959, 4992, 5007, 5024, 5108, 5121, 5740, 5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900, 5902, 5908, 5920, 5940, 5952, 5971, 5984, 5996, 5998, 6000, 6002, 6003, 6016, 6099, 6103, 6103, 6108, 6109, 6112, 6121, 6155, 6157, 6160, 6169, 6176, 6263, 6272, 6314, 6320, 6389, 6400, 6428, 6432, 6443, 6448, 6459, 6470, 6509, 6512, 6516, 6528, 6571, 6576, 6601, 6608, 6617, 6656, 6683, 6688, 6750, 6752, 6780, 6783, 6793, 6800, 6809, 6823, 6823, 6912, 6987, 6992, 7001, 7019, 7027, 7040, 7155, 7168, 7223, 7232, 7241, 7245, 7293, 7376, 7378, 7380, 7414, 7424, 7654, 7676, 7957, 7960, 7965, 7968, 8005, 8008, 8013, 8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061, 8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140, 8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188, 8204, 8205, 8255, 8256, 8276, 8276, 8305, 8305, 8319, 8319, 8336, 8348, 8400, 8412, 8417, 8417, 8421, 8432, 8450, 8450, 8455, 8455, 8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486, 8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521, 8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358, 11360, 11492, 11499, 11507, 11520, 11557, 11559, 11559, 11565, 11565, 11568, 11623, 11631, 11631, 11647, 11670, 11680, 11686, 11688, 11694, 11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726, 11728, 11734, 11736, 11742, 11744, 11775, 11823, 11823, 12293, 12295, 12321, 12335, 12337, 12341, 12344, 12348, 12353, 12438, 12441, 12442, 12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589, 12593, 12686, 12704, 12730, 12784, 12799, 13312, 19893, 19968, 40908, 40960, 42124, 42192, 42237, 42240, 42508, 42512, 42539, 42560, 42607, 42612, 42621, 42623, 42647, 42655, 42737, 42775, 42783, 42786, 42888, 42891, 42894, 42896, 42899, 42912, 42922, 43000, 43047, 43072, 43123, 43136, 43204, 43216, 43225, 43232, 43255, 43259, 43259, 43264, 43309, 43312, 43347, 43360, 43388, 43392, 43456, 43471, 43481, 43520, 43574, 43584, 43597, 43600, 43609, 43616, 43638, 43642, 43643, 43648, 43714, 43739, 43741, 43744, 43759, 43762, 43766, 43777, 43782, 43785, 43790, 43793, 43798, 43808, 43814, 43816, 43822, 43968, 44010, 44012, 44013, 44016, 44025, 44032, 55203, 55216, 55238, 55243, 55291, 63744, 64109, 64112, 64217, 64256, 64262, 64275, 64279, 64285, 64296, 64298, 64310, 64312, 64316, 64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433, 64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019, 65024, 65039, 65056, 65062, 65075, 65076, 65101, 65103, 65136, 65140, 65142, 65276, 65296, 65305, 65313, 65338, 65343, 65343, 65345, 65370, 65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495, 65498, 65500];
    function lookupInUnicodeMap(code, map) {
        if (code < map[0]) {
            return false;
        }
        var lo = 0;
        var hi = map.length;
        var mid;
        while (lo + 1 < hi) {
            mid = lo + (hi - lo) / 2;
            mid -= mid % 2;
            if (map[mid] <= code && code <= map[mid + 1]) {
                return true;
            }
            if (code < map[mid]) {
                hi = mid;
            }
            else {
                lo = mid + 2;
            }
        }
        return false;
    }
    function isUnicodeIdentifierStart(code, languageVersion) {
        return languageVersion === 0 /* ES3 */ ? lookupInUnicodeMap(code, unicodeES3IdentifierStart) : lookupInUnicodeMap(code, unicodeES5IdentifierStart);
    }
    function isUnicodeIdentifierPart(code, languageVersion) {
        return languageVersion === 0 /* ES3 */ ? lookupInUnicodeMap(code, unicodeES3IdentifierPart) : lookupInUnicodeMap(code, unicodeES5IdentifierPart);
    }
    function makeReverseMap(source) {
        var result = [];
        for (var name in source) {
            if (source.hasOwnProperty(name)) {
                result[source[name]] = name;
            }
        }
        return result;
    }
    var tokenStrings = makeReverseMap(textToToken);
    function tokenToString(t) {
        return tokenStrings[t];
    }
    ts.tokenToString = tokenToString;
    function getLineStarts(text) {
        var result = new Array();
        var pos = 0;
        var lineStart = 0;
        while (pos < text.length) {
            switch (text.charCodeAt(pos++)) {
                case 13 /* carriageReturn */:
                    if (text.charCodeAt(pos) === 10 /* lineFeed */) {
                        pos++;
                    }
                case 10 /* lineFeed */:
                    result.push(lineStart);
                    lineStart = pos;
                    break;
            }
        }
        result.push(lineStart);
        return result;
    }
    ts.getLineStarts = getLineStarts;
    function getLineAndCharacterOfPosition(lineStarts, position) {
        var lineNumber = ts.binarySearch(lineStarts, position);
        if (lineNumber < 0) {
            lineNumber = (~lineNumber) - 1;
        }
        return {
            line: lineNumber + 1,
            character: position - lineStarts[lineNumber] + 1
        };
    }
    ts.getLineAndCharacterOfPosition = getLineAndCharacterOfPosition;
    function positionToLineAndCharacter(text, pos) {
        var lineStarts = getLineStarts(text);
        return getLineAndCharacterOfPosition(lineStarts, pos);
    }
    ts.positionToLineAndCharacter = positionToLineAndCharacter;
    function isWhiteSpace(ch) {
        return ch === 32 /* space */ || ch === 9 /* tab */ || ch === 11 /* verticalTab */ || ch === 12 /* formFeed */ || ch === 160 /* nonBreakingSpace */ || ch === 5760 /* ogham */ || ch >= 8192 /* enQuad */ && ch <= 8203 /* zeroWidthSpace */ || ch === 8239 /* narrowNoBreakSpace */ || ch === 8287 /* mathematicalSpace */ || ch === 12288 /* ideographicSpace */ || ch === 65279 /* byteOrderMark */;
    }
    function isLineBreak(ch) {
        return ch === 10 /* lineFeed */ || ch === 13 /* carriageReturn */ || ch === 8232 /* lineSeparator */ || ch === 8233 /* paragraphSeparator */;
    }
    function isDigit(ch) {
        return ch >= 48 /* _0 */ && ch <= 57 /* _9 */;
    }
    function skipTrivia(text, pos, stopAfterLineBreak) {
        while (true) {
            var ch = text.charCodeAt(pos);
            switch (ch) {
                case 13 /* carriageReturn */:
                    if (text.charCodeAt(pos + 1) === 10 /* lineFeed */)
                        pos++;
                case 10 /* lineFeed */:
                    pos++;
                    if (stopAfterLineBreak)
                        return pos;
                    continue;
                case 9 /* tab */:
                case 11 /* verticalTab */:
                case 12 /* formFeed */:
                case 32 /* space */:
                    pos++;
                    continue;
                case 47 /* slash */:
                    if (text.charCodeAt(pos + 1) === 47 /* slash */) {
                        pos += 2;
                        while (pos < text.length) {
                            if (isLineBreak(text.charCodeAt(pos))) {
                                break;
                            }
                            pos++;
                        }
                        continue;
                    }
                    if (text.charCodeAt(pos + 1) === 42 /* asterisk */) {
                        pos += 2;
                        while (pos < text.length) {
                            if (text.charCodeAt(pos) === 42 /* asterisk */ && text.charCodeAt(pos + 1) === 47 /* slash */) {
                                pos += 2;
                                break;
                            }
                            pos++;
                        }
                        continue;
                    }
                    break;
                default:
                    if (ch > 127 /* maxAsciiCharacter */ && (isWhiteSpace(ch) || isLineBreak(ch))) {
                        pos++;
                        continue;
                    }
                    break;
            }
            return pos;
        }
    }
    ts.skipTrivia = skipTrivia;
    function createScanner(languageVersion, text, onError, onComment) {
        var pos;
        var len;
        var startPos;
        var tokenPos;
        var token;
        var tokenValue;
        var precedingLineBreak;
        function error(message) {
            if (onError)
                onError(message);
        }
        function isIdentifierStart(ch) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ || ch === 36 /* $ */ || ch === 95 /* _ */ || ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierStart(ch, languageVersion);
        }
        function isIdentifierPart(ch) {
            return ch >= 65 /* A */ && ch <= 90 /* Z */ || ch >= 97 /* a */ && ch <= 122 /* z */ || ch >= 48 /* _0 */ && ch <= 57 /* _9 */ || ch === 36 /* $ */ || ch === 95 /* _ */ || ch > 127 /* maxAsciiCharacter */ && isUnicodeIdentifierPart(ch, languageVersion);
        }
        function scanNumber() {
            var start = pos;
            while (isDigit(text.charCodeAt(pos)))
                pos++;
            if (text.charCodeAt(pos) === 46 /* dot */) {
                pos++;
                while (isDigit(text.charCodeAt(pos)))
                    pos++;
            }
            var end = pos;
            if (text.charCodeAt(pos) === 69 /* E */ || text.charCodeAt(pos) === 101 /* e */) {
                pos++;
                if (text.charCodeAt(pos) === 43 /* plus */ || text.charCodeAt(pos) === 45 /* minus */)
                    pos++;
                if (isDigit(text.charCodeAt(pos))) {
                    pos++;
                    while (isDigit(text.charCodeAt(pos)))
                        pos++;
                    end = pos;
                }
                else {
                    error(ts.Diagnostics.Digit_expected);
                }
            }
            return +(text.substring(start, end));
        }
        function scanHexDigits(count, exact) {
            var digits = 0;
            var value = 0;
            while (digits < count || !exact) {
                var ch = text.charCodeAt(pos);
                if (ch >= 48 /* _0 */ && ch <= 57 /* _9 */) {
                    value = value * 16 + ch - 48 /* _0 */;
                }
                else if (ch >= 65 /* A */ && ch <= 70 /* F */) {
                    value = value * 16 + ch - 65 /* A */ + 10;
                }
                else if (ch >= 97 /* a */ && ch <= 102 /* f */) {
                    value = value * 16 + ch - 97 /* a */ + 10;
                }
                else {
                    break;
                }
                pos++;
                digits++;
            }
            if (digits < count) {
                value = -1;
            }
            return value;
        }
        function scanString() {
            var quote = text.charCodeAt(pos++);
            var result = "";
            var start = pos;
            while (true) {
                if (pos >= len) {
                    result += text.substring(start, pos);
                    error(ts.Diagnostics.Unexpected_end_of_text);
                    break;
                }
                var ch = text.charCodeAt(pos);
                if (ch === quote) {
                    result += text.substring(start, pos);
                    pos++;
                    break;
                }
                if (ch === 92 /* backslash */) {
                    result += text.substring(start, pos);
                    pos++;
                    if (pos >= len) {
                        error(ts.Diagnostics.Unexpected_end_of_text);
                        break;
                    }
                    ch = text.charCodeAt(pos++);
                    switch (ch) {
                        case 48 /* _0 */:
                            result += "\0";
                            break;
                        case 98 /* b */:
                            result += "\b";
                            break;
                        case 116 /* t */:
                            result += "\t";
                            break;
                        case 110 /* n */:
                            result += "\n";
                            break;
                        case 118 /* v */:
                            result += "\v";
                            break;
                        case 102 /* f */:
                            result += "\f";
                            break;
                        case 114 /* r */:
                            result += "\r";
                            break;
                        case 39 /* singleQuote */:
                            result += "\'";
                            break;
                        case 34 /* doubleQuote */:
                            result += "\"";
                            break;
                        case 120 /* x */:
                        case 117 /* u */:
                            var ch = scanHexDigits(ch === 120 /* x */ ? 2 : 4, true);
                            if (ch >= 0) {
                                result += String.fromCharCode(ch);
                            }
                            else {
                                error(ts.Diagnostics.Hexadecimal_digit_expected);
                            }
                            break;
                        case 13 /* carriageReturn */:
                            if (pos < len && text.charCodeAt(pos) === 10 /* lineFeed */)
                                pos++;
                            break;
                        case 10 /* lineFeed */:
                        case 8232 /* lineSeparator */:
                        case 8233 /* paragraphSeparator */:
                            break;
                        default:
                            result += String.fromCharCode(ch);
                    }
                    start = pos;
                    continue;
                }
                if (isLineBreak(ch)) {
                    result += text.substring(start, pos);
                    error(ts.Diagnostics.Unterminated_string_constant);
                    break;
                }
                pos++;
            }
            return result;
        }
        function peekUnicodeEscape() {
            if (pos + 5 < len && text.charCodeAt(pos + 1) === 117 /* u */) {
                var start = pos;
                pos += 2;
                var value = scanHexDigits(4, true);
                pos = start;
                return value;
            }
            return -1;
        }
        function scanIdentifierParts() {
            var result = "";
            var start = pos;
            while (pos < len) {
                var ch = text.charCodeAt(pos);
                if (isIdentifierPart(ch)) {
                    pos++;
                }
                else if (ch === 92 /* backslash */) {
                    ch = peekUnicodeEscape();
                    if (!(ch >= 0 && isIdentifierPart(ch))) {
                        break;
                    }
                    result += text.substring(start, pos);
                    result += String.fromCharCode(ch);
                    pos += 6;
                    start = pos;
                }
                else {
                    break;
                }
            }
            result += text.substring(start, pos);
            return result;
        }
        function getIdentifierToken() {
            var len = tokenValue.length;
            if (len >= 2 && len <= 11) {
                var ch = tokenValue.charCodeAt(0);
                if (ch >= 97 /* a */ && ch <= 122 /* z */ && textToToken.hasOwnProperty(tokenValue)) {
                    return token = textToToken[tokenValue];
                }
            }
            return token = 55 /* Identifier */;
        }
        function scan() {
            startPos = pos;
            precedingLineBreak = false;
            while (true) {
                tokenPos = pos;
                if (pos >= len) {
                    return token = 1 /* EndOfFileToken */;
                }
                var ch = text.charCodeAt(pos);
                switch (ch) {
                    case 10 /* lineFeed */:
                    case 13 /* carriageReturn */:
                        precedingLineBreak = true;
                    case 9 /* tab */:
                    case 11 /* verticalTab */:
                    case 12 /* formFeed */:
                    case 32 /* space */:
                        pos++;
                        continue;
                    case 33 /* exclamation */:
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            if (text.charCodeAt(pos + 2) === 61 /* equals */) {
                                return pos += 3, token = 22 /* ExclamationEqualsEqualsToken */;
                            }
                            return pos += 2, token = 20 /* ExclamationEqualsToken */;
                        }
                        return pos++, token = 37 /* ExclamationToken */;
                    case 34 /* doubleQuote */:
                    case 39 /* singleQuote */:
                        tokenValue = scanString();
                        return token = 3 /* StringLiteral */;
                    case 37 /* percent */:
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 48 /* PercentEqualsToken */;
                        }
                        return pos++, token = 28 /* PercentToken */;
                    case 38 /* ampersand */:
                        if (text.charCodeAt(pos + 1) === 38 /* ampersand */) {
                            return pos += 2, token = 39 /* AmpersandAmpersandToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 52 /* AmpersandEqualsToken */;
                        }
                        return pos++, token = 34 /* AmpersandToken */;
                    case 40 /* openParen */:
                        return pos++, token = 7 /* OpenParenToken */;
                    case 41 /* closeParen */:
                        return pos++, token = 8 /* CloseParenToken */;
                    case 42 /* asterisk */:
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 46 /* AsteriskEqualsToken */;
                        }
                        return pos++, token = 26 /* AsteriskToken */;
                    case 43 /* plus */:
                        if (text.charCodeAt(pos + 1) === 43 /* plus */) {
                            return pos += 2, token = 29 /* PlusPlusToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 44 /* PlusEqualsToken */;
                        }
                        return pos++, token = 24 /* PlusToken */;
                    case 44 /* comma */:
                        return pos++, token = 14 /* CommaToken */;
                    case 45 /* minus */:
                        if (text.charCodeAt(pos + 1) === 45 /* minus */) {
                            return pos += 2, token = 30 /* MinusMinusToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 45 /* MinusEqualsToken */;
                        }
                        return pos++, token = 25 /* MinusToken */;
                    case 46 /* dot */:
                        if (isDigit(text.charCodeAt(pos + 1))) {
                            tokenValue = "" + scanNumber();
                            return token = 2 /* NumericLiteral */;
                        }
                        if (text.charCodeAt(pos + 1) === 46 /* dot */ && text.charCodeAt(pos + 2) === 46 /* dot */) {
                            return pos += 3, token = 12 /* DotDotDotToken */;
                        }
                        return pos++, token = 11 /* DotToken */;
                    case 47 /* slash */:
                        if (text.charCodeAt(pos + 1) === 47 /* slash */) {
                            pos += 2;
                            while (pos < len) {
                                if (isLineBreak(text.charCodeAt(pos))) {
                                    break;
                                }
                                pos++;
                            }
                            if (onComment) {
                                onComment(tokenPos, pos);
                            }
                            continue;
                        }
                        if (text.charCodeAt(pos + 1) === 42 /* asterisk */) {
                            pos += 2;
                            var safeLength = len - 1;
                            var commentClosed = false;
                            while (pos < safeLength) {
                                var ch = text.charCodeAt(pos);
                                if (ch === 42 /* asterisk */ && text.charCodeAt(pos + 1) === 47 /* slash */) {
                                    pos += 2;
                                    commentClosed = true;
                                    break;
                                }
                                if (isLineBreak(ch)) {
                                    precedingLineBreak = true;
                                }
                                pos++;
                            }
                            if (!commentClosed) {
                                pos++;
                                onError(ts.Diagnostics.Asterisk_Slash_expected);
                            }
                            if (onComment) {
                                onComment(tokenPos, pos);
                            }
                            continue;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 47 /* SlashEqualsToken */;
                        }
                        return pos++, token = 27 /* SlashToken */;
                    case 48 /* _0 */:
                        if (pos + 2 < len && (text.charCodeAt(pos + 1) === 88 /* X */ || text.charCodeAt(pos + 1) === 120 /* x */)) {
                            pos += 2;
                            var value = scanHexDigits(1, false);
                            if (value < 0) {
                                error(ts.Diagnostics.Hexadecimal_digit_expected);
                                value = 0;
                            }
                            tokenValue = "" + value;
                            return 2 /* NumericLiteral */;
                        }
                    case 49 /* _1 */:
                    case 50 /* _2 */:
                    case 51 /* _3 */:
                    case 52 /* _4 */:
                    case 53 /* _5 */:
                    case 54 /* _6 */:
                    case 55 /* _7 */:
                    case 56 /* _8 */:
                    case 57 /* _9 */:
                        tokenValue = "" + scanNumber();
                        return token = 2 /* NumericLiteral */;
                    case 58 /* colon */:
                        return pos++, token = 42 /* ColonToken */;
                    case 59 /* semicolon */:
                        return pos++, token = 13 /* SemicolonToken */;
                    case 60 /* lessThan */:
                        if (text.charCodeAt(pos + 1) === 60 /* lessThan */) {
                            if (text.charCodeAt(pos + 2) === 61 /* equals */) {
                                return pos += 3, token = 49 /* LessThanLessThanEqualsToken */;
                            }
                            return pos += 2, token = 31 /* LessThanLessThanToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 17 /* LessThanEqualsToken */;
                        }
                        return pos++, token = 15 /* LessThanToken */;
                    case 61 /* equals */:
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            if (text.charCodeAt(pos + 2) === 61 /* equals */) {
                                return pos += 3, token = 21 /* EqualsEqualsEqualsToken */;
                            }
                            return pos += 2, token = 19 /* EqualsEqualsToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 62 /* greaterThan */) {
                            return pos += 2, token = 23 /* EqualsGreaterThanToken */;
                        }
                        return pos++, token = 43 /* EqualsToken */;
                    case 62 /* greaterThan */:
                        return pos++, token = 16 /* GreaterThanToken */;
                    case 63 /* question */:
                        return pos++, token = 41 /* QuestionToken */;
                    case 91 /* openBracket */:
                        return pos++, token = 9 /* OpenBracketToken */;
                    case 93 /* closeBracket */:
                        return pos++, token = 10 /* CloseBracketToken */;
                    case 94 /* caret */:
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 54 /* CaretEqualsToken */;
                        }
                        return pos++, token = 36 /* CaretToken */;
                    case 123 /* openBrace */:
                        return pos++, token = 5 /* OpenBraceToken */;
                    case 124 /* bar */:
                        if (text.charCodeAt(pos + 1) === 124 /* bar */) {
                            return pos += 2, token = 40 /* BarBarToken */;
                        }
                        if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                            return pos += 2, token = 53 /* BarEqualsToken */;
                        }
                        return pos++, token = 35 /* BarToken */;
                    case 125 /* closeBrace */:
                        return pos++, token = 6 /* CloseBraceToken */;
                    case 126 /* tilde */:
                        return pos++, token = 38 /* TildeToken */;
                    case 92 /* backslash */:
                        var ch = peekUnicodeEscape();
                        if (ch >= 0 && isIdentifierStart(ch)) {
                            pos += 6;
                            tokenValue = String.fromCharCode(ch) + scanIdentifierParts();
                            return token = getIdentifierToken();
                        }
                        error(ts.Diagnostics.Invalid_character);
                        return pos++, token = 0 /* Unknown */;
                    default:
                        if (isIdentifierStart(ch)) {
                            pos++;
                            while (pos < len && isIdentifierPart(ch = text.charCodeAt(pos)))
                                pos++;
                            tokenValue = text.substring(tokenPos, pos);
                            if (ch === 92 /* backslash */) {
                                tokenValue += scanIdentifierParts();
                            }
                            return token = getIdentifierToken();
                        }
                        else if (isWhiteSpace(ch)) {
                            pos++;
                            continue;
                        }
                        else if (isLineBreak(ch)) {
                            precedingLineBreak = true;
                            pos++;
                            continue;
                        }
                        error(ts.Diagnostics.Invalid_character);
                        return pos++, token = 0 /* Unknown */;
                }
            }
        }
        function reScanGreaterToken() {
            if (token === 16 /* GreaterThanToken */) {
                if (text.charCodeAt(pos) === 62 /* greaterThan */) {
                    if (text.charCodeAt(pos + 1) === 62 /* greaterThan */) {
                        if (text.charCodeAt(pos + 2) === 61 /* equals */) {
                            return pos += 3, token = 51 /* GreaterThanGreaterThanGreaterThanEqualsToken */;
                        }
                        return pos += 2, token = 33 /* GreaterThanGreaterThanGreaterThanToken */;
                    }
                    if (text.charCodeAt(pos + 1) === 61 /* equals */) {
                        return pos += 2, token = 50 /* GreaterThanGreaterThanEqualsToken */;
                    }
                    return pos++, token = 32 /* GreaterThanGreaterThanToken */;
                }
                if (text.charCodeAt(pos) === 61 /* equals */) {
                    return pos++, token = 18 /* GreaterThanEqualsToken */;
                }
            }
            return token;
        }
        function reScanSlashToken() {
            if (token === 27 /* SlashToken */ || token === 47 /* SlashEqualsToken */) {
                var p = tokenPos + 1;
                var inEscape = false;
                var inClass = false;
                while (true) {
                    if (p >= len) {
                        return token;
                    }
                    var ch = text.charCodeAt(p);
                    if (isLineBreak(ch)) {
                        return token;
                    }
                    if (inEscape) {
                        inEscape = false;
                    }
                    else if (ch === 47 /* slash */) {
                        break;
                    }
                    else if (ch === 91 /* openBracket */) {
                        inClass = true;
                    }
                    else if (ch === 92 /* backslash */) {
                        inEscape = true;
                    }
                    else if (ch === 93 /* closeBracket */) {
                        inClass = false;
                    }
                    p++;
                }
                p++;
                while (isIdentifierPart(text.charCodeAt(p)))
                    p++;
                pos = p;
                tokenValue = text.substring(tokenPos, pos);
                token = 4 /* RegularExpressionLiteral */;
            }
            return token;
        }
        function tryScan(callback) {
            var savePos = pos;
            var saveStartPos = startPos;
            var saveTokenPos = tokenPos;
            var saveToken = token;
            var saveTokenValue = tokenValue;
            var savePrecedingLineBreak = precedingLineBreak;
            var result = callback();
            if (!result) {
                pos = savePos;
                startPos = saveStartPos;
                tokenPos = saveTokenPos;
                token = saveToken;
                tokenValue = saveTokenValue;
                precedingLineBreak = savePrecedingLineBreak;
            }
            return result;
        }
        function setText(newText) {
            text = newText || "";
            len = text.length;
            setTextPos(0);
        }
        function setTextPos(textPos) {
            pos = textPos;
            startPos = textPos;
            tokenPos = textPos;
            token = 0 /* Unknown */;
            precedingLineBreak = false;
        }
        setText(text);
        return {
            getStartPos: function () { return startPos; },
            getTextPos: function () { return pos; },
            getToken: function () { return token; },
            getTokenPos: function () { return tokenPos; },
            getTokenText: function () { return text.substring(tokenPos, pos); },
            getTokenValue: function () { return tokenValue; },
            hasPrecedingLineBreak: function () { return precedingLineBreak; },
            isIdentifier: function () { return token === 55 /* Identifier */ || token > ts.SyntaxKind.LastReservedWord; },
            isReservedWord: function () { return token >= ts.SyntaxKind.FirstReservedWord && token <= ts.SyntaxKind.LastReservedWord; },
            reScanGreaterToken: reScanGreaterToken,
            reScanSlashToken: reScanSlashToken,
            scan: scan,
            setText: setText,
            setTextPos: setTextPos,
            tryScan: tryScan
        };
    }
    ts.createScanner = createScanner;
})(ts || (ts = {}));
var ts;
(function (ts) {
    (function (SyntaxKind) {
        SyntaxKind[SyntaxKind["Unknown"] = 0] = "Unknown";
        SyntaxKind[SyntaxKind["EndOfFileToken"] = 1] = "EndOfFileToken";
        SyntaxKind[SyntaxKind["NumericLiteral"] = 2] = "NumericLiteral";
        SyntaxKind[SyntaxKind["StringLiteral"] = 3] = "StringLiteral";
        SyntaxKind[SyntaxKind["RegularExpressionLiteral"] = 4] = "RegularExpressionLiteral";
        SyntaxKind[SyntaxKind["OpenBraceToken"] = 5] = "OpenBraceToken";
        SyntaxKind[SyntaxKind["CloseBraceToken"] = 6] = "CloseBraceToken";
        SyntaxKind[SyntaxKind["OpenParenToken"] = 7] = "OpenParenToken";
        SyntaxKind[SyntaxKind["CloseParenToken"] = 8] = "CloseParenToken";
        SyntaxKind[SyntaxKind["OpenBracketToken"] = 9] = "OpenBracketToken";
        SyntaxKind[SyntaxKind["CloseBracketToken"] = 10] = "CloseBracketToken";
        SyntaxKind[SyntaxKind["DotToken"] = 11] = "DotToken";
        SyntaxKind[SyntaxKind["DotDotDotToken"] = 12] = "DotDotDotToken";
        SyntaxKind[SyntaxKind["SemicolonToken"] = 13] = "SemicolonToken";
        SyntaxKind[SyntaxKind["CommaToken"] = 14] = "CommaToken";
        SyntaxKind[SyntaxKind["LessThanToken"] = 15] = "LessThanToken";
        SyntaxKind[SyntaxKind["GreaterThanToken"] = 16] = "GreaterThanToken";
        SyntaxKind[SyntaxKind["LessThanEqualsToken"] = 17] = "LessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanEqualsToken"] = 18] = "GreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["EqualsEqualsToken"] = 19] = "EqualsEqualsToken";
        SyntaxKind[SyntaxKind["ExclamationEqualsToken"] = 20] = "ExclamationEqualsToken";
        SyntaxKind[SyntaxKind["EqualsEqualsEqualsToken"] = 21] = "EqualsEqualsEqualsToken";
        SyntaxKind[SyntaxKind["ExclamationEqualsEqualsToken"] = 22] = "ExclamationEqualsEqualsToken";
        SyntaxKind[SyntaxKind["EqualsGreaterThanToken"] = 23] = "EqualsGreaterThanToken";
        SyntaxKind[SyntaxKind["PlusToken"] = 24] = "PlusToken";
        SyntaxKind[SyntaxKind["MinusToken"] = 25] = "MinusToken";
        SyntaxKind[SyntaxKind["AsteriskToken"] = 26] = "AsteriskToken";
        SyntaxKind[SyntaxKind["SlashToken"] = 27] = "SlashToken";
        SyntaxKind[SyntaxKind["PercentToken"] = 28] = "PercentToken";
        SyntaxKind[SyntaxKind["PlusPlusToken"] = 29] = "PlusPlusToken";
        SyntaxKind[SyntaxKind["MinusMinusToken"] = 30] = "MinusMinusToken";
        SyntaxKind[SyntaxKind["LessThanLessThanToken"] = 31] = "LessThanLessThanToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanToken"] = 32] = "GreaterThanGreaterThanToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanToken"] = 33] = "GreaterThanGreaterThanGreaterThanToken";
        SyntaxKind[SyntaxKind["AmpersandToken"] = 34] = "AmpersandToken";
        SyntaxKind[SyntaxKind["BarToken"] = 35] = "BarToken";
        SyntaxKind[SyntaxKind["CaretToken"] = 36] = "CaretToken";
        SyntaxKind[SyntaxKind["ExclamationToken"] = 37] = "ExclamationToken";
        SyntaxKind[SyntaxKind["TildeToken"] = 38] = "TildeToken";
        SyntaxKind[SyntaxKind["AmpersandAmpersandToken"] = 39] = "AmpersandAmpersandToken";
        SyntaxKind[SyntaxKind["BarBarToken"] = 40] = "BarBarToken";
        SyntaxKind[SyntaxKind["QuestionToken"] = 41] = "QuestionToken";
        SyntaxKind[SyntaxKind["ColonToken"] = 42] = "ColonToken";
        SyntaxKind[SyntaxKind["EqualsToken"] = 43] = "EqualsToken";
        SyntaxKind[SyntaxKind["PlusEqualsToken"] = 44] = "PlusEqualsToken";
        SyntaxKind[SyntaxKind["MinusEqualsToken"] = 45] = "MinusEqualsToken";
        SyntaxKind[SyntaxKind["AsteriskEqualsToken"] = 46] = "AsteriskEqualsToken";
        SyntaxKind[SyntaxKind["SlashEqualsToken"] = 47] = "SlashEqualsToken";
        SyntaxKind[SyntaxKind["PercentEqualsToken"] = 48] = "PercentEqualsToken";
        SyntaxKind[SyntaxKind["LessThanLessThanEqualsToken"] = 49] = "LessThanLessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanEqualsToken"] = 50] = "GreaterThanGreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanEqualsToken"] = 51] = "GreaterThanGreaterThanGreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["AmpersandEqualsToken"] = 52] = "AmpersandEqualsToken";
        SyntaxKind[SyntaxKind["BarEqualsToken"] = 53] = "BarEqualsToken";
        SyntaxKind[SyntaxKind["CaretEqualsToken"] = 54] = "CaretEqualsToken";
        SyntaxKind[SyntaxKind["Identifier"] = 55] = "Identifier";
        SyntaxKind[SyntaxKind["BreakKeyword"] = 56] = "BreakKeyword";
        SyntaxKind[SyntaxKind["CaseKeyword"] = 57] = "CaseKeyword";
        SyntaxKind[SyntaxKind["CatchKeyword"] = 58] = "CatchKeyword";
        SyntaxKind[SyntaxKind["ClassKeyword"] = 59] = "ClassKeyword";
        SyntaxKind[SyntaxKind["ConstKeyword"] = 60] = "ConstKeyword";
        SyntaxKind[SyntaxKind["ContinueKeyword"] = 61] = "ContinueKeyword";
        SyntaxKind[SyntaxKind["DebuggerKeyword"] = 62] = "DebuggerKeyword";
        SyntaxKind[SyntaxKind["DefaultKeyword"] = 63] = "DefaultKeyword";
        SyntaxKind[SyntaxKind["DeleteKeyword"] = 64] = "DeleteKeyword";
        SyntaxKind[SyntaxKind["DoKeyword"] = 65] = "DoKeyword";
        SyntaxKind[SyntaxKind["ElseKeyword"] = 66] = "ElseKeyword";
        SyntaxKind[SyntaxKind["EnumKeyword"] = 67] = "EnumKeyword";
        SyntaxKind[SyntaxKind["ExportKeyword"] = 68] = "ExportKeyword";
        SyntaxKind[SyntaxKind["ExtendsKeyword"] = 69] = "ExtendsKeyword";
        SyntaxKind[SyntaxKind["FalseKeyword"] = 70] = "FalseKeyword";
        SyntaxKind[SyntaxKind["FinallyKeyword"] = 71] = "FinallyKeyword";
        SyntaxKind[SyntaxKind["ForKeyword"] = 72] = "ForKeyword";
        SyntaxKind[SyntaxKind["FunctionKeyword"] = 73] = "FunctionKeyword";
        SyntaxKind[SyntaxKind["IfKeyword"] = 74] = "IfKeyword";
        SyntaxKind[SyntaxKind["ImportKeyword"] = 75] = "ImportKeyword";
        SyntaxKind[SyntaxKind["InKeyword"] = 76] = "InKeyword";
        SyntaxKind[SyntaxKind["InstanceOfKeyword"] = 77] = "InstanceOfKeyword";
        SyntaxKind[SyntaxKind["NewKeyword"] = 78] = "NewKeyword";
        SyntaxKind[SyntaxKind["NullKeyword"] = 79] = "NullKeyword";
        SyntaxKind[SyntaxKind["ReturnKeyword"] = 80] = "ReturnKeyword";
        SyntaxKind[SyntaxKind["SuperKeyword"] = 81] = "SuperKeyword";
        SyntaxKind[SyntaxKind["SwitchKeyword"] = 82] = "SwitchKeyword";
        SyntaxKind[SyntaxKind["ThisKeyword"] = 83] = "ThisKeyword";
        SyntaxKind[SyntaxKind["ThrowKeyword"] = 84] = "ThrowKeyword";
        SyntaxKind[SyntaxKind["TrueKeyword"] = 85] = "TrueKeyword";
        SyntaxKind[SyntaxKind["TryKeyword"] = 86] = "TryKeyword";
        SyntaxKind[SyntaxKind["TypeOfKeyword"] = 87] = "TypeOfKeyword";
        SyntaxKind[SyntaxKind["VarKeyword"] = 88] = "VarKeyword";
        SyntaxKind[SyntaxKind["VoidKeyword"] = 89] = "VoidKeyword";
        SyntaxKind[SyntaxKind["WhileKeyword"] = 90] = "WhileKeyword";
        SyntaxKind[SyntaxKind["WithKeyword"] = 91] = "WithKeyword";
        SyntaxKind[SyntaxKind["ImplementsKeyword"] = 92] = "ImplementsKeyword";
        SyntaxKind[SyntaxKind["InterfaceKeyword"] = 93] = "InterfaceKeyword";
        SyntaxKind[SyntaxKind["LetKeyword"] = 94] = "LetKeyword";
        SyntaxKind[SyntaxKind["PackageKeyword"] = 95] = "PackageKeyword";
        SyntaxKind[SyntaxKind["PrivateKeyword"] = 96] = "PrivateKeyword";
        SyntaxKind[SyntaxKind["ProtectedKeyword"] = 97] = "ProtectedKeyword";
        SyntaxKind[SyntaxKind["PublicKeyword"] = 98] = "PublicKeyword";
        SyntaxKind[SyntaxKind["StaticKeyword"] = 99] = "StaticKeyword";
        SyntaxKind[SyntaxKind["YieldKeyword"] = 100] = "YieldKeyword";
        SyntaxKind[SyntaxKind["AnyKeyword"] = 101] = "AnyKeyword";
        SyntaxKind[SyntaxKind["BooleanKeyword"] = 102] = "BooleanKeyword";
        SyntaxKind[SyntaxKind["ConstructorKeyword"] = 103] = "ConstructorKeyword";
        SyntaxKind[SyntaxKind["DeclareKeyword"] = 104] = "DeclareKeyword";
        SyntaxKind[SyntaxKind["GetKeyword"] = 105] = "GetKeyword";
        SyntaxKind[SyntaxKind["ModuleKeyword"] = 106] = "ModuleKeyword";
        SyntaxKind[SyntaxKind["RequireKeyword"] = 107] = "RequireKeyword";
        SyntaxKind[SyntaxKind["NumberKeyword"] = 108] = "NumberKeyword";
        SyntaxKind[SyntaxKind["SetKeyword"] = 109] = "SetKeyword";
        SyntaxKind[SyntaxKind["StringKeyword"] = 110] = "StringKeyword";
        SyntaxKind[SyntaxKind["Missing"] = 111] = "Missing";
        SyntaxKind[SyntaxKind["QualifiedName"] = 112] = "QualifiedName";
        SyntaxKind[SyntaxKind["TypeParameter"] = 113] = "TypeParameter";
        SyntaxKind[SyntaxKind["Parameter"] = 114] = "Parameter";
        SyntaxKind[SyntaxKind["Property"] = 115] = "Property";
        SyntaxKind[SyntaxKind["Method"] = 116] = "Method";
        SyntaxKind[SyntaxKind["Constructor"] = 117] = "Constructor";
        SyntaxKind[SyntaxKind["GetAccessor"] = 118] = "GetAccessor";
        SyntaxKind[SyntaxKind["SetAccessor"] = 119] = "SetAccessor";
        SyntaxKind[SyntaxKind["CallSignature"] = 120] = "CallSignature";
        SyntaxKind[SyntaxKind["ConstructSignature"] = 121] = "ConstructSignature";
        SyntaxKind[SyntaxKind["IndexSignature"] = 122] = "IndexSignature";
        SyntaxKind[SyntaxKind["TypeReference"] = 123] = "TypeReference";
        SyntaxKind[SyntaxKind["TypeQuery"] = 124] = "TypeQuery";
        SyntaxKind[SyntaxKind["TypeLiteral"] = 125] = "TypeLiteral";
        SyntaxKind[SyntaxKind["ArrayType"] = 126] = "ArrayType";
        SyntaxKind[SyntaxKind["ArrayLiteral"] = 127] = "ArrayLiteral";
        SyntaxKind[SyntaxKind["ObjectLiteral"] = 128] = "ObjectLiteral";
        SyntaxKind[SyntaxKind["PropertyAssignment"] = 129] = "PropertyAssignment";
        SyntaxKind[SyntaxKind["PropertyAccess"] = 130] = "PropertyAccess";
        SyntaxKind[SyntaxKind["IndexedAccess"] = 131] = "IndexedAccess";
        SyntaxKind[SyntaxKind["CallExpression"] = 132] = "CallExpression";
        SyntaxKind[SyntaxKind["NewExpression"] = 133] = "NewExpression";
        SyntaxKind[SyntaxKind["TypeAssertion"] = 134] = "TypeAssertion";
        SyntaxKind[SyntaxKind["ParenExpression"] = 135] = "ParenExpression";
        SyntaxKind[SyntaxKind["FunctionExpression"] = 136] = "FunctionExpression";
        SyntaxKind[SyntaxKind["ArrowFunction"] = 137] = "ArrowFunction";
        SyntaxKind[SyntaxKind["PrefixOperator"] = 138] = "PrefixOperator";
        SyntaxKind[SyntaxKind["PostfixOperator"] = 139] = "PostfixOperator";
        SyntaxKind[SyntaxKind["BinaryExpression"] = 140] = "BinaryExpression";
        SyntaxKind[SyntaxKind["ConditionalExpression"] = 141] = "ConditionalExpression";
        SyntaxKind[SyntaxKind["OmittedExpression"] = 142] = "OmittedExpression";
        SyntaxKind[SyntaxKind["Block"] = 143] = "Block";
        SyntaxKind[SyntaxKind["VariableStatement"] = 144] = "VariableStatement";
        SyntaxKind[SyntaxKind["EmptyStatement"] = 145] = "EmptyStatement";
        SyntaxKind[SyntaxKind["ExpressionStatement"] = 146] = "ExpressionStatement";
        SyntaxKind[SyntaxKind["IfStatement"] = 147] = "IfStatement";
        SyntaxKind[SyntaxKind["DoStatement"] = 148] = "DoStatement";
        SyntaxKind[SyntaxKind["WhileStatement"] = 149] = "WhileStatement";
        SyntaxKind[SyntaxKind["ForStatement"] = 150] = "ForStatement";
        SyntaxKind[SyntaxKind["ForInStatement"] = 151] = "ForInStatement";
        SyntaxKind[SyntaxKind["ContinueStatement"] = 152] = "ContinueStatement";
        SyntaxKind[SyntaxKind["BreakStatement"] = 153] = "BreakStatement";
        SyntaxKind[SyntaxKind["ReturnStatement"] = 154] = "ReturnStatement";
        SyntaxKind[SyntaxKind["WithStatement"] = 155] = "WithStatement";
        SyntaxKind[SyntaxKind["SwitchStatement"] = 156] = "SwitchStatement";
        SyntaxKind[SyntaxKind["CaseClause"] = 157] = "CaseClause";
        SyntaxKind[SyntaxKind["DefaultClause"] = 158] = "DefaultClause";
        SyntaxKind[SyntaxKind["LabelledStatement"] = 159] = "LabelledStatement";
        SyntaxKind[SyntaxKind["ThrowStatement"] = 160] = "ThrowStatement";
        SyntaxKind[SyntaxKind["TryStatement"] = 161] = "TryStatement";
        SyntaxKind[SyntaxKind["TryBlock"] = 162] = "TryBlock";
        SyntaxKind[SyntaxKind["CatchBlock"] = 163] = "CatchBlock";
        SyntaxKind[SyntaxKind["FinallyBlock"] = 164] = "FinallyBlock";
        SyntaxKind[SyntaxKind["DebuggerStatement"] = 165] = "DebuggerStatement";
        SyntaxKind[SyntaxKind["VariableDeclaration"] = 166] = "VariableDeclaration";
        SyntaxKind[SyntaxKind["FunctionDeclaration"] = 167] = "FunctionDeclaration";
        SyntaxKind[SyntaxKind["FunctionBlock"] = 168] = "FunctionBlock";
        SyntaxKind[SyntaxKind["ClassDeclaration"] = 169] = "ClassDeclaration";
        SyntaxKind[SyntaxKind["InterfaceDeclaration"] = 170] = "InterfaceDeclaration";
        SyntaxKind[SyntaxKind["EnumDeclaration"] = 171] = "EnumDeclaration";
        SyntaxKind[SyntaxKind["ModuleDeclaration"] = 172] = "ModuleDeclaration";
        SyntaxKind[SyntaxKind["ModuleBlock"] = 173] = "ModuleBlock";
        SyntaxKind[SyntaxKind["ImportDeclaration"] = 174] = "ImportDeclaration";
        SyntaxKind[SyntaxKind["ExportAssignment"] = 175] = "ExportAssignment";
        SyntaxKind[SyntaxKind["EnumMember"] = 176] = "EnumMember";
        SyntaxKind[SyntaxKind["SourceFile"] = 177] = "SourceFile";
        SyntaxKind[SyntaxKind["Program"] = 178] = "Program";
        SyntaxKind[SyntaxKind["SyntaxList"] = 179] = "SyntaxList";
        SyntaxKind[SyntaxKind["Count"] = 180] = "Count";
        SyntaxKind[SyntaxKind["FirstAssignment"] = SyntaxKind.EqualsToken] = "FirstAssignment";
        SyntaxKind[SyntaxKind["LastAssignment"] = SyntaxKind.CaretEqualsToken] = "LastAssignment";
        SyntaxKind[SyntaxKind["FirstReservedWord"] = SyntaxKind.BreakKeyword] = "FirstReservedWord";
        SyntaxKind[SyntaxKind["LastReservedWord"] = SyntaxKind.WithKeyword] = "LastReservedWord";
        SyntaxKind[SyntaxKind["FirstKeyword"] = SyntaxKind.BreakKeyword] = "FirstKeyword";
        SyntaxKind[SyntaxKind["LastKeyword"] = SyntaxKind.StringKeyword] = "LastKeyword";
        SyntaxKind[SyntaxKind["FirstFutureReservedWord"] = SyntaxKind.ImplementsKeyword] = "FirstFutureReservedWord";
        SyntaxKind[SyntaxKind["LastFutureReservedWord"] = SyntaxKind.YieldKeyword] = "LastFutureReservedWord";
    })(ts.SyntaxKind || (ts.SyntaxKind = {}));
    var SyntaxKind = ts.SyntaxKind;
    (function (NodeFlags) {
        NodeFlags[NodeFlags["Export"] = 0x00000001] = "Export";
        NodeFlags[NodeFlags["Ambient"] = 0x00000002] = "Ambient";
        NodeFlags[NodeFlags["QuestionMark"] = 0x00000004] = "QuestionMark";
        NodeFlags[NodeFlags["Rest"] = 0x00000008] = "Rest";
        NodeFlags[NodeFlags["Public"] = 0x00000010] = "Public";
        NodeFlags[NodeFlags["Private"] = 0x00000020] = "Private";
        NodeFlags[NodeFlags["Static"] = 0x00000040] = "Static";
        NodeFlags[NodeFlags["MultiLine"] = 0x00000080] = "MultiLine";
        NodeFlags[NodeFlags["Synthetic"] = 0x00000100] = "Synthetic";
        NodeFlags[NodeFlags["DeclarationFile"] = 0x00000200] = "DeclarationFile";
        NodeFlags[NodeFlags["Modifier"] = NodeFlags.Export | NodeFlags.Ambient | NodeFlags.Public | NodeFlags.Private | NodeFlags.Static] = "Modifier";
    })(ts.NodeFlags || (ts.NodeFlags = {}));
    var NodeFlags = ts.NodeFlags;
    (function (TypeFormatFlags) {
        TypeFormatFlags[TypeFormatFlags["None"] = 0x00000000] = "None";
        TypeFormatFlags[TypeFormatFlags["WriteArrayAsGenericType"] = 0x00000001] = "WriteArrayAsGenericType";
    })(ts.TypeFormatFlags || (ts.TypeFormatFlags = {}));
    var TypeFormatFlags = ts.TypeFormatFlags;
    (function (SymbolFlags) {
        SymbolFlags[SymbolFlags["Variable"] = 0x00000001] = "Variable";
        SymbolFlags[SymbolFlags["Property"] = 0x00000002] = "Property";
        SymbolFlags[SymbolFlags["EnumMember"] = 0x00000004] = "EnumMember";
        SymbolFlags[SymbolFlags["Function"] = 0x00000008] = "Function";
        SymbolFlags[SymbolFlags["Class"] = 0x00000010] = "Class";
        SymbolFlags[SymbolFlags["Interface"] = 0x00000020] = "Interface";
        SymbolFlags[SymbolFlags["Enum"] = 0x00000040] = "Enum";
        SymbolFlags[SymbolFlags["ValueModule"] = 0x00000080] = "ValueModule";
        SymbolFlags[SymbolFlags["NamespaceModule"] = 0x00000100] = "NamespaceModule";
        SymbolFlags[SymbolFlags["TypeLiteral"] = 0x00000200] = "TypeLiteral";
        SymbolFlags[SymbolFlags["ObjectLiteral"] = 0x00000400] = "ObjectLiteral";
        SymbolFlags[SymbolFlags["Method"] = 0x00000800] = "Method";
        SymbolFlags[SymbolFlags["Constructor"] = 0x00001000] = "Constructor";
        SymbolFlags[SymbolFlags["GetAccessor"] = 0x00002000] = "GetAccessor";
        SymbolFlags[SymbolFlags["SetAccessor"] = 0x00004000] = "SetAccessor";
        SymbolFlags[SymbolFlags["CallSignature"] = 0x00008000] = "CallSignature";
        SymbolFlags[SymbolFlags["ConstructSignature"] = 0x00010000] = "ConstructSignature";
        SymbolFlags[SymbolFlags["IndexSignature"] = 0x00020000] = "IndexSignature";
        SymbolFlags[SymbolFlags["TypeParameter"] = 0x00040000] = "TypeParameter";
        SymbolFlags[SymbolFlags["ExportValue"] = 0x00080000] = "ExportValue";
        SymbolFlags[SymbolFlags["ExportType"] = 0x00100000] = "ExportType";
        SymbolFlags[SymbolFlags["ExportNamespace"] = 0x00200000] = "ExportNamespace";
        SymbolFlags[SymbolFlags["Import"] = 0x00400000] = "Import";
        SymbolFlags[SymbolFlags["Instantiated"] = 0x00800000] = "Instantiated";
        SymbolFlags[SymbolFlags["Merged"] = 0x01000000] = "Merged";
        SymbolFlags[SymbolFlags["Transient"] = 0x02000000] = "Transient";
        SymbolFlags[SymbolFlags["Prototype"] = 0x04000000] = "Prototype";
        SymbolFlags[SymbolFlags["Value"] = SymbolFlags.Variable | SymbolFlags.Property | SymbolFlags.EnumMember | SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule | SymbolFlags.Method | SymbolFlags.GetAccessor | SymbolFlags.SetAccessor] = "Value";
        SymbolFlags[SymbolFlags["Type"] = SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.Enum | SymbolFlags.TypeLiteral | SymbolFlags.ObjectLiteral | SymbolFlags.TypeParameter] = "Type";
        SymbolFlags[SymbolFlags["Namespace"] = SymbolFlags.ValueModule | SymbolFlags.NamespaceModule] = "Namespace";
        SymbolFlags[SymbolFlags["Module"] = SymbolFlags.ValueModule | SymbolFlags.NamespaceModule] = "Module";
        SymbolFlags[SymbolFlags["Accessor"] = SymbolFlags.GetAccessor | SymbolFlags.SetAccessor] = "Accessor";
        SymbolFlags[SymbolFlags["Signature"] = SymbolFlags.CallSignature | SymbolFlags.ConstructSignature | SymbolFlags.IndexSignature] = "Signature";
        SymbolFlags[SymbolFlags["ParameterExcludes"] = SymbolFlags.Value] = "ParameterExcludes";
        SymbolFlags[SymbolFlags["VariableExcludes"] = SymbolFlags.Value & ~SymbolFlags.Variable] = "VariableExcludes";
        SymbolFlags[SymbolFlags["PropertyExcludes"] = SymbolFlags.Value] = "PropertyExcludes";
        SymbolFlags[SymbolFlags["EnumMemberExcludes"] = SymbolFlags.Value] = "EnumMemberExcludes";
        SymbolFlags[SymbolFlags["FunctionExcludes"] = SymbolFlags.Value & ~(SymbolFlags.Function | SymbolFlags.ValueModule)] = "FunctionExcludes";
        SymbolFlags[SymbolFlags["ClassExcludes"] = (SymbolFlags.Value | SymbolFlags.Type) & ~SymbolFlags.ValueModule] = "ClassExcludes";
        SymbolFlags[SymbolFlags["InterfaceExcludes"] = SymbolFlags.Type & ~SymbolFlags.Interface] = "InterfaceExcludes";
        SymbolFlags[SymbolFlags["EnumExcludes"] = (SymbolFlags.Value | SymbolFlags.Type) & ~(SymbolFlags.Enum | SymbolFlags.ValueModule)] = "EnumExcludes";
        SymbolFlags[SymbolFlags["ValueModuleExcludes"] = SymbolFlags.Value & ~(SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule)] = "ValueModuleExcludes";
        SymbolFlags[SymbolFlags["NamespaceModuleExcludes"] = 0] = "NamespaceModuleExcludes";
        SymbolFlags[SymbolFlags["MethodExcludes"] = SymbolFlags.Value & ~SymbolFlags.Method] = "MethodExcludes";
        SymbolFlags[SymbolFlags["GetAccessorExcludes"] = SymbolFlags.Value & ~SymbolFlags.SetAccessor] = "GetAccessorExcludes";
        SymbolFlags[SymbolFlags["SetAccessorExcludes"] = SymbolFlags.Value & ~SymbolFlags.GetAccessor] = "SetAccessorExcludes";
        SymbolFlags[SymbolFlags["TypeParameterExcludes"] = SymbolFlags.Type & ~SymbolFlags.TypeParameter] = "TypeParameterExcludes";
        SymbolFlags[SymbolFlags["ImportExcludes"] = SymbolFlags.Import] = "ImportExcludes";
        SymbolFlags[SymbolFlags["ModuleMember"] = SymbolFlags.Variable | SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.Enum | SymbolFlags.Module | SymbolFlags.Import] = "ModuleMember";
        SymbolFlags[SymbolFlags["ExportHasLocal"] = SymbolFlags.Function | SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.ValueModule] = "ExportHasLocal";
        SymbolFlags[SymbolFlags["HasLocals"] = SymbolFlags.Function | SymbolFlags.Module | SymbolFlags.Method | SymbolFlags.Constructor | SymbolFlags.Accessor | SymbolFlags.Signature] = "HasLocals";
        SymbolFlags[SymbolFlags["HasExports"] = SymbolFlags.Class | SymbolFlags.Enum | SymbolFlags.Module] = "HasExports";
        SymbolFlags[SymbolFlags["HasMembers"] = SymbolFlags.Class | SymbolFlags.Interface | SymbolFlags.TypeLiteral | SymbolFlags.ObjectLiteral] = "HasMembers";
        SymbolFlags[SymbolFlags["IsContainer"] = SymbolFlags.HasLocals | SymbolFlags.HasExports | SymbolFlags.HasMembers] = "IsContainer";
        SymbolFlags[SymbolFlags["PropertyOrAccessor"] = SymbolFlags.Property | SymbolFlags.Accessor] = "PropertyOrAccessor";
        SymbolFlags[SymbolFlags["Export"] = SymbolFlags.ExportNamespace | SymbolFlags.ExportType | SymbolFlags.ExportValue] = "Export";
    })(ts.SymbolFlags || (ts.SymbolFlags = {}));
    var SymbolFlags = ts.SymbolFlags;
    (function (NodeCheckFlags) {
        NodeCheckFlags[NodeCheckFlags["TypeChecked"] = 0x00000001] = "TypeChecked";
        NodeCheckFlags[NodeCheckFlags["LexicalThis"] = 0x00000002] = "LexicalThis";
        NodeCheckFlags[NodeCheckFlags["CaptureThis"] = 0x00000004] = "CaptureThis";
        NodeCheckFlags[NodeCheckFlags["EmitExtends"] = 0x00000008] = "EmitExtends";
        NodeCheckFlags[NodeCheckFlags["SuperInstance"] = 0x00000010] = "SuperInstance";
        NodeCheckFlags[NodeCheckFlags["SuperStatic"] = 0x00000020] = "SuperStatic";
    })(ts.NodeCheckFlags || (ts.NodeCheckFlags = {}));
    var NodeCheckFlags = ts.NodeCheckFlags;
    (function (TypeFlags) {
        TypeFlags[TypeFlags["Any"] = 0x00000001] = "Any";
        TypeFlags[TypeFlags["String"] = 0x00000002] = "String";
        TypeFlags[TypeFlags["Number"] = 0x00000004] = "Number";
        TypeFlags[TypeFlags["Boolean"] = 0x00000008] = "Boolean";
        TypeFlags[TypeFlags["Void"] = 0x00000010] = "Void";
        TypeFlags[TypeFlags["Undefined"] = 0x00000020] = "Undefined";
        TypeFlags[TypeFlags["Null"] = 0x00000040] = "Null";
        TypeFlags[TypeFlags["Enum"] = 0x00000080] = "Enum";
        TypeFlags[TypeFlags["StringLiteral"] = 0x00000100] = "StringLiteral";
        TypeFlags[TypeFlags["TypeParameter"] = 0x00000200] = "TypeParameter";
        TypeFlags[TypeFlags["Class"] = 0x00000400] = "Class";
        TypeFlags[TypeFlags["Interface"] = 0x00000800] = "Interface";
        TypeFlags[TypeFlags["Reference"] = 0x00001000] = "Reference";
        TypeFlags[TypeFlags["Anonymous"] = 0x00002000] = "Anonymous";
        TypeFlags[TypeFlags["FromSignature"] = 0x00004000] = "FromSignature";
        TypeFlags[TypeFlags["Intrinsic"] = TypeFlags.Any | TypeFlags.String | TypeFlags.Number | TypeFlags.Boolean | TypeFlags.Void | TypeFlags.Undefined | TypeFlags.Null] = "Intrinsic";
        TypeFlags[TypeFlags["StringLike"] = TypeFlags.String | TypeFlags.StringLiteral] = "StringLike";
        TypeFlags[TypeFlags["NumberLike"] = TypeFlags.Number | TypeFlags.Enum] = "NumberLike";
        TypeFlags[TypeFlags["ObjectType"] = TypeFlags.Class | TypeFlags.Interface | TypeFlags.Reference | TypeFlags.Anonymous] = "ObjectType";
    })(ts.TypeFlags || (ts.TypeFlags = {}));
    var TypeFlags = ts.TypeFlags;
    (function (SignatureKind) {
        SignatureKind[SignatureKind["Call"] = 0] = "Call";
        SignatureKind[SignatureKind["Construct"] = 1] = "Construct";
    })(ts.SignatureKind || (ts.SignatureKind = {}));
    var SignatureKind = ts.SignatureKind;
    (function (IndexKind) {
        IndexKind[IndexKind["String"] = 0] = "String";
        IndexKind[IndexKind["Number"] = 1] = "Number";
    })(ts.IndexKind || (ts.IndexKind = {}));
    var IndexKind = ts.IndexKind;
    (function (DiagnosticCategory) {
        DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
        DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
        DiagnosticCategory[DiagnosticCategory["Message"] = 2] = "Message";
        DiagnosticCategory[DiagnosticCategory["NoPrefix"] = 3] = "NoPrefix";
    })(ts.DiagnosticCategory || (ts.DiagnosticCategory = {}));
    var DiagnosticCategory = ts.DiagnosticCategory;
    (function (ModuleKind) {
        ModuleKind[ModuleKind["None"] = 0] = "None";
        ModuleKind[ModuleKind["CommonJS"] = 1] = "CommonJS";
        ModuleKind[ModuleKind["AMD"] = 2] = "AMD";
    })(ts.ModuleKind || (ts.ModuleKind = {}));
    var ModuleKind = ts.ModuleKind;
    (function (ScriptTarget) {
        ScriptTarget[ScriptTarget["ES3"] = 0] = "ES3";
        ScriptTarget[ScriptTarget["ES5"] = 1] = "ES5";
    })(ts.ScriptTarget || (ts.ScriptTarget = {}));
    var ScriptTarget = ts.ScriptTarget;
    (function (CharacterCodes) {
        CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
        CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 0x7F] = "maxAsciiCharacter";
        CharacterCodes[CharacterCodes["lineFeed"] = 0x0A] = "lineFeed";
        CharacterCodes[CharacterCodes["carriageReturn"] = 0x0D] = "carriageReturn";
        CharacterCodes[CharacterCodes["lineSeparator"] = 0x2028] = "lineSeparator";
        CharacterCodes[CharacterCodes["paragraphSeparator"] = 0x2029] = "paragraphSeparator";
        CharacterCodes[CharacterCodes["nextLine"] = 0x0085] = "nextLine";
        CharacterCodes[CharacterCodes["space"] = 0x0020] = "space";
        CharacterCodes[CharacterCodes["nonBreakingSpace"] = 0x00A0] = "nonBreakingSpace";
        CharacterCodes[CharacterCodes["enQuad"] = 0x2000] = "enQuad";
        CharacterCodes[CharacterCodes["emQuad"] = 0x2001] = "emQuad";
        CharacterCodes[CharacterCodes["enSpace"] = 0x2002] = "enSpace";
        CharacterCodes[CharacterCodes["emSpace"] = 0x2003] = "emSpace";
        CharacterCodes[CharacterCodes["threePerEmSpace"] = 0x2004] = "threePerEmSpace";
        CharacterCodes[CharacterCodes["fourPerEmSpace"] = 0x2005] = "fourPerEmSpace";
        CharacterCodes[CharacterCodes["sixPerEmSpace"] = 0x2006] = "sixPerEmSpace";
        CharacterCodes[CharacterCodes["figureSpace"] = 0x2007] = "figureSpace";
        CharacterCodes[CharacterCodes["punctuationSpace"] = 0x2008] = "punctuationSpace";
        CharacterCodes[CharacterCodes["thinSpace"] = 0x2009] = "thinSpace";
        CharacterCodes[CharacterCodes["hairSpace"] = 0x200A] = "hairSpace";
        CharacterCodes[CharacterCodes["zeroWidthSpace"] = 0x200B] = "zeroWidthSpace";
        CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 0x202F] = "narrowNoBreakSpace";
        CharacterCodes[CharacterCodes["ideographicSpace"] = 0x3000] = "ideographicSpace";
        CharacterCodes[CharacterCodes["mathematicalSpace"] = 0x205F] = "mathematicalSpace";
        CharacterCodes[CharacterCodes["ogham"] = 0x1680] = "ogham";
        CharacterCodes[CharacterCodes["_"] = 0x5F] = "_";
        CharacterCodes[CharacterCodes["$"] = 0x24] = "$";
        CharacterCodes[CharacterCodes["_0"] = 0x30] = "_0";
        CharacterCodes[CharacterCodes["_1"] = 0x31] = "_1";
        CharacterCodes[CharacterCodes["_2"] = 0x32] = "_2";
        CharacterCodes[CharacterCodes["_3"] = 0x33] = "_3";
        CharacterCodes[CharacterCodes["_4"] = 0x34] = "_4";
        CharacterCodes[CharacterCodes["_5"] = 0x35] = "_5";
        CharacterCodes[CharacterCodes["_6"] = 0x36] = "_6";
        CharacterCodes[CharacterCodes["_7"] = 0x37] = "_7";
        CharacterCodes[CharacterCodes["_8"] = 0x38] = "_8";
        CharacterCodes[CharacterCodes["_9"] = 0x39] = "_9";
        CharacterCodes[CharacterCodes["a"] = 0x61] = "a";
        CharacterCodes[CharacterCodes["b"] = 0x62] = "b";
        CharacterCodes[CharacterCodes["c"] = 0x63] = "c";
        CharacterCodes[CharacterCodes["d"] = 0x64] = "d";
        CharacterCodes[CharacterCodes["e"] = 0x65] = "e";
        CharacterCodes[CharacterCodes["f"] = 0x66] = "f";
        CharacterCodes[CharacterCodes["g"] = 0x67] = "g";
        CharacterCodes[CharacterCodes["h"] = 0x68] = "h";
        CharacterCodes[CharacterCodes["i"] = 0x69] = "i";
        CharacterCodes[CharacterCodes["j"] = 0x6A] = "j";
        CharacterCodes[CharacterCodes["k"] = 0x6B] = "k";
        CharacterCodes[CharacterCodes["l"] = 0x6C] = "l";
        CharacterCodes[CharacterCodes["m"] = 0x6D] = "m";
        CharacterCodes[CharacterCodes["n"] = 0x6E] = "n";
        CharacterCodes[CharacterCodes["o"] = 0x6F] = "o";
        CharacterCodes[CharacterCodes["p"] = 0x70] = "p";
        CharacterCodes[CharacterCodes["q"] = 0x71] = "q";
        CharacterCodes[CharacterCodes["r"] = 0x72] = "r";
        CharacterCodes[CharacterCodes["s"] = 0x73] = "s";
        CharacterCodes[CharacterCodes["t"] = 0x74] = "t";
        CharacterCodes[CharacterCodes["u"] = 0x75] = "u";
        CharacterCodes[CharacterCodes["v"] = 0x76] = "v";
        CharacterCodes[CharacterCodes["w"] = 0x77] = "w";
        CharacterCodes[CharacterCodes["x"] = 0x78] = "x";
        CharacterCodes[CharacterCodes["y"] = 0x79] = "y";
        CharacterCodes[CharacterCodes["z"] = 0x7A] = "z";
        CharacterCodes[CharacterCodes["A"] = 0x41] = "A";
        CharacterCodes[CharacterCodes["B"] = 0x42] = "B";
        CharacterCodes[CharacterCodes["C"] = 0x43] = "C";
        CharacterCodes[CharacterCodes["D"] = 0x44] = "D";
        CharacterCodes[CharacterCodes["E"] = 0x45] = "E";
        CharacterCodes[CharacterCodes["F"] = 0x46] = "F";
        CharacterCodes[CharacterCodes["G"] = 0x47] = "G";
        CharacterCodes[CharacterCodes["H"] = 0x48] = "H";
        CharacterCodes[CharacterCodes["I"] = 0x49] = "I";
        CharacterCodes[CharacterCodes["J"] = 0x4A] = "J";
        CharacterCodes[CharacterCodes["K"] = 0x4B] = "K";
        CharacterCodes[CharacterCodes["L"] = 0x4C] = "L";
        CharacterCodes[CharacterCodes["M"] = 0x4D] = "M";
        CharacterCodes[CharacterCodes["N"] = 0x4E] = "N";
        CharacterCodes[CharacterCodes["O"] = 0x4F] = "O";
        CharacterCodes[CharacterCodes["P"] = 0x50] = "P";
        CharacterCodes[CharacterCodes["Q"] = 0x51] = "Q";
        CharacterCodes[CharacterCodes["R"] = 0x52] = "R";
        CharacterCodes[CharacterCodes["S"] = 0x53] = "S";
        CharacterCodes[CharacterCodes["T"] = 0x54] = "T";
        CharacterCodes[CharacterCodes["U"] = 0x55] = "U";
        CharacterCodes[CharacterCodes["V"] = 0x56] = "V";
        CharacterCodes[CharacterCodes["W"] = 0x57] = "W";
        CharacterCodes[CharacterCodes["X"] = 0x58] = "X";
        CharacterCodes[CharacterCodes["Y"] = 0x59] = "Y";
        CharacterCodes[CharacterCodes["Z"] = 0x5a] = "Z";
        CharacterCodes[CharacterCodes["ampersand"] = 0x26] = "ampersand";
        CharacterCodes[CharacterCodes["asterisk"] = 0x2A] = "asterisk";
        CharacterCodes[CharacterCodes["at"] = 0x40] = "at";
        CharacterCodes[CharacterCodes["backslash"] = 0x5C] = "backslash";
        CharacterCodes[CharacterCodes["bar"] = 0x7C] = "bar";
        CharacterCodes[CharacterCodes["caret"] = 0x5E] = "caret";
        CharacterCodes[CharacterCodes["closeBrace"] = 0x7D] = "closeBrace";
        CharacterCodes[CharacterCodes["closeBracket"] = 0x5D] = "closeBracket";
        CharacterCodes[CharacterCodes["closeParen"] = 0x29] = "closeParen";
        CharacterCodes[CharacterCodes["colon"] = 0x3A] = "colon";
        CharacterCodes[CharacterCodes["comma"] = 0x2C] = "comma";
        CharacterCodes[CharacterCodes["dot"] = 0x2E] = "dot";
        CharacterCodes[CharacterCodes["doubleQuote"] = 0x22] = "doubleQuote";
        CharacterCodes[CharacterCodes["equals"] = 0x3D] = "equals";
        CharacterCodes[CharacterCodes["exclamation"] = 0x21] = "exclamation";
        CharacterCodes[CharacterCodes["greaterThan"] = 0x3E] = "greaterThan";
        CharacterCodes[CharacterCodes["lessThan"] = 0x3C] = "lessThan";
        CharacterCodes[CharacterCodes["minus"] = 0x2D] = "minus";
        CharacterCodes[CharacterCodes["openBrace"] = 0x7B] = "openBrace";
        CharacterCodes[CharacterCodes["openBracket"] = 0x5B] = "openBracket";
        CharacterCodes[CharacterCodes["openParen"] = 0x28] = "openParen";
        CharacterCodes[CharacterCodes["percent"] = 0x25] = "percent";
        CharacterCodes[CharacterCodes["plus"] = 0x2B] = "plus";
        CharacterCodes[CharacterCodes["question"] = 0x3F] = "question";
        CharacterCodes[CharacterCodes["semicolon"] = 0x3B] = "semicolon";
        CharacterCodes[CharacterCodes["singleQuote"] = 0x27] = "singleQuote";
        CharacterCodes[CharacterCodes["slash"] = 0x2F] = "slash";
        CharacterCodes[CharacterCodes["tilde"] = 0x7E] = "tilde";
        CharacterCodes[CharacterCodes["backspace"] = 0x08] = "backspace";
        CharacterCodes[CharacterCodes["formFeed"] = 0x0C] = "formFeed";
        CharacterCodes[CharacterCodes["byteOrderMark"] = 0xFEFF] = "byteOrderMark";
        CharacterCodes[CharacterCodes["tab"] = 0x09] = "tab";
        CharacterCodes[CharacterCodes["verticalTab"] = 0x0B] = "verticalTab";
    })(ts.CharacterCodes || (ts.CharacterCodes = {}));
    var CharacterCodes = ts.CharacterCodes;
})(ts || (ts = {}));
var ts;
(function (ts) {
    ts.Diagnostics = {
        Unknown_compiler_option_0: { code: 6001, category: 1 /* Error */, key: "Unknown compiler option '{0}'." },
        File_0_not_found: { code: 6002, category: 1 /* Error */, key: "File '{0}' not found." },
        File_0_must_have_extension_ts_or_d_ts: { code: 6003, category: 1 /* Error */, key: "File '{0}' must have extension '.ts' or '.d.ts'." },
        Unrecognized_escape_sequence: { code: 1000, category: 1 /* Error */, key: "Unrecognized escape sequence." },
        Unexpected_character_0: { code: 1001, category: 1 /* Error */, key: "Unexpected character {0}." },
        Missing_close_quote_character: { code: 1002, category: 1 /* Error */, key: "Missing close quote character." },
        Identifier_expected: { code: -9999999, category: 1 /* Error */, key: "Identifier expected." },
        _0_keyword_expected: { code: 1004, category: 1 /* Error */, key: "'{0}' keyword expected." },
        _0_expected: { code: -9999999, category: 1 /* Error */, key: "'{0}' expected." },
        Identifier_expected_0_is_a_keyword: { code: 1006, category: 1 /* Error */, key: "Identifier expected; '{0}' is a keyword." },
        Automatic_semicolon_insertion_not_allowed: { code: 1007, category: 1 /* Error */, key: "Automatic semicolon insertion not allowed." },
        Trailing_comma_not_allowed: { code: 1009, category: 1 /* Error */, key: "Trailing comma not allowed." },
        Asterisk_Slash_expected: { code: 1010, category: 1 /* Error */, key: "'*/' expected." },
        public_or_private_modifier_must_precede_static: { code: 1011, category: 1 /* Error */, key: "'public' or 'private' modifier must precede 'static'." },
        Unexpected_token: { code: 1012, category: 1 /* Error */, key: "Unexpected token." },
        Catch_clause_parameter_cannot_have_a_type_annotation: { code: 1013, category: 1 /* Error */, key: "Catch clause parameter cannot have a type annotation." },
        A_rest_parameter_must_be_last_in_a_parameter_list: { code: 1014, category: 1 /* Error */, key: "A rest parameter must be last in a parameter list." },
        Parameter_cannot_have_question_mark_and_initializer: { code: 1015, category: 1 /* Error */, key: "Parameter cannot have question mark and initializer." },
        A_required_parameter_cannot_follow_an_optional_parameter: { code: 1016, category: 1 /* Error */, key: "A required parameter cannot follow an optional parameter." },
        An_index_signature_cannot_have_a_rest_parameter: { code: 1017, category: 1 /* Error */, key: "An index signature cannot have a rest parameter." },
        An_index_signature_parameter_cannot_have_an_accessibility_modifier: { code: 1018, category: 1 /* Error */, key: "An index signature parameter cannot have an accessibility modifier." },
        An_index_signature_parameter_cannot_have_a_question_mark: { code: 1019, category: 1 /* Error */, key: "An index signature parameter cannot have a question mark." },
        An_index_signature_parameter_cannot_have_an_initializer: { code: 1020, category: 1 /* Error */, key: "An index signature parameter cannot have an initializer." },
        An_index_signature_must_have_a_type_annotation: { code: 1021, category: 1 /* Error */, key: "An index signature must have a type annotation." },
        An_index_signature_parameter_must_have_a_type_annotation: { code: 1022, category: 1 /* Error */, key: "An index signature parameter must have a type annotation." },
        An_index_signature_parameter_type_must_be_string_or_number: { code: 1023, category: 1 /* Error */, key: "An index signature parameter type must be 'string' or 'number'." },
        extends_clause_already_seen: { code: 1024, category: 1 /* Error */, key: "'extends' clause already seen." },
        extends_clause_must_precede_implements_clause: { code: 1025, category: 1 /* Error */, key: "'extends' clause must precede 'implements' clause." },
        Classes_can_only_extend_a_single_class: { code: 1026, category: 1 /* Error */, key: "Classes can only extend a single class." },
        implements_clause_already_seen: { code: 1027, category: 1 /* Error */, key: "'implements' clause already seen." },
        Accessibility_modifier_already_seen: { code: 1028, category: 1 /* Error */, key: "Accessibility modifier already seen." },
        _0_modifier_must_precede_1_modifier: { code: 1029, category: 1 /* Error */, key: "'{0}' modifier must precede '{1}' modifier." },
        _0_modifier_already_seen: { code: 1030, category: 1 /* Error */, key: "'{0}' modifier already seen." },
        _0_modifier_cannot_appear_on_a_class_element: { code: 1031, category: 1 /* Error */, key: "'{0}' modifier cannot appear on a class element." },
        Interface_declaration_cannot_have_implements_clause: { code: 1032, category: 1 /* Error */, key: "Interface declaration cannot have 'implements' clause." },
        super_invocation_cannot_have_type_arguments: { code: 1034, category: 1 /* Error */, key: "'super' invocation cannot have type arguments." },
        Only_ambient_modules_can_use_quoted_names: { code: 1035, category: 1 /* Error */, key: "Only ambient modules can use quoted names." },
        Statements_are_not_allowed_in_ambient_contexts: { code: 1036, category: 1 /* Error */, key: "Statements are not allowed in ambient contexts." },
        A_function_implementation_cannot_be_declared_in_an_ambient_context: { code: 1037, category: 1 /* Error */, key: "A function implementation cannot be declared in an ambient context." },
        A_declare_modifier_cannot_be_used_in_an_already_ambient_context: { code: 1038, category: 1 /* Error */, key: "A 'declare' modifier cannot be used in an already ambient context." },
        Initializers_are_not_allowed_in_ambient_contexts: { code: 1039, category: 1 /* Error */, key: "Initializers are not allowed in ambient contexts." },
        _0_modifier_cannot_appear_on_a_module_element: { code: 1044, category: 1 /* Error */, key: "'{0}' modifier cannot appear on a module element." },
        A_declare_modifier_cannot_be_used_with_an_interface_declaration: { code: 1045, category: 1 /* Error */, key: "A 'declare' modifier cannot be used with an interface declaration." },
        A_declare_modifier_is_required_for_a_top_level_declaration_in_a_d_ts_file: { code: 1046, category: 1 /* Error */, key: "A 'declare' modifier is required for a top level declaration in a .d.ts file." },
        A_rest_parameter_cannot_be_optional: { code: 1047, category: 1 /* Error */, key: "A rest parameter cannot be optional." },
        A_rest_parameter_cannot_have_an_initializer: { code: 1048, category: 1 /* Error */, key: "A rest parameter cannot have an initializer." },
        A_set_accessor_must_have_exactly_one_parameter: { code: 1049, category: 1 /* Error */, key: "A 'set' accessor must have exactly one parameter." },
        A_set_accessor_cannot_have_an_optional_parameter: { code: 1051, category: 1 /* Error */, key: "A 'set' accessor cannot have an optional parameter." },
        A_set_accessor_parameter_cannot_have_an_initializer: { code: 1052, category: 1 /* Error */, key: "A 'set' accessor parameter cannot have an initializer." },
        A_set_accessor_cannot_have_rest_parameter: { code: 1053, category: 1 /* Error */, key: "A 'set' accessor cannot have rest parameter." },
        A_get_accessor_cannot_have_parameters: { code: 1054, category: 1 /* Error */, key: "A 'get' accessor cannot have parameters." },
        Modifiers_cannot_appear_here: { code: 1055, category: 1 /* Error */, key: "Modifiers cannot appear here." },
        Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher: { code: 1056, category: 1 /* Error */, key: "Accessors are only available when targeting ECMAScript 5 and higher." },
        Enum_member_must_have_initializer: { code: -9999999, category: 1 /* Error */, key: "Enum member must have initializer." },
        An_export_assignment_cannot_be_used_in_an_internal_module: { code: 1063, category: 1 /* Error */, key: "An export assignment cannot be used in an internal module." },
        Ambient_enum_elements_can_only_have_integer_literal_initializers: { code: 1066, category: 1 /* Error */, key: "Ambient enum elements can only have integer literal initializers." },
        module_class_interface_enum_import_or_statement: { code: 1067, category: 3 /* NoPrefix */, key: "module, class, interface, enum, import or statement" },
        Unexpected_token_A_constructor_method_accessor_or_property_was_expected: { code: 1068, category: 1 /* Error */, key: "Unexpected token. A constructor, method, accessor, or property was expected." },
        statement: { code: 1069, category: 3 /* NoPrefix */, key: "statement" },
        case_or_default_clause: { code: 1070, category: 3 /* NoPrefix */, key: "case or default clause" },
        identifier: { code: 1071, category: 3 /* NoPrefix */, key: "identifier" },
        call_construct_index_property_or_function_signature: { code: 1072, category: 3 /* NoPrefix */, key: "call, construct, index, property or function signature" },
        expression: { code: 1073, category: 3 /* NoPrefix */, key: "expression" },
        type_name: { code: 1074, category: 3 /* NoPrefix */, key: "type name" },
        property_or_accessor: { code: 1075, category: 3 /* NoPrefix */, key: "property or accessor" },
        parameter: { code: 1076, category: 3 /* NoPrefix */, key: "parameter" },
        type: { code: 1077, category: 3 /* NoPrefix */, key: "type" },
        type_parameter: { code: 1078, category: 3 /* NoPrefix */, key: "type parameter" },
        A_declare_modifier_cannot_be_used_with_an_import_declaration: { code: 1079, category: 1 /* Error */, key: "A 'declare' modifier cannot be used with an import declaration." },
        Invalid_reference_directive_syntax: { code: 1084, category: 1 /* Error */, key: "Invalid 'reference' directive syntax." },
        Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher: { code: 1085, category: 1 /* Error */, key: "Octal literals are not available when targeting ECMAScript 5 and higher." },
        An_accessor_cannot_be_declared_in_an_ambient_context: { code: 1086, category: 1 /* Error */, key: "An accessor cannot be declared in an ambient context." },
        _0_modifier_cannot_appear_on_a_constructor_declaration: { code: 1089, category: 1 /* Error */, key: "'{0}' modifier cannot appear on a constructor declaration." },
        _0_modifier_cannot_appear_on_a_parameter: { code: 1090, category: 1 /* Error */, key: "'{0}' modifier cannot appear on a parameter." },
        Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement: { code: 1091, category: 1 /* Error */, key: "Only a single variable declaration is allowed in a 'for...in' statement." },
        Type_parameters_cannot_appear_on_a_constructor_declaration: { code: 1092, category: 1 /* Error */, key: "Type parameters cannot appear on a constructor declaration." },
        Type_annotation_cannot_appear_on_a_constructor_declaration: { code: 1093, category: 1 /* Error */, key: "Type annotation cannot appear on a constructor declaration." },
        An_accessor_cannot_have_type_parameters: { code: 1094, category: 1 /* Error */, key: "An accessor cannot have type parameters." },
        A_set_accessor_cannot_have_a_return_type_annotation: { code: 1095, category: 1 /* Error */, key: "A 'set' accessor cannot have a return type annotation." },
        An_index_signature_must_have_exactly_one_parameter: { code: 1096, category: 1 /* Error */, key: "An index signature must have exactly one parameter." },
        _0_list_cannot_be_empty: { code: 1097, category: 1 /* Error */, key: "'{0}' list cannot be empty." },
        Type_parameter_list_cannot_be_empty: { code: 1098, category: 1 /* Error */, key: "Type parameter list cannot be empty." },
        Type_argument_list_cannot_be_empty: { code: 1099, category: 1 /* Error */, key: "Type argument list cannot be empty." },
        Invalid_use_of_0_in_strict_mode: { code: 1100, category: 1 /* Error */, key: "Invalid use of '{0}' in strict mode." },
        with_statements_are_not_allowed_in_strict_mode: { code: 1101, category: 1 /* Error */, key: "'with' statements are not allowed in strict mode." },
        delete_cannot_be_called_on_an_identifier_in_strict_mode: { code: 1102, category: 1 /* Error */, key: "'delete' cannot be called on an identifier in strict mode." },
        Invalid_left_hand_side_in_for_in_statement: { code: 1103, category: 1 /* Error */, key: "Invalid left-hand side in 'for...in' statement." },
        A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement: { code: 1104, category: 1 /* Error */, key: "A 'continue' statement can only be used within an enclosing iteration statement." },
        A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement: { code: 1105, category: 1 /* Error */, key: "A 'break' statement can only be used within an enclosing iteration or switch statement." },
        Jump_target_cannot_cross_function_boundary: { code: 1107, category: 1 /* Error */, key: "Jump target cannot cross function boundary." },
        A_return_statement_can_only_be_used_within_a_function_body: { code: 1108, category: 1 /* Error */, key: "A 'return' statement can only be used within a function body." },
        Expression_expected: { code: -9999999, category: 1 /* Error */, key: "Expression expected." },
        Type_expected: { code: -9999999, category: 1 /* Error */, key: "Type expected." },
        A_constructor_implementation_cannot_be_declared_in_an_ambient_context: { code: 1111, category: 1 /* Error */, key: "A constructor implementation cannot be declared in an ambient context." },
        A_class_member_cannot_be_declared_optional: { code: 1112, category: 1 /* Error */, key: "A class member cannot be declared optional." },
        A_default_clause_cannot_appear_more_than_once_in_a_switch_statement: { code: 1113, category: 1 /* Error */, key: "A 'default' clause cannot appear more than once in a 'switch' statement." },
        Duplicate_label_0: { code: 1114, category: 1 /* Error */, key: "Duplicate label '{0}'" },
        A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement: { code: 1115, category: 1 /* Error */, key: "A 'continue' statement can only jump to a label of an enclosing iteration statement." },
        A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement: { code: 1116, category: 1 /* Error */, key: "A 'break' statement can only jump to a label of an enclosing statement." },
        An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode: { code: 1117, category: 1 /* Error */, key: "An object literal cannot have multiple properties with the same name in strict mode." },
        An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name: { code: 1118, category: 1 /* Error */, key: "An object literal cannot have multiple get/set accessors with the same name." },
        An_object_literal_cannot_have_property_and_accessor_with_the_same_name: { code: 1119, category: 1 /* Error */, key: "An object literal cannot have property and accessor with the same name." },
        An_export_assignment_cannot_have_modifiers: { code: 1120, category: 1 /* Error */, key: "An export assignment cannot have modifiers." },
        Duplicate_identifier_0: { code: 2000, category: 1 /* Error */, key: "Duplicate identifier '{0}'." },
        new_T_cannot_be_used_to_create_an_array_Use_new_Array_T_instead: { code: 2068, category: 1 /* Error */, key: "'new T[]' cannot be used to create an array. Use 'new Array<T>()' instead." },
        Multiple_constructor_implementations_are_not_allowed: { code: 2070, category: 1 /* Error */, key: "Multiple constructor implementations are not allowed." },
        A_class_may_only_implement_another_class_or_interface: { code: 2074, category: 1 /* Error */, key: "A class may only implement another class or interface." },
        get_and_set_accessor_must_have_the_same_type: { code: 2096, category: 1 /* Error */, key: "'get' and 'set' accessor must have the same type." },
        Static_members_cannot_reference_class_type_parameters: { code: 2099, category: 1 /* Error */, key: "Static members cannot reference class type parameters." },
        super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class: { code: 2102, category: 1 /* Error */, key: "'super' property access is permitted only in a constructor, member function, or member accessor of a derived class" },
        The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type: { code: 2112, category: 1 /* Error */, key: "The right-hand side of an arithmetic operation must be of type 'any', 'number' or an enum type." },
        The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type: { code: 2113, category: 1 /* Error */, key: "The left-hand side of an arithmetic operation must be of type 'any', 'number' or an enum type." },
        An_arithmetic_operand_must_be_of_type_any_number_or_an_enum_type: { code: 2114, category: 1 /* Error */, key: "An arithmetic operand must be of type 'any', 'number' or an enum type." },
        The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation: { code: 2115, category: 1 /* Error */, key: "The left-hand side of a 'for...in' statement cannot use a type annotation." },
        The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any: { code: 2116, category: 1 /* Error */, key: "The left-hand side of a 'for...in' statement must be of type 'string' or 'any'." },
        The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter: { code: 2117, category: 1 /* Error */, key: "The right-hand side of a 'for...in' statement must be of type 'any', an object type or a type parameter." },
        The_left_hand_side_of_an_in_expression_must_be_of_types_any_string_or_number: { code: 2118, category: 1 /* Error */, key: "The left-hand side of an 'in' expression must be of types 'any', 'string' or 'number'." },
        The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: { code: 2119, category: 1 /* Error */, key: "The right-hand side of an 'in' expression must be of type 'any', an object type or a type parameter" },
        A_get_accessor_must_return_a_value_or_consist_of_a_single_throw_statement: { code: 2126, category: 1 /* Error */, key: "A 'get' accessor must return a value or consist of a single 'throw' statement." },
        Getter_and_setter_accessors_do_not_agree_in_visibility: { code: 2127, category: 1 /* Error */, key: "Getter and setter accessors do not agree in visibility." },
        A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value_or_consist_of_a_single_throw_statement: { code: 2131, category: 1 /* Error */, key: "A function whose declared type is neither 'void' nor 'any' must return a value or consist of a single 'throw' statement." },
        Untyped_function_calls_may_not_accept_type_arguments: { code: 2158, category: 1 /* Error */, key: "Untyped function calls may not accept type arguments." },
        The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter: { code: 2120, category: 1 /* Error */, key: "The left-hand side of an 'instanceof' expression must be of type 'any', an object type or a type parameter." },
        The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type: { code: 2121, category: 1 /* Error */, key: "The right-hand side of an 'instanceof' expression must be of type 'any' or of a type assignable to the 'Function' interface type." },
        Setters_cannot_return_a_value: { code: 2122, category: 1 /* Error */, key: "Setters cannot return a value." },
        Invalid_left_hand_side_of_assignment_expression: { code: 2130, category: 1 /* Error */, key: "Invalid left-hand side of assignment expression." },
        Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2: { code: 2134, category: 1 /* Error */, key: "Subsequent variable declarations must have the same type.  Variable '{0}' must be of type '{1}', but here has type '{2}'." },
        All_symbols_within_a_with_block_will_be_resolved_to_any: { code: 2135, category: 1 /* Error */, key: "All symbols within a 'with' block will be resolved to 'any'." },
        The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer: { code: 2139, category: 1 /* Error */, key: "The operand of an increment or decrement operator must be a variable, property or indexer." },
        Overload_signatures_must_all_be_public_or_private: { code: 2150, category: 1 /* Error */, key: "Overload signatures must all be public or private." },
        Overload_signatures_must_all_be_exported_or_not_exported: { code: 2151, category: 1 /* Error */, key: "Overload signatures must all be exported or not exported." },
        Overload_signatures_must_all_be_ambient_or_non_ambient: { code: 2152, category: 1 /* Error */, key: "Overload signatures must all be ambient or non-ambient." },
        Overload_signatures_must_all_be_optional_or_required: { code: 2153, category: 1 /* Error */, key: "Overload signatures must all be optional or required." },
        this_cannot_be_referenced_in_constructor_arguments: { code: 2155, category: 1 /* Error */, key: "'this' cannot be referenced in constructor arguments." },
        Value_of_type_0_is_not_callable_Did_you_mean_to_include_new: { code: 2161, category: 1 /* Error */, key: "Value of type '{0}' is not callable. Did you mean to include 'new'?" },
        A_signature_with_an_implementation_cannot_use_a_string_literal_type: { code: 2163, category: 1 /* Error */, key: "A signature with an implementation cannot use a string literal type." },
        Interface_0_cannot_simultaneously_extend_types_1_and_2_Colon: { code: 2189, category: 1 /* Error */, key: "Interface '{0}' cannot simultaneously extend types '{1}' and '{2}':" },
        Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it: { code: 2190, category: 1 /* Error */, key: "Initializer of parameter '{0}' cannot reference identifier '{1}' declared after it." },
        Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local: { code: 2192, category: 1 /* Error */, key: "Individual declarations in merged declaration {0} must be all exported or all local." },
        super_cannot_be_referenced_in_constructor_arguments: { code: 2193, category: 1 /* Error */, key: "'super' cannot be referenced in constructor arguments." },
        Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class: { code: 2194, category: 1 /* Error */, key: "Return type of constructor signature must be assignable to the instance type of the class" },
        Ambient_external_module_declaration_cannot_specify_relative_module_name: { code: 2196, category: 1 /* Error */, key: "Ambient external module declaration cannot specify relative module name." },
        Import_declaration_in_an_ambient_external_module_declaration_cannot_reference_external_module_through_relative_external_module_name: { code: 2197, category: 1 /* Error */, key: "Import declaration in an ambient external module declaration cannot reference external module through relative external module name." },
        Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference: { code: 2200, category: 1 /* Error */, key: "Duplicate identifier '_this'. Compiler uses variable declaration '_this' to capture 'this' reference." },
        Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference: { code: 2205, category: 1 /* Error */, key: "Duplicate identifier '_super'. Compiler uses '_super' to capture base class reference." },
        Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference: { code: 2206, category: 1 /* Error */, key: "Expression resolves to variable declaration '_this' that compiler uses to capture 'this' reference." },
        Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference: { code: 2207, category: 1 /* Error */, key: "Expression resolves to '_super' that compiler uses to capture base class reference." },
        Duplicate_identifier_i_Compiler_uses_i_to_initialize_rest_parameter: { code: 2224, category: 1 /* Error */, key: "Duplicate identifier '_i'. Compiler uses '_i' to initialize rest parameter." },
        Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters: { code: 2225, category: 1 /* Error */, key: "Duplicate identifier 'arguments'. Compiler uses 'arguments' to initialize rest parameters." },
        Constraint_of_a_type_parameter_cannot_reference_any_type_parameter_from_the_same_type_parameter_list: { code: 2229, category: 1 /* Error */, key: "Constraint of a type parameter cannot reference any type parameter from the same type parameter list." },
        Initializer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor: { code: 2230, category: 1 /* Error */, key: "Initializer of instance member variable '{0}' cannot reference identifier '{1}' declared in the constructor." },
        Parameter_0_cannot_be_referenced_in_its_initializer: { code: 2231, category: 1 /* Error */, key: "Parameter '{0}' cannot be referenced in its initializer." },
        Duplicate_string_index_signature: { code: 2232, category: 1 /* Error */, key: "Duplicate string index signature." },
        Duplicate_number_index_signature: { code: 2233, category: 1 /* Error */, key: "Duplicate number index signature." },
        All_declarations_of_an_interface_must_have_identical_type_parameters: { code: 2234, category: 1 /* Error */, key: "All declarations of an interface must have identical type parameters." },
        Expression_resolves_to_variable_declaration_i_that_compiler_uses_to_initialize_rest_parameter: { code: 2235, category: 1 /* Error */, key: "Expression resolves to variable declaration '_i' that compiler uses to initialize rest parameter." },
        Constructor_implementation_expected: { code: 2240, category: 1 /* Error */, key: "Constructor implementation expected." },
        An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements: { code: 2245, category: 1 /* Error */, key: "An export assignment cannot be used in a module with other exported elements." },
        A_parameter_property_is_only_allowed_in_a_constructor_implementation: { code: 2246, category: 1 /* Error */, key: "A parameter property is only allowed in a constructor implementation." },
        Circular_definition_of_import_alias_0: { code: 3000, category: 1 /* Error */, key: "Circular definition of import alias '{0}'." },
        Cannot_find_name_0: { code: 3001, category: 1 /* Error */, key: "Cannot find name '{0}'." },
        Module_0_has_no_exported_member_1: { code: 3002, category: 1 /* Error */, key: "Module '{0}' has no exported member '{1}'." },
        Cannot_find_external_module_0: { code: 3003, category: 1 /* Error */, key: "Cannot find external module '{0}'." },
        A_module_cannot_have_more_than_one_export_assignment: { code: 3004, category: 1 /* Error */, key: "A module cannot have more than one export assignment." },
        Type_0_recursively_references_itself_as_a_base_type: { code: 3005, category: 1 /* Error */, key: "Type '{0}' recursively references itself as a base type." },
        A_class_may_only_extend_another_class: { code: 3006, category: 1 /* Error */, key: "A class may only extend another class." },
        An_interface_may_only_extend_a_class_or_another_interface: { code: 3007, category: 1 /* Error */, key: "An interface may only extend a class or another interface." },
        Generic_type_0_requires_1_type_argument_s: { code: 3008, category: 1 /* Error */, key: "Generic type '{0}' requires {1} type argument(s)." },
        Type_0_is_not_generic: { code: 3009, category: 1 /* Error */, key: "Type '{0}' is not generic." },
        Cannot_find_global_type_0: { code: 3010, category: 1 /* Error */, key: "Cannot find global type '{0}'." },
        Global_type_0_must_be_a_class_or_interface_type: { code: 3011, category: 1 /* Error */, key: "Global type '{0}' must be a class or interface type." },
        Global_type_0_must_have_1_type_parameter_s: { code: 3012, category: 1 /* Error */, key: "Global type '{0}' must have {1} type parameter(s)." },
        this_cannot_be_referenced_in_a_module_body: { code: 3013, category: 1 /* Error */, key: "'this' cannot be referenced in a module body." },
        this_cannot_be_referenced_in_a_static_property_initializer: { code: 3014, category: 1 /* Error */, key: "'this' cannot be referenced in a static property initializer." },
        this_cannot_be_referenced_in_current_location: { code: -9999999, category: 1 /* Error */, key: "'this' cannot be referenced in current location." },
        super_can_only_be_referenced_in_a_derived_class: { code: 3015, category: 1 /* Error */, key: "'super' can only be referenced in a derived class." },
        Property_0_does_not_exist_on_type_1: { code: 3017, category: 1 /* Error */, key: "Property '{0}' does not exist on type '{1}'." },
        An_index_expression_argument_must_be_of_type_string_number_or_any: { code: 3018, category: 1 /* Error */, key: "An index expression argument must be of type 'string', 'number', or 'any'." },
        Type_0_does_not_satisfy_the_constraint_1_Colon: { code: 3019, category: 1 /* Error */, key: "Type '{0}' does not satisfy the constraint '{1}':" },
        Type_0_does_not_satisfy_the_constraint_1: { code: 3019, category: 1 /* Error */, key: "Type '{0}' does not satisfy the constraint '{1}'." },
        Supplied_parameters_do_not_match_any_signature_of_call_target: { code: 3020, category: 1 /* Error */, key: "Supplied parameters do not match any signature of call target." },
        Cannot_invoke_an_expression_whose_type_lacks_a_call_signature: { code: 3021, category: 1 /* Error */, key: "Cannot invoke an expression whose type lacks a call signature." },
        Only_a_void_function_can_be_called_with_the_new_keyword: { code: 3022, category: 1 /* Error */, key: "Only a void function can be called with the 'new' keyword." },
        Cannot_use_new_with_an_expression_whose_type_lacks_a_call_or_construct_signature: { code: 3023, category: 1 /* Error */, key: "Cannot use 'new' with an expression whose type lacks a call or construct signature." },
        Neither_type_0_nor_type_1_is_assignable_to_the_other_Colon: { code: 3024, category: 1 /* Error */, key: "Neither type '{0}' nor type '{1}' is assignable to the other:" },
        Neither_type_0_nor_type_1_is_assignable_to_the_other: { code: 3024, category: 1 /* Error */, key: "Neither type '{0}' nor type '{1}' is assignable to the other." },
        No_best_common_type_exists_among_return_expressions: { code: 3027, category: 1 /* Error */, key: "No best common type exists among return expressions." },
        Operator_0_cannot_be_applied_to_types_1_and_2: { code: 3028, category: 1 /* Error */, key: "Operator '{0}' cannot be applied to types '{1}' and '{2}'." },
        No_best_common_type_exists_between_0_and_1: { code: 3029, category: 1 /* Error */, key: "No best common type exists between '{0}' and '{1}'." },
        No_best_common_type_exists_between_0_1_and_2: { code: 3030, category: 1 /* Error */, key: "No best common type exists between '{0}', '{1}', and '{2}'." },
        A_rest_parameter_must_be_of_an_array_type: { code: 3031, category: 1 /* Error */, key: "A rest parameter must be of an array type." },
        A_parameter_initializer_is_only_allowed_in_a_function_or_constructor_implementation: { code: 3032, category: 1 /* Error */, key: "A parameter initializer is only allowed in a function or constructor implementation." },
        Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature: { code: 3033, category: 1 /* Error */, key: "Specialized overload signature is not assignable to any non-specialized signature." },
        Duplicate_function_implementation: { code: 3034, category: 1 /* Error */, key: "Duplicate function implementation." },
        Overload_signature_is_not_compatible_with_function_implementation: { code: 3035, category: 1 /* Error */, key: "Overload signature is not compatible with function implementation." },
        Argument_of_type_0_is_not_assignable_to_parameter_of_type_1: { code: 3036, category: 1 /* Error */, key: "Argument of type '{0}' is not assignable to parameter of type '{1}'." },
        Index_signature_is_missing_in_type_0: { code: 4003, category: 1 /* Error */, key: "Index signature is missing in type '{0}'." },
        Index_signatures_are_incompatible_Colon: { code: 4004, category: 1 /* Error */, key: "Index signatures are incompatible:" },
        Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function: { code: 4016, category: 3 /* NoPrefix */, key: "Class '{0}' defines instance member accessor '{1}', but extended class '{2}' defines it as instance member function." },
        Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function: { code: 4017, category: 3 /* NoPrefix */, key: "Class '{0}' defines instance member property '{1}', but extended class '{2}' defines it as instance member function." },
        Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor: { code: 4018, category: 3 /* NoPrefix */, key: "Class '{0}' defines instance member function '{1}', but extended class '{2}' defines it as instance member accessor." },
        Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_property: { code: 4019, category: 3 /* NoPrefix */, key: "Class '{0}' defines instance member function '{1}', but extended class '{2}' defines it as instance member property." },
        In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initializer_for_its_first_enum_element: { code: 4024, category: 1 /* Error */, key: "In an enum with multiple declarations, only one declaration can omit an initializer for its first enum element." },
        Named_properties_0_of_types_1_and_2_are_not_identical: { code: 4032, category: 3 /* NoPrefix */, key: "Named properties '{0}' of types '{1}' and '{2}' are not identical." },
        Cannot_find_the_common_subdirectory_path_for_the_input_files: { code: 5009, category: 1 /* Error */, key: "Cannot find the common subdirectory path for the input files." },
        Cannot_read_file_0_Colon_1: { code: 5012, category: 1 /* Error */, key: "Cannot read file '{0}': {1}" },
        Unsupported_file_encoding: { code: 5013, category: 3 /* NoPrefix */, key: "Unsupported file encoding." },
        Could_not_write_file_0_Colon_1: { code: 5033, category: 1 /* Error */, key: "Could not write file '{0}': {1}" },
        Option_mapRoot_cannot_be_specified_without_specifying_sourcemap_option: { code: 5038, category: 1 /* Error */, key: "Option mapRoot cannot be specified without specifying sourcemap option." },
        Option_sourceRoot_cannot_be_specified_without_specifying_sourcemap_option: { code: 5039, category: 1 /* Error */, key: "Option sourceRoot cannot be specified without specifying sourcemap option." },
        Variable_0_implicitly_has_an_1_type: { code: 7005, category: 1 /* Error */, key: "Variable '{0}' implicitly has an '{1}' type." },
        Parameter_0_implicitly_has_an_1_type: { code: 7006, category: 1 /* Error */, key: "Parameter '{0}' implicitly has an '{1}' type." },
        Member_0_implicitly_has_an_1_type: { code: 7008, category: 1 /* Error */, key: "Member '{0}' implicitly has an '{1}' type." },
        new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type: { code: 7009, category: 1 /* Error */, key: "'new' expression, whose target lacks a construct signature, implicitly has an 'any' type." },
        _0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type: { code: 7010, category: 1 /* Error */, key: "'{0}', which lacks return-type annotation, implicitly has an '{1}' return type." },
        Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: { code: 7011, category: 1 /* Error */, key: "Function expression, which lacks return-type annotation, implicitly has an '{0}' return type." },
        Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: { code: 7013, category: 1 /* Error */, key: "Construct signature, which lacks return-type annotation, implicitly has an 'any' return type." },
        Lambda_function_which_lacks_return_type_annotation_implicitly_has_an_0_return_type: { code: 7014, category: 1 /* Error */, key: "Lambda function, which lacks return-type annotation, implicitly has an '{0}' return type." },
        Array_literal_implicitly_has_an_0_type: { code: 7015, category: 1 /* Error */, key: "Array literal implicitly has an '{0}' type." },
        Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_type_annotation: { code: 7016, category: 1 /* Error */, key: "Property '{0}' implicitly has type 'any', because its 'set' accessor lacks a type annotation." },
        Index_signature_of_object_type_implicitly_has_an_any_type: { code: 7017, category: 1 /* Error */, key: "Index signature of object type implicitly has an 'any' type." },
        Object_literal_s_property_0_implicitly_has_an_1_type: { code: 7018, category: 1 /* Error */, key: "Object literal's property '{0}' implicitly has an '{1}' type." },
        Rest_parameter_0_implicitly_has_an_any_type: { code: 7019, category: 1 /* Error */, key: "Rest parameter '{0}' implicitly has an 'any[]' type." },
        Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type: { code: 7020, category: 1 /* Error */, key: "Call signature, which lacks return-type annotation, implicitly has an 'any' return type." },
        Variable_declaration_list_cannot_be_empty: { code: -9999999, category: 1 /* Error */, key: "Variable declaration list cannot be empty." },
        Digit_expected: { code: -9999999, category: 1 /* Error */, key: "Digit expected." },
        Hexadecimal_digit_expected: { code: -9999999, category: 1 /* Error */, key: "Hexadecimal digit expected." },
        Unexpected_end_of_text: { code: -9999999, category: 1 /* Error */, key: "Unexpected end of text." },
        Unterminated_string_constant: { code: -9999999, category: 1 /* Error */, key: "Unterminated string constant." },
        Invalid_character: { code: -9999999, category: 1 /* Error */, key: "Invalid character." },
        Declaration_or_statement_expected: { code: -9999999, category: 1 /* Error */, key: "Declaration or statement expected." },
        Statement_expected: { code: -9999999, category: 1 /* Error */, key: "Statement expected." },
        case_or_default_expected: { code: -9999999, category: 1 /* Error */, key: "'case' or 'default' expected." },
        Property_or_signature_expected: { code: -9999999, category: 1 /* Error */, key: "Property or signature expected." },
        Enum_member_expected: { code: -9999999, category: 1 /* Error */, key: "Enum member expected." },
        Type_reference_expected: { code: -9999999, category: 1 /* Error */, key: "Type reference expected." },
        Variable_declaration_expected: { code: -9999999, category: 1 /* Error */, key: "Variable declaration expected." },
        Argument_expression_expected: { code: -9999999, category: 1 /* Error */, key: "Argument expression expected." },
        Property_assignment_expected: { code: -9999999, category: 1 /* Error */, key: "Property assignment expected." },
        Expression_or_comma_expected: { code: -9999999, category: 1 /* Error */, key: "Expression or comma expected." },
        Parameter_declaration_expected: { code: -9999999, category: 1 /* Error */, key: "Parameter declaration expected." },
        Type_parameter_declaration_expected: { code: -9999999, category: 1 /* Error */, key: "Type parameter declaration expected." },
        Type_argument_expected: { code: -9999999, category: 1 /* Error */, key: "Type argument expected." },
        String_literal_expected: { code: -9999999, category: 1 /* Error */, key: "String literal expected." },
        not_preceded_by_parameter_list: { code: -9999999, category: 1 /* Error */, key: "'=>' not preceded by parameter list." },
        Invalid_assignment_target: { code: -9999999, category: 1 /* Error */, key: "Invalid assignment target." },
        super_must_be_followed_by_argument_list_or_member_access: { code: -9999999, category: 1 /* Error */, key: "'super' must be followed by argument list or member access." },
        Line_break_not_permitted_here: { code: -9999999, category: 1 /* Error */, key: "Line break not permitted here." },
        catch_or_finally_expected: { code: -9999999, category: 1 /* Error */, key: "'catch' or 'finally' expected." },
        Block_or_expected: { code: -9999999, category: 1 /* Error */, key: "Block or ';' expected." },
        Modifiers_not_permitted_on_index_signature_members: { code: -9999999, category: 1 /* Error */, key: "Modifiers not permitted on index signature members." },
        Class_member_declaration_expected: { code: -9999999, category: 1 /* Error */, key: "Class member declaration expected." },
        Declaration_expected: { code: -9999999, category: 1 /* Error */, key: "Declaration expected." },
        Invalid_reference_comment: { code: -9999999, category: 1 /* Error */, key: "Invalid reference comment." },
        File_0_is_not_an_external_module: { code: -9999999, category: 1 /* Error */, key: "File '{0}' is not an external module." },
        Excessive_stack_depth_comparing_types_0_and_1: { code: -9999999, category: 1 /* Error */, key: "Excessive stack depth comparing types '{0}' and '{1}'." },
        Type_0_is_not_assignable_to_type_1_Colon: { code: -9999999, category: 1 /* Error */, key: "Type '{0}' is not assignable to type '{1}':" },
        Type_0_is_not_assignable_to_type_1: { code: -9999999, category: 1 /* Error */, key: "Type '{0}' is not assignable to type '{1}'." },
        Property_0_is_missing_in_type_1: { code: -9999999, category: 1 /* Error */, key: "Property '{0}' is missing in type '{1}'." },
        Private_property_0_cannot_be_reimplemented: { code: -9999999, category: 1 /* Error */, key: "Private property '{0}' cannot be reimplemented." },
        Required_property_0_cannot_be_reimplemented_with_optional_property_in_1: { code: 2012, category: 1 /* Error */, key: "Required property '{0}' cannot be reimplemented with optional property in '{1}'." },
        Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors: { code: -9999999, category: 1 /* Error */, key: "Super calls are not permitted outside constructors or in nested functions inside constructors" },
        Only_public_methods_of_the_base_class_are_accessible_via_the_super_keyword: { code: -9999999, category: 1 /* Error */, key: "Only public methods of the base class are accessible via the 'super' keyword" },
        A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_or_has_parameter_properties: { code: -9999999, category: 1 /* Error */, key: "A 'super' call must be the first statement in the constructor when a class contains initialized properties or has parameter properties." },
        Constructors_for_derived_classes_must_contain_a_super_call: { code: -9999999, category: 1 /* Error */, key: "Constructors for derived classes must contain a 'super' call." },
        Import_name_cannot_be_0: { code: -9999999, category: 1 /* Error */, key: "Import name cannot be '{0}'" },
        Type_parameter_name_cannot_be_0: { code: -9999999, category: 1 /* Error */, key: "Type parameter name cannot be '{0}'" },
        Class_name_cannot_be_0: { code: -9999999, category: 1 /* Error */, key: "Class name cannot be '{0}'" },
        Interface_name_cannot_be_0: { code: -9999999, category: 1 /* Error */, key: "Interface name cannot be '{0}'" },
        Enum_name_cannot_be_0: { code: -9999999, category: 1 /* Error */, key: "Enum name cannot be '{0}'" },
        Types_of_property_0_are_incompatible_Colon: { code: -9999999, category: 1 /* Error */, key: "Types of property '{0}' are incompatible:" },
        Types_of_parameters_0_and_1_are_incompatible_Colon: { code: -9999999, category: 1 /* Error */, key: "Types of parameters '{0}' and '{1}' are incompatible:" },
        Unknown_identifier_0: { code: -9999999, category: 1 /* Error */, key: "Unknown identifier '{0}'." },
        Property_0_is_inaccessible: { code: -9999999, category: 1 /* Error */, key: "Property '{0}' is inaccessible." },
        Function_implementation_expected: { code: -9999999, category: 1 /* Error */, key: "Function implementation expected." },
        Property_0_of_type_1_is_not_assignable_to_string_index_type_2: { code: -9999999, category: 1 /* Error */, key: "Property '{0}' of type '{1}' is not assignable to string index type '{2}'." },
        Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2: { code: -9999999, category: 1 /* Error */, key: "Property '{0}' of type '{1}' is not assignable to numeric index type '{2}'." },
        Numeric_index_type_0_is_not_assignable_to_string_index_type_1: { code: -9999999, category: 1 /* Error */, key: "Numeric index type '{0}' is not assignable to string index type '{1}'." },
        Class_0_incorrectly_extends_base_class_1_Colon: { code: -9999999, category: 1 /* Error */, key: "Class '{0}' incorrectly extends base class '{1}':" },
        Class_0_incorrectly_extends_base_class_1: { code: -9999999, category: 1 /* Error */, key: "Class '{0}' incorrectly extends base class '{1}'." },
        Class_static_side_0_incorrectly_extends_base_class_static_side_1_Colon: { code: -9999999, category: 1 /* Error */, key: "Class static side '{0}' incorrectly extends base class static side '{1}':" },
        Class_static_side_0_incorrectly_extends_base_class_static_side_1: { code: -9999999, category: 1 /* Error */, key: "Class static side '{0}' incorrectly extends base class static side '{1}'." },
        Type_name_0_in_extends_clause_does_not_reference_constructor_function_for_0: { code: -9999999, category: 1 /* Error */, key: "Type name '{0}' in extends clause does not reference constructor function for '{0}'." },
        Class_0_incorrectly_implements_interface_1_Colon: { code: -9999999, category: 1 /* Error */, key: "Class '{0}' incorrectly implements interface '{1}':" },
        Class_0_incorrectly_implements_interface_1: { code: -9999999, category: 1 /* Error */, key: "Class '{0}' incorrectly implements interface '{1}'." },
        Interface_0_incorrectly_extends_interface_1_Colon: { code: -9999999, category: 1 /* Error */, key: "Interface '{0}' incorrectly extends interface '{1}':" },
        Interface_0_incorrectly_extends_interface_1: { code: -9999999, category: 1 /* Error */, key: "Interface '{0}' incorrectly extends interface '{1}'." },
        Ambient_external_modules_cannot_be_nested_in_other_modules: { code: -9999999, category: 1 /* Error */, key: "Ambient external modules cannot be nested in other modules." },
        Import_declarations_in_an_internal_module_cannot_reference_an_external_module: { code: -9999999, category: 1 /* Error */, key: "Import declarations in an internal module cannot reference an external module." },
        A_module_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged: { code: -9999999, category: 1 /* Error */, key: "A module declaration cannot be in a different file from a class or function with which it is merged" },
        A_module_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged: { code: -9999999, category: 1 /* Error */, key: "A module declaration cannot be located prior to a class or function with which it is merged" },
        Cannot_compile_external_modules_unless_the_module_flag_is_provided: { code: -9999999, category: 1 /* Error */, key: "Cannot compile external modules unless the '--module' flag is provided." },
        Import_declaration_conflicts_with_local_declaration_of_0: { code: -9999999, category: 1 /* Error */, key: "Import declaration conflicts with local declaration of '{0}'" },
        Module_0_is_hidden_by_a_local_declaration_with_the_same_name: { code: -9999999, category: 1 /* Error */, key: "Module '{0}' is hidden by a local declaration with the same name" },
        Filename_0_differs_from_already_included_filename_1_only_in_casing: { code: -9999999, category: 1 /* Error */, key: "Filename '{0}' differs from already included filename '{1}' only in casing" },
        Argument_for_module_option_must_be_commonjs_or_amd: { code: -9999999, category: 1 /* Error */, key: "Argument for '--module' option must be 'commonjs' or 'amd'." },
        Argument_for_target_option_must_be_es3_or_es5: { code: -9999999, category: 1 /* Error */, key: "Argument for '--target' option must be 'es3' or 'es5'." },
        Compiler_option_0_expects_an_argument: { code: -9999999, category: 1 /* Error */, key: "Compiler option '{0}' expects an argument." },
        Unterminated_quoted_string_in_response_file_0: { code: -9999999, category: 1 /* Error */, key: "Unterminated quoted string in response file '{0}'." },
        Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1: { code: -9999999, category: 1 /* Error */, key: "Locale must be of the form <language> or <language>-<territory>. For example '{0}' or '{1}'." },
        Unsupported_locale_0: { code: -9999999, category: 1 /* Error */, key: "Unsupported locale {0}." },
        Unable_to_open_file_0: { code: -9999999, category: 1 /* Error */, key: "Unable to open file {0}." },
        Corrupted_locale_file_0: { code: -9999999, category: 1 /* Error */, key: "Corrupted locale file {0}." },
        No_input_files_specified: { code: -9999999, category: 1 /* Error */, key: "No input files specified." }
    };
})(ts || (ts = {}));
var sys = (function () {
    function getWScriptSystem() {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        var fileStream = new ActiveXObject("ADODB.Stream");
        fileStream.Type = 2;
        var binaryStream = new ActiveXObject("ADODB.Stream");
        binaryStream.Type = 1;
        var args = [];
        for (var i = 0; i < WScript.Arguments.length; i++) {
            args[i] = WScript.Arguments.Item(i);
        }
        function readFile(fileName, encoding) {
            if (!fso.FileExists(fileName)) {
                return undefined;
            }
            fileStream.Open();
            try {
                if (encoding) {
                    fileStream.Charset = encoding;
                    fileStream.LoadFromFile(fileName);
                }
                else {
                    fileStream.Charset = "x-ansi";
                    fileStream.LoadFromFile(fileName);
                    var bom = fileStream.ReadText(2) || "";
                    fileStream.Position = 0;
                    fileStream.Charset = bom.length >= 2 && (bom.charCodeAt(0) === 0xFF && bom.charCodeAt(1) === 0xFE || bom.charCodeAt(0) === 0xFE && bom.charCodeAt(1) === 0xFF) ? "unicode" : "utf-8";
                }
                return fileStream.ReadText();
            }
            catch (e) {
                throw e.number === -2147024809 ? new Error(ts.Diagnostics.Unsupported_file_encoding.key) : e;
            }
            finally {
                fileStream.Close();
            }
        }
        function writeFile(fileName, data) {
            fileStream.Open();
            binaryStream.Open();
            try {
                fileStream.Charset = "utf-8";
                fileStream.WriteText(data);
                fileStream.Position = 3;
                fileStream.CopyTo(binaryStream);
                binaryStream.SaveToFile(fileName, 2);
            }
            finally {
                binaryStream.Close();
                fileStream.Close();
            }
        }
        return {
            args: args,
            newLine: "\r\n",
            useCaseSensitiveFileNames: false,
            write: function write(s) {
                WScript.StdOut.Write(s);
            },
            writeErr: function writeErr(s) {
                WScript.StdErr.Write(s);
            },
            readFile: readFile,
            writeFile: writeFile,
            resolvePath: function resolvePath(path) {
                return fso.GetAbsolutePathName(path);
            },
            fileExists: function fileExists(path) {
                return fso.FileExists(path);
            },
            directoryExists: function directoryExists(path) {
                return fso.FolderExists(path);
            },
            createDirectory: function createDirectory(directoryName) {
                if (!this.directoryExists(directoryName)) {
                    fso.CreateFolder(directoryName);
                }
            },
            getExecutingFilePath: function getExecutingFilePath() {
                return WScript.ScriptFullName;
            },
            getCurrentDirectory: function getCurrentDirectory() {
                return new ActiveXObject("WScript.Shell").CurrentDirectory;
            },
            getMemoryUsage: function getMemoryUsage() {
                return 0;
            },
            exit: function exit(exitCode) {
                try {
                    WScript.Quit(exitCode);
                }
                catch (e) {
                }
            }
        };
    }
    function getNodeSystem() {
        var _fs = require("fs");
        var _path = require("path");
        var _os = require('os');
        var platform = _os.platform();
        var useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin";
        function readFile(fileName, encoding) {
            if (!_fs.existsSync(fileName)) {
                return undefined;
            }
            var buffer = _fs.readFileSync(fileName);
            var len = buffer.length;
            if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                len &= ~1;
                for (var i = 0; i < len; i += 2) {
                    var temp = buffer[i];
                    buffer[i] = buffer[i + 1];
                    buffer[i + 1] = temp;
                }
                return buffer.toString("utf16le", 2);
            }
            if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                return buffer.toString("utf16le", 2);
            }
            if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                return buffer.toString("utf8", 3);
            }
            return buffer.toString("utf8");
        }
        function writeFile(fileName, data) {
            _fs.writeFileSync(fileName, data, "utf8");
        }
        return {
            args: process.argv.slice(2),
            newLine: _os.EOL,
            useCaseSensitiveFileNames: useCaseSensitiveFileNames,
            write: function write(s) {
                process.stdout.write(s);
            },
            writeErr: function writeErr(s) {
                process.stderr.write(s);
            },
            readFile: readFile,
            writeFile: writeFile,
            resolvePath: function (path) {
                return _path.resolve(path);
            },
            fileExists: function fileExists(path) {
                return _fs.existsSync(path);
            },
            directoryExists: function directoryExists(path) {
                return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
            },
            createDirectory: function createDirectory(directoryName) {
                if (!this.directoryExists(directoryName)) {
                    _fs.mkdirSync(directoryName);
                }
            },
            getExecutingFilePath: function getExecutingFilePath() {
                return process.mainModule.filename;
            },
            getCurrentDirectory: function getCurrentDirectory() {
                return process.cwd();
            },
            getMemoryUsage: function getMemoryUsage() {
                global.gc();
                return process.memoryUsage().heapUsed;
            },
            exit: function exit(exitCode) {
                process.exit(exitCode);
            }
        };
    }
    if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
        return getWScriptSystem();
    }
    else if (typeof module !== "undefined" && module.exports) {
        return getNodeSystem();
    }
    else {
        return undefined;
    }
})();
function main() {
    if (sys.args.length < 1) {
        sys.write("Usage:" + sys.newLine);
        sys.write("\tnode processDiagnosticMessages.js <diagnostic-json-input-file>" + sys.newLine);
        return;
    }
    var inputFilePath = sys.args[0].replace(/\\/g, "/");
    var inputStr = sys.readFile(inputFilePath);
    var diagnosticMesages = JSON.parse(inputStr);
    var names = Utilities.getObjectKeys(diagnosticMesages);
    var nameMap = buildUniqueNameMap(names);
    var infoFileOutput = buildInfoFileOutput(diagnosticMesages, nameMap);
    var inputDirectory = inputFilePath.substr(0, inputFilePath.lastIndexOf("/"));
    var fileOutputPath = inputDirectory + "/diagnosticInformationMap.generated.ts";
    sys.writeFile(fileOutputPath, infoFileOutput);
}
function buildUniqueNameMap(names) {
    var nameMap = {};
    var uniqueNames = NameGenerator.ensureUniqueness(names, undefined, false);
    for (var i = 0; i < names.length; i++) {
        nameMap[names[i]] = uniqueNames[i];
    }
    return nameMap;
}
function buildInfoFileOutput(messageTable, nameMap) {
    var result = '// <auto-generated />\r\n' + '/// <reference path="types.ts" />\r\n' + 'module ts {\r\n' + '    export var Diagnostics = {\r\n';
    var names = Utilities.getObjectKeys(messageTable);
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var diagnosticDetails = messageTable[name];
        result += '        ' + convertPropertyName(nameMap[name]) + ': { code: ' + diagnosticDetails.code + ', category: DiagnosticCategory.' + diagnosticDetails.category + ', key: "' + name.replace('"', '\\"') + '" },\r\n';
    }
    result += '    };\r\n}';
    return result;
}
function convertPropertyName(origName) {
    var result = origName.split("").map(function (char) {
        if (char === '*') {
            return "_Asterisk";
        }
        if (char === '/') {
            return "_Slash";
        }
        if (char === ':') {
            return "_Colon";
        }
        return /\w/.test(char) ? char : "_";
    }).join("");
    result = result.replace(/_+/g, "_");
    result = result.replace(/^_([^\d])/, "$1");
    result = result.replace(/_$/, "");
    return result;
}
var NameGenerator;
(function (NameGenerator) {
    function ensureUniqueness(names, isFixed, isCaseSensitive) {
        if (isFixed === void 0) { isFixed = names.map(function () { return false; }); }
        if (isCaseSensitive === void 0) { isCaseSensitive = true; }
        var names = names.map(function (x) { return x; });
        ensureUniquenessInPlace(names, isFixed, isCaseSensitive);
        return names;
    }
    NameGenerator.ensureUniqueness = ensureUniqueness;
    function ensureUniquenessInPlace(names, isFixed, isCaseSensitive) {
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            var collisionIndices = Utilities.collectMatchingIndices(name, names, isCaseSensitive);
            if (collisionIndices.length < 2) {
                continue;
            }
            handleCollisions(name, names, isFixed, collisionIndices, isCaseSensitive);
        }
    }
    function handleCollisions(name, proposedNames, isFixed, collisionIndices, isCaseSensitive) {
        var suffix = 1;
        for (var i = 0; i < collisionIndices.length; i++) {
            var collisionIndex = collisionIndices[i];
            if (isFixed[collisionIndex]) {
                continue;
            }
            while (true) {
                var newName = name + suffix++;
                if (proposedNames.some(function (name) { return Utilities.stringEquals(name, newName, isCaseSensitive); })) {
                    proposedNames[collisionIndex] = newName;
                    break;
                }
            }
        }
    }
})(NameGenerator || (NameGenerator = {}));
var Utilities;
(function (Utilities) {
    function collectMatchingIndices(name, proposedNames, isCaseSensitive) {
        if (isCaseSensitive === void 0) { isCaseSensitive = true; }
        var matchingIndices = [];
        for (var i = 0; i < proposedNames.length; i++) {
            if (stringEquals(name, proposedNames[i], isCaseSensitive)) {
                matchingIndices.push(i);
            }
        }
        return matchingIndices;
    }
    Utilities.collectMatchingIndices = collectMatchingIndices;
    function stringEquals(s1, s2, caseSensitive) {
        if (caseSensitive === void 0) { caseSensitive = true; }
        if (!caseSensitive) {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
        }
        return s1 == s2;
    }
    Utilities.stringEquals = stringEquals;
    function getObjectKeys(obj) {
        var result = [];
        for (var name in obj) {
            if (obj.hasOwnProperty(name)) {
                result.push(name);
            }
        }
        return result;
    }
    Utilities.getObjectKeys = getObjectKeys;
})(Utilities || (Utilities = {}));
main();
