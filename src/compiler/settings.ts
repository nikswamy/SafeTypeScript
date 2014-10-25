// Modified by N.Swamy (2014)
///<reference path='references.ts' />

module TypeScript {
    export interface KnownWarning {
        category?: string;
        fileName: string;
        line: number;
        column: number;
        code: number;
        matched?: boolean;
        message?: string;
    }
    export function kw2str(kw: KnownWarning) {
        return kw.fileName + "(" + kw.line + "," + kw.column + "): warning TS" + kw.code + (kw.message ? ": TS*: " + kw.message : "");
    }
    /// Compiler settings
    export class CompilationSettings {
        public static SECURE: boolean;
        public propagateEnumConstants: boolean = false;
        public removeComments: boolean = false;
        public watch: boolean = false;
        public noResolve: boolean = false;
        public allowAutomaticSemicolonInsertion: boolean = true;
        public noImplicitAny: boolean = false;
        public noLib: boolean = false;
        public codeGenTarget: LanguageVersion = LanguageVersion.EcmaScript3;
        public moduleGenTarget: ModuleGenTarget = ModuleGenTarget.Unspecified;
        public outFileOption: string = "";
        public outDirOption: string = "";
        public mapSourceFiles: boolean = false;
        public mapRoot: string = "";
        public sourceRoot: string = "";
        public generateDeclarationFiles: boolean = false;
        public useCaseSensitiveFileResolution: boolean = false;
        public gatherDiagnostics: boolean = false;
        public codepage: number = null;
        public safe: boolean = false;
        public secure: boolean = CompilationSettings.SECURE ? true : false;
        public serviceMode = true;
        public noRuntimeChecks = false;
        public generics = false;
        public noWarns: string[] = [];
        public noInstrs: string[] = [];
        public knownWarnings: KnownWarning[] = [];
        public addKnownWarnings(kws: KnownWarning[]) {
            this.knownWarnings = this.knownWarnings.concat(kws);
        }
        public errorStats = false;
        public relaxNullChecks = false;
        public inlineCasts = false;
        public tsstarTagging = false;
        public noGetters = false;
        public weakMaps = false;
        public optimizePure = false;
    }

    export class ImmutableCompilationSettings {
        private static _defaultSettings: ImmutableCompilationSettings;

        private _propagateEnumConstants: boolean;
        private _removeComments: boolean;
        private _watch: boolean;
        private _noResolve: boolean;
        private _allowAutomaticSemicolonInsertion: boolean;
        private _noImplicitAny: boolean;
        private _noLib: boolean;
        private _codeGenTarget: LanguageVersion;
        private _moduleGenTarget: ModuleGenTarget;
        private _outFileOption: string;
        private _outDirOption: string;
        private _mapSourceFiles: boolean;
        private _mapRoot: string;
        private _sourceRoot: string;
        private _generateDeclarationFiles: boolean;
        private _useCaseSensitiveFileResolution: boolean;
        private _gatherDiagnostics: boolean;
        private _codepage: number;
        private _safe: boolean;
        private _secure: boolean;
        private _serviceMode: boolean;
        private _noRuntimeChecks: boolean;
        private _generics: boolean;
        private _noWarns: string[];
        private _noInstrs: string[];
        private _knownWarnings: KnownWarning[];
        private _errorStats: boolean;
        private _relaxNullChecks: boolean;
        private _inlineCasts: boolean;
        private _tsstarTagging: boolean;
        private _noGetters: boolean;
        private _weakMaps: boolean;
        private _optimizePure: boolean;

