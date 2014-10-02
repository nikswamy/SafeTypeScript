// Modified by N.Swamy, A.Rastogi (2014)
///<reference path='../../references.ts' />
///<reference path='treln.ts' />
module TypeScript {
    export class SoundTypeChecker {
        private static emittedBaseClassHierarchy = false;
        private result_t: SoundType = null;      //a bit of state to keep track of the expected result type for bidirectional type-checking
        private static globalEnv: TcEnv = null;   //hang on to the accumulated type environment for each file in this bit of state (re-using the env for each file processed)
        public static compilationSettings : ImmutableCompilationSettings = null;

        //Entry point from typescript.ts
        public static buildSignature(compilationSettings: ImmutableCompilationSettings, semanticInfoChain: SemanticInfoChain, doc: Document): Diagnostic[] {
            var tcEnv: TcEnv = null;
            TcUtil.Logger.startLogForDocument(doc);
            if (TcUtil.isCurrentScriptRT()) {
                return [];
            }
            this.compilationSettings = compilationSettings;
            if (SoundTypeChecker.globalEnv) {     //restore the environment built from the previous files
                tcEnv = SoundTypeChecker.globalEnv;
            } else {
                tcEnv = new TcEnv(semanticInfoChain, compilationSettings);
            }
            tcEnv.buildSignature(doc.sourceUnit().moduleElements);
            SoundTypeChecker.globalEnv = tcEnv;
            return [];
            //tcEnv.logger.diagnostics(); //Suppressing diagnostics for the signature
        }

        //Entry point from typescript.ts
        public static check(compilationSettings: ImmutableCompilationSettings, semanticInfoChain: SemanticInfoChain, doc: Document) {
            this.compilationSettings = compilationSettings;
            var scriptName = doc.fileName.substring(doc.fileName.lastIndexOf("/") + 1);
            TcUtil.Logger.setSettings(compilationSettings);
            var checker =
                new SoundTypeChecker(
                    SoundTypeChecker.globalEnv
                    , scriptName
                    , compilationSettings
                    , semanticInfoChain
                    , doc
                    , true);
            TcUtil.Logger.startLogForDocument(doc);
            TcEnv.currentEnv = SoundTypeChecker.globalEnv;
            checker.tc(doc.sourceUnit());
            return TcUtil.Logger.diagnostics();
        }

        constructor(
            private tcenv: TcEnv,
            private scriptName: string,
            public compilationSettings: ImmutableCompilationSettings,
            public semanticInfoChain: SemanticInfoChain,
            public doc: Document,
            public rewriteSource: boolean) {
            //this flag controls if we instrument the code with checks or not
            //It is generally determined globally for all files by the compilationSettings
            //But can also be controlled on a per-file basis (although that control does not seem to be used, currently)
            this.rewriteSource = this.rewriteSource && !compilationSettings.noRuntimeChecks();
        }

        public emitBaseClassHierarchy() : AST[] {
            SoundTypeChecker.emittedBaseClassHierarchy = true;
            var emit = (tname: string, name: string) : AST => {
                var ot = <TInterface>TcEnv.currentEnv.lookupType({ dottedName: tname });
                if (!ot) {
                    return MkAST.stringConst(name + " missing");
                }
                var st = ot.toRecord(false);
                return new ExpressionStatement(MkAST.callRT("registerType", [MkAST.callRT("InterfaceRepr",
                    [MkAST.stringConst(name),
                        toMethodTable(st.exposeMethods()),
                        toFieldTable(st.exposeFields()),
                        MkAST.mkCleanArray([])])]));

            };
            return [emit("Object", "Object"),
                emit("String", "String"),
                emit("Number", "Number"),
                emit("Boolean", "Boolean"),
                emit("Error", "Error"),
                emit("TypeError", "TypeError"),
                emit("RegExp", "RegExp")];
        }

        public emitInterfaceRegistration(ast: InterfaceDeclaration) : AST {
            var t = this.tcenv.lookupTypeInCurrentScope(ast.identifier.text());
            if (!t || t["emitted"] || t.isVirtual() || !(t instanceof TInterface)) {
                return;
            }
            var it = <TInterface>t;
            it["emitted"] = true;
            var st = it.toRecord(true);

            var reduceFn = (accum: SoundType[], curr: SoundType, index: number, a: SoundType[]): SoundType[]=> {
                if (curr instanceof NamedType) {
                    var nt = <NamedType> curr;
                    return (nt.extendsC ? accum.concat(nt.extendsC.reduce(reduceFn, [curr])) : [curr]);
                } else {
                    accum.push(curr);
                    return accum;
                }
            }

            var extendsList = it.extendsC ? it.extendsC.reduce(reduceFn, []) : [];

            return new ExpressionStatement(MkAST.callRT("registerType", [MkAST.callRT("InterfaceRepr",
                [MkAST.stringConst(ast.identifier.text()),
                    toMethodTable(st.exposeMethods()),
                    toFieldTable(st.exposeFields()),
                    //MkAST.mkCleanArray(it.extendsC ? it.extendsC.map((t) => MkAST.stringConst(t.toString())) : []),
                    MkAST.mkCleanArray(extendsList.map((t) => MkAST.stringConst(t.toString()))),
                    MkAST.boolConst(it.isNominal())])]));
        }

        public emitClassRtti(ast: ClassDeclaration): AST {
            var t = this.tcenv.lookupTypeInCurrentScope(ast.identifier.text());
            if (!t || t.isVirtual()) {
                return;
            }
            var a = new ExpressionStatement(new BinaryExpression(SyntaxKind.AssignmentExpression,
                new MemberAccessExpression(new MemberAccessExpression(ast.identifier, new Identifier("prototype")), new Identifier("__rtti__")),
                MkAST.callRT("InstanceType", [MkAST.stringConst(ast.identifier.text())])));
            return a;
        }
        public emitFunctionRtti(ast: FunctionDeclaration): AST {
            var t = ast.soundType;
            if (!t || t.isVirtual()) {
                return;
            }
            return new ExpressionStatement(MkAST.setRtti(ast.identifier, t.toRTTI()));
        }
        private symbol(a: AST): PullSymbol {
            return this.semanticInfoChain.getSymbolForAST(a);
        }

        //Calls the type-checker and discards the return flag
        private tc(ast: AST): AST {
            return this.tcaux(ast).fst;
        }

        /* *************************************************************************
         tcWithResult
         * Sets the expected type for computation 'a' to 'r', 
         * although the check that the computation actually returns r is done internally 
         * while checking a (because it may contain early returns)
         * The only check done here is that a returns something at all (if r is non-void)
         * Strictly speaking, given that undefined is in every type, a missing return 
         * is not technically type incorrect.
         * However, it's a useful warning to emit. 
         ***************************************************************************/
        private tcWithResult(r: SoundType, a: AST) {
            var old = this.result_t;
            this.result_t = r;
            try {
                var res = this.tcaux(a);
                switch (r.typeName) {
                    case TypeName.Void:
                    case TypeName.Any:
                    case TypeName.Un: break; // don't have to return something in these cases 
                    default:
                        if (!res.snd) {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Missing_return, [], a);
                        }
                }
                this.result_t = old;
                return res.fst;
            } catch (e) {    //NS: probably not worth catching this exception here
                this.result_t = old;
                throw (e);
            }
        }

