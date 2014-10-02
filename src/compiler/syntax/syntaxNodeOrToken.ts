// Modified by N.Swamy (2014)
///<reference path='references.ts' />

module TypeScript {
    export interface ISyntaxNodeOrToken extends ISyntaxElement {
        withLeadingTrivia(leadingTrivia: ISyntaxTriviaList): ISyntaxNodeOrToken;
        withTrailingTrivia(trailingTrivia: ISyntaxTriviaList): ISyntaxNodeOrToken;

        accept(visitor: ISyntaxVisitor): any;
    }
}