        public propagateEnumConstants() { return this._propagateEnumConstants; }
        public removeComments() { return this._removeComments; }
        public watch() { return this._watch; }
        public noResolve() { return this._noResolve; }
        public allowAutomaticSemicolonInsertion() { return this._allowAutomaticSemicolonInsertion; }
        public noImplicitAny() { return this._noImplicitAny; }
        public noLib() { return this._noLib; }
        public codeGenTarget() { return this._codeGenTarget; }
        public moduleGenTarget() { return this._moduleGenTarget; }
        public outFileOption() { return this._outFileOption; }
        public outDirOption() { return this._outDirOption; }
        public mapSourceFiles() { return this._mapSourceFiles; }
        public mapRoot() { return this._mapRoot; }
        public sourceRoot() { return this._sourceRoot; }
        public generateDeclarationFiles() { return this._generateDeclarationFiles; }
        public useCaseSensitiveFileResolution() { return this._useCaseSensitiveFileResolution; }
        public gatherDiagnostics() { return this._gatherDiagnostics; }
        public codepage() { return this._codepage; }
        public safe() { return this._safe; }
        public secure() { return this._secure; }
        public weakMaps() { return this._weakMaps; }
        public optimizePure() { return this._optimizePure; }
        public matchedOrAlmost: KnownWarning[] = [];
        public shouldInstrument(fn: string) {
            var sn = fn.substring(fn.lastIndexOf("/") + 1);
            if (sn === "lib.d.ts" || sn === "rt.ts" || sn === "rtapi.ts" || sn === "core.ts") {
                return false;
            }
            return !this._noInstrs.some((f) => fn.substr(fn.length - f.length)  === f);
        }
        public shouldWarn(diag:Diagnostic, di: DiagnosticInfo) {
            var code = di.code.toString();
            if (this._noWarns.some((s) => s === di.code.toString())) return false;
            var kw2 = {
                fileName: diag.fileName().toLowerCase(),
                line: diag.line() + 1,
                column: diag.character() + 1,
                code: di.code
            };
            

            var almostMatches = this._knownWarnings.filter((kw) => {
                var endsWith = (s1: string, s2: string) => {
                    if (s1.length >= s2.length) {
                        return s1.substring(s1.length - s2.length) === s2.toLowerCase();
                    }
                    return false;
                };
                return endsWith(kw2.fileName, kw.fileName)
                    && kw.column === kw2.column
                    && kw.code == kw2.code
            });

            if (almostMatches.some((kw) => {
                if (kw.line === kw2.line) {
                    kw.matched = true;
                    this.matchedOrAlmost.push({
                        category: kw.category,
                        fileName: kw.fileName,
                        column: kw.column,
                        code: kw.code,
                        line: kw.line,
                        message: diag.message()
                    });
                    return true;
                } else {
                    return false;
                }
            })) return false;

            if (almostMatches.length !== 0) {
                var am = almostMatches.sort((k, l) => (Math.abs(k.line - kw2.line) - Math.abs(l.line - kw2.line)));
                am = am.filter((kw) => !kw.matched);
                if (am && am.length !== 0) {
                    console.log("Warning at " + kw2str(kw2) + " almost matched known warnings: ");
                    console.log("\t" + kw2str(am[0]));
                    this.matchedOrAlmost.push({
                        category: am[0].category,
                        fileName: kw2.fileName,
                        column: kw2.column,
                        code: kw2.code,
                        line: kw2.line,
                        message: diag.message()
                    });
                    am[0].matched = true;
                }
            }
            return true;
        }
        public reportUnmatchedKnownWarnings(writeFile:(fileName:string, contents:string) => void) {
            this._knownWarnings.forEach((f) => {
                if (!f.matched) {
                    console.log("   ;;Unmatched known warning: " + kw2str(f));
                }
            });
            var sorted = this.matchedOrAlmost.sort((kw1, kw2) => kw1.category.localeCompare(kw2.category));
            var currentCategory : string = null;
            var contents = sorted.map((kw) => {
                var out = "";
                if (currentCategory !== kw.category) {
                    out = out + kw.category + "\n";
                    currentCategory = kw.category;
                }
                out = out + "1>" + kw2str(kw);
                return out;
            }).join("\n");

            writeFile("knownWarnings.generated.txt", contents);
        }
        public serviceMode() {
            return this._serviceMode;
        }
        public noRuntimeChecks() {
            return this._noRuntimeChecks;
        }
        public generics() {
            return this._generics;
        }
        public knownWarnings() {
            return this._knownWarnings;
        }
        public errorStats() {
            return this._errorStats;
        }
        public relaxNullChecks() {
            return this._relaxNullChecks;
        }
        public inlineCasts() {
            return this._inlineCasts;
        }
        public tsstarTagging() {
            return this._tsstarTagging;
        }
        public noGetters() {
            return this._noGetters;
        }
        constructor(
            propagateEnumConstants: boolean,
            removeComments: boolean,
            watch: boolean,
            noResolve: boolean,
            allowAutomaticSemicolonInsertion: boolean,
            noImplicitAny: boolean,
            noLib: boolean,
            codeGenTarget: LanguageVersion,
            moduleGenTarget: ModuleGenTarget,
            outFileOption: string,
            outDirOption: string,
            mapSourceFiles: boolean,
            mapRoot: string,
            sourceRoot: string,
            generateDeclarationFiles: boolean,
            useCaseSensitiveFileResolution: boolean,
            gatherDiagnostics: boolean,
            codepage: number,
            safe: boolean,
            secure: boolean,
            serviceMode: boolean,
            noRuntimeChecks: boolean,
            generics: boolean,
            noWarns: string[],
            noInstrs: string[],
            knownWarnings: KnownWarning[],
            errorStats: boolean,
            relaxNullChecks: boolean,
            inlineCasts: boolean,
            tsstarTagging: boolean,
            noGetters: boolean,
            weakMaps: boolean,
            optimizePure: boolean) {

            this._propagateEnumConstants = propagateEnumConstants;
            this._removeComments = removeComments;
            this._watch = watch;
            this._noResolve = noResolve;
            this._allowAutomaticSemicolonInsertion = allowAutomaticSemicolonInsertion;
            this._noImplicitAny = noImplicitAny;
            this._noLib = noLib;
            this._codeGenTarget = codeGenTarget;
            this._moduleGenTarget = moduleGenTarget;
            this._outFileOption = outFileOption;
            this._outDirOption = outDirOption;
            this._mapSourceFiles = mapSourceFiles;
            this._mapRoot = mapRoot;
            this._sourceRoot = sourceRoot;
            this._generateDeclarationFiles = generateDeclarationFiles;
            this._useCaseSensitiveFileResolution = useCaseSensitiveFileResolution;
            this._gatherDiagnostics = gatherDiagnostics;
            this._codepage = codepage;
            this._safe = safe;
            this._secure = secure;
            this._serviceMode = serviceMode;
            this._noRuntimeChecks = noRuntimeChecks;
            this._generics = generics;
            this._noWarns = noWarns;
            this._noInstrs = noInstrs;
            this._knownWarnings = knownWarnings;
            this._errorStats = errorStats;
            this._relaxNullChecks = relaxNullChecks;
            this._inlineCasts = inlineCasts;
            this._tsstarTagging = tsstarTagging;
                this._noGetters = noGetters;
                this._weakMaps = weakMaps;
                this._optimizePure = optimizePure;
        }

