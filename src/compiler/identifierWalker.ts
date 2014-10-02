// Modified by N.Swamy (2014)
module TypeScript {    
    export class IdentifierWalker extends SyntaxWalker {
        constructor(public list: IIndexable<boolean>) {
            super();
        }

        public visitToken(token: ISyntaxToken): void {
            this.list[token.text()] = true;
        }
    }
}