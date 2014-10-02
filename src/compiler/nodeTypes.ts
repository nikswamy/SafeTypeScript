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

///<reference path='typescript.ts' />

module TypeScript {
    // Note: Any addition to the NodeType should also be supported with addition to AstWalkerDetailCallback
    export enum NodeType {
        None,
        List,
        Script,

        // Literals
        TrueLiteral,
        FalseLiteral,
        StringLiteral,
        RegularExpressionLiteral,
        NumericLiteral,
        NullLiteral,

        // Types
        TypeParameter,
        GenericType,
        TypeRef,
        TypeQuery,

        // Declarations
        FunctionDeclaration,
        ClassDeclaration,
        InterfaceDeclaration,
        ModuleDeclaration,
        ImportDeclaration,
        VariableDeclarator,
        VariableDeclaration,
        Parameter,

        // Expressions
        Name,
        ArrayLiteralExpression,
        ObjectLiteralExpression,
        OmittedExpression,
        VoidExpression,
        CommaExpression,
        PlusExpression,
        NegateExpression,
        DeleteExpression,
        ThisExpression,
        SuperExpression,
        InExpression,
        MemberAccessExpression,
        InstanceOfExpression,
        TypeOfExpression,
        ElementAccessExpression,
        InvocationExpression,
        ObjectCreationExpression,
        AssignmentExpression,
        AddAssignmentExpression,
        SubtractAssignmentExpression,
        DivideAssignmentExpression,
        MultiplyAssignmentExpression,
        ModuloAssignmentExpression,
        AndAssignmentExpression,
        ExclusiveOrAssignmentExpression,
        OrAssignmentExpression,
        LeftShiftAssignmentExpression,
        SignedRightShiftAssignmentExpression,
        UnsignedRightShiftAssignmentExpression,
        ConditionalExpression,
        LogicalOrExpression,
        LogicalAndExpression,
        BitwiseOrExpression,
        BitwiseExclusiveOrExpression,
        BitwiseAndExpression,
        EqualsWithTypeConversionExpression,
        NotEqualsWithTypeConversionExpression,
        EqualsExpression,
        NotEqualsExpression,
        LessThanExpression,
        LessThanOrEqualExpression,
        GreaterThanExpression,
        GreaterThanOrEqualExpression,
        AddExpression,
        SubtractExpression,
        MultiplyExpression,
        DivideExpression,
        ModuloExpression,
        LeftShiftExpression,
        SignedRightShiftExpression,
        UnsignedRightShiftExpression,
        BitwiseNotExpression,
        LogicalNotExpression,
        PreIncrementExpression,
        PreDecrementExpression,
        PostIncrementExpression,
        PostDecrementExpression,
        CastExpression,
        ParenthesizedExpression,
        Member,

        // Statements
        Block,
        BreakStatement,
        ContinueStatement,
        DebuggerStatement,
        DoStatement,
        EmptyStatement,
        ExportAssignment,
        ExpressionStatement,
        ForInStatement,
        ForStatement,
        IfStatement,
        LabeledStatement,
        ReturnStatement,
        SwitchStatement,
        ThrowStatement,
        TryStatement,
        VariableStatement,
        WhileStatement,
        WithStatement,

        // Clauses
        CaseClause,
        CatchClause,

        Comment,
    }

