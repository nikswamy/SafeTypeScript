// Modified by N.Swamy, A.Rastogi (2014)
///<reference path='../../references.ts' />
///<reference path='types.ts' />
module TypeScript {

    /* ******************************************************************************************
      *
      * Translating TypeScript types to SoundTypes                                             
      * 
      * ******************************************************************************************/
    export module TranslateTypes {
        function unexpectedSymbol<A>(t: PullSymbol): A {
            throw new Error(TcUtil.Logger.pos()
                + ": Unrecognized PullSymbol: " + t.toString()
                + " :: isType " + t.isType()
                + ", name " + t.name
                + " fullName :: " + t.fullName()
                + " :: kind " + t.kind);
        }
        export function translate(t: PullSymbol, tcenv: TcEnv, debug: boolean= false): SoundType {
            if (t.isType()) return translateType(<PullTypeSymbol>t, tcenv, debug);
            return unexpectedSymbol<SoundType>(t);
        }
        export function translateType(t: PullTypeSymbol, tcenv: TcEnv, debug: boolean = false): SoundType {
            var ts = translateTypeInternal(t, tcenv, debug);
            if (tcenv.inBuildPhase) tcenv.flushLocalTypes();
            return ts;
        }
        export function translateTypeOrSig(t: PullSymbol, tcenv: TcEnv, debug: boolean = false): SoundType {
            if (t.isType()) return translateType(<PullTypeSymbol>t, tcenv, debug);
            else if (t.isSignature()) {
                if (t.kind === PullElementKind.IndexSignature) {
                    return signatureToIndexMap(<PullSignatureSymbol>t, tcenv, debug);
                }
                else if (t.kind === PullElementKind.CallSignature) {
                    return signatureToPolyArrow(<PullSignatureSymbol>t, tcenv, debug);
                }
                else if (t.kind === PullElementKind.ConstructSignature) {
                    return constructSignatureToPolyArrow(<PullSignatureSymbol>t, tcenv, debug);
                }
            }
            return unexpectedSymbol<SoundType>(t);
        }
        function translateTypeInternal(t: PullTypeSymbol, tcenv: TcEnv, debug: boolean = false): SoundType {
            if (t._translatedSymbol) return t._translatedSymbol;           //if it's memo'd, just return it
            var ts = translateTypeBody(t, tcenv, debug);
            t._translatedSymbol = ts;
            return ts;
        }
        function translateTypeBody(t: PullTypeSymbol, tcenv: TcEnv, debug: boolean = false): SoundType {
            var log = debug ? (msg: any) => console.log(msg) : (msg: any) => { };
            if (!t) {
                console.log(TcUtil.Logger.pos() + ": Warning: TypeScript inferred an undefined type; mapping it to 'any'");
                return TConstant.Any;
            }
            var typeOfSym = t.getTypeOfSymbol();
            if (typeOfSym) {
                var res = tcenv.lookupFullName({ dottedName: typeOfSym.fullName() }, true);
                if (res) {
                    return res;
                }
            }
            if (t.kind === PullElementKind.FunctionType) {
                var ft = new TRecord([]);
                addMembersAndMethods(t, ft, tcenv, debug);
                return ft;
            }
            else if (TcUtil.isClassType(t)) {
                var tc = new TClass(TcUtil.getClassName(t));
                addMembersAndMethods(t, tc, tcenv, debug);
                return tc;
            }
            else if (!t.name || t.name === "" || t.name === "{}") {
                var s = new TRecord([]);
                addMembersAndMethods(t, s, tcenv, debug);
                return s;
            }
            else {
                switch (t.name) {
                    case "boolean": return TConstant.Bool;
                    case "string": return TConstant.String;
                    case "number": return TConstant.Number;
                    case "un": return TConstant.Un;
                    case "null": return TConstant.Null;
                    case "any": return TConstant.Any;
                    case "void": return TConstant.Void;
                    default:
                        return translateNamedType(t, tcenv, debug);
                }
            }
            return unexpectedSymbol<SoundType>(t);
        }
        function addMembersAndMethods(t: PullTypeSymbol, r: StructuredType, tcenv: TcEnv, debug: boolean = false) {
            var log = debug ? (msg: any) => console.log(msg) : (msg: any) => { };
            if (t.getCallSignatures()) {
                t.getCallSignatures().map((callSig) =>
                    r.addCallSignature(signatureToPolyArrow(callSig, tcenv, debug)));
            }
            if (t.getIndexSignatures()) {
                t.getIndexSignatures().map((indexSig) =>
                    r.addIndexSignature(signatureToIndexMap(indexSig, tcenv, debug)));
            }
            if (t.getConstructSignatures()) {
                t.getConstructSignatures().map((constructSig) =>
                    r.addConstructSignature(constructSignatureToPolyArrow(constructSig, tcenv, debug)));
            }
            var mems = t.getMembers();
            for (var i = 0; mems && i < mems.length; i++) {
                if (mems[i].isMethod() || mems[i].kind === PullElementKind.FunctionExpression) {
                    var callSigs = mems[i].type.getCallSignatures();
                    callSigs.forEach((s: PullSignatureSymbol) =>
                        r.addMethod(Method(mems[i].name, signatureToPolyArrow(s, tcenv, debug))));
                } else {
                    r.addField(Field(mems[i].name, translateTypeInternal(mems[i].type, tcenv, debug), mems[i].isOptional));
                }
            }
        }
        interface FullNameAndParams {
            fullName: string[];
            binders: Pair<string, SoundType>[];
            targs?: SoundType[];
            tparams?: TVar[];
            dottedName?: string;
        }
        function fullNameAndParams(t: PullTypeSymbol, tcenv: TcEnv, debug= false): FullNameAndParams {
            var emptyBinders: Pair<string, SoundType>[] = [];
            if (t.isTypeParameter()) {
                return {
                    fullName: [t.name],
                    binders: emptyBinders
                };
            }
            var fullName = t.fullQualifiedName();
            if (tcenv.compilationSettings.generics() && t.isGeneric()) {
                if (t.getTypeArguments()) { //this is not a binder for the type parameters
                    var targs = t.getTypeArguments().map((t) => translateTypeInternal(t, tcenv, debug));
                    return {
                        fullName: fullName,
                        targs: targs,
                        binders: emptyBinders
                    };

                } else {
                    var binders: Pair<string, SoundType>[] = [];
                    var tparams = t.getTypeParameters().map((ptps) => {
                        var tv = new TVar(TcUtil.mkTypeParamName(fullName, ptps.name), ptps.name);
                        binders.push({ fst: ptps.name, snd: <SoundType>tv });
                        return tv;
                    });
                    return {
                        fullName: fullName,
                        targs: tparams.map((t: TVar) => <SoundType>t),
                        tparams: tparams,
                        binders: binders
                    };
                }
            } else {
                return {
                    fullName: fullName,
                    binders: emptyBinders
                };
            }
        }
        function translateNamedType(t: PullTypeSymbol, tcenv: TcEnv, debug: boolean = false): SoundType {
            var log = debug ? (msg: any) => console.log(msg) : (msg: any) => { };
            var nameAndArgs = fullNameAndParams(t, tcenv, debug);
            return tcenv.withLocalTypes(nameAndArgs.binders, () => {
                var cachedType: SoundType = tcenv.lookupType(nameAndArgs);
                if (cachedType) {
                    if (nameAndArgs.targs) {
                        if (nameAndArgs.tparams && nameAndArgs.tparams.length !== 0 && tcenv.inBuildPhase) {
                            throw new Error("Unexpected nested binding occurrence");
                        } else if (nameAndArgs.tparams) {
                            return cachedType;
                        }
                        return new TInst(<TPoly>cachedType, nameAndArgs.targs);
                    }
                    return cachedType;
                }

                if (t.isEnum()) {
                    return new TEnum(t.name, []);
                }
                else if (t.isTypeParameter()) {
                    if (tcenv.compilationSettings.generics() && !tcenv.inBuildPhase) {
                        console.log(TcUtil.Logger.pos() + " type variable " + nameAndArgs.fullName + " not found; defaulting to 'any'");
                    }
                    return TConstant.Any;
                }
                var mkT =
                    (t.isInterface() ? () => <NamedType>new TInterface(t.name)
                    : () => <NamedType>new TObject(t.name));
                if (nameAndArgs.targs && !nameAndArgs.tparams) {
                    //we haven't seen a definition of this type yet. just make a stub and instantiate it. 
                    return new TInst(new TPoly([], mkT(), nameAndArgs.fullName), nameAndArgs.targs);
                }
                var iot: NamedType = null;
                var tscheme: SoundType = null;
                if (nameAndArgs.tparams && nameAndArgs.tparams.length !== 0) {//binding occurrence
                    iot = mkT();
                    tscheme = new TPoly(nameAndArgs.tparams, iot);
                } else {
                    iot = mkT();
                    tscheme = iot;
                }
                var buildScheme = () => {
                    iot.extendsC = t.getExtendedTypes().map((pts) => translateTypeInternal(pts, tcenv, debug));
                    iot.implementsI = t.getImplementedTypes().map((pts) => translateTypeInternal(pts, tcenv, debug));
                    addMembersAndMethods(t, iot, tcenv, debug);
                    return tscheme;
                };
                if (tcenv.inBuildPhase) {
                    return tcenv.pushLocalType(nameAndArgs, tscheme, buildScheme);
                } else {
                    return tcenv.withLocalType(nameAndArgs, tscheme, buildScheme);
                }
            });
        }
        function signatureToPolyArrow(f: PullSignatureSymbol, tcenv: TcEnv, debug= false): SoundType {
            var translateArgs = (f: PullSignatureSymbol) => {
                var args: TArg[] = [];
                for (var i = 0; i < f.parameters.length; i++) {
                    var flags = f.parameters[i].getDeclarations().map((d) => d.flags);
                    args.push(new TArg(f.parameters[i].name, translateTypeInternal(f.parameters[i].type, tcenv, debug), flags, f.parameters[i].isVarArg));
                }
                return args;
            };
            var resolveConstraint = (f: PullTypeSymbol): SoundType => {
                if (!f) {
                    return undefined;
                }
                var t = translateTypeInternal(f, tcenv, debug);
                if ((!t) || t.typeName === TypeName.Variable) {
                    throw new Error("Variable constraints are not yet supported");
                }
                return t;
            };
            var binders = !f.typeParameters
                ? []
                : f.typeParameters.map((tp: PullTypeSymbol) => {
                    var t = <TVar>tcenv.lookupType({ dottedName: tp.name });
                    if (t && t.typeName === TypeName.Variable) {
                        var x = (<TVar>t).asBinder();
                        x["push"] = false;
                        return x;
                    }
                    else {
                        var constraint = resolveConstraint((<PullTypeParameterSymbol> tp).getConstraint());
                        t = new TypeScript.TVar(tp.name, tp.name, constraint);
                        var x = t.asBinder();
                        x["push"] = true;
                        return x;
                    }
                });
            var arr = tcenv.withLocalTypes(binders.filter((f) => f["push"]), () => new TArrow(translateArgs(f), translateTypeInternal(f.returnType, tcenv, debug)));
            return TcUtil.close(binders, arr);
        }
        function signatureToIndexMap(i: PullSignatureSymbol, tcenv: TcEnv, debug= false): TIndexMap {
            if (i.kind !== PullElementKind.IndexSignature) return unexpectedSymbol<TIndexMap>(i);
            var indexType = translateTypeInternal(i.parameters[0].type, tcenv, debug);
            var elementType = translateTypeInternal(i.returnType, tcenv, debug);
            return new TIndexMap(indexType, elementType);
        }
        function constructSignatureToPolyArrow(t: PullSignatureSymbol, tcenv: TcEnv, debug= false): SoundType {
            var constr_t = signatureToPolyArrow(<PullSignatureSymbol>t, tcenv, debug);
            if (constr_t.typeName === TypeName.Poly) {//need to massage it a bit to move the type instantiations to the result
                var tfun = (<TPoly>constr_t).body;
                if (!tfun || tfun.typeName !== TypeName.Arrow) {
                    throw new Error("Impossible");          
                }
                var tarrow = <TArrow>tfun;
                if (tarrow.result.typeName === TypeName.Poly) {
                    var f2 = new TArrow(tarrow.args, new TInst(<TPoly>tarrow.result, (<TPoly>constr_t).bvars.map((t) => <SoundType>t)));      //NS: real type error here: bvars is a TVar[], expect a SoundType[]
                    constr_t = new TPoly((<TPoly>constr_t).bvars, f2);
                }
            }
            return constr_t;
        }
    }
}

