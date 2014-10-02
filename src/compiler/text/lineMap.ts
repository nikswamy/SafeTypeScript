// Modified by N.Swamy (2014)
///<reference path='references.ts' />

module TypeScript {
    export module LineMap1 {
        export function fromSimpleText(text: ISimpleText): LineMap {
            return new LineMap(() => TextUtilities.parseLineStarts({ charCodeAt(index) { return text.charCodeAt(index); }, length: text.length() }), text.length());
        }

        export function fromScriptSnapshot(scriptSnapshot: IScriptSnapshot): LineMap {
            return new LineMap(() => scriptSnapshot.getLineStartPositions(), scriptSnapshot.getLength());
        }

        export function fromString(text: string): LineMap {
            return new LineMap(() => TextUtilities.parseLineStarts(new String(text)), text.length);
        }
    }
}