    export function nodeTypeAsString(n: NodeType) {
        switch (n) {
            //          case NodeType.None: return "None";
            case NodeType.List: return "List";
            case NodeType.Script: return "Script";
            // Literals
            case NodeType.TrueLiteral: return "TrueLiteral";
            case NodeType.FalseLiteral: return "FalseLiteral";
            case NodeType.StringLiteral: return "StringLiteral";
            case NodeType.RegularExpressionLiteral: return "RegularExpressionLiteral";
            case NodeType.NumericLiteral: return "NumericLiteral";
            case NodeType.NullLiteral: return "NullLiteral";

            // Declarations
            case NodeType.FunctionDeclaration: return "FunctionDeclaration";
            case NodeType.ClassDeclaration: return "ClassDeclaration";
            case NodeType.InterfaceDeclaration: return "InterfaceDeclaration";
            case NodeType.ModuleDeclaration: return "ModuleDeclaration";
            case NodeType.ImportDeclaration: return "ImportDeclaration";
            case NodeType.VariableDeclarator: return "VariableDeclarator";
            case NodeType.VariableDeclaration: return "VariableDeclaration";
            case NodeType.Parameter: return "Parameter";

            // Expressions
            case NodeType.Name: return "Name";
            case NodeType.ArrayLiteralExpression: return "ArrayLiteralExpression";
            case NodeType.ObjectLiteralExpression: return "ObjectLiteralExpression";
            case NodeType.OmittedExpression: return "OmittedExpression";
            case NodeType.VoidExpression: return "VoidExpression";
            case NodeType.CommaExpression: return "CommaExpression";
            case NodeType.PlusExpression: return "PlusExpression";
            case NodeType.NegateExpression: return "NegateExpression";
            case NodeType.DeleteExpression: return "DeleteExpression";
            case NodeType.ThisExpression: return "ThisExpression";
            case NodeType.SuperExpression: return "SuperExpression";
            case NodeType.InExpression: return "InExpression";
            case NodeType.MemberAccessExpression: return "MemberAccessExpression";
            case NodeType.InstanceOfExpression: return "InstanceOfExpression";
            case NodeType.TypeOfExpression: return "TypeOfExpression";
            case NodeType.ElementAccessExpression: return "ElementAccessExpression";
            case NodeType.InvocationExpression: return "InvocationExpression";
            case NodeType.ObjectCreationExpression: return "ObjectCreationExpression";
            case NodeType.AssignmentExpression: return "AssignmentExpression";

            case NodeType.AddAssignmentExpression: return "AddAssignmentExpression";
            case NodeType.SubtractAssignmentExpression: return "SubtractAssignmentExpression";
            case NodeType.DivideAssignmentExpression: return "DivideAssignmentExpression";
            case NodeType.MultiplyAssignmentExpression: return "MultiplyAssignmentExpression";
            case NodeType.ModuloAssignmentExpression: return "ModuloAssignmentExpression";
            case NodeType.AndAssignmentExpression: return "AndAssignmentExpression";
            case NodeType.ExclusiveOrAssignmentExpression: return "ExclusiveOrAssignmentExpression";
            case NodeType.OrAssignmentExpression: return "OrAssignmentExpression";
            case NodeType.LeftShiftAssignmentExpression: return "LeftShiftAssignmentExpression";
            case NodeType.SignedRightShiftAssignmentExpression: return "SignedRightShiftAssignmentExpression";
            case NodeType.UnsignedRightShiftAssignmentExpression: return "UnsignedRightShiftAssignmentExpression";
            case NodeType.ConditionalExpression: return "ConditionalExpression";
            case NodeType.LogicalOrExpression: return "LogicalOrExpression";
            case NodeType.LogicalAndExpression: return "LogicalAndExpression";
            case NodeType.BitwiseOrExpression: return "BitwiseOrExpression";
            case NodeType.BitwiseExclusiveOrExpression: return "BitwiseExclusiveOrExpression";
            case NodeType.BitwiseAndExpression: return "BitwiseAndExpression";
            case NodeType.EqualsWithTypeConversionExpression: return "EqualsWithTypeConversionExpression";
            case NodeType.NotEqualsWithTypeConversionExpression: return "NotEqualsWithTypeConversionExpression";
            case NodeType.EqualsExpression: return "EqualsExpression";
            case NodeType.NotEqualsExpression: return "NotEqualsExpression";
            case NodeType.LessThanExpression: return "LessThanExpression";
            case NodeType.LessThanOrEqualExpression: return "LessThanOrEqualExpression";
            case NodeType.GreaterThanExpression: return "GreaterThanExpression";
            case NodeType.GreaterThanOrEqualExpression: return "GreaterThanOrEqualExpression";
            case NodeType.AddExpression: return "AddExpression";
            case NodeType.SubtractExpression: return "SubtractExpression";
            case NodeType.MultiplyExpression: return "MultiplyExpression";
            case NodeType.DivideExpression: return "DivideExpression";
            case NodeType.ModuloExpression: return "ModuloExpression";
            case NodeType.LeftShiftExpression: return "LeftShiftExpression";
            case NodeType.SignedRightShiftExpression: return "SignedRightShiftExpression";
            case NodeType.UnsignedRightShiftExpression: return "UnsignedRightShiftExpression";
            case NodeType.BitwiseNotExpression: return "BitwiseNotExpression";
            case NodeType.LogicalNotExpression: return "LogicalNotExpression";
            case NodeType.PreIncrementExpression: return "PreIncrementExpression";
            case NodeType.PreDecrementExpression: return "PreDecrementExpression";
            case NodeType.PostIncrementExpression: return "PostIncrementExpression";
            case NodeType.PostDecrementExpression: return "PostDecrementExpression";
            case NodeType.CastExpression: return "CastExpression";
            case NodeType.ParenthesizedExpression: return "ParenthesizedExpression";
            case NodeType.Member: return "Member";

            // Statements
            case NodeType.Block: return "Block";
            case NodeType.BreakStatement: return "BreakStatement";
            case NodeType.ContinueStatement: return "ContinueStatement";
            case NodeType.DebuggerStatement: return "DebuggerStatement";
            case NodeType.DoStatement: return "DoStatement";
            case NodeType.EmptyStatement: return "EmptyStatement";
            case NodeType.ExportAssignment: return "ExportAssignment";
            case NodeType.ExpressionStatement: return "ExpressionStatement";
            case NodeType.ForInStatement: return "ForInStatement";
            case NodeType.ForStatement: return "ForStatement";
            case NodeType.IfStatement: return "IfStatement";
            case NodeType.LabeledStatement: return "LabeledStatement";
            case NodeType.ReturnStatement: return "ReturnStatement";
            case NodeType.SwitchStatement: return "SwitchStatement";
            case NodeType.ThrowStatement: return "ThrowStatement";
            case NodeType.TryStatement: return "TryStatement";
            case NodeType.VariableStatement: return "VariableStatement";
            case NodeType.WhileStatement: return "WhileStatement";
            case NodeType.WithStatement: return "WithStatement";

            // Types
            case NodeType.TypeParameter: return "TypeParameter";
            case NodeType.GenericType: return "GenericType";
            case NodeType.TypeRef: return "TypeRef";
            case NodeType.TypeQuery: return "TypeQuery";


            // Clauses
            case NodeType.CaseClause: return "caseClause";
            case NodeType.CatchClause: return "CatchClause";
            case NodeType.Comment: return "Comment";
        }
    }


}
