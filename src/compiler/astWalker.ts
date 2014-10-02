// Modified by N.Swamy (2014)
//
// Copyright (c) Microsoft Corporation.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

///<reference path='references.ts' />

module TypeScript {
    function walkListChildren(ast: AST, walker: AstWalker): void { var preAst = <ISyntaxList2>ast;
        for (var i = 0, n = preAst.childCount(); i < n; i++) {
            walker.walk(preAst.childAt(i));
        }
    }

    function walkThrowStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <ThrowStatement>ast;
        walker.walk(preAst.expression);
    }

    function walkPrefixUnaryExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <PrefixUnaryExpression>ast;
        walker.walk(preAst.operand);
    }

    function walkPostfixUnaryExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <PostfixUnaryExpression>ast;
        walker.walk(preAst.operand);
    }

    function walkDeleteExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <DeleteExpression>ast;
        walker.walk(preAst.expression);
    }

    function walkTypeArgumentListChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeArgumentList>ast;
        walker.walk(preAst.typeArguments);
    }

    function walkTypeOfExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeOfExpression>ast;
        walker.walk(preAst.expression);
    }

    function walkVoidExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <VoidExpression>ast;
        walker.walk(preAst.expression);
    }

    function walkArgumentListChildren(ast: AST, walker: AstWalker): void { var preAst = <ArgumentList>ast;
        walker.walk(preAst.typeArgumentList);
        walker.walk(preAst.args);
    }

    function walkArrayLiteralExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ArrayLiteralExpression>ast;
        walker.walk(preAst.expressions);
    }

    function walkSimplePropertyAssignmentChildren(ast: AST, walker: AstWalker): void { var preAst = <SimplePropertyAssignment>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.expression);
    }

    function walkFunctionPropertyAssignmentChildren(ast: AST, walker: AstWalker): void { var preAst = <FunctionPropertyAssignment>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.callSignature);
        walker.walk(preAst.block);
    }

    function walkGetAccessorChildren(ast: AST, walker: AstWalker): void { var preAst = <GetAccessor>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.typeAnnotation);
        walker.walk(preAst.block);
    }

    function walkSeparatedListChildren(ast: AST, walker: AstWalker): void { var preAst = <ISeparatedSyntaxList2>ast;
        for (var i = 0, n = preAst.nonSeparatorCount(); i < n; i++) {
            walker.walk(preAst.nonSeparatorAt(i));
        }
    }

    function walkSetAccessorChildren(ast: AST, walker: AstWalker): void { var preAst = <SetAccessor>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.block);
    }

    function walkObjectLiteralExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ObjectLiteralExpression>ast;
        walker.walk(preAst.propertyAssignments);
    }

    function walkCastExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <CastExpression>ast;
        walker.walk(preAst.type);
        walker.walk(preAst.expression);
    }

    function walkParenthesizedExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ParenthesizedExpression>ast;
        walker.walk(preAst.expression);
    }

    function walkElementAccessExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ElementAccessExpression>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.argumentExpression);
    }

    function walkMemberAccessExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <MemberAccessExpression>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.name);
    }

    function walkQualifiedNameChildren(ast: AST, walker: AstWalker): void { var preAst = <QualifiedName>ast;
        walker.walk(preAst.left);
        walker.walk(preAst.right);
    }

    function walkBinaryExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <BinaryExpression>ast;
        walker.walk(preAst.left);
        walker.walk(preAst.right);
    }

    function walkEqualsValueClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <EqualsValueClause>ast;
        walker.walk(preAst.value);
    }

    function walkTypeParameterChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeParameter>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.constraint);
    }

    function walkTypeParameterListChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeParameterList>ast;
        walker.walk(preAst.typeParameters);
    }

    function walkGenericTypeChildren(ast: AST, walker: AstWalker): void { var preAst = <GenericType>ast;
        walker.walk(preAst.name);
        walker.walk(preAst.typeArgumentList);
    }

    function walkTypeAnnotationChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeAnnotation>ast;
        walker.walk(preAst.type);
    }

    function walkTypeQueryChildren(ast: AST, walker: AstWalker): void { var preAst = <TypeQuery>ast;
        walker.walk(preAst.name);
    }

    function walkInvocationExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <InvocationExpression>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.argumentList);
    }

    function walkObjectCreationExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ObjectCreationExpression>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.argumentList);
    }

    function walkTrinaryExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ConditionalExpression>ast;
        walker.walk(preAst.condition);
        walker.walk(preAst.whenTrue);
        walker.walk(preAst.whenFalse);
    }

    function walkFunctionExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <FunctionExpression>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.callSignature);
        walker.walk(preAst.block);
    }

    function walkFunctionTypeChildren(ast: AST, walker: AstWalker): void { var preAst = <FunctionType>ast;
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.type);
    }

    function walkParenthesizedArrowFunctionExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <ParenthesizedArrowFunctionExpression>ast;
        walker.walk(preAst.callSignature);
        walker.walk(preAst.block);
        walker.walk(preAst.expression);
    }

    function walkSimpleArrowFunctionExpressionChildren(ast: AST, walker: AstWalker): void { var preAst = <SimpleArrowFunctionExpression>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.block);
        walker.walk(preAst.expression);
    }

    function walkMemberFunctionDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <MemberFunctionDeclaration>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.callSignature);
        walker.walk(preAst.block);
    }

    function walkFuncDeclChildren(ast: AST, walker: AstWalker): void { var preAst = <FunctionDeclaration>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.callSignature);
        walker.walk(preAst.block);
    }

    function walkIndexMemberDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <IndexMemberDeclaration>ast;
        walker.walk(preAst.indexSignature);
    }

    function walkIndexSignatureChildren(ast: AST, walker: AstWalker): void { var preAst = <IndexSignature>ast;
        walker.walk(preAst.parameter);
        walker.walk(preAst.typeAnnotation);
    }

    function walkCallSignatureChildren(ast: AST, walker: AstWalker): void { var preAst = <CallSignature>ast;
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.typeAnnotation);
    }

    function walkConstraintChildren(ast: AST, walker: AstWalker): void { var preAst = <Constraint>ast;
        walker.walk(preAst.type);
    }

    function walkConstructorDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <ConstructorDeclaration>ast;
        walker.walk(preAst.parameterList);
        walker.walk(preAst.block);
    }

    function walkConstructorTypeChildren(ast: AST, walker: AstWalker): void { var preAst = <FunctionType>ast;
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.type);
    }

    function walkConstructSignatureChildren(ast: AST, walker: AstWalker): void { var preAst = <ConstructSignature>ast;
        walker.walk(preAst.callSignature);
    }

    function walkParameterChildren(ast: AST, walker: AstWalker): void { var preAst = <Parameter>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeAnnotation);
        walker.walk(preAst.equalsValueClause);
    }

    function walkParameterListChildren(ast: AST, walker: AstWalker): void { var preAst = <ParameterList>ast;
        walker.walk(preAst.parameters);
    }

    function walkPropertySignatureChildren(ast: AST, walker: AstWalker): void { var preAst = <PropertySignature>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.typeAnnotation);
    }

    function walkVariableDeclaratorChildren(ast: AST, walker: AstWalker): void { var preAst = <VariableDeclarator>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.typeAnnotation);
        walker.walk(preAst.equalsValueClause);
    }

    function walkMemberVariableDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <MemberVariableDeclaration>ast;
        walker.walk(preAst.variableDeclarator);
    }

    function walkMethodSignatureChildren(ast: AST, walker: AstWalker): void { var preAst = <MethodSignature>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.callSignature);
    }

    function walkReturnStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <ReturnStatement>ast;
        walker.walk(preAst.expression);
    }

    function walkForStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <ForStatement>ast;
        walker.walk(preAst.variableDeclaration);
        walker.walk(preAst.initializer);
        walker.walk(preAst.condition);
        walker.walk(preAst.incrementor);
        walker.walk(preAst.statement);
    }

    function walkForInStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <ForInStatement>ast;
        walker.walk(preAst.variableDeclaration);
        walker.walk(preAst.left);
        walker.walk(preAst.expression);
        walker.walk(preAst.statement);
    }

    function walkIfStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <IfStatement>ast;
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
        walker.walk(preAst.elseClause);
    }

    function walkElseClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <ElseClause>ast;
        walker.walk(preAst.statement);
    }

    function walkWhileStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <WhileStatement>ast;
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkDoStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <DoStatement>ast;
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkBlockChildren(ast: AST, walker: AstWalker): void { var preAst = <Block>ast;
        walker.walk(preAst.statements);
    }

    function walkVariableDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <VariableDeclaration>ast;
        walker.walk(preAst.declarators);
    }

    function walkCaseSwitchClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <CaseSwitchClause>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.statements);
    }

    function walkDefaultSwitchClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <DefaultSwitchClause>ast;
        walker.walk(preAst.statements);
    }

    function walkSwitchStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <SwitchStatement>ast;
        walker.walk(preAst.expression);
        walker.walk(preAst.switchClauses);
    }

    function walkTryStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <TryStatement>ast;
        walker.walk(preAst.block);
        walker.walk(preAst.catchClause);
        walker.walk(preAst.finallyClause);
    }

    function walkCatchClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <CatchClause>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeAnnotation);
        walker.walk(preAst.block);
    }

    function walkExternalModuleReferenceChildren(ast: AST, walker: AstWalker): void { var preAst = <ExternalModuleReference>ast;
        walker.walk(preAst.stringLiteral);
    }

    function walkFinallyClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <FinallyClause>ast;
        walker.walk(preAst.block);
    }

    function walkClassDeclChildren(ast: AST, walker: AstWalker): void { var preAst = <ClassDeclaration>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.heritageClauses);
        walker.walk(preAst.classElements);
    }

    function walkScriptChildren(ast: AST, walker: AstWalker): void { var preAst = <SourceUnit>ast;
        walker.walk(preAst.moduleElements);
    }

    function walkHeritageClauseChildren(ast: AST, walker: AstWalker): void { var preAst = <HeritageClause>ast;
        walker.walk(preAst.typeNames);
    }

    function walkInterfaceDeclerationChildren(ast: AST, walker: AstWalker): void { var preAst = <InterfaceDeclaration>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.heritageClauses);
        walker.walk(preAst.body);
    }

    function walkObjectTypeChildren(ast: AST, walker: AstWalker): void { var preAst = <ObjectType>ast;
        walker.walk(preAst.typeMembers);
    }

    function walkArrayTypeChildren(ast: AST, walker: AstWalker): void { var preAst = <ArrayType>ast;
        walker.walk(preAst.type);
    }

    function walkModuleDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <ModuleDeclaration>ast;
        walker.walk(preAst.name);
        walker.walk(preAst.stringLiteral);
        walker.walk(preAst.moduleElements);
    }

    function walkModuleNameModuleReferenceChildren(ast: AST, walker: AstWalker): void { var preAst = <ModuleNameModuleReference>ast;
        walker.walk(preAst.moduleName);
    }

    function walkEnumDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <EnumDeclaration>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.enumElements);
    }

    function walkEnumElementChildren(ast: AST, walker: AstWalker): void { var preAst = <EnumElement>ast;
        walker.walk(preAst.propertyName);
        walker.walk(preAst.equalsValueClause);
    }

    function walkImportDeclarationChildren(ast: AST, walker: AstWalker): void { var preAst = <ImportDeclaration>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.moduleReference);
    }

    function walkExportAssignmentChildren(ast: AST, walker: AstWalker): void { var preAst = <ExportAssignment>ast;
        walker.walk(preAst.identifier);
    }

    function walkWithStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <WithStatement>ast;
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkExpressionStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <ExpressionStatement>ast;
        walker.walk(preAst.expression);
    }

    function walkLabeledStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <LabeledStatement>ast;
        walker.walk(preAst.identifier);
        walker.walk(preAst.statement);
    }

    function walkVariableStatementChildren(ast: AST, walker: AstWalker): void { var preAst = <VariableStatement>ast;
        walker.walk(preAst.declaration);
    }

    var childrenWalkers: IAstWalkChildren[] = new Array<IAstWalkChildren>(SyntaxKind.Last + 1);

    // Tokens/trivia can't ever be walked into. 
    for (var i = SyntaxKind.FirstToken, n = SyntaxKind.LastToken; i <= n; i++) {
        childrenWalkers[i] = null;
    }
    for (var i = SyntaxKind.FirstTrivia, n = SyntaxKind.LastTrivia; i <= n; i++) {
        childrenWalkers[i] = null;
    }

    childrenWalkers[SyntaxKind.AddAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.AddExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.AndAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.AnyKeyword] = null;
    childrenWalkers[SyntaxKind.ArgumentList] = walkArgumentListChildren;
    childrenWalkers[SyntaxKind.ArrayLiteralExpression] = walkArrayLiteralExpressionChildren;
    childrenWalkers[SyntaxKind.ArrayType] = walkArrayTypeChildren;
    childrenWalkers[SyntaxKind.SimpleArrowFunctionExpression] = walkSimpleArrowFunctionExpressionChildren;
    childrenWalkers[SyntaxKind.ParenthesizedArrowFunctionExpression] = walkParenthesizedArrowFunctionExpressionChildren;
    childrenWalkers[SyntaxKind.AssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.BitwiseAndExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.BitwiseExclusiveOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.BitwiseNotExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.BitwiseOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.Block] = walkBlockChildren;
    childrenWalkers[SyntaxKind.BooleanKeyword] = null;
    childrenWalkers[SyntaxKind.BreakStatement] = null;
    childrenWalkers[SyntaxKind.CallSignature] = walkCallSignatureChildren;
    childrenWalkers[SyntaxKind.CaseSwitchClause] = walkCaseSwitchClauseChildren;
    childrenWalkers[SyntaxKind.CastExpression] = walkCastExpressionChildren;
    childrenWalkers[SyntaxKind.CatchClause] = walkCatchClauseChildren;
    childrenWalkers[SyntaxKind.ClassDeclaration] = walkClassDeclChildren;
    childrenWalkers[SyntaxKind.CommaExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.ConditionalExpression] = walkTrinaryExpressionChildren;
    childrenWalkers[SyntaxKind.Constraint] = walkConstraintChildren;
    childrenWalkers[SyntaxKind.ConstructorDeclaration] = walkConstructorDeclarationChildren;
    childrenWalkers[SyntaxKind.ConstructSignature] = walkConstructSignatureChildren;
    childrenWalkers[SyntaxKind.ContinueStatement] = null;
    childrenWalkers[SyntaxKind.ConstructorType] = walkConstructorTypeChildren;
    childrenWalkers[SyntaxKind.DebuggerStatement] = null;
    childrenWalkers[SyntaxKind.DefaultSwitchClause] = walkDefaultSwitchClauseChildren;
    childrenWalkers[SyntaxKind.DeleteExpression] = walkDeleteExpressionChildren;
    childrenWalkers[SyntaxKind.DivideAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.DivideExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.DoStatement] = walkDoStatementChildren;
    childrenWalkers[SyntaxKind.ElementAccessExpression] = walkElementAccessExpressionChildren;
    childrenWalkers[SyntaxKind.ElseClause] = walkElseClauseChildren;
    childrenWalkers[SyntaxKind.EmptyStatement] = null;
    childrenWalkers[SyntaxKind.EnumDeclaration] = walkEnumDeclarationChildren;
    childrenWalkers[SyntaxKind.EnumElement] = walkEnumElementChildren;
    childrenWalkers[SyntaxKind.EqualsExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.EqualsValueClause] = walkEqualsValueClauseChildren;
    childrenWalkers[SyntaxKind.EqualsWithTypeConversionExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.ExclusiveOrAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.ExportAssignment] = walkExportAssignmentChildren;
    childrenWalkers[SyntaxKind.ExpressionStatement] = walkExpressionStatementChildren;
    childrenWalkers[SyntaxKind.ExtendsHeritageClause] = walkHeritageClauseChildren;
    childrenWalkers[SyntaxKind.ExternalModuleReference] = walkExternalModuleReferenceChildren;
    childrenWalkers[SyntaxKind.FalseKeyword] = null;
    childrenWalkers[SyntaxKind.FinallyClause] = walkFinallyClauseChildren;
    childrenWalkers[SyntaxKind.ForInStatement] = walkForInStatementChildren;
    childrenWalkers[SyntaxKind.ForStatement] = walkForStatementChildren;
    childrenWalkers[SyntaxKind.FunctionDeclaration] = walkFuncDeclChildren;
    childrenWalkers[SyntaxKind.FunctionExpression] = walkFunctionExpressionChildren;
    childrenWalkers[SyntaxKind.FunctionPropertyAssignment] = walkFunctionPropertyAssignmentChildren;
    childrenWalkers[SyntaxKind.FunctionType] = walkFunctionTypeChildren;
    childrenWalkers[SyntaxKind.GenericType] = walkGenericTypeChildren;
    childrenWalkers[SyntaxKind.GetAccessor] = walkGetAccessorChildren;
    childrenWalkers[SyntaxKind.GreaterThanExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.GreaterThanOrEqualExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.IfStatement] = walkIfStatementChildren;
    childrenWalkers[SyntaxKind.ImplementsHeritageClause] = walkHeritageClauseChildren;
    childrenWalkers[SyntaxKind.ImportDeclaration] = walkImportDeclarationChildren;
    childrenWalkers[SyntaxKind.IndexMemberDeclaration] = walkIndexMemberDeclarationChildren;
    childrenWalkers[SyntaxKind.IndexSignature] = walkIndexSignatureChildren;
    childrenWalkers[SyntaxKind.InExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.InstanceOfExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.InterfaceDeclaration] = walkInterfaceDeclerationChildren;
    childrenWalkers[SyntaxKind.InvocationExpression] = walkInvocationExpressionChildren;
    childrenWalkers[SyntaxKind.LabeledStatement] = walkLabeledStatementChildren;
    childrenWalkers[SyntaxKind.LeftShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.LeftShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.LessThanExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.LessThanOrEqualExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.List] = walkListChildren;
    childrenWalkers[SyntaxKind.LogicalAndExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.LogicalNotExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.LogicalOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.MemberAccessExpression] = walkMemberAccessExpressionChildren;
    childrenWalkers[SyntaxKind.MemberFunctionDeclaration] = walkMemberFunctionDeclarationChildren;
    childrenWalkers[SyntaxKind.MemberVariableDeclaration] = walkMemberVariableDeclarationChildren;
    childrenWalkers[SyntaxKind.MethodSignature] = walkMethodSignatureChildren;
    childrenWalkers[SyntaxKind.ModuleDeclaration] = walkModuleDeclarationChildren;
    childrenWalkers[SyntaxKind.ModuleNameModuleReference] = walkModuleNameModuleReferenceChildren;
    childrenWalkers[SyntaxKind.ModuloAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.ModuloExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.MultiplyAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.MultiplyExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.IdentifierName] = null;
    childrenWalkers[SyntaxKind.NegateExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.None] = null;
    childrenWalkers[SyntaxKind.NotEqualsExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.NotEqualsWithTypeConversionExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.NullKeyword] = null;
    childrenWalkers[SyntaxKind.NumberKeyword] = null;
    childrenWalkers[SyntaxKind.NumericLiteral] = null;
    childrenWalkers[SyntaxKind.ObjectCreationExpression] = walkObjectCreationExpressionChildren;
    childrenWalkers[SyntaxKind.ObjectLiteralExpression] = walkObjectLiteralExpressionChildren;
    childrenWalkers[SyntaxKind.ObjectType] = walkObjectTypeChildren;
    childrenWalkers[SyntaxKind.OmittedExpression] = null;
    childrenWalkers[SyntaxKind.OrAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.Parameter] = walkParameterChildren;
    childrenWalkers[SyntaxKind.ParameterList] = walkParameterListChildren;
    childrenWalkers[SyntaxKind.ParenthesizedExpression] = walkParenthesizedExpressionChildren;
    childrenWalkers[SyntaxKind.PlusExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.PostDecrementExpression] = walkPostfixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.PostIncrementExpression] = walkPostfixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.PreDecrementExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.PreIncrementExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[SyntaxKind.PropertySignature] = walkPropertySignatureChildren;
    childrenWalkers[SyntaxKind.QualifiedName] = walkQualifiedNameChildren;
    childrenWalkers[SyntaxKind.RegularExpressionLiteral] = null;
    childrenWalkers[SyntaxKind.ReturnStatement] = walkReturnStatementChildren;
    childrenWalkers[SyntaxKind.SourceUnit] = walkScriptChildren;
    childrenWalkers[SyntaxKind.SeparatedList] = walkSeparatedListChildren;
    childrenWalkers[SyntaxKind.SetAccessor] = walkSetAccessorChildren;
    childrenWalkers[SyntaxKind.SignedRightShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.SignedRightShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.SimplePropertyAssignment] = walkSimplePropertyAssignmentChildren;
    childrenWalkers[SyntaxKind.StringLiteral] = null;
    childrenWalkers[SyntaxKind.StringKeyword] = null;
    childrenWalkers[SyntaxKind.SubtractAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.SubtractExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.SuperKeyword] = null;
    childrenWalkers[SyntaxKind.SwitchStatement] = walkSwitchStatementChildren;
    childrenWalkers[SyntaxKind.ThisKeyword] = null;
    childrenWalkers[SyntaxKind.ThrowStatement] = walkThrowStatementChildren;
    childrenWalkers[SyntaxKind.TriviaList] = null;
    childrenWalkers[SyntaxKind.TrueKeyword] = null;
    childrenWalkers[SyntaxKind.TryStatement] = walkTryStatementChildren;
    childrenWalkers[SyntaxKind.TypeAnnotation] = walkTypeAnnotationChildren;
    childrenWalkers[SyntaxKind.TypeArgumentList] = walkTypeArgumentListChildren;
    childrenWalkers[SyntaxKind.TypeOfExpression] = walkTypeOfExpressionChildren;
    childrenWalkers[SyntaxKind.TypeParameter] = walkTypeParameterChildren;
    childrenWalkers[SyntaxKind.TypeParameterList] = walkTypeParameterListChildren;
    childrenWalkers[SyntaxKind.TypeQuery] = walkTypeQueryChildren;
    childrenWalkers[SyntaxKind.UnsignedRightShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.UnsignedRightShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[SyntaxKind.VariableDeclaration] = walkVariableDeclarationChildren;
    childrenWalkers[SyntaxKind.VariableDeclarator] = walkVariableDeclaratorChildren;
    childrenWalkers[SyntaxKind.VariableStatement] = walkVariableStatementChildren;
    childrenWalkers[SyntaxKind.VoidExpression] = walkVoidExpressionChildren;
    childrenWalkers[SyntaxKind.VoidKeyword] = null;
    childrenWalkers[SyntaxKind.WhileStatement] = walkWhileStatementChildren;
    childrenWalkers[SyntaxKind.WithStatement] = walkWithStatementChildren;

    // Verify the code is up to date with the enum
    for (var e in SyntaxKind) {
        if (SyntaxKind.hasOwnProperty(e) && StringUtilities.isString(SyntaxKind[e])) {
            TypeScript.Debug.assert(childrenWalkers[e] !== undefined, "Fix initWalkers: " + SyntaxKind[e]);
        }
    }

    export class AstWalkOptions {
        public goChildren = true;
        public stopWalking = false;
    }

    interface IAstWalkChildren {
        (preAst: AST, walker: AstWalker): void;
    }

    export interface IAstWalker {
        options: AstWalkOptions;
        state: any
    }

    interface AstWalker {
        walk(ast: AST): void;
    }

    class SimplePreAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, state: any) => void,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            this.pre(ast, this.state);

            var walker = childrenWalkers[ast.kind()];
            if (walker) {
                walker(ast, this);
            }
        }
    }

    class SimplePrePostAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, state: any) => void,
            private post: (ast: AST, state: any) => void,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            this.pre(ast, this.state);

            var walker = childrenWalkers[ast.kind()];
            if (walker) {
                walker(ast, this);
            }

            this.post(ast, this.state);
        }
    }

    class NormalAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, walker: IAstWalker) => void,
            private post: (ast: AST, walker: IAstWalker) => void,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            // If we're stopping, then bail out immediately.
            if (this.options.stopWalking) {
                return;
            }

            this.pre(ast, this);

            // If we were asked to stop, then stop.
            if (this.options.stopWalking) {
                return;
            }

            if (this.options.goChildren) {
                // Call the "walkChildren" function corresponding to "nodeType".
                var walker = childrenWalkers[ast.kind()];
                if (walker) {
                    walker(ast, this);
                }
            }
            else {
                // no go only applies to children of node issuing it
                this.options.goChildren = true;
            }

            if (this.post) {
                this.post(ast, this);
            }
        }
    }

    export class AstWalkerFactory {
        public walk(ast: AST, pre: (ast: AST, walker: IAstWalker) => void, post?: (ast: AST, walker: IAstWalker) => void, state?: any): void {
            new NormalAstWalker(pre, post, state).walk(ast);
        }

        public simpleWalk(ast: AST, pre: (ast: AST, state: any) => void, post?: (ast: AST, state: any) => void, state?: any): void {
            if (post) {
                new SimplePrePostAstWalker(pre, post, state).walk(ast);
            }
            else {
                new SimplePreAstWalker(pre, state).walk(ast);
            }
        }
    }

    var globalAstWalkerFactory = new AstWalkerFactory();

    export function getAstWalkerFactory(): AstWalkerFactory {
        return globalAstWalkerFactory;
    }
}