        public static defaultSettings() {
            if (!ImmutableCompilationSettings._defaultSettings) {
                ImmutableCompilationSettings._defaultSettings = ImmutableCompilationSettings.fromCompilationSettings(new CompilationSettings());
            }

            return ImmutableCompilationSettings._defaultSettings;
        }

        public static fromCompilationSettings(settings: CompilationSettings): ImmutableCompilationSettings {
            return new ImmutableCompilationSettings(
                settings.propagateEnumConstants,
                settings.removeComments,
                settings.watch,
                settings.noResolve,
                settings.allowAutomaticSemicolonInsertion,
                settings.noImplicitAny,
                settings.noLib,
                settings.codeGenTarget,
                settings.moduleGenTarget,
                settings.outFileOption,
                settings.outDirOption,
                settings.mapSourceFiles,
                settings.mapRoot,
                settings.sourceRoot,
                settings.generateDeclarationFiles,
                settings.useCaseSensitiveFileResolution,
                settings.gatherDiagnostics,
                settings.codepage,
                settings.safe,
                settings.secure,
                settings.serviceMode,
                settings.noRuntimeChecks,
                settings.generics,
                settings.noWarns,
                settings.noInstrs,
                settings.knownWarnings,
                settings.errorStats,
                settings.relaxNullChecks,
                settings.inlineCasts,
                settings.tsstarTagging,
                settings.noGetters,
                settings.weakMaps,
                settings.optimizePure);
        }

        public toCompilationSettings(): any {
            var result = new CompilationSettings();

            for (var name in this) {
                if (this.hasOwnProperty(name) && StringUtilities.startsWith(name, "_")) {
                    result[name.substr(1)] = this[name];
                }
            }

            return result;
        }
    }
}
