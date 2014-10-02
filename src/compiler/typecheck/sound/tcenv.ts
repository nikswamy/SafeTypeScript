// Modified by N.Swamy (2014)
///<reference path='../../references.ts' />
///<reference path='tcutil.ts' />
///<reference path='translateTypes.ts' />
module TypeScript {
    export enum ScopeType {
        RegularBlock,
        FunctionBlock,
        NamespaceBlock
    }
    module ScopeStack {
        /////////////////////////////////////////////////////////////
        // Functionality for a stack of shadowed name bindings 
        /////////////////////////////////////////////////////////////
        interface MultiBinding {
            bindings: Pair<SoundType, AST>[];
            top:number
        }
        interface Gamma {
            [varname: string]: MultiBinding; //need to support shadowing (even if it is an error) to get proper error messages
        }
        function newBinding(b: Pair<SoundType, AST>) {
            var bindings = new Array<Pair<SoundType, AST>>(3);
            bindings[0] = b;
            return {
                bindings: bindings,
                top: 0
            };
        }
        function peekBinding(m: MultiBinding) {
            return m.bindings[m.top];
        }
        function pushBinding(m: MultiBinding, b:Pair<SoundType,AST>) {
            if (m.top < m.bindings.length - 1) {
                m.top++;
                m.bindings[m.top] = b;
            }
            else {
                m.bindings.push(b);
                m.top++;
            }
        }
        function popBinding(m:MultiBinding) {
            if (m.top >= 0) m.top--;
            else throw new Error("Popping empty multibinding");
        }
        ///////////////////////////////////////////////////////////
        interface Scope {
            gamma: Gamma;
            scopeType: ScopeType;
        }
        export interface T {
            scopes: Scope[];
            top: number
        }
        function mkScope(scopeType: ScopeType= ScopeType.RegularBlock): Scope {
            return {
                gamma: RT.createEmptyMap<MultiBinding>(),
                scopeType: scopeType
            };
        }
        function empty(t: T) {
            return t.top < 0;
        }
        function push(t: T, s: Scope) {
            if (t.top < t.scopes.length - 1) {
                t.top++;
                t.scopes[t.top] = s;
            } else {
                t.top++;
                t.scopes.push(s);
            }
            return t;
        }
        function peek(t: T) {
            if (empty(t)) return null;
            return t.scopes[t.top];
        }
        ////////////////////////////////////////////////
        export function mkT() {
            return newScope({
                scopes: new Array<Scope>(10),
                top: -1
            }, ScopeType.RegularBlock);
        }
        export function lookupVariable(t: T, x: string, stopAtBlockTypes: ScopeType[]= []): Pair<SoundType, AST> {
            for (var i = t.top; i >= 0; i--) {
                var s = t.scopes[i];
                var gx = s.gamma[x];
                if (gx) {
                    return peekBinding(gx);
                }
                if (stopAtBlockTypes.some((v) => v === s.scopeType)) {
                    break;
                }
            }
            return null;
        }
        export function newScope(t: T, scopeType: ScopeType): T {
            return push(t, mkScope(scopeType));
        }
        export function popScope(t: T) {
            if (empty(t)) {
                throw new Error("Popping empty stack");
            }
            t.top--;
            return t;
        }
        export function pushVariable(s: T, a: AST, x: string, t: SoundType, allowShadowing: boolean = false) {
            if (x === "arguments") {
                TcUtil.Logger.error(DiagnosticCode.SEC_Arguments_is_a_reserved_name, [], a);
            }
            var old = lookupVariable(s, x, [ScopeType.NamespaceBlock, ScopeType.FunctionBlock]);
            if (!allowShadowing && old) {//shadowed
                TcUtil.Logger.error(DiagnosticCode.SEC_Variable_shadowing, [x, TcUtil.Logger.pos(old.snd)], a);
            }
            var sc = peek(s);
            var gx = sc.gamma[x];
            if (gx) {
                pushBinding(gx, { fst: t, snd: a });
            } else {
                sc.gamma[x] = newBinding({ fst: t, snd: a });
            }
        }
        export function popVariable(s: T, x: string) {
            //if (this["debug"] && x === "this")
            var sc = peek(s);
            var gx = sc.gamma[x];
            if (gx) {
                popBinding(gx);
                if (gx.top < 0) sc.gamma[x] = null;
            }
        }
    }
    enum NSType {
        Module,
        Class
    }
    export interface QName extends RT.Virtual {
        dottedName?: string;
        fullName?: string[]
    }
    export class TcEnv implements RT.Virtual {
        public static currentEnv: TcEnv = null;
        public inBuildPhase = false;
        private scopes: ScopeStack.T;
        private staticScope: boolean = false;
        public global: TModule;
        private openNamespaces: NamedType[];
        private localTypeNames: { [name: string]: SoundType };
        private _thisType: SoundType;

