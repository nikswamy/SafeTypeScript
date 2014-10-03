// Modified by N.Swamy, A.Rastogi (2014)
///<reference path='../../references.ts' />
/* The first file in the dependency chain of the sound type-checker */
module TypeScript {
    export interface Pair<S, T> {
        fst: S;
        snd: T;
    }
    export function pair<S, T>(s: S, t: T): Pair<S, T> {
        return { fst: s, snd: t };
    }
    export interface Triple<S, T, U> extends Pair<S,T> {
        third: U;
    }
    export interface Either<S, T> {
        left?: S;
        right?: T;
    }

    export function Inl<S,T>(s: S): Either<S, T> {
        return { left: s };
    }

    export function Inr<S, T>(t: T): Either<S, T> {
        return { right: t };
    }
    export function idOrStringText(a: AST): string {
        if (a instanceof Identifier) {
            return (<Identifier>a).text();
        } else if (a instanceof StringLiteral) {
            return (<StringLiteral>a).text();
        } else {
            throw "Impossible";
        }
    }
    export function scriptNameFromFileName(fn: string) {
        return fn.substring(fn.lastIndexOf("/") + 1);
    }
    export class MkAST {
        static getRtti = (o: AST): AST => {
            if (SoundTypeChecker.compilationSettings.weakMaps()) {
                return MkAST.callRT("getRtti", [o]);
            }
            return MkAST.fieldAccess(o, "__rtti__");
        };
        static setRtti = (o: AST, t:AST): AST => {
            if (SoundTypeChecker.compilationSettings.weakMaps()) {
                return MkAST.callRT("setRtti", [o, t]);
            }
            return new BinaryExpression(SyntaxKind.AssignmentExpression,
                MkAST.fieldAccess(o, "__rtti__"), t);
        };
        //Builds AST fragments for the instrumentation that we insert
        static fieldAccess = (o: AST, f: string) => {
            return new MemberAccessExpression(o, new Identifier(f));
        };
        static fieldOfRT = (fname: string): AST => {
            var f = MkAST.fieldAccess(new Identifier("RT"), fname);
            return f;
        };
        static argList = (args: AST[]) => {
            return new ISeparatedSyntaxList2(TcUtil.currentFile(), args, args.length - 1);
        };
        static callExpr = (f: AST, args: AST[]): AST => {
            return new InvocationExpression(f, new ArgumentList(null, MkAST.argList(args), new ASTSpan(0, 0)));
        };
        static callRT = (m: string, args: AST[]): AST => {
            return MkAST.callExpr(MkAST.fieldOfRT(m), args);
        };
        static mkCleanArray = (args: AST[]) => {
            return new ArrayLiteralExpression(MkAST.argList(args), NewLineMode.Suppress);
        };
        static mkObjLit = (args: Pair<string, AST>[]): AST => {
            var argL = args.map((p:Pair<string,AST>) : AST => {
                return new SimplePropertyAssignment(MkAST.stringConst(p.fst), //NS: SimplePropertyAssignment used to expect an Identifier; changed it to take an AST for JSON keys
                                                    p.snd);
            });
            return new ObjectLiteralExpression(MkAST.argList(argL), NewLineMode.Force);
        };
        static stringConst = (s: string): AST => {
            return new StringLiteral("\"" + s + "\"", s);
        };
        static numberConst = (n: number): AST => {
            return new NumericLiteral(n, n.toString(), n.toString());
        };
        static ttConst = (): AST => { return new LiteralExpression(SyntaxKind.TrueKeyword, "true", "true"); };
        static ffConst = (): AST => { return new LiteralExpression(SyntaxKind.FalseKeyword, "false", "false"); };
        static undefConst = (): AST => new Identifier("undefined");
        static boolConst(b: boolean) {
            return b ? MkAST.ttConst() : MkAST.ffConst();
        }
        static nullConst = (): AST => {
            return new LiteralExpression(SyntaxKind.NullKeyword, "null", "null");
        }
        static unsafe = (e: AST): AST => {
            var x = MkAST.callExpr(MkAST.fieldOfRT("__UNSAFE__"), [e]);
            x.soundType = e.soundType;
            return x;
        };
        static id = (s: string) => new Identifier(s);
    }
    export module TcUtil {
        var _currentFile: string = null;
        var _currentScript: string;
        export interface Delta extends SoundType { }
        export var zeroDelta: Delta = undefined;
        export function currentFile() {
            return _currentFile;
        };
        export function setCurrentFile(f: string) {
            _currentFile = f;
            _currentScript = scriptNameFromFileName(f);
        };
        export function isCurrentScriptRT() {
            return _currentScript === "rt.ts";
        };
        export function isCurrentScriptLib_d_ts() {
            return _currentScript === "lib.d.ts";
        };
        export function unFree(t: SoundType) {
            return true;
        };
        export function isPrimitive(t: SoundType) {
            t = t.unfold();
            if (t.isArray() || t.isCheckedArray() || t.typeName === TypeName.Bool || t.typeName === TypeName.String || t.typeName === TypeName.Number) {
                return true;
            }
            if (t instanceof NamedType) {
                var n = <NamedType>t;
                switch (n.name) {
                    case "Array":
                    case "Object":
                    case "Boolean":
                    case "Number":
                    case "String":
                    case "Error":
                    case "TypeError":
                    case "RegExp": return true;
                    default: return false;
                }
            }
            return false;
        }
        export function markAsVirtual(tif: SoundType) {
            return isCurrentScriptLib_d_ts()
                && !isPrimitive(tif);
        }
        export function markAsNominal(tif: SoundType) {
            return isCurrentScriptLib_d_ts()
                && isPrimitive(tif);
        }
        export function shallowTag(sc: Pair<boolean, Delta>, a: AST, ta: SoundType): AST  {
            if (sc.fst && sc.snd) {
                var aa = MkAST.callRT("shallowTag", [a, sc.snd.toRTTI()]);
                aa.soundType = ta;
                return aa;
            }
            return a;
        };
        export function checkAndTag(v: AST, tv: SoundType, texpected: SoundType): AST {
            return MkAST.callRT("checkAndTag", [v, tv.toRTTI(), texpected.toRTTI()]);
        }
        export function mkTypeParamName(ns: string[], id: string) {
            return ns.join(".") + ".'" + id;
        }
        export function mkArrayType(tcenv: TcEnv, elt: SoundType): SoundType {
            var a = tcenv.lookupType({ dottedName: "Array" });
            if (a && a.typeName === TypeName.Poly) {
                return new TInst(<TPoly>a, [elt]);
            }
            TcUtil.Logger.warn("Type Array not found");
            return TConstant.Any;
        }
        export function mkCheckedArrayType(tcenv: TcEnv, elt: SoundType): SoundType {
            var a = tcenv.lookupType({ dottedName: "CheckedArray" });
            if (a && a.typeName === TypeName.Poly) {
                return new TInst(<TPoly>a, [elt]);
            }
            TcUtil.Logger.warn("Type CheckedArray not found");
            return TConstant.Any;
        }
        export function force(t: SoundType, a: AST): AST {
            if (a.soundType && a.soundType.typeName === t.typeName) {
                return a;
            }
            switch (t.typeName) {
                case TypeName.Enum:
                case TypeName.Number: return new PrefixUnaryExpression(SyntaxKind.PlusExpression, a);
                case TypeName.String: return new BinaryExpression(SyntaxKind.AddExpression, a, MkAST.stringConst(""));
                case TypeName.Bool: return new ConditionalExpression(a, MkAST.boolConst(true), MkAST.boolConst(false));
                default: throw new Error("Unknown force type " + t.toString());
            }
        };
        export function zip<A, B>(a: A[], b: B[]): Pair<A, B>[] {
            if (a.length !== b.length) {
                throw new Error("Zip with unequal lengths");
            }
            return a.map((x:A, i:number, a:A[]) : Pair<A,B> => ({ fst: x, snd: b[i] }));
        }
        export function withType(a: AST, t: SoundType) {
            a.soundType = t;
            return a;
        };
        export function NYI(msg?: string): Pair<AST, boolean> {
            throw new Error(msg ? (msg + " not supported in [--secure|--safe] mode") : "Not yet implemented");
        };
        export function reservedName(x: string) {
            switch (x) {
                case "__rtti__": return true;
                default: return false;
            }
        };
        export function syntaxListMembers(l: ISyntaxList2): AST[] {
            var elts: AST[] = [];
            for (var i = 0; l && i < l.childCount(); i++) {
                elts.push(l.childAt(i));
            }
            return elts;
        }
        export function sepListMembers<B>(l: ISeparatedSyntaxList2) : AST [] {
            var out: AST[] = [];
            for (var i = 0; i < l.nonSeparatorCount(); i++) {
                out.push(l.nonSeparatorAt(i));
            }
            return out;
        }
        export function mapSepList2<B>(l: ISeparatedSyntaxList2, f: (a: AST) => B): B[]{
            var out: B[] = [];
            for (var i = 0; i < l.nonSeparatorCount(); i++) {
                out.push(f(l.nonSeparatorAt(i)));
            }
            return out;
        }
        export function mapSepList2WithIndex<B>(l: ISeparatedSyntaxList2, f: (a: AST, i:number) => B): B[] {
            var out: B[] = [];
            for (var i = 0; i < l.nonSeparatorCount(); i++) {
                out.push(f(l.nonSeparatorAt(i), i));
            }
            return out;
        }   
        export interface LocalTypeBinding extends Pair<string, SoundType> { }
        export function callSigTypeParamBindings(callSig: CallSignature): LocalTypeBinding[] {
            if (callSig && callSig.typeParameterList) {
                return TcUtil.mapSepList2(callSig.typeParameterList.typeParameters, (a: AST) => {
                    var n = (<TypeParameter>a).identifier.text();
                    return { fst: n, snd: <SoundType>new TVar(n, n) };
                });
            }
            return [];
        }
        export function typeParameterListBindings(tps: TypeParameterList, fullName: string[]= []): LocalTypeBinding[] {
            if (tps && tps.typeParameters.nonSeparatorCount() !== 0) {
                return TcUtil.mapSepList2(tps.typeParameters, (t: AST) => (<TVar>t.soundType).asBinder(fullName));
            }
            return [];
        }
        export function classDeclTypeParams(cd: ClassDeclaration, tcenv: TcEnv): LocalTypeBinding[] {
            if (cd.typeParameterList) {
                var fullName = tcenv.curNamespace(); fullName.push(cd.identifier.text());
                return TcUtil.mapSepList2(cd.typeParameterList.typeParameters, (t: AST) => {
                    var n = (<TypeParameter>t).identifier.text();
                    return { fst: n, snd: <SoundType>new TVar(TcUtil.mkTypeParamName(fullName, n), n) };
                });
            }
            return [];
        }
        export function isClassType(t: PullTypeSymbol) {
            var z: PullSignatureSymbol[] = null;
            return t.isObject()
                && t.getMembers().some((s) => s.name === "prototype" && s.anyDeclHasFlag(PullElementFlags.Static))
                && (z = t.getConstructSignatures(), (z && z.length !== 0));
        }
        export function getClassName(t: PullTypeSymbol) {
            var sig = t.getConstructSignatures()[0];
            return sig.returnType.name;
        }
        export function tvarsInScopeForClassElement(elt: AST, tcenv: TcEnv) {
            switch (elt.kind()) {
                case SyntaxKind.IndexMemberDeclaration:
                    return true;
                case SyntaxKind.MemberFunctionDeclaration:
                    return !hasModifier((<MemberFunctionDeclaration>elt).modifiers, PullElementFlags.Static);
                case SyntaxKind.MemberVariableDeclaration:
                    return !hasModifier((<MemberVariableDeclaration>elt).modifiers, PullElementFlags.Static);
                case SyntaxKind.ConstructorDeclaration:
                    return true;
                case SyntaxKind.SetAccessor:
                    return !hasModifier((<SetAccessor>elt).modifiers, PullElementFlags.Static);
                case SyntaxKind.GetAccessor:
                    return !hasModifier((<GetAccessor>elt).modifiers, PullElementFlags.Static);
                default:
                    TcUtil.Logger.error(DiagnosticCode.SEC_Unexpected_class_element, [kind2string(elt.kind())], elt);
                    return false;
            }
        }
        export interface VariableBinding {
            ast: AST;
            name: string;
            type: SoundType;
        }
        export function mkVariableBinding(a: AST, name: string, type: SoundType): VariableBinding {
            return { ast: a, name: name, type: type };
        }
        export function gatherFunctionBindings(elts: ISyntaxList2): VariableBinding[] {
            var bs: VariableBinding[] = [];
            for (var i = 0; i < elts.childCount(); i++) {
                var a = elts.childAt(i);
                switch (a.kind()) {
                    case SyntaxKind.FunctionDeclaration:
                        var fd = <FunctionDeclaration>a;
                        if (!TcEnv.currentEnv.symbol(a).anyDeclHasFlag(PullElementFlags.Ambient)) {
                            var signature = TcEnv.currentEnv.symbol(a);
                            bs.push({
                                ast: a,
                                name: fd.identifier.text(),
                                type: TranslateTypes.translateType(signature.type, TcEnv.currentEnv)
                            });
                        }
                        break;
                    default:
                        break;
                }
            };
            return bs;
        }
        export function isArray(i: SoundType) {
            if (i.typeName === TypeName.Inst) {
                var t = (<TInst>i).t1;
                return (t.body.typeName === TypeName.Interface && ((<TInterface>t.body).name === "Array"));
            }
            return i.isArray();
        }
        export function arrayElementType(i: SoundType) {
            if (i.typeName === TypeName.Inst) {
                return (<TInst>i).args[0];
            }
            else if (i.typeName === TypeName.Interface) { 
                return (<TInterface>i).arrayElementType();
            }
            return undefined;
        }
        export interface fc {
            fresh: boolean;
            captureFree: boolean;
        }
        export var fcNeither = { fresh: false, captureFree: false };
        export function allowDeepSubtyping(a: AST): fc {
            /* fst is set if 'a' is a fresh allocation; 
               snd is set if 'a' captures no existing references that may be extracted directly */
            if (!a) return fcNeither;
            return { fresh: fresh(a), captureFree: captureFree(a)};

            function fresh(a: AST): boolean {
                switch (a.kind()) {
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.SimpleArrowFunctionExpression:
                    case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case SyntaxKind.NumericLiteral:
                    case SyntaxKind.StringLiteral:
                    case SyntaxKind.NullKeyword:
                    case SyntaxKind.TrueKeyword:
                    case SyntaxKind.FalseKeyword:
                    case SyntaxKind.VoidExpression:
                    case SyntaxKind.RegularExpressionLiteral:
                    case SyntaxKind.ObjectCreationExpression:
                    case SyntaxKind.ObjectLiteralExpression:
                    case SyntaxKind.ArrayLiteralExpression:
                        return true;
                    case SyntaxKind.EqualsValueClause:
                        return fresh((<EqualsValueClause>a).value);
                    case SyntaxKind.ParenthesizedExpression:
                        return fresh((<ParenthesizedExpression>a).expression);
                    default:
                        return false;
                }
            }

            function captureFree(a: AST): boolean {
                if (!a) return true;

                switch (a.kind()) {
                    case SyntaxKind.FunctionExpression:
                    case SyntaxKind.SimpleArrowFunctionExpression:
                    case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case SyntaxKind.NumericLiteral:
                    case SyntaxKind.StringLiteral:
                    case SyntaxKind.NullKeyword:
                    case SyntaxKind.TrueKeyword:
                    case SyntaxKind.FalseKeyword:
                    case SyntaxKind.VoidExpression:
                    case SyntaxKind.RegularExpressionLiteral:
                        return true;

                    case SyntaxKind.ObjectCreationExpression:
                        return true;

                    case SyntaxKind.SimplePropertyAssignment:
                        return captureFree((<SimplePropertyAssignment>a).expression);

                    case SyntaxKind.FunctionPropertyAssignment:
                        return true;

                    case SyntaxKind.ObjectLiteralExpression:
                        var o = <ObjectLiteralExpression>a;
                        return TcUtil.sepListMembers(o.propertyAssignments).every(captureFree);

                    case SyntaxKind.ArrayLiteralExpression:
                        var ar = <ArrayLiteralExpression>a;
                        return TcUtil.sepListMembers(ar.expressions).every(captureFree);

                    case SyntaxKind.EqualsValueClause:   
                        return captureFree((<EqualsValueClause>a).value);

                    case SyntaxKind.ConditionalExpression:
                        return captureFree((<ConditionalExpression>a).whenTrue)
                            && captureFree((<ConditionalExpression>a).whenFalse);

                    case SyntaxKind.ParenthesizedExpression:
                        return captureFree((<ParenthesizedExpression>a).expression);

                    case SyntaxKind.NotEqualsWithTypeConversionExpression:
                    case SyntaxKind.EqualsWithTypeConversionExpression:
                    case SyntaxKind.EqualsExpression:
                    case SyntaxKind.NotEqualsExpression:
                    case SyntaxKind.LessThanExpression:
                    case SyntaxKind.LessThanOrEqualExpression:
                    case SyntaxKind.GreaterThanOrEqualExpression:
                    case SyntaxKind.GreaterThanExpression:
                    case SyntaxKind.AddExpression:
                    case SyntaxKind.SubtractExpression:
                    case SyntaxKind.MultiplyExpression:
                    case SyntaxKind.DivideExpression:
                    case SyntaxKind.ModuloExpression:
                    case SyntaxKind.BitwiseOrExpression:
                    case SyntaxKind.BitwiseAndExpression:
                    case SyntaxKind.LeftShiftExpression:
                    case SyntaxKind.SignedRightShiftExpression:
                    case SyntaxKind.UnsignedRightShiftExpression:
                    case SyntaxKind.BitwiseExclusiveOrExpression:
                    case SyntaxKind.LogicalAndExpression:
                    case SyntaxKind.LogicalNotExpression:
                    case SyntaxKind.PlusExpression:
                    case SyntaxKind.NegateExpression:
                    case SyntaxKind.BitwiseNotExpression:
                    case SyntaxKind.PreIncrementExpression:
                    case SyntaxKind.PreDecrementExpression:
                    case SyntaxKind.PostIncrementExpression:
                    case SyntaxKind.PostDecrementExpression:
                    case SyntaxKind.TypeOfExpression:
                    case SyntaxKind.InstanceOfExpression:
                        return true;

                    case SyntaxKind.LogicalOrExpression:
                        var b = <BinaryExpression>a;
                        return captureFree(b.left) && captureFree(b.right);

                    case SyntaxKind.CommaExpression:
                        return captureFree((<BinaryExpression>a).right);
                    default:
                        return false;
                }
            }
        }
        export function varInScopeForInitializer(a: EqualsValueClause) {
            switch (a.value.kind()) {
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.SimpleArrowFunctionExpression:
                case SyntaxKind.ParenthesizedArrowFunctionExpression: return true;
                default: return false;
            }
        }
        export function safeTopLevelInitializer(a: EqualsValueClause) {
            return invocationFree(a.value);
        }
        function invocationFree(a: AST) : boolean {
            switch (a.kind()) {
                case SyntaxKind.FunctionPropertyAssignment:
                case SyntaxKind.IdentifierName:
                case SyntaxKind.QualifiedName:
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                case SyntaxKind.MemberFunctionDeclaration:
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.SimpleArrowFunctionExpression:
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                case SyntaxKind.NullKeyword:
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                case SyntaxKind.VoidExpression:
                case SyntaxKind.RegularExpressionLiteral:
                    return true;
                case SyntaxKind.List:
                    return TcUtil.syntaxListMembers(<ISyntaxList2>a).every(invocationFree);
                case SyntaxKind.SeparatedList:
                    return TcUtil.sepListMembers(<ISeparatedSyntaxList2>a).every(invocationFree);
                case SyntaxKind.ObjectLiteralExpression:
                    return invocationFree((<ObjectLiteralExpression>a).propertyAssignments);
                case SyntaxKind.SimplePropertyAssignment:
                    return invocationFree((<SimplePropertyAssignment>a).expression);
                case SyntaxKind.MemberAccessExpression:
                    return invocationFree((<MemberAccessExpression>a).expression);
                case SyntaxKind.ArrayLiteralExpression:
                    return invocationFree((<ArrayLiteralExpression>a).expressions);
                case SyntaxKind.CastExpression:
                    return invocationFree((<CastExpression>a).expression);
                case SyntaxKind.ElementAccessExpression:
                    return invocationFree((<ElementAccessExpression>a).expression)
                        && invocationFree((<ElementAccessExpression>a).argumentExpression);
                case SyntaxKind.TypeOfExpression:
                    return invocationFree((<TypeOfExpression>a).expression);
                case SyntaxKind.DeleteExpression:
                    return invocationFree((<TypeOfExpression>a).expression);
                case SyntaxKind.ConditionalExpression:
                    return invocationFree((<ConditionalExpression>a).condition)
                        && invocationFree((<ConditionalExpression>a).whenTrue)
                        && invocationFree((<ConditionalExpression>a).whenFalse);
                case SyntaxKind.ParenthesizedExpression:
                    return invocationFree((<ParenthesizedExpression>a).expression);
                default: 
                    if (a instanceof BinaryExpression) {
                        return invocationFree((<BinaryExpression>a).left) && invocationFree((<BinaryExpression>a).right);
                    } else if (a instanceof PrefixUnaryExpression) {
                        return invocationFree((<PrefixUnaryExpression>a).operand);
                    } else if (a instanceof PostfixUnaryExpression) {
                        return invocationFree((<PostfixUnaryExpression>a).operand);
                    } else { return false; }
            }
        }
        export function close(binders: LocalTypeBinding[], t: SoundType) {
            if (binders.length === 0) return t;
            else return new TPoly(binders.map((xt) => <TVar>xt.snd), t);
        }
        export function argumentListTypeArgs (tcenv:TcEnv, args:ArgumentList, inferredTypeArgs:PullTypeSymbol[] = []) {
            if (args.typeArgumentList && args.typeArgumentList.typeArguments) {
                return TcUtil.mapSepList2(args.typeArgumentList.typeArguments, (t: AST) => t.soundType);
            } else if (inferredTypeArgs && inferredTypeArgs.length !== 0) {
                return inferredTypeArgs.map((t) => TranslateTypes.translateType(t, tcenv));
            } else {
                return null;
            }
        }
        export function instantiateType(tcenv:TcEnv, t: SoundType, args: ArgumentList, inferredTypeArgs: PullTypeSymbol[]= [], overload=0) {
            var targs = TcUtil.argumentListTypeArgs(tcenv, args, inferredTypeArgs);
            if (targs && targs.length !== 0) {
                if (t.typeName !== TypeName.Poly) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Unexpected_type_arguments, [t.toString(), overload.toString(), targs.map((t) => t.toString()).join(", ")]);
                    return t;
                }
                return new TInst(<TPoly>t, targs);
                var tpoly = <TPoly> t;
                if (tpoly.bvars.length !== targs.length) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Unexpected_type_arguments, [t.toString(), overload.toString(), targs.map((t) => t.toString()).join(", ")]);
                    return t;
                }
                targs.forEach((t, i) => {
                    if ((!tpoly.checkInstantiation(i, t))) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_type_instantiation_not_subtype_constraint, [t.toString(), tpoly.bvars[i].toString()]);
                    }
                });
                return new TInst(tpoly, targs);
            } else if (t.typeName === TypeName.Poly) {
                var default_targs = (<TPoly>t).bvars.map((a) => <SoundType>TConstant.Any);
                TcUtil.Logger.error(DiagnosticCode.SEC_Could_not_infer_type_arguments, []);
                return new TInst(<TPoly>t, default_targs);
             
            } else {
                return t;
            }
        }
        export function btoa(s: string) : string {
            return new Buffer(s).toString('base64');
        }
        function isGenerics(msg: string) {
            switch (msg) {
                case DiagnosticCode.SEC_Unexpected_type_arguments:
                case DiagnosticCode.SEC_Generic_types_unsupported: return true;
                default: return false;
            }
        }
        export module Logger {
            var _settings: ImmutableCompilationSettings = null;
            var diags: { [fileName: string]: Diagnostic[] } = {};
            var lineMaps: { [fileName: string]: LineMap } = {};
            export var currentFileName: string;
            var currentNode: AST = null;
            export var reportWarnings = false;

            export function setSettings(i: ImmutableCompilationSettings) {
                _settings = i;
            }
            export function settings() {
                return _settings;
            }
            export function startLogForDocument(doc: Document) {
                currentFileName = doc.fileName;
                TcUtil.setCurrentFile(currentFileName);
                lineMaps[currentFileName] = doc.lineMap();
                diags[currentFileName] = new Array<Diagnostic>();
            }

            export function setCurrentNode(a: AST) {
                currentNode = a;
            }

            export function withCurrentNode<A>(a: AST, f: () => A): A {
                var old = currentNode;
                currentNode = a;
                var res = f();
                currentNode = old;
                return res;
            }

            export function diagnostics() {
                return diags[currentFileName];
            }

            function addDiag(d: Diagnostic) {
                diags[currentFileName].push(d);
            }

            function lineNumber(ast: AST) {
                var lineCol = { file: ast.fileName(), line: NaN, character: NaN };
                var lm = lineMaps[ast.fileName()];
                if (lm) {
                    lm.fillLineAndCharacterFromPosition(ast.start(), lineCol);
                }
                lineCol.line++;
                return lineCol;
            }

            export function pos(ast: AST= currentNode) {
                if (!ast) {
                    return "<unknown>";
                }
                var p = lineNumber(ast);
                return (p.file + ":(" + p.line + ", " + p.character + ")");
            }

            export function error(msg: string, args: string[], ast: AST= currentNode) {
                if (isGenerics(msg) && !settings().generics()) {
                    return;
                }
                addDiag(new Diagnostic(currentFileName, lineMaps[currentFileName], ast.start(), ast.width(), msg, args));
            }

            export function warning(msg: string, args: string[], ast: AST= currentNode) {
                if (isGenerics(msg) && !settings().generics()) {
                    return;
                }
                addDiag(new Diagnostic(currentFileName, lineMaps[currentFileName], ast.start(), ast.width(), msg, args));
            }

            export function warn(msg: string) {
                if (reportWarnings) {
                    console.log("At " + pos() + ":: " + msg);
                }
            }
        }
    }
           
    export function kind2string(k: SyntaxKind) {
        switch (k) {
            case SyntaxKind.None: return "None";
            case SyntaxKind.List: return "List";
            case SyntaxKind.SeparatedList: return "SeparatedList";
            case SyntaxKind.TriviaList: return "TriviaList";
            case SyntaxKind.WhitespaceTrivia: return "WhitespaceTrivia";
            case SyntaxKind.NewLineTrivia: return "NewLineTrivia";
            case SyntaxKind.MultiLineCommentTrivia: return "MultiLineCommentTrivia";
            case SyntaxKind.SingleLineCommentTrivia: return "SingleLineCommentTrivia";
            case SyntaxKind.SkippedTokenTrivia: return "SkippedTokenTrivia";
            case SyntaxKind.ErrorToken: return "ErrorToken";
            case SyntaxKind.EndOfFileToken: return "EndOfFileToken";
            case SyntaxKind.IdentifierName: return "IdentifierName";
            case SyntaxKind.RegularExpressionLiteral: return "RegularExpressionLiteral";
            case SyntaxKind.NumericLiteral: return "NumericLiteral";
            case SyntaxKind.StringLiteral: return "StringLiteral";
            case SyntaxKind.BreakKeyword: return "BreakKeyword";
            case SyntaxKind.CaseKeyword: return "CaseKeyword";
            case SyntaxKind.CatchKeyword: return "CatchKeyword";
            case SyntaxKind.ContinueKeyword: return "ContinueKeyword";
            case SyntaxKind.DebuggerKeyword: return "DebuggerKeyword";
            case SyntaxKind.DefaultKeyword: return "DefaultKeyword";
            case SyntaxKind.DeleteKeyword: return "DeleteKeyword";
            case SyntaxKind.DoKeyword: return "DoKeyword";
            case SyntaxKind.ElseKeyword: return "ElseKeyword";
            case SyntaxKind.FalseKeyword: return "FalseKeyword";
            case SyntaxKind.FinallyKeyword: return "FinallyKeyword";
            case SyntaxKind.ForKeyword: return "ForKeyword";
            case SyntaxKind.FunctionKeyword: return "FunctionKeyword";
            case SyntaxKind.IfKeyword: return "IfKeyword";
            case SyntaxKind.InKeyword: return "InKeyword";
            case SyntaxKind.InstanceOfKeyword: return "InstanceOfKeyword";
            case SyntaxKind.NewKeyword: return "NewKeyword";
            case SyntaxKind.NullKeyword: return "NullKeyword";
            case SyntaxKind.ReturnKeyword: return "ReturnKeyword";
            case SyntaxKind.SwitchKeyword: return "SwitchKeyword";
            case SyntaxKind.ThisKeyword: return "ThisKeyword";
            case SyntaxKind.ThrowKeyword: return "ThrowKeyword";
            case SyntaxKind.TrueKeyword: return "TrueKeyword";
            case SyntaxKind.TryKeyword: return "TryKeyword";
            case SyntaxKind.TypeOfKeyword: return "TypeOfKeyword";
            case SyntaxKind.VarKeyword: return "VarKeyword";
            case SyntaxKind.VoidKeyword: return "VoidKeyword";
            case SyntaxKind.WhileKeyword: return "WhileKeyword";
            case SyntaxKind.WithKeyword: return "WithKeyword";
            case SyntaxKind.ClassKeyword: return "ClassKeyword";
            case SyntaxKind.ConstKeyword: return "ConstKeyword";
            case SyntaxKind.EnumKeyword: return "EnumKeyword";
            case SyntaxKind.ExportKeyword: return "ExportKeyword";
            case SyntaxKind.ExtendsKeyword: return "ExtendsKeyword";
            case SyntaxKind.ImportKeyword: return "ImportKeyword";
            case SyntaxKind.SuperKeyword: return "SuperKeyword";
            case SyntaxKind.ImplementsKeyword: return "ImplementsKeyword";
            case SyntaxKind.InterfaceKeyword: return "InterfaceKeyword";
            case SyntaxKind.LetKeyword: return "LetKeyword";
            case SyntaxKind.PackageKeyword: return "PackageKeyword";
            case SyntaxKind.PrivateKeyword: return "PrivateKeyword";
            case SyntaxKind.ProtectedKeyword: return "ProtectedKeyword";
            case SyntaxKind.PublicKeyword: return "PublicKeyword";
            case SyntaxKind.StaticKeyword: return "StaticKeyword";
            case SyntaxKind.YieldKeyword: return "YieldKeyword";
            case SyntaxKind.AnyKeyword: return "AnyKeyword";
            case SyntaxKind.BooleanKeyword: return "BooleanKeyword";
            case SyntaxKind.ConstructorKeyword: return "ConstructorKeyword";
            case SyntaxKind.DeclareKeyword: return "DeclareKeyword";
            case SyntaxKind.GetKeyword: return "GetKeyword";
            case SyntaxKind.ModuleKeyword: return "ModuleKeyword";
            case SyntaxKind.RequireKeyword: return "RequireKeyword";
            case SyntaxKind.NumberKeyword: return "NumberKeyword";
            case SyntaxKind.SetKeyword: return "SetKeyword";
            case SyntaxKind.StringKeyword: return "StringKeyword";
            case SyntaxKind.OpenBraceToken: return "OpenBraceToken";
            case SyntaxKind.CloseBraceToken: return "CloseBraceToken";
            case SyntaxKind.OpenParenToken: return "OpenParenToken";
            case SyntaxKind.CloseParenToken: return "CloseParenToken";
            case SyntaxKind.OpenBracketToken: return "OpenBracketToken";
            case SyntaxKind.CloseBracketToken: return "CloseBracketToken";
            case SyntaxKind.DotToken: return "DotToken";
            case SyntaxKind.DotDotDotToken: return "DotDotDotToken";
            case SyntaxKind.SemicolonToken: return "SemicolonToken";
            case SyntaxKind.CommaToken: return "CommaToken";
            case SyntaxKind.LessThanToken: return "LessThanToken";
            case SyntaxKind.GreaterThanToken: return "GreaterThanToken";
            case SyntaxKind.LessThanEqualsToken: return "LessThanEqualsToken";
            case SyntaxKind.GreaterThanEqualsToken: return "GreaterThanEqualsToken";
            case SyntaxKind.EqualsEqualsToken: return "EqualsEqualsToken";
            case SyntaxKind.EqualsGreaterThanToken: return "EqualsGreaterThanToken";
            case SyntaxKind.ExclamationEqualsToken: return "ExclamationEqualsToken";
            case SyntaxKind.EqualsEqualsEqualsToken: return "EqualsEqualsEqualsToken";
            case SyntaxKind.ExclamationEqualsEqualsToken: return "ExclamationEqualsEqualsToken";
            case SyntaxKind.PlusToken: return "PlusToken";
            case SyntaxKind.MinusToken: return "MinusToken";
            case SyntaxKind.AsteriskToken: return "AsteriskToken";
            case SyntaxKind.PercentToken: return "PercentToken";
            case SyntaxKind.PlusPlusToken: return "PlusPlusToken";
            case SyntaxKind.MinusMinusToken: return "MinusMinusToken";
            case SyntaxKind.LessThanLessThanToken: return "LessThanLessThanToken";
            case SyntaxKind.GreaterThanGreaterThanToken: return "GreaterThanGreaterThanToken";
            case SyntaxKind.GreaterThanGreaterThanGreaterThanToken: return "GreaterThanGreaterThanGreaterThanToken";
            case SyntaxKind.AmpersandToken: return "AmpersandToken";
            case SyntaxKind.BarToken: return "BarToken";
            case SyntaxKind.CaretToken: return "CaretToken";
            case SyntaxKind.ExclamationToken: return "ExclamationToken";
            case SyntaxKind.TildeToken: return "TildeToken";
            case SyntaxKind.AmpersandAmpersandToken: return "AmpersandAmpersandToken";
            case SyntaxKind.BarBarToken: return "BarBarToken";
            case SyntaxKind.QuestionToken: return "QuestionToken";
            case SyntaxKind.ColonToken: return "ColonToken";
            case SyntaxKind.EqualsToken: return "EqualsToken";
            case SyntaxKind.PlusEqualsToken: return "PlusEqualsToken";
            case SyntaxKind.MinusEqualsToken: return "MinusEqualsToken";
            case SyntaxKind.AsteriskEqualsToken: return "AsteriskEqualsToken";
            case SyntaxKind.PercentEqualsToken: return "PercentEqualsToken";
            case SyntaxKind.LessThanLessThanEqualsToken: return "LessThanLessThanEqualsToken";
            case SyntaxKind.GreaterThanGreaterThanEqualsToken: return "GreaterThanGreaterThanEqualsToken";
            case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken: return "GreaterThanGreaterThanGreaterThanEqualsToken";
            case SyntaxKind.AmpersandEqualsToken: return "AmpersandEqualsToken";
            case SyntaxKind.BarEqualsToken: return "BarEqualsToken";
            case SyntaxKind.CaretEqualsToken: return "CaretEqualsToken";
            case SyntaxKind.SlashToken: return "SlashToken";
            case SyntaxKind.SlashEqualsToken: return "SlashEqualsToken";
            case SyntaxKind.SourceUnit: return "SourceUnit";
            case SyntaxKind.QualifiedName: return "QualifiedName";
            case SyntaxKind.ObjectType: return "ObjectType";
            case SyntaxKind.FunctionType: return "FunctionType";
            case SyntaxKind.ArrayType: return "ArrayType";
            case SyntaxKind.ConstructorType: return "ConstructorType";
            case SyntaxKind.GenericType: return "GenericType";
            case SyntaxKind.TypeQuery: return "TypeQuery";
            case SyntaxKind.InterfaceDeclaration: return "InterfaceDeclaration";
            case SyntaxKind.FunctionDeclaration: return "FunctionDeclaration";
            case SyntaxKind.ModuleDeclaration: return "ModuleDeclaration";
            case SyntaxKind.ClassDeclaration: return "ClassDeclaration";
            case SyntaxKind.EnumDeclaration: return "EnumDeclaration";
            case SyntaxKind.ImportDeclaration: return "ImportDeclaration";
            case SyntaxKind.ExportAssignment: return "ExportAssignment";
            case SyntaxKind.MemberFunctionDeclaration: return "MemberFunctionDeclaration";
            case SyntaxKind.MemberVariableDeclaration: return "MemberVariableDeclaration";
            case SyntaxKind.ConstructorDeclaration: return "ConstructorDeclaration";
            case SyntaxKind.IndexMemberDeclaration: return "IndexMemberDeclaration";
            case SyntaxKind.GetAccessor: return "GetAccessor";
            case SyntaxKind.SetAccessor: return "SetAccessor";
            case SyntaxKind.PropertySignature: return "PropertySignature";
            case SyntaxKind.CallSignature: return "CallSignature";
            case SyntaxKind.ConstructSignature: return "ConstructSignature";
            case SyntaxKind.IndexSignature: return "IndexSignature";
            case SyntaxKind.MethodSignature: return "MethodSignature";
            case SyntaxKind.Block: return "Block";
            case SyntaxKind.IfStatement: return "IfStatement";
            case SyntaxKind.VariableStatement: return "VariableStatement";
            case SyntaxKind.ExpressionStatement: return "ExpressionStatement";
            case SyntaxKind.ReturnStatement: return "ReturnStatement";
            case SyntaxKind.SwitchStatement: return "SwitchStatement";
            case SyntaxKind.BreakStatement: return "BreakStatement";
            case SyntaxKind.ContinueStatement: return "ContinueStatement";
            case SyntaxKind.ForStatement: return "ForStatement";
            case SyntaxKind.ForInStatement: return "ForInStatement";
            case SyntaxKind.EmptyStatement: return "EmptyStatement";
            case SyntaxKind.ThrowStatement: return "ThrowStatement";
            case SyntaxKind.WhileStatement: return "WhileStatement";
            case SyntaxKind.TryStatement: return "TryStatement";
            case SyntaxKind.LabeledStatement: return "LabeledStatement";
            case SyntaxKind.DoStatement: return "DoStatement";
            case SyntaxKind.DebuggerStatement: return "DebuggerStatement";
            case SyntaxKind.WithStatement: return "WithStatement";
            case SyntaxKind.PlusExpression: return "PlusExpression";
            case SyntaxKind.NegateExpression: return "NegateExpression";
            case SyntaxKind.BitwiseNotExpression: return "BitwiseNotExpression";
            case SyntaxKind.LogicalNotExpression: return "LogicalNotExpression";
            case SyntaxKind.PreIncrementExpression: return "PreIncrementExpression";
            case SyntaxKind.PreDecrementExpression: return "PreDecrementExpression";
            case SyntaxKind.DeleteExpression: return "DeleteExpression";
            case SyntaxKind.TypeOfExpression: return "TypeOfExpression";
            case SyntaxKind.VoidExpression: return "VoidExpression";
            case SyntaxKind.CommaExpression: return "CommaExpression";
            case SyntaxKind.AssignmentExpression: return "AssignmentExpression";
            case SyntaxKind.AddAssignmentExpression: return "AddAssignmentExpression";
            case SyntaxKind.SubtractAssignmentExpression: return "SubtractAssignmentExpression";
            case SyntaxKind.MultiplyAssignmentExpression: return "MultiplyAssignmentExpression";
            case SyntaxKind.DivideAssignmentExpression: return "DivideAssignmentExpression";
            case SyntaxKind.ModuloAssignmentExpression: return "ModuloAssignmentExpression";
            case SyntaxKind.AndAssignmentExpression: return "AndAssignmentExpression";
            case SyntaxKind.ExclusiveOrAssignmentExpression: return "ExclusiveOrAssignmentExpression";
            case SyntaxKind.OrAssignmentExpression: return "OrAssignmentExpression";
            case SyntaxKind.LeftShiftAssignmentExpression: return "LeftShiftAssignmentExpression";
            case SyntaxKind.SignedRightShiftAssignmentExpression: return "SignedRightShiftAssignmentExpression";
            case SyntaxKind.UnsignedRightShiftAssignmentExpression: return "UnsignedRightShiftAssignmentExpression";
            case SyntaxKind.ConditionalExpression: return "ConditionalExpression";
            case SyntaxKind.LogicalOrExpression: return "LogicalOrExpression";
            case SyntaxKind.LogicalAndExpression: return "LogicalAndExpression";
            case SyntaxKind.BitwiseOrExpression: return "BitwiseOrExpression";
            case SyntaxKind.BitwiseExclusiveOrExpression: return "BitwiseExclusiveOrExpression";
            case SyntaxKind.BitwiseAndExpression: return "BitwiseAndExpression";
            case SyntaxKind.EqualsWithTypeConversionExpression: return "EqualsWithTypeConversionExpression";
            case SyntaxKind.NotEqualsWithTypeConversionExpression: return "NotEqualsWithTypeConversionExpression";
            case SyntaxKind.EqualsExpression: return "EqualsExpression";
            case SyntaxKind.NotEqualsExpression: return "NotEqualsExpression";
            case SyntaxKind.LessThanExpression: return "LessThanExpression";
            case SyntaxKind.GreaterThanExpression: return "GreaterThanExpression";
            case SyntaxKind.LessThanOrEqualExpression: return "LessThanOrEqualExpression";
            case SyntaxKind.GreaterThanOrEqualExpression: return "GreaterThanOrEqualExpression";
            case SyntaxKind.InstanceOfExpression: return "InstanceOfExpression";
            case SyntaxKind.InExpression: return "InExpression";
            case SyntaxKind.LeftShiftExpression: return "LeftShiftExpression";
            case SyntaxKind.SignedRightShiftExpression: return "SignedRightShiftExpression";
            case SyntaxKind.UnsignedRightShiftExpression: return "UnsignedRightShiftExpression";
            case SyntaxKind.MultiplyExpression: return "MultiplyExpression";
            case SyntaxKind.DivideExpression: return "DivideExpression";
            case SyntaxKind.ModuloExpression: return "ModuloExpression";
            case SyntaxKind.AddExpression: return "AddExpression";
            case SyntaxKind.SubtractExpression: return "SubtractExpression";
            case SyntaxKind.PostIncrementExpression: return "PostIncrementExpression";
            case SyntaxKind.PostDecrementExpression: return "PostDecrementExpression";
            case SyntaxKind.MemberAccessExpression: return "MemberAccessExpression";
            case SyntaxKind.InvocationExpression: return "InvocationExpression";
            case SyntaxKind.ArrayLiteralExpression: return "ArrayLiteralExpression";
            case SyntaxKind.ObjectLiteralExpression: return "ObjectLiteralExpression";
            case SyntaxKind.ObjectCreationExpression: return "ObjectCreationExpression";
            case SyntaxKind.ParenthesizedExpression: return "ParenthesizedExpression";
            case SyntaxKind.ParenthesizedArrowFunctionExpression: return "ParenthesizedArrowFunctionExpression";
            case SyntaxKind.SimpleArrowFunctionExpression: return "SimpleArrowFunctionExpression";
            case SyntaxKind.CastExpression: return "CastExpression";
            case SyntaxKind.ElementAccessExpression: return "ElementAccessExpression";
            case SyntaxKind.FunctionExpression: return "FunctionExpression";
            case SyntaxKind.OmittedExpression: return "OmittedExpression";
            case SyntaxKind.VariableDeclaration: return "VariableDeclaration";
            case SyntaxKind.VariableDeclarator: return "VariableDeclarator";
            case SyntaxKind.ArgumentList: return "ArgumentList";
            case SyntaxKind.ParameterList: return "ParameterList";
            case SyntaxKind.TypeArgumentList: return "TypeArgumentList";
            case SyntaxKind.TypeParameterList: return "TypeParameterList";
            case SyntaxKind.ExtendsHeritageClause: return "ExtendsHeritageClause";
            case SyntaxKind.ImplementsHeritageClause: return "ImplementsHeritageClause";
            case SyntaxKind.EqualsValueClause: return "EqualsValueClause";
            case SyntaxKind.CaseSwitchClause: return "CaseSwitchClause";
            case SyntaxKind.DefaultSwitchClause: return "DefaultSwitchClause";
            case SyntaxKind.ElseClause: return "ElseClause";
            case SyntaxKind.CatchClause: return "CatchClause";
            case SyntaxKind.FinallyClause: return "FinallyClause";
            case SyntaxKind.TypeParameter: return "TypeParameter";
            case SyntaxKind.Constraint: return "Constraint";
            case SyntaxKind.SimplePropertyAssignment: return "SimplePropertyAssignment";
            case SyntaxKind.FunctionPropertyAssignment: return "FunctionPropertyAssignment";
            case SyntaxKind.Parameter: return "Parameter";
            case SyntaxKind.EnumElement: return "EnumElement";
            case SyntaxKind.TypeAnnotation: return "TypeAnnotation";
            case SyntaxKind.ExternalModuleReference: return "ExternalModuleReference";
            case SyntaxKind.ModuleNameModuleReference: return "ModuleNameModuleReference";
            default: return "Unknown syntax kind"
        }
    }
}