        //Calls the type-checker after setting location information in the logger for error reporting
        //Also checks that the type computed by us is compatible with the type inferred by the 1st round tc
        private tcaux(ast: AST): Pair<AST, boolean> {
            return TcUtil.Logger.withCurrentNode(ast, () => {
                var res = this.tcMain(ast);
                if (TcUtil.Logger.reportWarnings) {
                    var expected_t: SoundType;
                    if (ast.inferredType) {
                        expected_t = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv);
                    }
                    if (expected_t) {
                        var sc = TypeRelations.subTypeOrSig(res.fst.soundType, expected_t, TcUtil.allowDeepSubtyping(ast));
                        if (!sc.fst) { //can't shallow tag here, since AST may not be an expression form
                            TcUtil.Logger.warn("Inferred type incompatible for " + kind2string(ast.kind()));
                            TcUtil.Logger.error(DiagnosticCode.SEC_Inferred_type_incompatible_with_sound_type, [expected_t.toString(), res.fst.soundType.toString()], ast);
                        }
                    }
                }
                return res;
            });
        }

        /**********************************************************************************
         pkg
         * Packages up the result of a call to the type-checker on the orig AST node
         * -- checked is the type-checked and (optionally) rewritten node
         * The main idea is a bit of a hack:
         *  i.e., rewire the symbol tables to point to the rewritten term instead of the original one
         * This seems to be sufficient to provide the emitter with all the metadata it needs to emit the rewritten term
         **********************************************************************************/
        private pkg(orig: AST, checked: AST, t: SoundType = TConstant.Void, returns: boolean= false): Pair<AST, boolean> {
            var astDecl = this.semanticInfoChain.getDeclForAST(orig);
            if (astDecl) {
                this.semanticInfoChain.setDeclForAST(checked, astDecl);
            }
            checked._start = orig._start;
            checked._end = orig._end;
            checked.setPreComments(orig.preComments());
            checked.setPostComments(orig.postComments());
            this.semanticInfoChain.setSymbolForAST(checked, this.symbol(orig));
            this.semanticInfoChain.setAliasSymbolForAST(checked, this.semanticInfoChain.getAliasSymbolForAST(orig));
            checked._trailingTriviaWidth = orig._trailingTriviaWidth;
            checked.soundType = t;
            return { fst: checked, snd: returns };
        }

        /*************************************************************************
         tcMain
         * The main case analysis of the type-checker 
         * This skeleton is borrowed from the case analysis in typecheck/pullTypeResolution
         * The general style is to delegate all case-specific handling to auxiliary functions
         * ***********************************************************************/
        private tcMain(ast: AST): Pair<AST, boolean> {
            if (!ast) {
                throw new Error("Unexpected null AST");
            }
            //console.log(TcUtil.Logger.pos(ast) + ": " + kind2string(ast.kind()));
            var nodeType = ast.kind();
            switch (nodeType) {
                case SyntaxKind.AnyKeyword:
                case SyntaxKind.BooleanKeyword:
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.NumberKeyword:
                case SyntaxKind.StringKeyword:
                case SyntaxKind.VoidKeyword:
                case SyntaxKind.ArrayType:
                case SyntaxKind.GenericType:
                case SyntaxKind.ObjectType:
                case SyntaxKind.TypeQuery:
                case SyntaxKind.ConstructorType:
                case SyntaxKind.FunctionType:
                    try {
                        var tsStarType = this.computeType(ast);
                        return this.pkg(ast, ast, tsStarType);
                    } catch (e) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Feature_not_supported, ["Type reference"], ast);
                        return this.pkg(ast, ast, TConstant.Any);
                    }

                case SyntaxKind.List:
                    return this.tcList(<ISyntaxList2>ast);

                case SyntaxKind.SeparatedList:
                    return this.tcSeparatedList(<ISeparatedSyntaxList2>ast);

                case SyntaxKind.SourceUnit:
                    return this.tcSourceUnit(<SourceUnit>ast);

                case SyntaxKind.EnumDeclaration:
                    return this.tcEnumDeclaration(<EnumDeclaration>ast);

                case SyntaxKind.ModuleDeclaration:
                    return this.tcModuleDeclaration(<ModuleDeclaration>ast);

                case SyntaxKind.InterfaceDeclaration:
                    return this.tcInterfaceDeclaration(<InterfaceDeclaration>ast);

                case SyntaxKind.ClassDeclaration:
                    return this.tcClassDeclaration(<ClassDeclaration>ast);

                case SyntaxKind.VariableDeclaration:
                    return this.tcVariableDeclarationList(<VariableDeclaration>ast);

                case SyntaxKind.MemberVariableDeclaration:
                    return this.tcMemberVariableDeclaration(<MemberVariableDeclaration>ast);

                case SyntaxKind.VariableDeclarator:
                    var vd = <VariableDeclarator>ast;
                    if (this.scriptName === "lib.d.ts" && vd.propertyName.text() === "Array") {
                        return { fst: <AST> vd, snd: false };
                    }
                    return this.tcVariableDeclarator(<VariableDeclarator>ast);

                case SyntaxKind.PropertySignature:
                    return this.tcPropertySignature(<PropertySignature>ast);

                case SyntaxKind.ParameterList:
                    return this.tcParameterList(<ParameterList>ast);

                case SyntaxKind.Parameter:
                    return this.tcParameter(<Parameter>ast);

                case SyntaxKind.EnumElement:
                    return this.tcEnumElement(<EnumElement>ast);

                case SyntaxKind.EqualsValueClause:
                    return this.tcEqualsValueClause(<EqualsValueClause>ast);

                case SyntaxKind.TypeParameter:
                    return this.tcTypeParameterDeclaration(<TypeParameter>ast);

                case SyntaxKind.Constraint:
                    return this.tcConstraint(<Constraint>ast);

                case SyntaxKind.ImportDeclaration:
                    return this.tcImportDeclaration(<ImportDeclaration>ast);

                case SyntaxKind.ObjectLiteralExpression:
                    return this.tcObjectLiteralExpression(<ObjectLiteralExpression>ast);

                case SyntaxKind.SimplePropertyAssignment:
                    return this.tcSimplePropertyAssignment(<SimplePropertyAssignment>ast);

                case SyntaxKind.FunctionPropertyAssignment:
                    return this.tcFunctionPropertyAssignment(<FunctionPropertyAssignment>ast);

                case SyntaxKind.IdentifierName:
                    if (isTypesOnlyLocation(ast)) {
                        return this.tcTypeNameExpression(<Identifier>ast);
                    }
                    else {
                        return this.tcNameExpression(<Identifier>ast);
                    }

                case SyntaxKind.MemberAccessExpression:
                    return this.tcMemberAccessExpression(<MemberAccessExpression>ast);

                case SyntaxKind.QualifiedName:
                    return this.tcQualifiedName(<QualifiedName>ast);

                case SyntaxKind.ConstructorDeclaration:
                    return this.tcConstructorDeclaration(<ConstructorDeclaration>ast);

                case SyntaxKind.GetAccessor:
                    return this.tcGetAccessor(<GetAccessor>ast);

                case SyntaxKind.SetAccessor:
                    return this.tcSetAccessor(<SetAccessor>ast);

                case SyntaxKind.IndexMemberDeclaration:
                    return this.tcIndexMemberDeclaration(<IndexMemberDeclaration>ast);

                case SyntaxKind.IndexSignature:
                    return this.tcIndexSignature(<IndexSignature>ast);

                case SyntaxKind.MemberFunctionDeclaration:
                    return this.tcMemberFunctionDeclaration(<MemberFunctionDeclaration>ast);

                case SyntaxKind.CallSignature:
                    return this.tcCallSignature(<CallSignature>ast);

                case SyntaxKind.ConstructSignature:
                    return this.tcConstructSignature(<ConstructSignature>ast);

                case SyntaxKind.MethodSignature:
                    return this.tcMethodSignature(<MethodSignature>ast);

                case SyntaxKind.FunctionDeclaration:
                    return this.tcAnyFunctionDeclaration(<FunctionDeclaration>ast);

                case SyntaxKind.FunctionExpression:
                    return this.tcFunctionExpression(<FunctionExpression>ast);

                case SyntaxKind.SimpleArrowFunctionExpression:
                    return this.tcSimpleArrowFunctionExpression(<SimpleArrowFunctionExpression>ast);

                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return this.tcParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpression>ast);

                case SyntaxKind.ArrayLiteralExpression:
                    return this.tcArrayLiteralExpression(<ArrayLiteralExpression>ast);

                case SyntaxKind.ThisKeyword:
                    return this.tcThisExpression(<ThisExpression>ast);

                case SyntaxKind.SuperKeyword:
                    return this.tcSuperExpression(<SuperExpression>ast);

                case SyntaxKind.InvocationExpression:
                    var ie = <InvocationExpression>ast;
                    switch (ie.expression.kind()) {
                        case SyntaxKind.IdentifierName:
                            var id = <Identifier>ie.expression;
                            switch (id.text()) {  //NS: Probably unnecessary for SafeTS, although this may still be useful functions to provide in the RT library
                                case "wrap": return this.tcWrapOrCanTagInvocation(ie, "wrap");
                                case "canTag": return this.tcWrapOrCanTagInvocation(ie, "canTag");
                                default: break;
                            }
                            break;
                        case SyntaxKind.MemberAccessExpression:
                            var mae = <MemberAccessExpression>ie.expression;
                            if (mae.expression.kind() === SyntaxKind.IdentifierName && (<Identifier>mae.expression).text() === "RT" && mae.name.text() === "forceCheckedArray") {
                                return this.tcForceCheckedArrayInvocation(ie);
                            }   
                            break;
                        default: break;
                    }
                    return this.tcInvocationExpression(<InvocationExpression>ast);

                case SyntaxKind.ObjectCreationExpression:
                    return this.tcObjectCreationExpression(<ObjectCreationExpression>ast);

                case SyntaxKind.CastExpression:
                    return this.tcCastExpression(<CastExpression>ast);

                case SyntaxKind.TypeAnnotation:
                    return this.tcTypeAnnotation(<TypeAnnotation>ast);

                case SyntaxKind.ExportAssignment:
                    return this.tcExportAssignmentStatement(<ExportAssignment>ast);

                // primitives
                case SyntaxKind.NumericLiteral:
                    return this.pkg(ast, ast, TConstant.Number, false);

                case SyntaxKind.StringLiteral:
                    return this.pkg(ast, ast, TConstant.String, false);

                case SyntaxKind.NullKeyword:
                    return this.pkg(ast, ast, TConstant.Null, false);

                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                    return this.pkg(ast, ast, TConstant.Bool, false);

                case SyntaxKind.VoidExpression:
                    return this.tcVoidExpression(<VoidExpression>ast);

                // assignment
                case SyntaxKind.AssignmentExpression:
                case SyntaxKind.AddAssignmentExpression:
                case SyntaxKind.ExclusiveOrAssignmentExpression:
                case SyntaxKind.LeftShiftAssignmentExpression:
                case SyntaxKind.SignedRightShiftAssignmentExpression:
                case SyntaxKind.UnsignedRightShiftAssignmentExpression:
                case SyntaxKind.SubtractAssignmentExpression:
                case SyntaxKind.MultiplyAssignmentExpression:
                case SyntaxKind.DivideAssignmentExpression:
                case SyntaxKind.ModuloAssignmentExpression:
                case SyntaxKind.OrAssignmentExpression:
                case SyntaxKind.AndAssignmentExpression:
                    return this.tcAssignmentExpression(<BinaryExpression>ast);

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
                    return this.tcBinOp(<BinaryExpression>ast);

                case SyntaxKind.LogicalOrExpression:
                    return this.tcLogicalOrExpression(<BinaryExpression>ast);

                // unary operators
                case SyntaxKind.LogicalNotExpression:
                case SyntaxKind.PlusExpression:
                case SyntaxKind.NegateExpression:
                case SyntaxKind.BitwiseNotExpression:
                    return this.tcUnaryOperation(<PrefixUnaryExpression>ast);

                //unary ops with assignment (prefix)
                case SyntaxKind.PreIncrementExpression:
                case SyntaxKind.PreDecrementExpression:
                    return this.tcPrefixUnaryOpWithAssignment(<PrefixUnaryExpression>ast);

                //unary ops with assignment (postfix)
                case SyntaxKind.PostIncrementExpression:
                case SyntaxKind.PostDecrementExpression:
                    return this.tcPostfixUnaryOpWithAssignment(<PostfixUnaryExpression>ast);

               
                case SyntaxKind.ElementAccessExpression:
                    return this.tcElementAccessExpression(<ElementAccessExpression>ast);

                case SyntaxKind.TypeOfExpression:
                    return this.tcTypeOfExpression(<TypeOfExpression>ast);

                case SyntaxKind.ThrowStatement:
                    return this.tcThrowStatement(<ThrowStatement>ast);

                case SyntaxKind.DeleteExpression:
                    return this.tcDeleteExpression(<DeleteExpression>ast);

                case SyntaxKind.ConditionalExpression:
                    return this.tcConditionalExpression(<ConditionalExpression>ast);

                case SyntaxKind.RegularExpressionLiteral:
                    return this.tcRegularExpressionLiteral(<RegularExpressionLiteral>ast);

                case SyntaxKind.ParenthesizedExpression:
                    return this.tcParenthesizedExpression(<ParenthesizedExpression>ast);

                case SyntaxKind.ExpressionStatement:
                    return this.tcExpressionStatement(<ExpressionStatement>ast);

                case SyntaxKind.InstanceOfExpression:
                    return this.tcInstanceOfExpression(<BinaryExpression>ast);

                case SyntaxKind.CommaExpression:
                    return this.tcCommaExpression(<BinaryExpression>ast);

                case SyntaxKind.InExpression:
                    return this.tcInExpression(<BinaryExpression>ast);

                case SyntaxKind.ForStatement:
                    return this.tcForStatement(<ForStatement>ast);

                case SyntaxKind.ForInStatement:
                    return this.tcForInStatement(<ForInStatement>ast);

                case SyntaxKind.WhileStatement:
                    return this.tcWhileStatement(<WhileStatement>ast);

                case SyntaxKind.DoStatement:
                    return this.tcDoStatement(<DoStatement>ast);

                case SyntaxKind.IfStatement:
                    return this.tcIfStatement(<IfStatement>ast);

                case SyntaxKind.ElseClause:
                    return this.tcElseClause(<ElseClause>ast);

                case SyntaxKind.Block:
                    return this.tcBlock(<Block>ast);

                case SyntaxKind.VariableStatement:
                    return this.tcVariableStatement(<VariableStatement>ast);

                case SyntaxKind.WithStatement:
                    return this.tcWithStatement(<WithStatement>ast);

                case SyntaxKind.TryStatement:
                    return this.tcTryStatement(<TryStatement>ast);

                case SyntaxKind.CatchClause:
                    return this.tcCatchClause(<CatchClause>ast);

                case SyntaxKind.FinallyClause:
                    return this.tcFinallyClause(<FinallyClause>ast);

                case SyntaxKind.ReturnStatement:
                    return this.tcReturnStatement(<ReturnStatement>ast);

                case SyntaxKind.SwitchStatement:
                    return this.tcSwitchStatement(<SwitchStatement>ast);

                case SyntaxKind.ContinueStatement:
                    return this.tcContinueStatement(<ContinueStatement>ast);

                case SyntaxKind.BreakStatement:
                    return this.tcBreakStatement(<BreakStatement>ast);

                case SyntaxKind.LabeledStatement:
                    return this.tcLabeledStatement(<LabeledStatement>ast);

                case SyntaxKind.ArgumentList:
                    return this.tcArgumentList(<ArgumentList>ast);

                case SyntaxKind.CaseSwitchClause:
                    return this.tcCaseSwitchClause(<CaseSwitchClause>ast);

                case SyntaxKind.DefaultSwitchClause:
                    return this.tcDefaultSwitchClause(<DefaultSwitchClause>ast);

                case SyntaxKind.ExtendsHeritageClause:
                case SyntaxKind.ImplementsHeritageClause:
                    return this.tcHeritageClause(<HeritageClause>ast);

                case SyntaxKind.EmptyStatement:
                    return this.pkg(ast, ast, TConstant.Void);

                case SyntaxKind.TypeParameterList:
                    return this.tcTypeParameterList(<TypeParameterList>ast);

                case SyntaxKind.TypeArgumentList:
                    return this.tcTypeArgumentList(<TypeArgumentList>ast);

                default:
                    return TcUtil.NYI("Unexpected ast kind " + (kind2string(nodeType)));
            }
        }

        private tcList(ast: ISyntaxList2) {
            var checked: AST[];
            if (!SoundTypeChecker.emittedBaseClassHierarchy) {
                checked = this.emitBaseClassHierarchy();
            } else {
                checked = <AST[]>[];
            }

            var returns = false;
            for (var i = 0; i < ast.childCount(); i++) {
                var c = this.tcaux(ast.childAt(i));
                checked.push(c.fst);
                if (c.fst.kind() === SyntaxKind.InterfaceDeclaration) {
                    var ireg = this.emitInterfaceRegistration(<InterfaceDeclaration>c.fst);
                    if (ireg) {
                        checked.push(ireg);
                    }
                }
                if (c.fst.kind() === SyntaxKind.ClassDeclaration) {
                    var creg = this.emitClassRtti(<ClassDeclaration>c.fst);
                    if (creg) {
                        checked.push(creg);
                    }
                }
                if (c.fst.kind() === SyntaxKind.FunctionDeclaration && this.compilationSettings.tsstarTagging()) {
                    var f = this.emitFunctionRtti(<FunctionDeclaration>c.fst);
                    if (f) {
                        checked.push(f);
                    }
                }
                returns = returns || c.snd;
            }
            var res = new ISyntaxList2(this.doc.fileName, checked);
            return this.pkg(ast, res, TConstant.Void, returns);
        }
        private tcSeparatedList(ast: ISeparatedSyntaxList2) {
            var checked: AST[] = [];
            var returns = false;
            for (var i = 0; i < ast.nonSeparatorCount(); i++) {
                var c = this.tcaux(ast.nonSeparatorAt(i));
                checked.push(c.fst);
                returns = returns || c.snd;
            }
            var res = new ISeparatedSyntaxList2(this.doc.fileName, checked, ast.separatorCount());
            return this.pkg(ast, res, TConstant.Void, returns);
        }
        private tcSourceUnit(ast: SourceUnit) {
            var elts = this.tc(ast.moduleElements);
            if (this.rewriteSource) {
                ast.rewrittenModuleElements = <ISyntaxList2>elts;
                elts.parent = ast;
                return this.pkg(ast, ast);
            }
            return { fst: <AST> ast, snd: false };
        }
        private tcEnumDeclaration(ast: EnumDeclaration) {
            var t = new TEnum(ast.identifier.text(),
                TcUtil.mapSepList2(ast.enumElements, (a: AST) =>
                    (<EnumElement>a).propertyName.text()));
            TcUtil.mapSepList2(ast.enumElements, (a: AST) => {
                a.soundType = t;
            });
            return this.pkg(ast, ast);
        }
        private tcModuleDeclaration(ast: ModuleDeclaration) {
            if (hasModifier(ast.modifiers, PullElementFlags.Ambient)) {
                return this.pkg(ast, ast);
            }
            var names = getModuleNames(ast.name);
            var withNames: (i: number) => ISyntaxList2 = (i) => {
                if (i === names.length - 1) {
                    return this.tcenv.withModule<ISyntaxList2>(names[i].text())(()
                        => this.tcenv.newScope(() => <ISyntaxList2>this.tc(ast.moduleElements),
                            ScopeType.NamespaceBlock));
                } else {
                    return this.tcenv.withModule<ISyntaxList2>(names[i].text())(()
                        => withNames(i + 1));
                }
            };
            TcUtil.syntaxListMembers(ast.moduleElements).forEach((v: AST) => {
                switch (v.kind()) {
                    case SyntaxKind.VariableStatement:
                        var vs = <VariableStatement>v;
                        TcUtil.mapSepList2(vs.declaration.declarators, (b: AST) => {
                            var vdr = <VariableDeclarator>b;
                            if (vdr.equalsValueClause && !TcUtil.safeTopLevelInitializer(vdr.equalsValueClause)) {
                                TcUtil.Logger.error(DiagnosticCode.SEC_Initializer_may_rely_on_uninitialized_top_level_names, [], vdr);
                            }
                        });
                        break;
                    default:
                        break;
                }
            });
            var members = withNames(0);
            TcUtil.syntaxListMembers(members).forEach((v: AST) => {
                switch (v.kind()) {
                    case SyntaxKind.VariableStatement:
                        var vs = <VariableStatement>v;
                        if (hasModifier(vs.modifiers, PullElementFlags.Exported)) {
                            TcUtil.mapSepList2(vs.declaration.declarators, (b: AST) => {
                                var vdr = <VariableDeclarator>b;
                                var var_x = vdr.propertyName.text();
                                var ns = this.tcenv.curNamespace();
                                this.tcenv.addModuleMember(b, names, var_x, vdr.soundType);
                            });
                        }
                        break;
                    default:
                        break;
                }
            });
            var mod = new ModuleDeclaration(ast.modifiers, ast.name, ast.stringLiteral, members, ast.endingToken);
            return this.pkg(ast, mod);
        }
        private tcObjectType(ast: ObjectType) {
            var members = <ISeparatedSyntaxList2>this.tc(ast.typeMembers);
            var mems = TcUtil.mapSepList2(members, (a: AST) => a);
            var fields: Field[] = [];
            var methods: Field[] = [];
            var callSigs: SoundType[] = [];
            var constructSigs: SoundType[] = [];
            var indexSig: TIndexMap = null;
            mems.forEach((a: AST) => {
                switch (a.kind()) {
                    case SyntaxKind.PropertySignature:
                        var ps = <PropertySignature>a;
                        fields.push(Field(ps.propertyName.text(), ps.soundType));
                        break;
                    case SyntaxKind.MemberVariableDeclaration:
                        var mvd = <MemberVariableDeclaration>a;
                        fields.push(Field(mvd.variableDeclarator.propertyName.text(), mvd.variableDeclarator.soundType));
                        break;
                    case SyntaxKind.MemberFunctionDeclaration:
                        var mfd = <MemberFunctionDeclaration>a;
                        fields.push(Field(mfd.propertyName.text(), mfd.soundType));
                        break;
                    case SyntaxKind.MethodSignature:
                        var ms = <MethodSignature>a;
                        methods.push(Field(ms.propertyName.text(), ms.soundType));
                        break;
                    case SyntaxKind.IndexMemberDeclaration:
                        if (!indexSig) {
                            indexSig = <TIndexMap>a.soundType;
                        } else {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Feature_not_supported, ["Multiple index signatures"], a);
                        }
                        break;
                    case SyntaxKind.ConstructSignature:
                        constructSigs.push(a.soundType);
                        break;
                    case SyntaxKind.CallSignature:
                        callSigs.push(a.soundType);
                        break;
                }
            });
            var t = new TRecord(fields, methods);
            callSigs.forEach((s) => t.addCallSignature(s));
            constructSigs.forEach((s) => t.addConstructSignature(s));
            if (indexSig) t.addIndexSignature(indexSig);
            return this.pkg(ast, new ObjectType(members), t);
        }
        private tcTypeParameterList(ast: TypeParameterList) {
            TcUtil.mapSepList2(ast.typeParameters, (a: AST) => {
                var tp = <TypeParameter>a;
                if (tp.kind() !== SyntaxKind.TypeParameter) throw new Error("Impossible!");
                var name = tp.identifier.text();
                if (ast.parent.kind() === SyntaxKind.ClassDeclaration) {
                    var ns = this.tcenv.curNamespace();
                    ns.push((<ClassDeclaration>ast.parent).identifier.text())
                    name = TcUtil.mkTypeParamName(ns, name);
                } else if (ast.parent.kind() === SyntaxKind.InterfaceDeclaration) {
                    var ns = this.tcenv.curNamespace();
                    ns.push((<InterfaceDeclaration>ast.parent).identifier.text())
                    name = TcUtil.mkTypeParamName(ns, name);
                }
                var tv = new TVar(name, tp.identifier.text());
                tp.soundType = tv;
            });
            return this.pkg(ast, ast);
        }
        private tcTypeArgumentList(ast: TypeArgumentList) {
            TcUtil.mapSepList2(ast.typeArguments, (t: AST) => {
                this.tc(t);
            });
            return this.pkg(ast, ast);
        }
        private tcInterfaceDeclaration(ast: InterfaceDeclaration) {
            var log = (msg: string) => {
                if (this.scriptName !== "lib.d.ts") {
                    console.log(msg);                                  
                }
            };
            var tglobal = this.tcenv.lookupTypeInCurrentScope(ast.identifier.text());
            if (!tglobal) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, [ast.identifier.text()], ast);
                return this.pkg(ast, ast);
            }
            //Need to check that the interface decl is consistent with the type in the global environment
            var tps = ast.typeParameterList ? <TypeParameterList>this.tc(ast.typeParameterList) : ast.typeParameterList;
            var ns = this.tcenv.curNamespace();
            ns.push(ast.identifier.text());
            var tparmBinders = TcUtil.typeParameterListBindings(tps);
            var idecl = this.tcenv.withLocalTypes(tparmBinders, () => {
                var heritageClauses = <ISyntaxList2>this.tc(ast.heritageClauses);
                var extendsList: SoundType[] = [];
                TcUtil.syntaxListMembers(heritageClauses).forEach((a: AST) => {
                    TcUtil.mapSepList2((<HeritageClause>a).typeNames, (a: AST) => extendsList.push(a.soundType))
                });

                var body = this.tcObjectType(ast.body);
                var trec = <TRecord>body.fst.soundType;
                var tif = new TInterface(ast.identifier.text(), [], [], extendsList.filter(isNamedType));
                trec.exposeFields().forEach((f: Field) => tif.addField(f));
                trec.exposeMethods().forEach((f: Field) => tif.addMethod(f));
                return {
                    fst: new InterfaceDeclaration(ast.modifiers, ast.identifier, tps, heritageClauses, <ObjectType>body.fst),
                    snd: tif
                };
            });
            var tscheme = TcUtil.close(tparmBinders, idecl.snd);
            if (TypeRelations.subtype(tglobal, tscheme).fst) {
                return this.pkg(ast, idecl.fst, tscheme);
            }
            TcUtil.Logger.error(DiagnosticCode.SEC_Interface_declaration_mismatch, [ast.identifier.text(), tscheme.toString(), tglobal.toString()], ast);
            return this.pkg(ast, idecl.fst, tglobal);
        }

        private checkHeritageClauses(members: ISyntaxList2, heritageClauses: ISyntaxList2) {
            //NS: TODO!
        }

        private tcClassDeclaration(ast: ClassDeclaration) {
            var cd = <ClassDeclaration>ast;
            if (hasModifier(ast.modifiers, PullElementFlags.Ambient)) {
                return this.pkg(ast, ast);
            }
            var tparms = TcUtil.classDeclTypeParams(cd, this.tcenv);
            var classDecl = this.semanticInfoChain.getDeclForAST(ast);
            var members = this.tcenv.withClass<ISyntaxList2>(cd.identifier.text())(() => {
                var elements = TcUtil.syntaxListMembers(cd.classElements).map((elt: AST) => {
                    if (TcUtil.tvarsInScopeForClassElement(elt, this.tcenv)) {
                        return this.tcenv.withLocalTypes(tparms, () => this.tc(elt));
                    } else {
                        return this.tc(elt);
                    }
                });
                return <ISyntaxList2>this.pkg(cd.classElements, new ISyntaxList2(this.doc.fileName, elements)).fst;
            });
            var heritageClauses = this.tcenv.withLocalTypes(tparms, () => <ISyntaxList2>this.tc(cd.heritageClauses));
            var extendsClause = heritageClauses
                ? <HeritageClause>heritageClauses.firstOrDefault((a: AST, i: number) => a.kind() === SyntaxKind.ExtendsHeritageClause)
                : null;
            if (extendsClause) {
                var et = extendsClause.typeNames.nonSeparatorAt(0).soundType;
                if (et.typeName !== TypeName.Object && et.typeName !== TypeName.Inst) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Invalid_extends_clause, [et.toString() + " is not a class"], cd.heritageClauses);
                }
            }
            this.checkHeritageClauses(members, heritageClauses);
            var constructorDecl = members.firstOrDefault((a: AST, i: number) => a.kind() === SyntaxKind.ConstructorDeclaration);

            var class_t = <TClass>this.tcenv.lookup(cd.identifier.text());
            var obj_t = class_t.objectType();
            if (obj_t.isVirtual()) {
                var cd1 = new ClassDeclaration(cd.modifiers, cd.identifier, cd.typeParameterList, heritageClauses, members, cd.closeBraceToken);
                return this.pkg(ast, cd1, class_t);
            }
            if (obj_t.typeName !== TypeName.Object) {
                throw new Error(TcUtil.Logger.pos(ast) + ": Unexpected object type : " + obj_t.toString());
            }
            var object_t = <TObject>obj_t;
           
            var rttiSym = new PullSymbol("__rtti__", PullElementKind.Property);
            var extendsC = object_t.extendsC && object_t.extendsC.length === 1 ? <NamedType>object_t.extendsC[0].unfold() : null;
            var classArgs: AST[] = [MkAST.stringConst(class_t.name), //class name
                toMethodTable(object_t.toRecord(true).exposeMethods()), //methods
                toFieldTable(object_t.toRecord(true).exposeFields()), //fields
                extendsC ? <AST>MkAST.stringConst(extendsC.name) : MkAST.undefConst(), //extends
                MkAST.mkCleanArray(object_t.implementsI.map((i) => MkAST.stringConst(i.toString()))), //implements
                toMethodTable(class_t.toRecord(true).exposeMethods()), //static methods
                toFieldTable(class_t.toRecord(true).exposeFields()),   //static fields
                class_t.constructSignature().toRTTI(), //constructor        
                cd.identifier]; //function object
            var classRtti = new MemberVariableDeclaration([PullElementFlags.Static, PullElementFlags.Public],
                new VariableDeclarator(MkAST.id("__rtti__"), null,
                    new EqualsValueClause(
                        MkAST.callRT("registerClass", classArgs))));
            this.semanticInfoChain.setDeclForAST(classRtti,
                new NormalPullDecl("__rtti__", "__rtti__", PullElementKind.Property,
                    PullElementFlags.Public | PullElementFlags.Static, classDecl, new TextSpan(0, 0)));
            this.semanticInfoChain.setSymbolForAST(classRtti, rttiSym);
            var allMembers = new ISyntaxList2(this.doc.fileName, TcUtil.syntaxListMembers(members).concat([<AST>classRtti]));
            var cd2 = new ClassDeclaration(cd.modifiers, cd.identifier, cd.typeParameterList, heritageClauses, allMembers, cd.closeBraceToken);
            return this.pkg(ast, cd2, class_t);
        }
        private tcVariableDeclarationList(ast: VariableDeclaration) {
            var decls = <ISeparatedSyntaxList2>this.tc(ast.declarators);
            return this.pkg(ast, new VariableDeclaration(decls));
        }
        private tcMemberVariableDeclaration(ast: MemberVariableDeclaration) {
            if (ast.inferredType) {
                ast.variableDeclarator.inferredType = ast.inferredType;
            }
            var vd = this.tcenv.newScope(() => <VariableDeclarator>this.tc(ast.variableDeclarator), ScopeType.FunctionBlock);
            //newScope ensures that any newly pushed variable decl is cleared immediately;
            //tag it as a function block so that it doesn't clash with anything before it
            return this.pkg(ast, new MemberVariableDeclaration(ast.modifiers, vd));
        }
        private tcVariableDeclarator(ast: VariableDeclarator) {
            var texpected = ast.typeAnnotation
                ? this.computeType(ast.typeAnnotation.type)
                : ast.inferredType
                ? TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv)
                : TConstant.Any;

            var vdinit: EqualsValueClause = ast.equalsValueClause
                ? (TcUtil.varInScopeForInitializer(ast.equalsValueClause)
                ? this.tcenv.withVariable<EqualsValueClause>(ast, ast.propertyName.text(), texpected)(() => <EqualsValueClause> this.tc(ast.equalsValueClause))
                : <EqualsValueClause>this.tc(ast.equalsValueClause))
                : null;
            var sym = this.symbol(ast);
            var computedType = vdinit
                ? vdinit.soundType : (sym
                ? TranslateTypes.translateType(sym.type, this.tcenv)
                : TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv));
            var ambient = sym && sym.anyDeclHasFlag(PullElementFlags.Ambient);
            if (!ambient && !vdinit && texpected.typeName !== TypeName.Any && texpected.typeName !== TypeName.Un) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Uninitialized_variable, [texpected.toString()], ast);
            }
            if (vdinit) {
                var sc = TypeRelations.subtype(computedType, texpected, TcUtil.allowDeepSubtyping(ast.equalsValueClause));
                if (sc.fst) {
                    vdinit = new EqualsValueClause(TcUtil.shallowTag(sc, vdinit.value, texpected));
                } else {
                    if (TypeRelations.assignable(texpected, computedType)) {
                        vdinit = new EqualsValueClause(TcUtil.checkAndTag(vdinit.value, computedType, texpected));
                        TcUtil.Logger.warning(DiagnosticCode.SEC_Implicit_coercion, [computedType.toString(), texpected.toString()], ast.equalsValueClause);
                    } else {
                        TcUtil.Logger.error(
                            DiagnosticCode.SEC_Variable_assignment_incompatible_type,
                            [ast.propertyName.text(), texpected.toString(), vdinit.soundType.toString()],
                            ast.equalsValueClause);
                    }
                }
                vdinit.soundType = texpected;
            }
            this.tcenv.pushVariable(ast, ast.propertyName.text(), texpected);
            return this.pkg(ast, new VariableDeclarator(ast.propertyName, ast.typeAnnotation, vdinit), texpected);
        }
        private tcPropertySignature(ast: PropertySignature) {
            var t = <TypeAnnotation>this.tc(ast.typeAnnotation);
            var field = Field(ast.propertyName.text(), t.soundType);
            return this.pkg(ast, new PropertySignature(ast.propertyName, ast.questionToken, t), t.soundType);
        }
        private tcParameterList(ast: ParameterList) {
            return TcUtil.NYI("ParameterList");
        }
        private tcParameter(ast: Parameter) {
            var name = ast.identifier.text();
            var type = this.tc(ast.typeAnnotation).soundType;
            ast.soundType = type;
            return { fst: <AST>ast, snd: false };
        }
        private tcEnumElement(ast: EnumElement) {
            return TcUtil.NYI("EnumElement");
        }
        private tcEqualsValueClause(ast: EqualsValueClause) {
            var val = this.tc(ast.value);
            var t = val.soundType;
            return this.pkg(ast, new EqualsValueClause(val), t);
        }
        private tcTypeParameterDeclaration(ast: TypeParameter) {
            return TcUtil.NYI("TypeParameter");
        }
        private tcConstraint(ast: Constraint) {
            return TcUtil.NYI("Constraint");
        }
        private tcImportDeclaration(ast: ImportDeclaration) {
            var id = ast.identifier;
            var mref = ast.moduleReference;
            switch (mref.kind()) {
                case SyntaxKind.ExternalModuleReference:
                    var ref = (<ExternalModuleReference>mref).stringLiteral.text();
                    var mod = this.tcenv.lookup(ref);
                    if (!mod) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, ["module " + ref]);
                        mod = TConstant.Any;
                    }
                    this.tcenv.pushVariable(id, id.text(), mod);
                    break;
                default: 
                    return TcUtil.NYI("ImportDeclaration with a module reference of kind " + kind2string(mref.kind()));
            } 
            return this.pkg(ast, ast);
        }
        private tcObjectLiteralExpression(ast: ObjectLiteralExpression) {
            var this_t : SoundType = TConstant.Any;
            if (ast.inferredType) {
                this_t = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv).unfold();
                if (this_t instanceof StructuredType) {
                    this_t = (<StructuredType>this_t).removeExtraneousFields();
                }
            }
            var fields: {
                name: string;
                mutable: boolean;
                type: SoundType;
                expr: AST
            }[] = [];
            var methods: {
                name: string;
                mutable: boolean;
                type: SoundType;
                expr: AST
            }[] = [];
            var unquote = (s: string) => {
                if (s.charAt(0) === '"') {
                    return s.substring(1, s.length - 1);
                }
                return s;
            };

            var props: AST[] = TcUtil.mapSepList2(ast.propertyAssignments, (p: AST) => {
                if (p.kind() === SyntaxKind.SimplePropertyAssignment) {
                    var spa = <SimplePropertyAssignment>this.tc(p);
                    fields.push({
                        name: idOrStringText(spa.propertyName),
                        mutable: true,
                        type: spa.expression.soundType,
                        expr: spa.expression
                    });
                    return <AST>spa;
                } else if (p.kind() === SyntaxKind.GetAccessor) {
                    var ga = <GetAccessor>this.tcenv.withThisType(this_t, () => this.tc(p));
                    fields.push({
                        name: ga.propertyName.text(),
                        mutable: false,
                        type: ga.soundType,
                        expr: <AST> ga.block
                    });
                    return <AST>ga;
                } else if (p.kind() === SyntaxKind.SetAccessor) {
                    var sa = <SetAccessor>this.tcenv.withThisType(this_t, () => this.tc(p));
                    fields.forEach((f) => {
                        if (f.name === sa.propertyName.text()) {
                            f.mutable = true;
                        }
                    });
                    return <AST>sa;
                } else if (p.kind() === SyntaxKind.FunctionPropertyAssignment) {
                    var fpa = <FunctionPropertyAssignment>this.tcenv.withThisType(this_t, () => this.tc(p));
                    methods.push({
                        name: fpa.propertyName.text(),
                        mutable: false,
                        type: fpa.soundType,
                        expr: <AST> fpa
                    });
                    return <AST>fpa;
                } else {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Unexpected_property_assignment, [kind2string(p.kind())], p);
                    return p;
                }
            });
            var propertyAssignments = new ISeparatedSyntaxList2(this.doc.fileName, props, ast.propertyAssignments.separatorCount());
            this.pkg(ast.propertyAssignments, propertyAssignments, TConstant.Void);
            var trec =
                new TRecord(fields.map((f) => Field(unquote(f.name), f.type)),
                    methods.map((m) => Method(unquote(m.name), m.type)));
            var sc = TypeRelations.subtype(trec, this_t, TcUtil.allowDeepSubtyping(ast));
            if (!sc.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Object_literal_type_mismatch, [this_t.toString(), trec.toString()], ast);
            }
            var newObj: AST;
            if (this.compilationSettings.secure()) {
                newObj = MkAST.callExpr(MkAST.fieldOfRT("create"), [<AST>MkAST.nullConst()]);
                fields.forEach((f) => {
                    newObj = MkAST.callExpr(MkAST.fieldOfRT("setField"), [newObj, MkAST.stringConst(f.name), f.expr]);
                });
                return this.pkg(ast, TcUtil.shallowTag(sc, newObj, this_t), this_t);
            } else if (this.compilationSettings.tsstarTagging()) {
                newObj = MkAST.callRT("setTag", [new ObjectLiteralExpression(propertyAssignments), this_t.toRTTI()]);
                return this.pkg(ast, newObj, this_t); 
            } else {
                return this.pkg(ast, new ObjectLiteralExpression(propertyAssignments), this_t);
            }
        }
        private tcSimplePropertyAssignment(ast: SimplePropertyAssignment) {
            var e = this.tc(ast.expression);
            if (TcUtil.reservedName(idOrStringText(ast.propertyName))) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Reserved_name, [idOrStringText(ast.propertyName)], ast);
            }
            return this.pkg(ast, new SimplePropertyAssignment(ast.propertyName, e), e.soundType);
        }
        private tcFunctionPropertyAssignment(ast: FunctionPropertyAssignment) {
            var blockT = this.auxTcBlockFunction(ast, TcUtil.callSigTypeParamBindings(ast.callSignature), this.symbol(ast).type.getCallSignatures()[0], ast.block);
            return this.pkg(ast, new FunctionPropertyAssignment(ast.propertyName, ast.callSignature, blockT.fst), blockT.snd);
        }
        private tcTypeNameExpression(ast: Identifier) {
            ast.soundType = TranslateTypes.translate(this.symbol(ast), this.tcenv);
            return { fst: <AST>ast, snd: false };
        }
        private tcNameExpression(ast: Identifier) {
            var typ: SoundType = this.tcenv.lookup(ast.text());
            if (typ) {
                return this.pkg(ast, ast, typ);
            } else {
                TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, [ast.text()], ast);
                return this.pkg(ast, MkAST.unsafe(ast), TConstant.Any);
            }
        }
        private auxMemberOrMethodType(t: SoundType, name: string, overload: number, methodsOk: boolean= false): Field {
            if (!t.isVirtual() && !TcUtil.isPrimitive(t)) {
                overload = -1;
            }
            switch (t.typeName) {
                case TypeName.Any:
                    return null;
                case TypeName.Class:
                case TypeName.Module:
                case TypeName.Object:
                case TypeName.Interface:
                case TypeName.Record:
                case TypeName.Just:
                    var st = <StructuredType>t;
                    var fld = st.getField(name, overload);
                    if (!fld && methodsOk) {
                        fld = st.getMethod(name, overload);
                    }
                    if (!fld) {
                        var ot = <StructuredType>TcEnv.currentEnv.lookupType({ dottedName: "Object" });
                        if (ot) {
                            fld = ot.getField(name, overload);
                            if (!fld && methodsOk) {
                                fld = ot.getMethod(name, overload);
                            }
                        }
                    }
                    return fld;
                case TypeName.IndexMap:
                    return null;
                case TypeName.Enum:
                case TypeName.Number: //implicit conversion to number object
                    var numClass = this.tcenv.lookupType({ dottedName: "Number" });
                    if (numClass) {
                        return this.auxMemberOrMethodType(numClass, name, overload, methodsOk);
                    }
                    return null;
                case TypeName.String: //implicit conversion to string object
                    var strClass = this.tcenv.lookupType({ dottedName: "String" });
                    if (strClass) {
                        return this.auxMemberOrMethodType(strClass, name, overload, methodsOk);
                    }
                    return null;
                case TypeName.Variable:
                    var cons = (<TVar> t).getConstraint();
                    return (cons ? this.auxMemberOrMethodType(cons, name, overload, methodsOk) : null);
                default:
                    return null;
            }
        }
        private tcMemberAccessExpression(ast: MemberAccessExpression, methodsOk: boolean= false) {
            var o = this.tc(ast.expression);
            var f = ast.name.text();
            var mkProj = (fld?: Field) => {
                var proj = new MemberAccessExpression(o, ast.name);
                if (!fld) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Projecting_nonexistent_field, [f, o.soundType.toString()], ast);
                    return this.pkg(ast, MkAST.unsafe(proj), TConstant.Any);
                }
                return this.pkg(ast, proj, fld.type);
            };
            var t = o.soundType.unfold();
            switch (t.typeName) {
                case TypeName.Any:
                    TcUtil.Logger.error(DiagnosticCode.SEC_Implicit_coercion, [TConstant.Any.toString(), "{" + f + ":any}"], ast);

                    var id = function (s: string): Identifier {
                        return new Identifier(s);
                    }
                    var mem = function (o: AST, id: Identifier) {
                        return new MemberAccessExpression(o, id);
                    } 

                    if (this.isPure(o)) {
                        var ft_lookup: AST = mem(mem(MkAST.getRtti(o), id("fieldTable")), ast.name);
                        var mt_lookup: AST = mem(mem(MkAST.getRtti(o), id("methodTable")), ast.name);
                        var ob_lookup: AST = mem(MkAST.fieldOfRT("objectMethods"), ast.name);

                        var or_exp: AST = new BinaryExpression(SyntaxKind.LogicalOrExpression,
                            new BinaryExpression(SyntaxKind.LogicalOrExpression, ft_lookup, mt_lookup), ob_lookup);

                        var new_ast = MkAST.callRT("shallowTagSwap", [MkAST.callRT("getFieldTypeOptim", [or_exp, o, MkAST.stringConst(ast.name.text())]),
                                                                      new MemberAccessExpression(o, ast.name)]);
                        return this.pkg(ast, new_ast, TConstant.Any);
                    } else {
                        return this.pkg(ast,
                            MkAST.callRT("readField", [o, o.soundType.toRTTI(), MkAST.stringConst(f)]),
                            TConstant.Any);
                    }
                default:
                    var fld = this.auxMemberOrMethodType(t, f, 0);
                    return mkProj(fld);
            }
        }
        private tcQualifiedName(ast: QualifiedName) {
            
            if (isTypesOnlyLocation(ast)) {
                ast.soundType = TranslateTypes.translate(this.symbol(ast), this.tcenv);
                return { fst: <AST>ast, snd: false };
            }
            else {
                var fullName = [ast.right.text()];
                var pushNames = (ast: AST): any => {
                    switch (ast.kind()) {
                        case SyntaxKind.IdentifierName: fullName.push((<Identifier>ast).text()); return;
                        case SyntaxKind.QualifiedName: fullName.push((<QualifiedName>ast).right.text()); return pushNames((<QualifiedName>ast).left);
                        default: return TcUtil.NYI("Unexpected qualifiedName: " + ast + " at " + TcUtil.Logger.pos(ast));
                    }
                };
                pushNames(ast);
                fullName = fullName.reverse();
                var t = this.tcenv.lookupType({ fullName: fullName });
                return this.pkg(ast, ast, t);
            }
        }
        private tcConstructorDeclaration(ast: ConstructorDeclaration) {
            var signature = this.symbol(ast);
            var class_t = this.tcenv.lookup(this.tcenv.currentClassName());
            if (!class_t || class_t.typeName !== TypeName.Class) {
                throw new Error("die!");
            }
            var ct = (<TClass>class_t).constructSignature();
            var err = (msg: string): any => {
                throw ("Non-trivial constructor bodies are not yet supported in [--safe|--secure] mode: got a body with " + msg);
                return null;
            };
            var super_t: TcUtil.VariableBinding[] = [];
            var checkBody = (constr: TArrow, c: TObject) => {
                if (c.extendsC && c.extendsC[0]) {
                    var super_c = c.extendsC[0];
                    var cc = <TClass>this.tcenv.lookup((<NamedType>super_c.unfold()).name);
                    if (super_c.typeName === TypeName.Inst) {
                        super_t = [TcUtil.mkVariableBinding(ast, "__super__", new TInst(<TPoly>cc.constructSignature(), (<TInst>super_c).args))];
                    } else {
                        super_t = [TcUtil.mkVariableBinding(ast, "__super__", cc.constructSignature())];
                    }
                }
                var declPath: string[] = this.tcenv.curNamespace();
                var sym = this.semanticInfoChain.findSymbol(declPath, PullElementKind.All);
                if (!sym) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, [declPath.join(".")], ast);
                    return this.pkg(ast, ast);
                }
                else {
                    var classAST = <ClassDeclaration>this.semanticInfoChain.getASTForDecl(sym.getDeclarations()[0]);
                    var initialized = c.exposeFields().every((f: Field) => {
                        var initialized = constr.args.some((t: TArg) => t.name === f.name && t.isField())
                            || (c.extendsC && c.extendsC.some((u) => (<NamedType>u.unfold()).hasField(f.name)))
                            || classAST.classElements.any((m: AST) => {
                                switch (m.kind()) {
                                    case SyntaxKind.MemberFunctionDeclaration:
                                        return (<MemberFunctionDeclaration>m).propertyName.text() === f.name;
                                    case SyntaxKind.MemberVariableDeclaration:
                                        var vd = <MemberVariableDeclaration>m;
                                        return (vd.variableDeclarator.equalsValueClause && vd.variableDeclarator.propertyName.text() === f.name);
                                    default:
                                        return false;
                                }
                            });
                        if (!initialized) {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Uninitialized_member, [f.name], ast);
                        }
                        return initialized;
                    });
                }
            };
            var tparms: TcUtil.LocalTypeBinding[] = [];
            switch (ct.typeName) {
                case TypeName.Poly:
                    var constr = <TArrow>(<TPoly>ct).body;
                    tparms = (<TPoly>ct).bvars.map((bv) => bv.asBinder());
                    var failed = checkBody(constr, <TObject>constr.result.unfold());
                    if (failed) return failed;
                    break;
                case TypeName.Arrow:
                    var failed2 = checkBody(<TArrow>ct, <TObject>((<TArrow>ct).result.unfold()));
                    if (failed2) return failed2;
                    break;
                default:
                    throw new Error("Unexpected constructor type");
            }
            var blockT =
                this.tcenv.withVariables<Pair<Block, SoundType>>(super_t)(() => {
                    var csigs = signature.type.getConstructSignatures();      //take the last overload, which is the actual definition
                    return this.auxTcBlockFunction(ast, tparms, csigs[csigs.length - 1], ast.block, true /*voidOk*/);
                });
            var cd = new ConstructorDeclaration(ast.parameterList, blockT.fst);
            return this.pkg(ast, cd, blockT.snd);
        }
        private tcGetAccessor(ast: GetAccessor) {
            var block: Block;
            if (this.compilationSettings.noGetters()) {
                TcUtil.Logger.error(DiagnosticCode.SEC_noGetter_flag_getter_found, []);
                return pair(MkAST.unsafe(ast), true);
            }
            var t = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv);
            var block = <Block>this.tcWithResult(t, ast.block);
            return this.pkg(ast, new GetAccessor(ast.modifiers, ast.propertyName, ast.parameterList, ast.typeAnnotation, block), t);
        }
        private tcSetAccessor(ast: SetAccessor) {
            var t = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv);
            var bindings = TcUtil.mapSepList2(ast.parameterList.parameters, (a: AST) => {
                return TcUtil.mkVariableBinding(a, (<Parameter>a).identifier.text(), t);
            });
            var block = this.tcenv.newScope(() =>
                this.tcenv.withVariables<Block>(bindings)(() =>
                    <Block>this.tcWithResult(TConstant.Void, ast.block)),
                ScopeType.FunctionBlock);
            return this.pkg(ast, new SetAccessor(ast.modifiers, ast.propertyName, ast.parameterList, block), t);
        }
        private tcIndexMemberDeclaration(ast: IndexMemberDeclaration) {
            var index = this.tc(ast.indexSignature.parameter.typeAnnotation);
            var result = this.tc(ast.indexSignature.typeAnnotation);
            var isig = new TIndexMap(index.soundType, result.soundType);
            return this.pkg(ast, ast, isig);
        }
        private tcIndexSignature(ast: IndexSignature) {
            return { fst: <AST>ast, snd: false };
            //return TcUtil.NYI("IndexSignature" + JSON.stringify(TcUtil.Logger.lineNumber(ast));
        }
        private tcCallSignature(ast: CallSignature) {
            var binders = TcUtil.callSigTypeParamBindings(ast);
            var t: SoundType = this.tcenv.withLocalTypes(binders, () => {
                var parms = <ISeparatedSyntaxList2>this.tc(ast.parameterList.parameters);
                var result = this.computeType(ast.typeAnnotation.type);
                var t = new TArrow(TcUtil.mapSepList2(parms, (a: AST) => {
                    var p = <Parameter>a;
                    var decl = this.semanticInfoChain.getDeclForAST(p);
                    var flags = decl.flags;// .modifiers;
                    var variadic = p.dotDotDotToken ? true : false;
                    var targ = new TArg(p.identifier.text(), p.soundType, [flags], variadic);
                    return targ;
                }), result);
                return t;
            });
            t = TcUtil.close(binders, t);
            ast.soundType = t;
            return { fst: <AST>ast, snd: false };
        }
        private tcConstructSignature(ast: ConstructSignature) {
            return { fst: <AST>ast, snd: false };
        }
        private tcMethodSignature(ast: MethodSignature) {
            var cs = this.tcCallSignature(ast.callSignature);
            ast.soundType = cs.fst.soundType;
            return { fst: <AST>ast, snd: false };
        }
        private auxMkFunctionBodyBindings(ast: AST, tparms: TcUtil.LocalTypeBinding[], signature: PullSignatureSymbol, block?: Block): Triple<TcUtil.VariableBinding[], TArrow, TcUtil.LocalTypeBinding[]> {
            var bindings = this.tcenv.withLocalTypes(tparms, () => {
                var bindings = signature.parameters.map((p: PullSymbol) =>
                    <TcUtil.VariableBinding>{
                        ast: ast,
                        name: p.name,
                        type: TranslateTypes.translateType(p.type, this.tcenv)
                    });
                if (block) {
                    bindings = bindings.concat(TcUtil.gatherFunctionBindings(block.statements))
                }
                return bindings;
            });
            var t = TranslateTypes.translateTypeOrSig(signature, this.tcenv);
            var arrowType: TArrow = null;
            switch (t.typeName) {
                case TypeName.Arrow:
                    arrowType = <TArrow>t;
                    break;
                case TypeName.Poly:
                    arrowType = <TArrow>(new TInst(<TPoly>t, tparms.map((xt) => xt.snd))).unfold();
                    break;
                default:
                    throw new Error(TcUtil.Logger.pos(ast) + " Unexpected type for function " + t.toString());
            }
            return { fst: bindings, snd: arrowType, third: tparms };
        }
        private auxTcBlockFunction(ast: AST, tparms: TcUtil.LocalTypeBinding[],
            signature: PullSignatureSymbol, block: Block, voidOk: boolean = false): Pair<Block, SoundType/*Either an arrow or a polytype */> {
            //TODO: check callSig
            var bindingsT = this.auxMkFunctionBodyBindings(ast, tparms, signature, block);
            block = !block
            ? null
            : this.tcenv.newScope(() =>
                this.tcenv.withVariables<Block>(bindingsT.fst)(() =>
                    this.tcenv.withLocalTypes(bindingsT.third, () =>
                        <Block>this.tcWithResult(voidOk ? TConstant.Void : bindingsT.snd.result, block))),
                ScopeType.FunctionBlock);
            return { fst: block, snd: TcUtil.close(bindingsT.third, bindingsT.snd) };
        }
        private auxTcArrowFunction(ast: AST, callSig: CallSignature,
            signature: PullSignatureSymbol, block: Block, body: AST): { block: Block; body: AST; type: SoundType } {
            if (block && !body) {
                var blockT = this.auxTcBlockFunction(ast, TcUtil.callSigTypeParamBindings(callSig), signature, block);
                return { block: blockT.fst, body: body, type: blockT.snd };
            } else if (body && !block) {
                var bindingsT = this.auxMkFunctionBodyBindings(ast, TcUtil.callSigTypeParamBindings(callSig), signature);
                var expr = this.tcenv.newScope(() => this.tcenv.withVariables<AST>(bindingsT.fst, true)(() => this.tc(body)));
                var expected_t = bindingsT.snd.result ? bindingsT.snd.result : TConstant.Any;
                var sc = TypeRelations.subtype(expr.soundType, expected_t, TcUtil.allowDeepSubtyping(body));
                if (!sc.fst) {
                    if (TypeRelations.assignable(expected_t, expr.soundType)) {
                        TcUtil.Logger.warning(
                            DiagnosticCode.SEC_Implicit_coercion,
                            [expr.soundType.toString(), expected_t.toString()], body);
                        expr = TcUtil.checkAndTag(expr, expr.soundType, expected_t);
                    }
                    else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Function_return_type, [expected_t.toString(), expr.soundType.toString()], ast);
                        expr = MkAST.unsafe(expr);
                        expr.soundType = expected_t;
                    }
                } else {
                    expr = TcUtil.shallowTag(sc, expr, expected_t);
                }
                return { block: block, body: expr, type: <SoundType> bindingsT.snd };
            } else {
                throw TcUtil.NYI("Unexpected both block and expression in arrow function: " + TcUtil.Logger.pos(ast));
            }
        }
        private tcMemberFunctionDeclaration(ast: MemberFunctionDeclaration) {
            var callSigs = (<PullTypeSymbol>ast.inferredType).getCallSignatures();
            var checkBody = () => {
                var blockT = this.auxTcBlockFunction(ast, TcUtil.callSigTypeParamBindings(ast.callSignature), callSigs[callSigs.length - 1], ast.block);
                return this.pkg(ast, new MemberFunctionDeclaration(ast.modifiers, ast.propertyName, ast.callSignature, blockT.fst), blockT.snd);
            };
            if (hasModifier(ast.modifiers, PullElementFlags.Static)) {
                return this.tcenv.inStaticScope(checkBody);
            } else {
                return checkBody();
            }
        }
        private tcAnyFunctionDeclaration(ast: FunctionDeclaration) {
            var callSigs = this.symbol(ast).type.getCallSignatures();
            var callSig = callSigs ? callSigs[callSigs.length - 1] : null;        //the last call signature is what is used to type the function itself
            var blockT = this.tcenv.withoutThis(() => this.auxTcBlockFunction(ast, TcUtil.callSigTypeParamBindings(ast.callSignature), callSig, ast.block));
            var f = new FunctionDeclaration(ast.modifiers, ast.identifier, ast.callSignature, blockT.fst);
            return this.pkg(ast, f, functionType(blockT.snd));
        }
        private tcFunctionExpression(ast: FunctionExpression) {
            var callSigs = this.symbol(ast).type.getCallSignatures();
            var callSig = callSigs ? callSigs[callSigs.length - 1] : null;
            var blockT = this.tcenv.withoutThis(() => this.auxTcBlockFunction(ast, TcUtil.callSigTypeParamBindings(ast.callSignature), callSig, ast.block));
            var f = new FunctionExpression(ast.identifier, ast.callSignature, blockT.fst);
            var new_t = functionType(blockT.snd);
            if (this.compilationSettings.tsstarTagging()) {
                var newFun: AST = MkAST.callRT("setTag", [f, new_t.toRTTI()]);
                return this.pkg(ast, newFun, new_t);
            } else {
                return this.pkg(ast, f, new_t);
            }
        }
        private tcSimpleArrowFunctionExpression(ast: SimpleArrowFunctionExpression) {
            var bet = this.auxTcArrowFunction(ast, null, this.symbol(ast).type.getCallSignatures()[0], ast.block, ast.expression);
            var f = new SimpleArrowFunctionExpression(ast.identifier, bet.block, bet.body);
            var new_t = functionType(bet.type);
            if (this.compilationSettings.tsstarTagging()) {
                var newFun: AST = MkAST.callRT("setTag", [f, new_t.toRTTI()]);
                return this.pkg(ast, newFun, new_t);
            } else {
                return this.pkg(ast, f, new_t);
            }
        }
        private tcParenthesizedArrowFunctionExpression(ast: ParenthesizedArrowFunctionExpression) {
            var bet = this.auxTcArrowFunction(ast, ast.callSignature, this.symbol(ast).type.getCallSignatures()[0], ast.block, ast.expression);
            var f = new ParenthesizedArrowFunctionExpression(ast.callSignature, bet.block, bet.body);
            var new_t = functionType(bet.type);
            if (this.compilationSettings.tsstarTagging()) {
                var newFun: AST = MkAST.callRT("setTag", [f, new_t.toRTTI()]);
                return this.pkg(ast, newFun, new_t);
            } else {
                return this.pkg(ast, f, new_t);
            }
        }
        private tcArrayLiteralExpression(ast: ArrayLiteralExpression) {
            var expected_t: SoundType = null;
            if (ast.expressions.nonSeparatorCount() === 0) {
                expected_t = new TUVar();
            } else {
                var at = TranslateTypes.translateType(this.symbol(ast).type, this.tcenv);
                if (TcUtil.isArray(at)) {
                    expected_t = TcUtil.arrayElementType(<TInst>at);
                }
            }
            var elts = ast.expressions;
            var out: AST[] = [];
            var err = false;
            for (var i = 0; i < elts.nonSeparatorCount(); i++) {
                var elt = this.tc(elts.nonSeparatorAt(i));
                if (!expected_t) {
                    expected_t = elt.soundType;
                } else {
                    var sc = TypeRelations.subtype(elt.soundType, expected_t, TcUtil.allowDeepSubtyping(ast));
                    if (sc.fst) {
                        out.push(TcUtil.shallowTag(sc, elt, expected_t));
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Array_element_type, [expected_t.toString(), elt.soundType.toString()], elt);
                        err = true;
                        out.push(TcUtil.shallowTag(sc, elt, expected_t));
                    }
                }
            }
            if (!expected_t) {
                expected_t = TConstant.Any;
            }
            var elements = new ISeparatedSyntaxList2(elts.fileName(), out, elts.separatorCount());
            var arr = new ArrayLiteralExpression(elements);
            var res_t = TcUtil.mkArrayType(this.tcenv, expected_t);
            arr.soundType = res_t;
            var res: AST = null;
            if (this.compilationSettings.secure()) {
                res = MkAST.callExpr(MkAST.fieldOfRT("newArray"), [expected_t.toRTTI(), arr]);
                res.soundType = res_t;
                res = err ? MkAST.unsafe(res) : res;
            } else if (this.compilationSettings.tsstarTagging() && expected_t.typeName !== TypeName.UVar) {
                res = err ? MkAST.unsafe(arr) : MkAST.callRT("setTag", [arr, res_t.toRTTI()]); 
            } else {
                res = err ? MkAST.unsafe(arr) : arr;
            }
            return this.pkg(ast, res, res_t);
        }
        private tcThisExpression(ast: ThisExpression) {
            var this_t = this.tcenv.thisType();
            if (!this_t) {
                TcUtil.Logger.error(DiagnosticCode.SEC_This_not_in_scope, [], ast);
                ast.soundType = TConstant.Any;
                return { fst: MkAST.unsafe(ast), snd: false };
            }
            if (this_t.equals(TConstant.Any)) {
                TcUtil.Logger.error(DiagnosticCode.SEC_This_not_in_scope, [], ast);
            }
            ast.soundType = this_t;
            return { fst: <AST> ast, snd: false };
        }
        private tcSuperExpression(ast: SuperExpression) {
            var sup = this.tcenv.lookup("__super__");
            if (sup) {
                ast.soundType = sup;
                return { fst: <AST> ast, snd: false };
            }
            var this_t = this.tcenv.thisType();
            if (!this_t) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Super_not_in_scope, [], ast);
                ast.soundType = TConstant.Any;
                return { fst: MkAST.unsafe(ast), snd: false };
            }
            if (this_t.typeName === TypeName.Inst) {
                this_t = this_t.unfold();
                if (!(this_t instanceof NamedType)) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Super_not_in_scope, [], ast);
                    ast.soundType = TConstant.Any;
                    return { fst: MkAST.unsafe(ast), snd: false };
                }
            }
            var super_t = (<NamedType>this_t).extendsC[0];
            ast.soundType = super_t;
            return { fst: <AST> ast, snd: false };
        }
        private tcArgumentList(ast: ArgumentList) {
            var targs = ast.typeArgumentList ? <TypeArgumentList>this.tc(ast.typeArgumentList) : null; //TODO: Check type arguments
            var args = <ISeparatedSyntaxList2>this.tc(ast.args);
            return this.pkg(ast, new ArgumentList(targs, args, ast.closeParenToken));
        }
        private auxTcArgumentList(untyped_args:ArgumentList, typed_args: ArgumentList, t: TArrow, default_t?:SoundType): ArgumentList {
            var newargs: AST[] = [];
            var formal: TArg = null;
            var actual: AST = null;
            var i = 0;
            for (; i < typed_args.args.nonSeparatorCount(); i++) {
                actual = typed_args.args.nonSeparatorAt(i);
                if (i >= t.args.length) {
                    if (!formal) {
                        TcUtil.Logger.error(
                            DiagnosticCode.SEC_Arity_mismatch,
                            [t.args.length.toString(), typed_args.args.nonSeparatorCount().toString()], typed_args);
                        formal = new TArg("dummy", TConstant.Any);
                    }
                }
                else if (!formal) {
                    formal = t.args[i];
                }
                var type = formal.type;
                if (formal.variadic) {
                    var ft = formal.type.unfold();
                    if (!ft.isArray()) {
                        throw ("Impossible:  got a variadic argument type " + (formal.type.toString()));
                    }
                    type = (<TInterface>ft).arrayElementType();
                }
                var sc = TypeRelations.subtype(actual.soundType, type, TcUtil.allowDeepSubtyping(untyped_args.args.nonSeparatorAt(i)));
                if (!sc.fst) {
                    if (default_t && default_t.typeName === TypeName.Arrow) { //switching to default overload
                       return this.auxTcArgumentList(untyped_args, typed_args, <TArrow>default_t);
                    }
                    if (TypeRelations.assignable(type, actual.soundType)) {
                        TcUtil.Logger.warning(
                            DiagnosticCode.SEC_Implicit_coercion,
                            [actual.soundType.toString(), type.toString()], actual);
                        newargs.push(TcUtil.checkAndTag(actual, actual.soundType, type));
                    }
                    else {
                        TcUtil.Logger.error(
                            DiagnosticCode.SEC_Argument_type_mismatch,
                            [type.toString(), actual.soundType.toString()], actual);
                        newargs.push(MkAST.unsafe(actual));
                    }
                }
                else {
                    newargs.push(TcUtil.shallowTag(sc, actual, type));
                }
                if (!formal.variadic) {
                    formal = null;
                }
            }
            for (; i < t.args.length; i++) {
                if (!t.args[i].optional()) {
                    TcUtil.Logger.error(
                        DiagnosticCode.SEC_Missing_argument,
                        [t.args[i].name, t.args[i].type.toString()], typed_args);
                }
            }

            var argsList = new ISeparatedSyntaxList2(typed_args.args.fileName(), newargs, typed_args.args.separatorCount());
            return new ArgumentList(typed_args.typeArgumentList, argsList, typed_args.closeParenToken);
        }
        private isPure(ast: AST): boolean {
            if (!this.compilationSettings.optimizePure()) {
                return false;
            }
            switch (ast.kind()) {
                case SyntaxKind.FalseKeyword:
                case SyntaxKind.IdentifierName:
                case SyntaxKind.NullKeyword:
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.ThisKeyword:
                    return true;
                case SyntaxKind.MemberAccessExpression:
                    return this.compilationSettings.noGetters() || this.isPure((<MemberAccessExpression> ast).expression);
                case SyntaxKind.ParenthesizedExpression:
                    return this.isPure((<ParenthesizedExpression> ast).expression);
                default:
                    return false;
            }
        }
        private auxTcInvocationTarget(ast: AST, preArgs: ArgumentList, inferredTypeArgs: PullTypeSymbol[], overload: number):
            Pair<Pair<SoundType/* any or arrow */, SoundType>, (args: ArgumentList) => AST> {
            var mkArgList = (receiver: AST[], args: ArgumentList): AST[]=> {
                var typeArgs = args.typeArgumentList;
                var argsArray = TcUtil.mapSepList2(args.args, (a) => a);
                var targs = TcUtil.mapSepList2(args.args, (a) => a.soundType.toRTTI());
                return receiver.concat(argsArray).concat(targs);
            };
            var default_t: SoundType = undefined;
            var nargs = (args: ArgumentList) => args.args.nonSeparatorCount();
            var instantiate = (t: SoundType) => {
                switch (t.typeName) {
                    case TypeName.Arrow:
                    case TypeName.Any:
                        return pair(t, default_t);
                    case TypeName.Poly:
                        var tt = TcUtil.instantiateType(this.tcenv, t, preArgs, inferredTypeArgs, overload);
                        if (tt) {
                            tt = tt.unfold();
                        }
                        if (!tt || (tt.typeName !== TypeName.Arrow && tt.typeName !== TypeName.Any)) {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Cannot_apply_a_non_function, [t.toString()], ast);
                            return pair(<SoundType>TConstant.Any, default_t);
                        }
                        return pair(tt, default_t);
                    default:
                        var callSig = callSignature(this.tcenv, ast, t, overload);
                        var defaultSig = callSignature(this.tcenv, ast, t, -1);
                        var instCall = (sig: SoundType, warn: boolean) : SoundType => {
                            if (sig) {
                                var tcall = TcUtil.instantiateType(this.tcenv, sig, preArgs, inferredTypeArgs, overload);
                                if (tcall) {
                                    tcall = tcall.unfold();
                                }
                                if (!tcall || (tcall.typeName !== TypeName.Arrow && tcall.typeName !== TypeName.Any)) {
                                    TcUtil.Logger.error(DiagnosticCode.SEC_Cannot_apply_a_non_function, [t.toString()], ast);
                                    return <SoundType> TConstant.Any;
                                }
                                return tcall;
                            } else {
                                TcUtil.Logger.error(DiagnosticCode.SEC_Cannot_apply_a_non_function, [t.toString()], ast);
                                return TConstant.Any;
                            }
                        };
                        return pair(instCall(callSig, true), (defaultSig===callSig ? default_t : instCall(defaultSig, false)));
                }
            };
            switch (ast.kind()) {
                case SyntaxKind.MemberAccessExpression:
                    var mae = <MemberAccessExpression>ast;
                    var receiver = this.tc(mae.expression);
                    var name = mae.name.text();
                    var t = receiver.soundType.unfold();
                    switch (t.typeName) {
                        case TypeName.Any:
                            TcUtil.Logger.error(DiagnosticCode.SEC_Implicit_coercion, [TConstant.Any.toString(), "{" + name + ":any}"], ast);
                            var callMethod = (args: ArgumentList) => {
                                var allPure: boolean = this.isPure(receiver) && TcUtil.sepListMembers(args.args).every((x: AST) => {
                                    return this.isPure(x);
                                });
                                if (!allPure) {
                                    return MkAST.callRT("callMethod" + nargs(args),
                                        mkArgList([receiver, receiver.soundType.toRTTI(), MkAST.stringConst(name)], args));
                                } else {
                                    return MkAST.callRT("shallowTagSwap", [MkAST.callRT("checkMethodArgs" + nargs(args), mkArgList([receiver, receiver.soundType.toRTTI(), MkAST.stringConst(name)], args)),
                                                                           new InvocationExpression(new MemberAccessExpression(receiver, mae.name), args)]);
                                }
                            };
                            return {
                                fst: instantiate(TConstant.Any),
                                snd: callMethod
                            };
                        default:
                            var fld = this.auxMemberOrMethodType(t, name, overload, true);
                            var default_f = this.auxMemberOrMethodType(t, name, -1, true);
                            var mkCall = (args: ArgumentList): AST => {
                                return new InvocationExpression(new MemberAccessExpression(receiver, mae.name), args);
                            };
                            if (!fld) {
                                TcUtil.Logger.error(DiagnosticCode.SEC_Projecting_nonexistent_field, [name, t.toString()], ast);
                                return {
                                    fst: instantiate(TConstant.Any),
                                    snd: (args: ArgumentList) => MkAST.unsafe(mkCall(args))
                                };
                            } else {
                                return {
                                    fst: pair(instantiate(fld.type).fst, default_f === fld ? <SoundType>undefined : instantiate(default_f.type).fst),
                                    snd: mkCall
                                };
                            }
                    }

                case SyntaxKind.ElementAccessExpression:                //TODO: Handle index signature here
                    var eae = <ElementAccessExpression>ast;
                    var receiver2 = this.tc(eae.expression);
                    var methodName = this.tc(eae.argumentExpression);
                   return {
                        fst: instantiate(TConstant.Any),
                        snd: (args: ArgumentList) => MkAST.callRT("callMethod" + nargs(args), mkArgList([receiver2, receiver2.soundType.toRTTI(), methodName], args))
                    }

                default:
                    var receiver3 = this.tc(ast);
                    var t3 = receiver3.soundType.unfold();
                    switch (t3.typeName) {
                        case TypeName.Any:
                            TcUtil.Logger.warning(DiagnosticCode.SEC_Implicit_coercion, [t3.toString(), "call signature"], ast);
                            return {
                                fst: instantiate(TConstant.Any),
                                snd: (args: ArgumentList) => MkAST.callRT("callFunction" + nargs(args),
                                    mkArgList([receiver3, receiver3.soundType.toRTTI()], args))
                            };
                        default:
                            var tarr = instantiate(t3);        //1st round type-inference ensures that t3 must have a call signature
                            var mkCall = (args: ArgumentList): AST => new InvocationExpression(receiver3, args);
                            return {
                                fst: tarr,
                                snd: mkCall
                            };
                    }
            }
        }

        private tcForceCheckedArrayInvocation(ast: InvocationExpression) {
            var targs = <ISeparatedSyntaxList2>this.tc(ast.argumentList.typeArgumentList.typeArguments);
            var args = <ISeparatedSyntaxList2>this.tc(ast.argumentList.args);
            var source_t: SoundType = null, target_t: SoundType = null;
            if (targs.nonSeparatorCount() !== 2) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Arity_mismatch, ["2 type", targs.nonSeparatorCount() + " type"], ast);
                source_t = TConstant.Any;
                target_t = TConstant.Any;
            } else {
                source_t = TcUtil.mkCheckedArrayType(this.tcenv, targs.nonSeparatorAt(0).soundType);
                target_t = targs.nonSeparatorAt(1).soundType;
            }
            if (args.nonSeparatorCount() !== 1) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Arity_mismatch, ["1", targs.nonSeparatorCount().toString()], ast);
                return this.pkg(ast, MkAST.unsafe(ast), TConstant.Any);
            }
            var arg = args.nonSeparatorAt(0);
            var sc = TypeRelations.subtype(arg.soundType, source_t, TcUtil.allowDeepSubtyping(ast.argumentList.args.nonSeparatorAt(0)));
            if (!sc.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Argument_type_mismatch, [source_t.toString(), arg.soundType.toString()], ast);
                return this.pkg(ast, MkAST.unsafe(ast), TConstant.Any);
            }
            var call = MkAST.callRT("__forceCheckedArray", [TcUtil.shallowTag(sc, arg, source_t), target_t.toRTTI()]);
            return this.pkg(ast, call, TcUtil.mkArrayType(this.tcenv, target_t));
        }
        private tcWrapOrCanTagInvocation(ast: InvocationExpression, wrapOrCanTag: string) {
            var targs = <ISeparatedSyntaxList2>this.tc(ast.argumentList.typeArgumentList.typeArguments);
            var args = <ISeparatedSyntaxList2>this.tc(ast.argumentList.args);
            var source_t: SoundType = null, target_t: SoundType = null;
            if (targs.nonSeparatorCount() !== 2) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Arity_mismatch, ["2 type", targs.nonSeparatorCount() + " type"], ast);
                source_t = TConstant.Any;
                target_t = TConstant.Any;
            } else {
                source_t = targs.nonSeparatorAt(0).soundType;
                target_t = targs.nonSeparatorAt(1).soundType;
            }
            if (args.nonSeparatorCount() !== 1) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Arity_mismatch, ["1", targs.nonSeparatorCount().toString()], ast);
                return this.pkg(ast, MkAST.unsafe(ast), TConstant.Any);
            }
            var arg = args.nonSeparatorAt(0);
            var sc = TypeRelations.subtype(arg.soundType, source_t, TcUtil.allowDeepSubtyping(ast.argumentList.args.nonSeparatorAt(0)));
            if (!sc.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Argument_type_mismatch, [source_t.toString(), arg.soundType.toString()], ast);
                return this.pkg(ast, MkAST.unsafe(ast), TConstant.Any);
            }
            var callWrap = MkAST.callExpr(MkAST.fieldOfRT(wrapOrCanTag), [source_t.toRTTI(), target_t.toRTTI(), TcUtil.shallowTag(sc, arg, source_t)]);
            if (wrapOrCanTag === "wrap") {
                return this.pkg(ast, callWrap, target_t);
            } else {
                return this.pkg(ast, callWrap, TConstant.Bool);
            }
        }
        private tcInvocationExpression(ast: InvocationExpression) {
            var typed_args = <ArgumentList>this.tc(ast.argumentList);
            var ttcall = this.auxTcInvocationTarget(ast.expression, typed_args, ast.inferredTypeArgs, ast.resolvedSignatureIndex);
            var tt = ttcall.fst.fst.unfold();
            var def_t = ttcall.fst.snd ? ttcall.fst.snd.unfold() : <SoundType>undefined;
            var call = ttcall.snd;
            switch (tt.typeName) {
                case TypeName.Arrow:
                    var tarr = <TArrow>tt;
                    var result = call(this.auxTcArgumentList(ast.argumentList, typed_args, tarr, def_t));
                    if (ast.expression.kind() === SyntaxKind.SuperKeyword) {
                        return this.pkg(ast, result, TConstant.Void);
                    } else {
                        return this.pkg(ast, result, tarr.result);
                    }
                case TypeName.Any:
                    var argsSub: AST[] = TcUtil.mapSepList2WithIndex(typed_args.args,
                        (a: AST, i:number) => {
                            var sc = TypeRelations.subtype(a.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(ast.argumentList.args.nonSeparatorAt(i)));
                            if (!sc.fst) TcUtil.Logger.error(DiagnosticCode.SEC_Dynamic_call_with_un_typed_argument, [], a);
                            return TcUtil.shallowTag(sc, a, TConstant.Any);
                        });
                    var argList =
                        new ArgumentList(typed_args.typeArgumentList,
                            new ISeparatedSyntaxList2(this.doc.fileName, argsSub, argsSub.length - 1),
                            typed_args.closeParenToken);
                    return this.pkg(ast, call(argList), TConstant.Any);

                default:    //should not be reachable
                    TcUtil.Logger.error(DiagnosticCode.SEC_Cannot_apply_a_non_function, [tt.toString()], ast);
                    return this.pkg(ast, MkAST.unsafe(call(typed_args)), TConstant.Any);
            }
        }
        private tcObjectCreationExpression(ast: ObjectCreationExpression) {
            var tgt = this.tc(ast.expression);
            var tgtType = tgt.soundType.unfold();
            var typed_args = <ArgumentList>this.tc(ast.argumentList);
            if (!(tgtType instanceof StructuredType) || !(<StructuredType>tgtType).constructSignature()) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Invalid_new_target,
                    [tgt.soundType.toString()], ast.expression);
                tgtType = new TClass("Dummy",
                    new TArrow(TcUtil.mapSepList2(typed_args.args, (a: AST) => new TArg("", TConstant.Any)), TConstant.Any), []);
            }
            var csig = (<StructuredType>tgtType).constructSignature(ast.resolvedSignatureIndex);
            var defSig = (<StructuredType>tgtType).constructSignature(-1);
            var inst = (sig: SoundType) => {
                var ctype = TcUtil.instantiateType(this.tcenv, sig, typed_args, ast.inferredTypeArgs).unfold();
                if (!ctype || ctype.typeName !== TypeName.Arrow) {
                    throw new Error("Unexpected constructor type " + ctype);
                }
                return ctype;
            };
            var ctype = inst(csig);
            var new_obj : AST = new ObjectCreationExpression(tgt, this.auxTcArgumentList(ast.argumentList, typed_args, <TArrow>ctype, defSig === csig ? <SoundType>undefined : inst(defSig)));
            var result_t = (<TArrow>ctype).result;     //NS: Fixme ...should be the defSig result, if that's the one chosen
            if (this.compilationSettings.tsstarTagging() && TcUtil.isArray(result_t)) {
                new_obj = MkAST.callRT("setTag", [new_obj, result_t.toRTTI()]);
            }
            return this.pkg(ast, new_obj, result_t);
        }
        private computeType(ast: AST): SoundType {
            switch (ast.kind()) {
                case SyntaxKind.AnyKeyword: return TConstant.Any;
                case SyntaxKind.BooleanKeyword: return TConstant.Bool;
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.NumberKeyword: return TConstant.Number;
                case SyntaxKind.StringLiteral:
                case SyntaxKind.StringKeyword: return TConstant.String;
                case SyntaxKind.VoidKeyword: return TConstant.Void;
                case SyntaxKind.ArrayType: return TcUtil.mkArrayType(this.tcenv, this.computeType((<ArrayType>ast).type));
                case SyntaxKind.GenericType:
                    var gt = <GenericType>ast;
                    var nm = (<IASTToken>gt.name).text();
                    if (nm === "Array") {
                        return TcUtil.mkArrayType(this.tcenv, this.computeType(gt.typeArgumentList.typeArguments.nonSeparatorAt(0)));
                    }
                    else if (this.compilationSettings.generics()) {
                        var tt = <TPoly>TranslateTypes.translateTypeOrSig(this.symbol(gt.name), this.tcenv);
                        var targs = TypeScript.TcUtil.mapSepList2(gt.typeArgumentList.typeArguments, (t) => this.computeType(t));
                        var res = new TypeScript.TInst(tt, targs);
                        return res;
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Generic_types_unsupported, [nm], ast);
                        return TConstant.Any;
                    }
                default:
                    return TranslateTypes.translateType(<PullTypeSymbol>this.symbol(ast), this.tcenv);
            }
        }
        private tcCastExpression(ast: CastExpression) {
            var targ = this.computeType(ast.type);
            var arg = this.tc(ast.expression);
            var fc = TcUtil.allowDeepSubtyping(ast.expression);
            var sc = TypeRelations.subtype(arg.soundType, targ, fc);
            if (sc.fst) {
                if (fc.fresh) {
                    return this.pkg(ast, arg, targ);
                }
                return this.pkg(ast, TcUtil.shallowTag(sc, arg, targ), targ);
            }
            if (this.compilationSettings.inlineCasts() && targ.typeName === TypeName.Object && ast.expression.kind() === SyntaxKind.IdentifierName) {
                var tobj = <TObject>targ;
                var nullGuard = new ParenthesizedExpression([], new BinaryExpression(SyntaxKind.LogicalOrExpression,
                    new BinaryExpression(SyntaxKind.EqualsExpression, arg, MkAST.undefConst()),
                    new BinaryExpression(SyntaxKind.EqualsExpression, arg, MkAST.nullConst())));
                var strEquals =
                    new BinaryExpression(SyntaxKind.EqualsExpression,
                        new MemberAccessExpression(MkAST.getRtti(arg), new Identifier("name")),
                        MkAST.stringConst(tobj.name));
                var instanceOf = new BinaryExpression(SyntaxKind.InstanceOfExpression, arg, new Identifier(tobj.fullName.join(".")));
                var tm = new ConditionalExpression(new BinaryExpression(SyntaxKind.LogicalOrExpression, nullGuard,
                    new ParenthesizedExpression([], new BinaryExpression(SyntaxKind.LogicalOrExpression, strEquals, instanceOf))),
                    arg,
                    MkAST.callRT("die", []));
                return this.pkg(ast, tm, targ);
            } else if (arg.soundType.isUn()) {
                return this.pkg(ast, MkAST.callRT("wrapFromUn", [arg, targ.toRTTI()]), targ);
            } else if (targ.isUn()) {
                return this.pkg(ast, MkAST.callRT("wrapToUn", [arg, arg.soundType.toRTTI()]), targ);
            } else {
                return this.pkg(ast, MkAST.callRT("checkAndTag", [arg, arg.soundType.toRTTI(), targ.toRTTI()]), targ);
            }
        }
        private tcTypeAnnotation(ast: TypeAnnotation) {
            ast.soundType = this.computeType(ast.type);
            return { fst: <AST>ast, snd: false };
        }
        private tcExportAssignmentStatement(ast: ExportAssignment) {
            return TcUtil.NYI("ExportAssignment");
        }
        private tcVoidExpression(ast: VoidExpression) {
            ast.soundType = TConstant.Void;
            return { fst: <AST>ast, snd: false };
        }
        private tcAssignIdentifier(ast: BinaryExpression, lhs: AST/*already type-checked */, rhs: AST /*already type-checked*/, rhs_orig:AST /* untyped */) {
            var sc = TypeRelations.subtype(rhs.soundType, lhs.soundType, TcUtil.allowDeepSubtyping(rhs_orig));
            if (!sc.fst) {
                if (TypeRelations.assignable(lhs.soundType, rhs.soundType)) {
                    TcUtil.Logger.warning(DiagnosticCode.SEC_Implicit_coercion, [rhs.soundType.toString(), lhs.soundType.toString()], lhs);
                    return this.pkg(ast, new BinaryExpression(ast.kind(), lhs, TcUtil.checkAndTag(rhs, rhs.soundType, lhs.soundType)), rhs.soundType);
                }
                TcUtil.Logger.error(DiagnosticCode.SEC_Variable_assignment_incompatible_type,
                    [(<Identifier>ast.left).text(), lhs.soundType.toString(), rhs.soundType.toString()], ast.left);
                return this.pkg(ast, MkAST.unsafe(new BinaryExpression(ast.kind(), lhs, TcUtil.checkAndTag(rhs, rhs.soundType, lhs.soundType))), rhs.soundType);
            }
            return this.pkg(ast, new BinaryExpression(ast.kind(), lhs, TcUtil.shallowTag(sc, rhs, lhs.soundType)), rhs.soundType);
        }
        private tcAssignMember(ast: BinaryExpression, o: AST, fn: Identifier, rhs: AST, rhs_orig: AST) {
            var safe = (lhs: AST, rhs: AST, t: SoundType) => {
                return this.pkg(ast, new BinaryExpression(ast.kind(), lhs, rhs), t);
            };
            var unsafe = (lhs: AST, rhs: AST) => {
                return this.pkg(ast, MkAST.unsafe(new BinaryExpression(ast.kind(), lhs, rhs)), TConstant.Any);
            };
            var tcAssign = (ft: Field) => {
                var mae = new MemberAccessExpression(o, fn);
                if (!ft) {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_to_nonexistent_field, [fn.text(), o.soundType.toString()], ast);
                    return unsafe(mae, rhs);
                }
                mae.soundType = ft.type;
                var sc = TypeRelations.subtype(rhs.soundType, ft.type, TcUtil.allowDeepSubtyping(rhs_orig));
                if (ft.mutable && sc.fst) {
                    return safe(mae, TcUtil.shallowTag(sc, rhs, ft.type), rhs.soundType);
                } else {
                    if (!ft.mutable) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_to_immutable_field, [fn.text()], ast);
                        return unsafe(mae, TcUtil.shallowTag(sc, rhs, ft.type));
                    } else {
                        if (TypeRelations.assignable(ft.type, rhs.soundType) && TypeRelations.isSubtype(o.soundType, TConstant.Any)) {
                            return safe(mae, MkAST.callRT("checkAndTag", [rhs, rhs.soundType.toRTTI(), ft.type.toRTTI()]), ft.type);
                        } else {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_incompatible_value_to_field, [
                                fn.text(),
                                ft.type.toString(),
                                rhs.soundType.toString()
                            ], ast);
                            return unsafe(mae, TcUtil.shallowTag(sc, rhs, ft.type));
                        }
                    }
                }
            };
            var ot = o.soundType.unfold();
            switch (ot.typeName) {
                case TypeName.Any:
                    var sc = TypeRelations.subtype(rhs.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(rhs_orig));
                    if (!sc.fst) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_incompatible_value_to_field, [
                            fn.text(),
                            TConstant.Any.toString(),
                            rhs.soundType.toString()
                        ], ast);
                        return unsafe(new MemberAccessExpression(o, fn), rhs);
                    } else {
                        if (this.isPure(o)) {
                            var id = function (s: string): Identifier {
                                return new Identifier(s);
                            }
                            var mem = function (o: AST, id: Identifier) {
                                return new MemberAccessExpression(o, id);
                            }
                            var ft_lookup: AST = mem(mem(MkAST.getRtti(o), id("fieldTable")), fn);
                            var mt_lookup: AST = mem(mem(MkAST.getRtti(o), id("methodTable")), fn);
                            var ob_lookup: AST = mem(MkAST.fieldOfRT("objectMethods"), fn);

                            var or_exp: AST = new BinaryExpression(SyntaxKind.LogicalOrExpression,
                                new BinaryExpression(SyntaxKind.LogicalOrExpression, ft_lookup, mt_lookup), ob_lookup);

                            var new_rhs = MkAST.callRT("checkAndTag", [rhs, rhs.soundType.toRTTI(),
                                MkAST.callRT("getFieldTypeOptim", [or_exp, o, MkAST.stringConst(fn.text())])
                            ]); 
                            return this.pkg(ast, new BinaryExpression(ast.kind(), new MemberAccessExpression(o, fn), new_rhs), TConstant.Any)
                        } else {
                            var ce = MkAST.callRT("writeField", [o, o.soundType.toRTTI(), MkAST.stringConst(fn.text()), rhs, rhs.soundType.toRTTI()]);
                            return this.pkg(ast, ce, TConstant.Any);
                        }
                    }
                default:
                    if (ot instanceof StructuredType) {
                        return tcAssign((<StructuredType>ot).getField(fn.text()));
                    }
                    if (ot instanceof TVar) {
                        var cons = (<TVar> ot).getConstraint();
                        if (cons && cons instanceof StructuredType) {
                            return tcAssign((<StructuredType> cons).getField(fn.text()));
                        }
                    }
                    TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_to_non_record, [fn.text(), o.soundType.toString()], o);
                    return unsafe(new MemberAccessExpression(o, fn), rhs);
            }
        }
        private tcAssignElement(ast: BinaryExpression, o: AST, key: AST, rhs: AST) {
            var safe = (lhs: AST, rhs: AST, t: SoundType) => {
                return this.pkg(ast, new BinaryExpression(ast.kind(), lhs, rhs), t);
            };
            var unsafe = (lhs: AST, rhs: AST) => {
                return this.pkg(ast, MkAST.unsafe(new BinaryExpression(ast.kind(), lhs, rhs)), TConstant.Any);
            };
            if (o.soundType.unfold().isCheckedArray()) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Assignment_to_index_of_immutable_array_is_not_allowed, [o.soundType.toString()]);
                return unsafe(new ElementAccessExpression(o, key), rhs);
            }
            var assignee = (o1: AST, t: SoundType) => {
                var res = new ElementAccessExpression(o1, key);
                res.soundType = t;
                return res;
            };
            var t_o = o.soundType.unfold();
            if (t_o.indexSignature()) {
                var index = t_o.indexSignature();
                var eltSub = TypeRelations.subtype(rhs.soundType, index.elt, TcUtil.allowDeepSubtyping(ast.right));
                var indexSub = TypeRelations.subtype(key.soundType, index.indexType);
                if (!indexSub.fst) {
                    if (TypeRelations.assignable(index.indexType, key.soundType)) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Implicit_coercion, [key.soundType.toString(), index.indexType.toString()]);
                        key = MkAST.callRT("checkAndTag", [key, key.soundType.toRTTI(), index.indexType.toRTTI()]);
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Index_map_key_type_mismatch,
                            [index.indexType.toString(), key.soundType.toString()], ast);
                        key = MkAST.unsafe(key);
                    }
                }
                if (!eltSub.fst) {
                    if (TypeRelations.assignable(index.elt, rhs.soundType)) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Implicit_coercion, [rhs.soundType.toString(), index.elt.toString()]);
                        rhs = MkAST.callRT("checkAndTag", [rhs, rhs.soundType.toRTTI(), index.elt.toRTTI()]);
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Index_map_elt_type_mismatch,
                            [index.elt.toString(), rhs.soundType.toString()], ast);
                        rhs = MkAST.unsafe(rhs);
                    }
                } else {
                    rhs = TcUtil.shallowTag(eltSub, rhs, index.elt);
                }
                return safe(assignee(o, index.elt), rhs, index.elt);
            } else {
                var sc1 = TypeRelations.subtype(o.soundType, TConstant.Any);
                var sc2 = pair(true, TcUtil.zeroDelta);
                if (this.compilationSettings.secure()) {
                    sc2 = TypeRelations.subtype(key.soundType, TConstant.Any);
                }
                var scrhs = TypeRelations.subtype(rhs.soundType, TConstant.Any);
                if (sc1.fst && sc2.fst && scrhs.fst) {
                    var ce = MkAST.callRT("writeField", [o, o.soundType.toRTTI(), key, rhs, rhs.soundType.toRTTI()]);
                    return this.pkg(ast, ce, TConstant.Any);
                }
                else {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Dynamic_field_assignment_all_not_any,
                        [o.soundType.toString(),
                            key.soundType.toString(),
                            rhs.soundType.toString()], ast);
                    return unsafe(assignee(o, TConstant.Any), TcUtil.shallowTag(scrhs, rhs, TConstant.Any));
                }
            }
        }

        private getBinOpFromAssignment(aKind: SyntaxKind): SyntaxKind {
            switch (aKind) {
                case SyntaxKind.AddAssignmentExpression:                return SyntaxKind.AddExpression;
                case SyntaxKind.SubtractAssignmentExpression:           return SyntaxKind.SubtractExpression;
                case SyntaxKind.MultiplyAssignmentExpression:           return SyntaxKind.MultiplyExpression;
                case SyntaxKind.DivideAssignmentExpression:             return SyntaxKind.DivideExpression;
                case SyntaxKind.ModuloAssignmentExpression:             return SyntaxKind.ModuloExpression;
                case SyntaxKind.AndAssignmentExpression:                return SyntaxKind.BitwiseAndExpression;
                case SyntaxKind.ExclusiveOrAssignmentExpression:        return SyntaxKind.BitwiseExclusiveOrExpression;
                case SyntaxKind.OrAssignmentExpression:                 return SyntaxKind.BitwiseOrExpression;
                case SyntaxKind.LeftShiftAssignmentExpression:          return SyntaxKind.LeftShiftExpression;
                case SyntaxKind.SignedRightShiftAssignmentExpression:   return SyntaxKind.SignedRightShiftExpression;
                case SyntaxKind.UnsignedRightShiftAssignmentExpression: return SyntaxKind.UnsignedRightShiftExpression;

                default:
                    throw new Error("getBinOpFromAssignment doesn't handle this case: " + aKind.toString());
            }
        }

        private tcOpWithAssignment(orig: AST, lhs_un: AST, trhs: SoundType, safe: (o: AST, f?: AST, tagRhs?: SoundType) => AST,
            rewrite?: (o: AST, f: AST) => AST): Pair<AST, boolean> {
            var unsafe = (lhs:AST, f?:AST) => MkAST.unsafe(safe(lhs, f));
            var tresult = TranslateTypes.translateTypeOrSig(orig.inferredType, this.tcenv);
            switch (lhs_un.kind()) {
                case SyntaxKind.IdentifierName: //local
                    var lhs = this.tc(lhs_un);
                    if (TypeRelations.subtypeZ(tresult, lhs.soundType)) {
                        return this.pkg(orig, safe(lhs), tresult);
                    } else if (TypeRelations.assignable(lhs.soundType, tresult)) {
                        TcUtil.Logger.warning(DiagnosticCode.SEC_Implicit_coercion, [tresult.toString(), lhs.soundType.toString()], orig);
                        return this.pkg(orig, safe(lhs, undefined, lhs.soundType), lhs.soundType);
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Variable_assignment_incompatible_type, [(<Identifier>lhs_un).text(), lhs.soundType.toString(), tresult.toString()]);
                        return this.pkg(orig, unsafe(lhs), tresult);
                    }

                case SyntaxKind.MemberAccessExpression:
                    var mae = <MemberAccessExpression>lhs_un;
                    var o = this.tc(mae.expression);
                    var f = mae.name.text();
                    var t_o = o.soundType.unfold();
                    switch (t_o.typeName) {
                        case TypeName.Any:
                            if (TypeRelations.isSubtype(trhs, TConstant.Any)) {
                                return this.pkg(orig, rewrite(o, MkAST.stringConst(mae.name.text())), tresult);
                            } else {
                                throw new Error("Got a term that should have been untypeable in TypeScript");
                            }

                        default:
                            if (t_o instanceof StructuredType) {
                                var tf = (<StructuredType>t_o).getField(f);
                                if (tf) {
                                    if (TypeRelations.subtypeZ(tresult, tf.type)) {
                                        return this.pkg(orig, safe(o, mae.name), tresult);
                                    } else if (TypeRelations.assignable(tf.type, tresult)) {
                                        TcUtil.Logger.warning(DiagnosticCode.SEC_Implicit_coercion, [tresult.toString(), tf.type.toString()], orig);
                                        return this.pkg(orig, safe(o, mae.name, tf.type), tf.type);
                                    } else {
                                        TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_incompatible_value_to_field, [f, tf.type.toString(), tresult.toString()]);
                                        return this.pkg(orig, unsafe(o, mae.name), tresult);
                                    }
                                }
                                else {
                                    TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_to_nonexistent_field, [f, o.soundType.toString()]);
                                    return this.pkg(orig, unsafe(o, mae.name), tresult);
                                }
                            }
                            else {
                                TcUtil.Logger.error(DiagnosticCode.SEC_Assigning_to_non_record, [f, o.soundType.toString()]);
                                return this.pkg(orig, unsafe(o, mae.name), tresult);
                            }
                    }

                case SyntaxKind.ElementAccessExpression:
                    var eae = <ElementAccessExpression>lhs_un;
                    var o = this.tc(eae.expression);
                    var index = this.tc(eae.argumentExpression);
                    var t_o = o.soundType.unfold();
                    if (t_o.isCheckedArray()) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Assignment_to_index_of_immutable_array_is_not_allowed, [o.soundType.toString()]);
                        return this.pkg(orig, unsafe(o, index), tresult);
                    }
                    if (t_o.isArray() && index.soundType === TConstant.Number && TypeRelations.subtypeZ(trhs, TcUtil.arrayElementType(t_o))) {
                        return this.pkg(orig, safe(o, index), TcUtil.arrayElementType(t_o));
                    }

                    if (TypeRelations.isSubtype(t_o, TConstant.Any)
                        && TypeRelations.isSubtype(trhs, TConstant.Any)) {
                        return this.pkg(orig, rewrite(o, index), tresult);
                    } else {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Assignment_with_op_expects_undotted_arguments, [o.soundType.toString(), trhs.toString()]);
                        return this.pkg(orig, unsafe(o, index), tresult);
                    }

                default:
                    throw new Error("Got an unexpected l-value in assignment with op at " + TcUtil.Logger.pos(orig) + "\n kind is " + (kind2string(lhs_un.kind())));
            }
        }
        private tcAssignmentExpression(ast: BinaryExpression) {
            var lhs = ast.left;
            var tresult = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv);
            var kind = ast.kind();
            var rhs_typed = this.tc(ast.right);
            var rewrite_with_op = (e1: AST, e2: AST) =>
                MkAST.callRT("assignmentWithOp",
                    [MkAST.stringConst(kind2string(ast.kind())),
                        e1, e1.soundType.toRTTI(),
                        e2,
                        rhs_typed]);
            switch (lhs.kind()) {
                case SyntaxKind.IdentifierName:
                    switch (kind) {
                        case SyntaxKind.AssignmentExpression:
                            var lhs_typed = this.tc(lhs);
                            return this.tcAssignIdentifier(ast, lhs_typed, rhs_typed, ast.right);
                        default:
                            var rebuild_safe = (o: AST, fn?: AST, tagRhs?: SoundType) => {
                                o = this.pkg(lhs, o, TConstant.Any).fst;
                                if (tagRhs) {
                                    rhs_typed = this.pkg(rhs_typed, TcUtil.checkAndTag(new BinaryExpression(this.getBinOpFromAssignment(ast.kind()), lhs, rhs_typed),
                                        tresult, tagRhs), tagRhs).fst;
                                    kind = SyntaxKind.AssignmentExpression;
                                }
                                return <AST>new BinaryExpression(kind, o, rhs_typed)
                            };
                            return this.tcOpWithAssignment(ast, lhs, rhs_typed.soundType, rebuild_safe);
                    }
                case SyntaxKind.MemberAccessExpression:
                    switch (kind) {
                        case SyntaxKind.AssignmentExpression:
                            var ma = <MemberAccessExpression>lhs;
                            var o = this.tc(ma.expression);
                            var fn = ma.name;
                            return this.tcAssignMember(ast, o, fn, rhs_typed, ast.right);
                        default:
                            var rebuild_safe = (o: AST, fn?: AST, tagRhs?: SoundType) => {
                                var mae = this.pkg(lhs, new MemberAccessExpression(o, <Identifier>fn), TConstant.Any).fst;
                                if (tagRhs) {
                                    rhs_typed = this.pkg(rhs_typed, TcUtil.checkAndTag(new BinaryExpression(this.getBinOpFromAssignment(ast.kind()), lhs, rhs_typed),
                                        tresult, tagRhs), tagRhs).fst;
                                    kind = SyntaxKind.AssignmentExpression;
                                }
                                return <AST>new BinaryExpression(kind, mae, rhs_typed);
                            };
                            return this.tcOpWithAssignment(ast, lhs, rhs_typed.soundType, rebuild_safe, rewrite_with_op);
                    }
                case SyntaxKind.ElementAccessExpression:
                    switch (kind) {
                        case SyntaxKind.AssignmentExpression:
                            var ea = <ElementAccessExpression>lhs;
                            var o1 = this.tc(ea.expression);
                            var o2 = this.tc(ea.argumentExpression);
                            return this.tcAssignElement(ast, o1, o2, rhs_typed);
                        default:
                            var rebuild_safe_eae = (o: AST, fn?: AST, tagRhs?: SoundType) => {
                                var eae = this.pkg(lhs, new ElementAccessExpression(o, fn), TConstant.Any).fst;
                                return new BinaryExpression(ast.kind(), eae, rhs_typed);
                            };
                            return this.tcOpWithAssignment(ast, lhs, rhs_typed.soundType, rebuild_safe_eae, rewrite_with_op);
                    }
                default:
                    throw new Error("Unexpected LHS of assignment: " + rhs_typed.kind());
            }
        }
        private rebuildUnary(operand: AST, e: AST, f?: AST) {
            var term: AST;
            switch (operand.kind()) {
                case SyntaxKind.IdentifierName:
                    term = e; break;
                case SyntaxKind.MemberAccessExpression:
                    term = new MemberAccessExpression(e, <Identifier>f); break;
                case SyntaxKind.ElementAccessExpression:
                    term = new ElementAccessExpression(e, f); break;
                default:
                    throw new Error("Impossible");
            }
            return this.pkg(operand, term, term.soundType).fst;
        }
        private tcPostfixUnaryOpWithAssignment(ast: PostfixUnaryExpression) {
            var rewrite = (e: AST, f: AST): AST => {
                return MkAST.callRT("assignmentWithUnaryOp", [MkAST.stringConst(kind2string(ast.kind())), e, e.soundType.toRTTI(), f]);
            };
            var safe = (e: AST, f?: AST, tagRhs?: SoundType): AST => {
                if (tagRhs) {
                    return rewrite(e, f);
                } else {
                    return new PostfixUnaryExpression(ast.kind(), this.rebuildUnary(ast.operand, e, f));
                }
            }        
            return this.tcOpWithAssignment(ast, ast.operand, TConstant.Number, safe, rewrite);
        }
        private tcPrefixUnaryOpWithAssignment(ast: PrefixUnaryExpression) {
            var rewrite = (e: AST, f: AST) => {
                return MkAST.callRT("assignmentWithUnaryOp", [MkAST.stringConst(kind2string(ast.kind())), e, e.soundType.toRTTI(), f]);
            };
            var safe = (e: AST, f?: AST, tagRhs?: SoundType): AST => {
                if (tagRhs) {
                    return rewrite(e, f);
                } else {
                    return new PrefixUnaryExpression(ast.kind(), this.rebuildUnary(ast.operand, e, f));
                }
            };
            return this.tcOpWithAssignment(ast, ast.operand, TConstant.Number, safe, rewrite);
        }
        private tcUnaryOperation(ast: PrefixUnaryExpression) {
            var e = this.tc(ast.operand);
            var res = new PrefixUnaryExpression(ast.kind(), e);
            if (this.compilationSettings.secure() && !TypeRelations.isSubtype(e.soundType, TConstant.Any)) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Unary_operator_expects_an_un_free_type, [e.soundType.toString()], ast);
                return this.pkg(ast, MkAST.unsafe(res), TConstant.Number);
            }
            var result_t = TranslateTypes.translateTypeOrSig(ast.inferredType, this.tcenv);
            return this.pkg(ast, res, result_t);
        }
        private tcElementAccessExpression(ast: ElementAccessExpression) {
            var o = this.tc(ast.expression);
            var key = this.tc(ast.argumentExpression);
            var t_o = o.soundType.unfold();
            switch (t_o.typeName) {
                case TypeName.Null:
                case TypeName.Un:
                case TypeName.Number:
                case TypeName.Bool:
                case TypeName.Arrow:
                    TcUtil.Logger.error(DiagnosticCode.SEC_Projection_from_non_records, [o.soundType.toString()], ast);
                default:
                    if (this.compilationSettings.secure()) {
                        if (o.soundType.unfold().typeName === TypeName.String) {
                            return this.pkg(ast, MkAST.callExpr(MkAST.fieldOfRT("charAt"), [o, key]), TConstant.String);
                        } else {
                            return this.pkg(ast, MkAST.callRT("readField", [o, o.soundType.toRTTI(), key]), TConstant.Any);
                        }
                    } else {
                        switch (t_o.typeName) {
                            case TypeName.String:
                                return this.pkg(ast,
                                    new ElementAccessExpression(o, TcUtil.force(TConstant.Number, key)),
                                    TConstant.String);
                            default:
                                var imap = t_o.indexSignature();
                                if (imap) {
                                    return this.pkg(ast,
                                        new ElementAccessExpression(o, TcUtil.force(imap.indexType, key)),
                                        imap.elt);
                                }
                                if (!TypeRelations.isSubtype(o.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(ast.expression))) {
                                    TcUtil.Logger.error(DiagnosticCode.SEC_ElementAccess_from_non_any, [o.soundType.toString(), key.soundType.toString()], ast);
                                }
                                return this.pkg(ast, MkAST.callRT("readField", [o, o.soundType.toRTTI(), key]), TConstant.Any);
                        }
                    }
            }
        }
        private tcBinOp(ast: BinaryExpression) {
            var e1 = this.tc(ast.left);
            var e2 = this.tc(ast.right);
            var res: AST = new BinaryExpression(ast.kind(), e1, e2);
            var expected_t = TranslateTypes.translate(ast.inferredType, this.tcenv);//let TS resolve + overloading
            return this.pkg(ast, res, expected_t);
        }
        private tcLogicalOrExpression(ast: BinaryExpression) {
            var e1 = this.tc(ast.left);
            var e2 = this.tc(ast.right);
            var expected_t = ast.inferredType ? TranslateTypes.translate(ast.inferredType, this.tcenv) : e1.soundType;
            var sc1 = TypeRelations.subtype(e1.soundType, expected_t, TcUtil.allowDeepSubtyping(ast.left));
            var sc2 = TypeRelations.subtype(e2.soundType, expected_t, TcUtil.allowDeepSubtyping(ast.right));
            if (!TypeRelations.isSubtype(e1.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(ast.left))
                || !TypeRelations.isSubtype(e2.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(ast.right))) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Binary_operator_expects_both_any, [e1.soundType.toString(), e2.soundType.toString()], ast);
                return this.pkg(ast, MkAST.unsafe(new BinaryExpression(ast.kind(), e1, e2)), TConstant.Bool);
            }
            if (sc1.fst && sc2.fst) {
                return this.pkg(ast, new BinaryExpression(ast.kind(), TcUtil.shallowTag(sc1, e1, TConstant.Any), TcUtil.shallowTag(sc2, e2, TConstant.Any)), expected_t);
            } else {
                return this.pkg(ast, TcUtil.force(TConstant.Bool, new BinaryExpression(ast.kind(), e1, e2)), TConstant.Bool);
            }
        }
      
        private tcTypeOfExpression(ast: TypeOfExpression) {
            var o = this.tc(ast.expression);
            if (o.soundType.unfold().typeName === TypeName.Un) {
                TcUtil.Logger.error(DiagnosticCode.SEC_TypeOf_un, [], ast);
            }
            return this.pkg(ast, new TypeOfExpression(o), TConstant.String);
        }
        private tcThrowStatement(ast: ThrowStatement) {
            var ts = <ThrowStatement>ast;
            var exn = this.tc(ts.expression);
            var sc = TypeRelations.subtype(exn.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(ts.expression));
            if (!sc.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Throw_not_any, [exn.soundType.toString()], ts.expression);
            } else {
                exn = TcUtil.shallowTag(sc, exn, TConstant.Any);
            }
            return this.pkg(ast, new ThrowStatement(exn), TConstant.Void, true); //exceptional return
        }
        private tcDeleteExpression(ast: DeleteExpression) {
            var expression = this.tc(ast.expression);
            switch (expression.kind()) {
                case SyntaxKind.ElementAccessExpression:
                    var eae = <ElementAccessExpression>expression;
                    var safeDelete = MkAST.callExpr(MkAST.fieldOfRT("deleteField"), [eae.expression, eae.argumentExpression]);
                    return this.pkg(ast, safeDelete);

                case SyntaxKind.MemberAccessExpression:
                    var mae = <MemberAccessExpression>expression;
                    if (mae.soundType.unfold() !== TConstant.Any) {
                        TcUtil.Logger.error(DiagnosticCode.SEC_Delete_operator_expects_any, [mae.soundType.toString()], ast);
                        return this.pkg(ast, MkAST.unsafe(new DeleteExpression(mae)));
                    } else {
                        return this.pkg(ast, MkAST.callExpr(MkAST.fieldOfRT("deleteField"), [mae.expression, MkAST.stringConst(mae.name.text())]));
                    }

                default:
                    TcUtil.Logger.error(DiagnosticCode.SEC_Delete_operator_expects_member_or_element_access, [], ast);
                    return this.pkg(ast, MkAST.unsafe(new DeleteExpression(expression)));
            }
        }
        private tcConditionalExpression(ast: ConditionalExpression) {
            var cond = this.tc(ast.condition);
            var thenBod = this.tc(ast.whenTrue);
            var elseBod = this.tc(ast.whenFalse);
            var expected_t = TranslateTypes.translate(ast.inferredType, this.tcenv);
            if (expected_t.equals(TConstant.Null)) {
                if (thenBod.soundType.equals(TConstant.Null)) {
                    expected_t = elseBod.soundType;
                } else {
                    expected_t = thenBod.soundType;
                }
            }
            var bthen = TypeRelations.subtype(thenBod.soundType, expected_t, TcUtil.allowDeepSubtyping(ast.whenTrue));
            var belse = TypeRelations.subtype(elseBod.soundType, expected_t, TcUtil.allowDeepSubtyping(ast.whenFalse));
            var res: AST = new ConditionalExpression(cond, TcUtil.shallowTag(bthen, thenBod, expected_t), TcUtil.shallowTag(belse, elseBod, expected_t));
            if (bthen.fst && belse.fst) {
                return this.pkg(ast, res, expected_t);
            }
            if (!bthen.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Conditional_branch, [expected_t.toString(), thenBod.soundType.toString()], ast.whenTrue);
            }
            if (!belse.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Conditional_branch, [expected_t.toString(), elseBod.soundType.toString()], ast.whenFalse);
            }
            return this.pkg(ast, MkAST.unsafe(res), expected_t);
        }
        private tcRegularExpressionLiteral(ast: RegularExpressionLiteral) {
            var t = this.tcenv.lookupType({ dottedName: "RegExp" });
            if (t) {
                return this.pkg(ast, ast, t);
            }
            TcUtil.Logger.error(DiagnosticCode.SEC_Variable_not_found, ["RegExp"], ast);
            return this.pkg(ast, ast, TConstant.Any);
        }
        private tcParenthesizedExpression(ast: ParenthesizedExpression) {
            var expr = this.tc(ast.expression);
            return this.pkg(ast,
                new ParenthesizedExpression(ast.openParenTrailingComments, expr),
                expr.soundType);
        }
        private tcExpressionStatement(ast: ExpressionStatement) {
            var expr = this.tc(ast.expression);
            return this.pkg(ast, new ExpressionStatement(expr), TConstant.Void);
        }
        private tcCommaExpression(ast: BinaryExpression) {
            var e1 = this.tc(ast.left);
            var e2 = this.tc(ast.right);
            return this.pkg(ast, new BinaryExpression(SyntaxKind.CommaExpression, e1, e2), e2.soundType);
        }
        private auxTcInInstanceOf(ast: BinaryExpression) {
            var x = this.tc(ast.left);
            var o = this.tc(ast.right);
            var res: AST = new BinaryExpression(ast.kind(), x, o);
            return this.pkg(ast, res, TConstant.Bool);
        }
        private tcInstanceOfExpression(ast: BinaryExpression) {
            return this.auxTcInInstanceOf(ast);
        }
        private tcInExpression(ast: BinaryExpression) {
            return this.auxTcInInstanceOf(ast);
        }
        private tcForStatement(ast: ForStatement) {
            var fs = <ForStatement>ast;
            //this.tcenv.newScope(() => { //NS: new scope would be nice, but too many programs use the loop variable after the loop...safely
            var vd = fs.variableDeclaration ? <VariableDeclaration>this.tc(fs.variableDeclaration) : null;
            var init = fs.initializer ? this.tc(fs.initializer) : null;
            var cond = fs.condition ? this.tc(fs.condition) : null;
            var incr = fs.incrementor ? this.tc(fs.incrementor) : null;
            var bodyR = fs.statement ? this.tcaux(fs.statement) : { fst: <AST>null, snd: false };
            var res: AST = new ForStatement(vd, init, cond, incr, bodyR.fst);
            return this.pkg(ast, res, TConstant.Void, bodyR.snd);
        }
        private tcForInStatement(ast: ForInStatement) {
            var fis = <ForInStatement>ast;
            var rval = this.tc(fis.expression);
            var rvalAny = TypeRelations.subtype(rval.soundType, TConstant.Any, TcUtil.allowDeepSubtyping(fis.expression));
            if (!rvalAny.fst) {
                TcUtil.Logger.error(DiagnosticCode.SEC_Property_iteration_on_non_any, [rval.soundType.toString()], fis.expression);
            }
            var unsafe = (msg: string) => {
                TcUtil.Logger.error(DiagnosticCode.SEC_Invalid_lval_iteration, [msg], ast);
                var bodyR = this.tcenv.newScope(() => this.tcaux(fis.statement));
                var res = new ForInStatement(fis.variableDeclaration, fis.left, rval, bodyR.fst);
                return this.pkg(ast, res, TConstant.Void, bodyR.snd);
            };
            var guardBlock = (id: Identifier, stmt:AST) => {
                switch (stmt.kind()) {
                    case SyntaxKind.Block:
                        var b = <Block>stmt;
                        var body = TcUtil.syntaxListMembers(b.statements);
                        var rttiCheck = new IfStatement(new BinaryExpression(SyntaxKind.EqualsExpression, id, MkAST.stringConst("__rtti__")),
                            new ContinueStatement(null), null);
                        body.unshift(rttiCheck);
                        var bodyL = new ISyntaxList2(TcUtil.currentFile(), body);
                        var block = new Block(bodyL, b.closeBraceLeadingComments, b.closeBraceToken);
                        return this.pkg(fis.statement, block).fst;
                    default:
                        throw new Error("For/in loop without a block body ... it's a " + kind2string(stmt.kind()));
                }
            };
            if (fis.variableDeclaration && !fis.left) {
                var vd = fis.variableDeclaration;
                var decls = vd.declarators;
                if (decls.nonSeparatorCount() != 1) {
                    return unsafe(decls.nonSeparatorCount() + " variable declarators");
                }
                if ((<VariableDeclarator>decls.nonSeparatorAt(0)).equalsValueClause) {
                    return unsafe("unexpected initializer in 'for-in' loop");
                }
                var decl = <VariableDeclarator>decls.nonSeparatorAt(0);
                var iterVar = decl.propertyName;
                var bodyR = this.tcenv.newScope(() =>
                    this.tcenv.withVariable<Pair<AST, boolean>>(decls, iterVar.text(), TConstant.String)(() =>
                        this.tcaux(fis.statement)));
                var res = new ForInStatement(vd, fis.left, rval, guardBlock(MkAST.id(iterVar.text()), bodyR.fst));
                return this.pkg(ast, res, TConstant.Void, bodyR.snd);
            } else if (!fis.variableDeclaration && fis.left && fis.left.kind() === SyntaxKind.IdentifierName) {
                var id = <Identifier>fis.left;
                var xt = this.tcenv.lookup(id.text());
                if (!xt || (xt.typeName !== TypeName.String &&  xt.typeName !== TypeName.Any)) {
                    TcUtil.Logger.error(
                        DiagnosticCode.SEC_Invalid_lval_iteration,
                        ["Expected a string- or any-typed variable; got " + xt ? xt.toString() : "unknown"],
                        fis.left);
                }
                var bodyR = this.tcenv.newScope(() => this.tcaux(fis.statement));
                var res = new ForInStatement(fis.variableDeclaration, id, rval, guardBlock(id, bodyR.fst));
                return this.pkg(ast, res, TConstant.Void, bodyR.snd);

            } else {
                return unsafe("unexpected LHS");
            }                
        }
        private tcWhileStatement(ast: WhileStatement) {
            var ws = <WhileStatement>ast;
            var cond = this.tc(ws.condition);
            var bodyR = this.tcaux(ws.statement);
            return this.pkg(ast, new WhileStatement(cond, bodyR.fst), TConstant.Void, bodyR.snd);
        }
        private tcDoStatement(ast: DoStatement) {
            var dos = <DoStatement>ast;
            var bodyR = this.tcaux(dos.statement);
            var cond = this.tc(dos.condition);
            return this.pkg(ast, new DoStatement(bodyR.fst, dos.whileKeyword, cond), TConstant.Void, bodyR.snd);
        }
        private tcIfStatement(ast: IfStatement) {
            var cond = this.tc(ast.condition);
            var thenBodR = this.tcaux(ast.statement);
            var elseBodR = ast.elseClause ? this.tcaux(ast.elseClause) : null;
            return this.pkg(ast, new IfStatement(cond, thenBodR.fst, elseBodR ? <ElseClause>elseBodR.fst : null), TConstant.Void, thenBodR.snd && elseBodR ? elseBodR.snd : true);
        }
        private tcElseClause(ast: ElseClause) {
            var eR = this.tcaux(ast.statement);
            return this.pkg(ast, new ElseClause(eR.fst), TConstant.Void, eR.snd);
        }
        private tcBlock(ast: Block) {
            var out: AST[] = [];
            var rr = this.tcenv.newScope(() => this.tcaux(ast.statements));
            var b = new Block(<ISyntaxList2>rr.fst, ast.closeBraceLeadingComments, ast.closeBraceToken);
            return this.pkg(ast, b, TConstant.Void, rr.snd);
        }
        private tcVariableStatement(ast: VariableStatement) {
            var vd = <VariableDeclaration>this.tc(ast.declaration);
            return this.pkg(ast, new VariableStatement(ast.modifiers, vd), vd.soundType);
        }
        private tcWithStatement(ast: WithStatement) {
            return TcUtil.NYI("WithStatement");
        }
        private tcTryStatement(ast: TryStatement) {
            var tryBodyR = this.tcaux(ast.block);
            var catch_clauseR = (ast.catchClause ? this.tcaux(ast.catchClause) : null);
            var finally_clauseR = (ast.finallyClause ? this.tcaux(ast.finallyClause) : null);
            return this.pkg(ast, new TryStatement(<Block>tryBodyR.fst, ast.catchClause ? <CatchClause>catch_clauseR.fst : null, ast.finallyClause ? <FinallyClause>finally_clauseR.fst : null),
                TConstant.Void,
                tryBodyR.snd && (!catch_clauseR || catch_clauseR.snd) && (!finally_clauseR || finally_clauseR.snd));
        }
        private tcCatchClause(ast: CatchClause) {
            var vd = ast.identifier; 
            var err_t = TConstant.Any;
            var catch_bodyR = this.tcenv.withVariable<Pair<AST, boolean>>(ast, vd.text(), err_t)(() =>
                this.tcaux(ast.block));
            return this.pkg(ast, new CatchClause(vd, ast.typeAnnotation, <Block>catch_bodyR.fst), TConstant.Void, catch_bodyR.snd);
        }
        private tcFinallyClause(ast: FinallyClause) {
            var block = this.tcaux(ast.block);
            return this.pkg(ast, new FinallyClause(<Block>block.fst), TConstant.Void, block.snd);
        }
        private tcReturnStatement(ast: ReturnStatement) {
            var result = ast.expression ? this.tc(ast.expression) : null;
            var result_t = result ? result.soundType : TConstant.Void;
            var sc = TypeRelations.subtype(result_t, this.result_t, TcUtil.allowDeepSubtyping(ast.expression));
            if (result && this.result_t && !sc.fst) {
                if (TypeRelations.assignable(this.result_t, result_t)) {
                    TcUtil.Logger.warning(
                        DiagnosticCode.SEC_Implicit_coercion,
                        [result_t.toString(), this.result_t.toString()], ast);
                    result = TcUtil.checkAndTag(result, result_t, this.result_t);
                }
                else {
                    TcUtil.Logger.error(DiagnosticCode.SEC_Function_return_type, [this.result_t.toString(), result_t.toString()], ast);
                    result = MkAST.unsafe(result);
                }
            }
            else if (result && sc.fst) {
                result = TcUtil.shallowTag(sc, result, this.result_t);
            }
            return this.pkg(ast, new ReturnStatement(result), result_t, true);
        }
        private tcSwitchStatement(ast: SwitchStatement) {
            var guard = this.tc(ast.expression);
            switch (guard.soundType.unfold().typeName) {
                case TypeName.Enum:
                case TypeName.Number:
                case TypeName.String:
                case TypeName.Bool: break;
                default:
                    TcUtil.Logger.error(DiagnosticCode.SEC_Switch_guard_not_primitive, [guard.soundType.toString()], ast.expression);
            }
            var clauses: AST[] = [];
            var returns = false;
            return this.tcenv.newScope(() => {
                for (var i = 0; i < ast.switchClauses.childCount(); i++) {
                    var caseClauseR = this.tcenv.newScope(() => this.tcaux(ast.switchClauses.childAt(i)));
                    if (caseClauseR.fst.kind() === SyntaxKind.CaseSwitchClause) {
                        var csc = <CaseSwitchClause>caseClauseR.fst;
                        if (!TypeRelations.subtype(csc.expression.soundType, guard.soundType, TcUtil.allowDeepSubtyping(ast.switchClauses.childAt(i))).fst) {
                            TcUtil.Logger.error(DiagnosticCode.SEC_Switch_case_incompatible,
                                [guard.soundType.toString(),
                                    csc.expression.soundType.toString()], ast.switchClauses.childAt(i));
                        }
                    }
                    clauses.push(caseClauseR.fst);
                    if (i === ast.switchClauses.childCount() - 1) {
                        returns = (caseClauseR.fst.kind() === SyntaxKind.DefaultSwitchClause && caseClauseR.snd);
                    }
                }
                var switchClauses = new ISyntaxList2(this.doc.fileName, clauses);
                return this.pkg(ast, new SwitchStatement(guard, ast.closeParenToken, switchClauses), TConstant.Void, returns);
            });
        }
        private tcCaseSwitchClause(ast: CaseSwitchClause) {
            var expr = this.tc(ast.expression);
            var st = this.tcaux(ast.statements);
            return this.pkg(ast, new CaseSwitchClause(expr, <ISyntaxList2>st.fst), TConstant.Void, st.snd);
        }
        private tcDefaultSwitchClause(ast: DefaultSwitchClause) {
            var st = this.tcaux(ast.statements);
            return this.pkg(ast, new DefaultSwitchClause(<ISyntaxList2>st.fst), TConstant.Void, st.snd);
        }
        private tcContinueStatement(ast: ContinueStatement) {
            ast.soundType = TConstant.Void;
            return { fst: <AST>ast, snd: false };
        }
        private tcBreakStatement(ast: BreakStatement) {
            if (ast.identifier) {
                return TcUtil.NYI("'labeled statements'");
            }
            ast.soundType = TConstant.Void;
            return { fst: <AST> ast, snd: false };
        }
        private tcLabeledStatement(ast: LabeledStatement) {
            var st = this.tc(ast.statement);
            return this.pkg(ast, new LabeledStatement(ast.identifier, st), TConstant.Void);
        }
        private tcHeritageClause(ast: HeritageClause) {
            var typeNames = <ISeparatedSyntaxList2>this.tc(ast.typeNames);
            return this.pkg(ast, new HeritageClause(ast.kind(), typeNames));
        }
    }
}