        constructor(private semanticInfoChain: SemanticInfoChain, public compilationSettings: ImmutableCompilationSettings) {
            TcUtil.Logger.setSettings(compilationSettings);
            this.scopes = ScopeStack.mkT();
            this.global = new TModule("<global>");
            this.global.addField(Field("undefined", TConstant.Void));
            this.openNamespaces = [this.global];
            this.localTypeNames = RT.createEmptyMap<SoundType>();
        }

        public symbol(a: AST): PullSymbol {
            return this.semanticInfoChain.getSymbolForAST(a);
        }

        public inFunctionScope() {
            return this.scopes.scopes.some((s) => s.scopeType === ScopeType.FunctionBlock);
        }

        public curNamespace(stopAtClass: boolean= false): string[] {
            var ns: string[] = [];
            this.openNamespaces.forEach((t: NamedType) => {
                if (t.name !== "<global>" && !(t.typeName === TypeName.Class && stopAtClass)) {
                    ns.push(t.name);
                }
            });
            return ns;
        }

        private lookupHelper(x: string, stopAtBlockTypes: ScopeType[]= [], circularOk=false): Pair<SoundType, AST> {
            circularOk = circularOk || this.inFunctionScope();
            var b = ScopeStack.lookupVariable(this.scopes, x, stopAtBlockTypes);
            if (b) return b;
            if (stopAtBlockTypes.some((v) => v === ScopeType.NamespaceBlock)) {
                return null;undefined;
            }
            //then all open namespaces, starting from the innermost one
            for (var i = this.openNamespaces.length - 1; i >= 0; i--) {
                var ns = this.openNamespaces[i];
                var f = ns.getField(x);
                if (f) {
                    if (!circularOk && ns.isCircular(x)) {
                        var md = (<TModule>ns).getMemberDecl(x).fst;
                        TcUtil.Logger.error(DiagnosticCode.SEC_Unsafe_circular_dependence_on_variable, [ns.name + "." + x, TcUtil.Logger.pos(md)]);
                    }
                    return { fst: f.type, snd: <AST>null };
                }
            }
            return null;
        }
        public lookup(x: string): SoundType {
            var b = this.lookupHelper(x);
            if (b) return b.fst;
            return null;
        }

        public lookupFullName(q: QName, circularOk= false): SoundType {
            if (!q.fullName && !q.dottedName) return null;
            circularOk = circularOk || this.inFunctionScope();
            var x = q.fullName;
            if (!x) {
                x = q.dottedName.split(".");
            }
            if (x.length === 1) {
                var res = this.lookupHelper(x[0], [ScopeType.NamespaceBlock], circularOk);
                if (res) {
                    return res.fst;
                }
            }
            var ns: TModule = this.global;
            for (var i = 0; i < x.length - 1; i++) {
                var next = ns.getMember(x[i]);
                if (!next || next.type.typeName !== TypeName.Module) {
                    TcUtil.Logger.warn("Module " + x[i] + " not found; full name is " + x.join("."));
                    return null;
                }
                ns = <TModule>next.type;
            }
            var f = ns.getMember(x[x.length - 1], 0, circularOk);
            if (f) {
                return f.type;
            }
            return null;
        }
        public lookupType(q: QName): SoundType {
            var xx = q.dottedName;
            if (!xx) {
                xx = q.fullName.join(".");
            }
            if (this.localTypeNames[xx]) {
                return this.localTypeNames[xx];
            }
            var x = q.fullName;
            if (!x) {
                x = xx.split(".");
            }
            var ns: TModule = this.global;
            for (var i = 0; i < x.length - 1; i++) {
                var next = ns.getMember(x[i]);
                if (!next) {
                    next = Field(x[i], new TModule(x[i]), false);
                    ns.addField(next);
                }
                if (next.type.typeName !== TypeName.Module) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Module_name_clash, [xx]);
                    return null;
                }
                ns = <TModule>next.type;
            }
            return ns.lookupType(x[x.length - 1]);
        }
        public lookupTypeInCurrentScope(x: string): SoundType {
            var ns = this.curNamespace();
            ns.push(x);
            return this.lookupType({ fullName: ns });
        }
        private mkName(x: QName) {
            if (x.dottedName) return x.dottedName;
            return x.fullName.join(".");
        }
        public pushLocalType<A>(x: QName, t: SoundType, f: () => A): A {
            var n = this.mkName(x);
            //console.log("Adding local type " + n + " mapped to " + t.toString());
            this.localTypeNames[n] = t;
            t.fullName = x.fullName;
            return f();
        }
        public withLocalType<A>(x: QName, t: SoundType, f: () => A): A {
            var n = this.mkName(x);
            var oldx = this.localTypeNames[n];
            this.localTypeNames[n] = t;
            var res = f();
            this.localTypeNames[n] = oldx;
            t.fullName = x.fullName;
            return res;
        }
        public withLocalTypes<A>(ts: Pair<string, SoundType>[], f: () => A, i= 0) {
            if (i < ts.length) {
                return this.withLocalType<A>({ dottedName: ts[i].fst }, ts[i].snd, () => this.withLocalTypes(ts, f, i + 1));
            } else {
                return f();
            }
        }
        public flushLocalTypes() {
            this.localTypeNames = {};
        }
        public isShadowed(x: string): boolean {
            return this.lookupHelper(x, [ScopeType.NamespaceBlock, ScopeType.FunctionBlock]) ? true : false;
        }
        private push(scopeType: ScopeType= ScopeType.RegularBlock) {
            this.scopes = ScopeStack.newScope(this.scopes, scopeType);
        }
        public pushVariable(a: AST, x: string, t: SoundType, allowShadowing: boolean = false) {
            ScopeStack.pushVariable(this.scopes, a, x, t, allowShadowing);
        }
        public withVariable<A>(a: AST, x: string, t: SoundType, allowShadowing: boolean = false): (f: () => A) => A {
            return (f: () => A) => {
                ScopeStack.pushVariable(this.scopes, a, x, t, allowShadowing);
                var result = f();
                ScopeStack.popVariable(this.scopes, x);
                return result;
            };
        }
        public withVariables<A>(bindings: TcUtil.VariableBinding[], allowShadowing: boolean = false): (f: () => A) => A {
            var clear = () => {
                //   console.log("Popping " + bindings.reverse().map((b) => b.name).join(", "));
                bindings.reverse().map((b) => {
                    ScopeStack.popVariable(this.scopes, b.name);
                });
            };
            return (f: () => A) => {
                //console.log("Pushing " + bindings.map((b) => b.name).join(", "));
                bindings.map((b) => {
                    ScopeStack.pushVariable(this.scopes, b.ast, b.name, b.type, allowShadowing);
                });
                var result = f();
                clear();
                return result;
            };
        }
        private withNS<A>(ns: NamedType): (f: () => A) => A {
            return (f: () => A) => {
                this.openNamespaces.push(ns);
                var result = f();
                this.openNamespaces.pop();
                return result;
            }
        }
        private nsTip() {
            return this.openNamespaces[this.openNamespaces.length - 1];
        }
        public withModule<A>(x: string) {
            var tip = this.nsTip();
            var tmod = tip.getField(x);
            if (tmod && tmod.type.typeName === TypeName.Module) {
                return this.withNS<A>(<TModule>tmod.type);
            } else {
                throw new Error("Unexpected module " + x + " in scope " + tip.name);
            }
        }
        public withClass<A>(x: string) {
            var tip = this.nsTip();
            var tclass = tip.lookupType(x + ".Class");
            if (tclass && tclass.typeName === TypeName.Class) {
                return (f:() => A) => this.withNS<A>(<TClass>tclass)(() => this.newScope(f));
            } else {
                throw new Error("Unexpected class " + x + " in scope " + tip.name);
            }
        }
        public currentClassName() {
            for (var i = this.openNamespaces.length - 1; i >= 0; i--) {
                if (this.openNamespaces[i].typeName === TypeName.Class) {
                    return this.openNamespaces[i].name;
                }
            }
            return null;
        }
        public newScope<A>(f: () => A, scopeType: ScopeType= ScopeType.RegularBlock): A {
            ScopeStack.newScope(this.scopes, scopeType);
            var result = f();
            ScopeStack.popScope(this.scopes);
            return result;
        }
        public inStaticScope<A>(f: () => A): A {
            var old = this.staticScope; 
            this.staticScope = true;
            var res = f();
            this.staticScope = old;
            return res;
        }
        private _withoutThis = false;
        public withoutThis<A>(f: () => A) {
            var old = this._withoutThis;
            this._withoutThis = true;
            var res = f();
            this._withoutThis = old;
            return res;
        }
        public withThisType<A>(t: SoundType, f: () => A) {
            var old = this._thisType;
            var oldw = this._withoutThis;
            this._thisType = t;
            this._withoutThis = false;
            var a = f();
            this._thisType = old;
            this._withoutThis = oldw;
            return a;
        }
        public thisType(): SoundType {
            if (this._withoutThis) {
                TcUtil.Logger.error(DiagnosticCode.SEC_This_not_in_scope, []);
                return TConstant.Any
            }
            var cn = this.currentClassName();
            if (cn) {
                var ct = this.lookup(cn);
                if (!ct || ct.typeName !== TypeName.Class) {
                    throw ("Class " + cn + " has type " + ct);
                }
                if (this.staticScope) return ct;
                var t = (<TClass>ct).objectType();
                switch (t.typeName) {
                    case TypeName.Poly:
                        return (<TPoly>t).body;
                    case TypeName.Object:
                    case TypeName.Interface:
                        return t;
                    default:
                        throw new Error("impossible!: class has an object of type " + t.toString());
                }
                return
            } 
            if (this._thisType) {
                return this._thisType;
            }
            return TConstant.Any; //TODO: change this to  o{}
        }
        public addModuleMember(b: AST, scope: Identifier[], fieldName: string, fieldType: SoundType) {
            var ns = this.global;
            var fullPath = this.curNamespace().concat(scope.map((i) => i.text()));
            for (var i = 0; i < fullPath.length; i++) {
                var f = ns.getMember(fullPath[i]);
                if (!f) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, [fullPath[i]], b);
                    return;
                }
                if (f.type.typeName !== TypeName.Module) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Module_name_clash, [fullPath[i]], b);
                    return;
                }
                ns = <TModule>f.type;
            }
            if (ns.hasField(fieldName)) {
                var decl = ns.getMemberDecl(fieldName);
                if (decl && !decl.snd) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Module_overlapping_field, [ns.name, fieldName, TcUtil.Logger.pos(decl.fst)], b);
                }
                decl.snd = false;
            } else {
                ns.addField(Field(fieldName, fieldType));
            }
        }
        public buildSignature(elts: ISyntaxList2, currentModule: TModule= this.global) {
            TcEnv.currentEnv = this;
            this.inBuildPhase = true;
            this.buildSignatureAux(elts, currentModule);
            this.inBuildPhase = false;
        }
        public getModuleNames(md: ModuleDeclaration) {
            if (md.stringLiteral) {
                return [new Identifier(md.stringLiteral.text())]
            } else {
                return getModuleNames(md.name);
            }
        }
        private buildSignatureAux(elts: ISyntaxList2, currentModule: TModule= this.global) {
            var tryAddType = (mod: TModule, a: AST, id: string, t: SoundType) => {
                if (mod.lookupType(id)) {
                    var decl = mod.lookupTypeDecl(id);
                    var pos = decl ? TcUtil.Logger.pos(decl) : "<unknown>";
                    TcUtil.Logger.error(DiagnosticCode.SEC_Variable_shadowing, [id, pos], a);
                } else {
                    mod.addType(id, t, a);
                }
            };    
            var tryMergeType = (mod: TModule, a: AST, id: string, t: SoundType) => {
                var merge = (name:string, i1: Field[], i2: Field[]) => {
                   return i1.concat(i2.filter((f2: Field) => {
                        if (i1.some((f1: Field) => f1.name === f2.name)) {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Interface_overlapping_field, [name, f2.name], a);
                            return false;
                        }
                        return true;
                    }));
                };
                var old_t = mod.lookupType(id);
                if (old_t && old_t.typeName === TypeName.Interface && t.typeName === TypeName.Interface) {
                    var i1 = <TInterface>old_t;
                    var i2 = <TInterface>t;
                    var fields = merge(i1.name, i1.exposeFields(), i2.exposeFields());
                    var methods = merge(i1.name, i1.exposeMethods(), i2.exposeMethods());
                    var extendsClause = i1.extendsC.concat(i2.extendsC.filter((t2) => !i1.extendsC.some((t1) => t1.equals(t2))));
                    var tif = new TInterface(i1.name, fields, methods, extendsClause);
                    tif.virtual = old_t.virtual || t.virtual;
                    mod.updateType(i1.name, tif);
                } else {
                    tryAddType(mod, a, id, t);
                }
            };
            var tryAddMember = (mod: TModule, a: AST, id: string, t: SoundType, circular:boolean=false) => {
                if (mod.getMember(id)) {
                    var decl = mod.getMemberDecl(id);
                    if (decl) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Variable_shadowing, [id, TcUtil.Logger.pos(decl.fst)], a);
                    }
                } else {
                    mod.addField(Field(id, t));
                    mod.addMemberDecl(id, a, circular);
                }
            };       
            TcUtil.syntaxListMembers(elts).forEach((a: AST) => {
                TcUtil.Logger.setCurrentNode(a);
                switch (a.kind()) {
                    case SyntaxKind.ModuleDeclaration:
                        var md = <ModuleDeclaration>a;
                        var names = this.getModuleNames(md);
                        var withNames = (currentModule: TModule, i: number) => {
                            //console.log(names[i].text());
                            var nextModuleField = currentModule.getMember(names[i].text());
                            if (!nextModuleField) {
                                nextModuleField = Field(names[i].text(), new TModule(names[i].text()));
                                tryAddMember(currentModule, a, nextModuleField.name, nextModuleField.type);
                            }
                            if (nextModuleField.type.typeName !== TypeName.Module) {
                                TcUtil.Logger.error(DiagnosticCode.SEC_Module_name_clash, [names[i].text()], a);
                                nextModuleField = Field(names[i].text(), new TModule(names[i].text()));
                            }
                            this.withModule<void>(nextModuleField.name)(() => {
                                if (i === names.length - 1) {
                                    this.buildSignatureAux(md.moduleElements, <TModule>nextModuleField.type);
                                } else {
                                    withNames(<TModule>nextModuleField.type, i + 1);
                                }
                            });
                        };
                        withNames(currentModule, 0);
                        break;
                    case SyntaxKind.ClassDeclaration:
                        var cd = <ClassDeclaration>a;
                        //console.log(cd.identifier.text());
                        var constructorType = this.symbol(a).type.getConstructorMethod().type;//Strange that it is stashed away in here ... but it is what it is
                        var classType = this.withLocalTypes(TcUtil.classDeclTypeParams(cd, this), () => TranslateTypes.translateType(constructorType, this));
                        if (classType && classType.typeName === TypeName.Class) {
                            var obj_t = (<TClass>classType).objectType();
                            if (TcUtil.Logger.currentFileName === "classes.ts") {
                                console.log("Translated " + cd.identifier.text() + " to instance type " + obj_t.toString());
                            }
                            obj_t.virtual = hasModifier(cd.modifiers, PullElementFlags.Ambient);
                            tryAddType(currentModule, a, cd.identifier.text(), obj_t);
                            tryAddType(currentModule, a, cd.identifier.text() + ".Class", <TClass>classType);
                            tryAddMember(currentModule, a, cd.identifier.text(), classType);
                        } else {
                            throw new Error("Unexpected translation of " + cd.identifier.text() + " to a non-class type: " + classType);
                        }
                        break;
                    case SyntaxKind.InterfaceDeclaration:
                        var id = <InterfaceDeclaration>a;
                        if (!currentModule.lookupType(id.identifier.text())) {
                            //console.log("Interface decl: " +id.identifier.text());
                            var interfaceType = TranslateTypes.translateType(this.symbol(a).type, this);
                            if (interfaceType &&
                                (interfaceType.typeName === TypeName.Interface
                                || (interfaceType.typeName === TypeName.Poly && (<TPoly>interfaceType).body.typeName === TypeName.Interface)
                                || interfaceType.typeName === TypeName.Un)) {
                                    //console.log(TcUtil.Logger.pos(a) + ": Translated " + id.identifier.text() + " to " + interfaceType.toString());
                                    //console.log("with fields " + (<NamedType>interfaceType).toRecord().toString());
                                    interfaceType.virtual = TcUtil.markAsVirtual(interfaceType);
                                    interfaceType.nominal = TcUtil.markAsNominal(interfaceType);
                                    tryMergeType(currentModule, a, id.identifier.text(), interfaceType);
                            } else {
                                throw new Error("Unexpected translation of " + id.identifier.text() + " to a non-interface type: " + interfaceType);
                            }
                        }
                        break;
                    case SyntaxKind.EnumDeclaration:
                        var ed = <EnumDeclaration>a;
                        //console.log(ed.identifier.text());
                        var enumType = TranslateTypes.translateType(this.symbol(a).type, this);
                        var fields = TcUtil.mapSepList2(ed.enumElements, (a: AST) => {
                            var en = <EnumElement>a;
                            return Field(en.propertyName.text(), enumType, false);
                        });
                        if (enumType && enumType.typeName === TypeName.Enum) {
                            tryAddType(currentModule, a, ed.identifier.text(), <TEnum>enumType);
                            var enumContainer = new TRecord(fields);
                            enumContainer.addIndexSignature(new TIndexMap(enumType, TConstant.String));
                            tryAddMember(currentModule, a, ed.identifier.text(), enumContainer);
                        } else {
                            throw new Error("Unexpected translation of " + ed.identifier.text() + " to a non-enum type: " + enumType);
                        }
                        break;
                    case SyntaxKind.FunctionDeclaration:
                        var fd = <FunctionDeclaration>a;
                        //console.log(fd.identifier.text());
                        var ftype = this.symbol(a).type;
                        if (ftype) {
                            var ftyp = TranslateTypes.translateType(ftype, this);
                            if (ftyp && (ftyp.typeName === TypeName.Arrow || ftyp.typeName === TypeName.Poly || ftyp.callSignature())) {
                                tryAddMember(currentModule, a, fd.identifier.text(), ftyp);
                            } else {
                                throw new Error("Unexpected translation of " + fd.identifier.text() + " to a non-arrow type: " + ftyp);
                            }
                        }
                        break;
                    case SyntaxKind.VariableStatement:
                        var vs = <VariableStatement>a;
                        if (hasModifier(vs.modifiers, PullElementFlags.Ambient) || hasModifier(vs.modifiers, PullElementFlags.Exported)) {
                            TcUtil.mapSepList2(vs.declaration.declarators, (b: AST) => {
                                var vdr = <VariableDeclarator>b;
                                var var_x = vdr.propertyName.text();
                                if (vdr.inferredType.isType()) {
                                    var var_t = TranslateTypes.translateType(<PullTypeSymbol>vdr.inferredType, this);
                                    if (hasModifier(vs.modifiers, PullElementFlags.Ambient) && !TcUtil.isPrimitive(var_t)) {
                                        var_t = new JustType(var_t); //declare var always has a virtual type
                                    }
                                    //console.log(var_x);
                                    tryAddMember(currentModule, b, var_x, var_t, !hasModifier(vs.modifiers, PullElementFlags.Ambient));
                                } else {
                                    throw new Error("Type inferred for " + var_x + " is not a type");
                                }
                            });
                        }
                        break;
                    default:
                        break;
                }
            });
        }
    }
}
