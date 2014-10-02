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

///<reference path='typescript.ts'/>
///<reference path='io.ts'/>
///<reference path='optionsParser.ts'/>
///<reference path='typecheck/sound/tc.ts' />

module TypeScript {
    class SourceFile {
        constructor(public scriptSnapshot: IScriptSnapshot, public byteOrderMark: ByteOrderMark) {
        }
    }

    class DiagnosticsLogger implements ILogger {
        constructor(public ioHost: IIO) {
        }
        public information(): boolean { return false; }
        public debug(): boolean { return false; }
        public warning(): boolean { return false; }
        public error(): boolean { return false; }
        public fatal(): boolean { return false; }
        public log(s: string): void {
            this.ioHost.stdout.WriteLine(s);
        }
    }

    // NS-0.9.5: revive
    // useDirectTypeStorage = true;
    export class BatchCompiler implements IReferenceResolverHost {
        public compilerVersion = "0.9.5.0";
        public researchCompilerVersion = "0.0.1";
        private inputFiles: string[] = [];
        private compilationSettings: ImmutableCompilationSettings;
        private resolvedFiles: IResolvedFile[] = [];
        private fileNameToSourceFile = new StringHashTable<SourceFile>();
        private hasErrors: boolean = false;
        private logger: ILogger = null;

        constructor(private ioHost: IIO) {
        }

        // Begin batch compilation
        public batchCompile() {
            var start = new Date().getTime();

            this.ioHost.stdout.WriteLine("Safe TypeScript");
            CompilerDiagnostics.diagnosticWriter = { Alert(s: string) { this.ioHost.printLine(s); } };

            // Parse command line options
            if (this.parseOptions()) {
                this.logger = this.compilationSettings.gatherDiagnostics() ? <ILogger>new DiagnosticsLogger(this.ioHost) : new NullLogger();

                if (this.compilationSettings.watch()) {
                    // Watch will cause the program to stick around as long as the files exist
                    this.watchFiles();
                    return;
                }

                // Resolve the compilation environemnt
                this.resolve();

                this.compile();

                if (this.compilationSettings.gatherDiagnostics()) {
                    this.logger.log("");
                    this.logger.log("File resolution time:                     " + TypeScript.fileResolutionTime);
                    this.logger.log("           file read:                     " + TypeScript.fileResolutionIOTime);
                    this.logger.log("        scan imports:                     " + TypeScript.fileResolutionScanImportsTime);
                    this.logger.log("       import search:                     " + TypeScript.fileResolutionImportFileSearchTime);
                    this.logger.log("        get lib.d.ts:                     " + TypeScript.fileResolutionGetDefaultLibraryTime);

                    this.logger.log("SyntaxTree parse time:                    " + TypeScript.syntaxTreeParseTime);
                    this.logger.log("Syntax Diagnostics time:                  " + TypeScript.syntaxDiagnosticsTime);
                    this.logger.log("AST translation time:                     " + TypeScript.astTranslationTime);
                    this.logger.log("");
                    this.logger.log("Type check time:                          " + TypeScript.typeCheckTime);
                    this.logger.log("");
                    this.logger.log("Emit time:                                " + TypeScript.emitTime);
                    this.logger.log("Declaration emit time:                    " + TypeScript.declarationEmitTime);

                    this.logger.log("Total number of symbols created:          " + TypeScript.pullSymbolID);
                    this.logger.log("Specialized types created:                " + TypeScript.nSpecializationsCreated);
                    this.logger.log("Specialized signatures created:           " + TypeScript.nSpecializedSignaturesCreated);

                    this.logger.log("  IsExternallyVisibleTime:                " + TypeScript.declarationEmitIsExternallyVisibleTime);
                    this.logger.log("  TypeSignatureTime:                      " + TypeScript.declarationEmitTypeSignatureTime);
                    this.logger.log("  GetBoundDeclTypeTime:                   " + TypeScript.declarationEmitGetBoundDeclTypeTime);
                    this.logger.log("  IsOverloadedCallSignatureTime:          " + TypeScript.declarationEmitIsOverloadedCallSignatureTime);
                    this.logger.log("  FunctionDeclarationGetSymbolTime:       " + TypeScript.declarationEmitFunctionDeclarationGetSymbolTime);
                    this.logger.log("  GetBaseTypeTime:                        " + TypeScript.declarationEmitGetBaseTypeTime);
                    this.logger.log("  GetAccessorFunctionTime:                " + TypeScript.declarationEmitGetAccessorFunctionTime);
                    this.logger.log("  GetTypeParameterSymbolTime:             " + TypeScript.declarationEmitGetTypeParameterSymbolTime);
                    this.logger.log("  GetImportDeclarationSymbolTime:         " + TypeScript.declarationEmitGetImportDeclarationSymbolTime);

                    this.logger.log("Emit write file time:                     " + TypeScript.emitWriteFileTime);

                    this.logger.log("Compiler resolve path time:               " + TypeScript.compilerResolvePathTime);
                    this.logger.log("Compiler directory name time:             " + TypeScript.compilerDirectoryNameTime);
                    this.logger.log("Compiler directory exists time:           " + TypeScript.compilerDirectoryExistsTime);
                    this.logger.log("Compiler file exists time:                " + TypeScript.compilerFileExistsTime);

                    this.logger.log("IO host resolve path time:                " + TypeScript.ioHostResolvePathTime);
                    this.logger.log("IO host directory name time:              " + TypeScript.ioHostDirectoryNameTime);
                    this.logger.log("IO host create directory structure time:  " + TypeScript.ioHostCreateDirectoryStructureTime);
                    this.logger.log("IO host write file time:                  " + TypeScript.ioHostWriteFileTime);

                    this.logger.log("Node make directory time:                 " + TypeScript.nodeMakeDirectoryTime);
                    this.logger.log("Node writeFileSync time:                  " + TypeScript.nodeWriteFileSyncTime);
                    this.logger.log("Node createBuffer time:                   " + TypeScript.nodeCreateBufferTime);
                }
            }
            this.reportDiagStats();
            // Exit with the appropriate error code
            this.ioHost.quit(0);//this.hasErrors ? 1 : 0);
        }

        private resolve() {
            // Resolve file dependencies, if requested
            var includeDefaultLibrary = !this.compilationSettings.noLib();
            var resolvedFiles: IResolvedFile[] = [];

            var start = new Date().getTime();

            if (!this.compilationSettings.noResolve()) {
                // Resolve references
                var resolutionResults = ReferenceResolver.resolve(this.inputFiles, this, this.compilationSettings.useCaseSensitiveFileResolution());
                resolvedFiles = resolutionResults.resolvedFiles;

                // Only include the library if useDefaultLib is set to true and did not see any 'no-default-lib' comments
                includeDefaultLibrary = !this.compilationSettings.noLib() && !resolutionResults.seenNoDefaultLibTag;

                // Populate any diagnostic messages generated during resolution
                resolutionResults.diagnostics.forEach(d => this.addDiagnostic(d));
            }
            else {
                for (var i = 0, n = this.inputFiles.length; i < n; i++) {
                    var inputFile = this.inputFiles[i];
                    var referencedFiles: string[] = [];
                    var importedFiles: string[] = [];

                    // If declaration files are going to be emitted, preprocess the file contents and add in referenced files as well
                    if (this.compilationSettings.generateDeclarationFiles()) {
                        var references = getReferencedFiles(inputFile, this.getScriptSnapshot(inputFile));
                        for (var j = 0; j < references.length; j++) {
                            referencedFiles.push(references[j].path);
                        }

                        inputFile = this.resolvePath(inputFile);
                    }

                    resolvedFiles.push({
                        path: inputFile,
                        referencedFiles: referencedFiles,
                        importedFiles: importedFiles
                    });
                }
            }

            var defaultLibStart = new Date().getTime();
            if (includeDefaultLibrary) {
                var libraryResolvedFile: IResolvedFile = {
                    path: this.getDefaultLibraryFilePath(),
                    referencedFiles: new Array<string>(),
                    importedFiles: new Array<string>()
                };

                // Prepend the library to the resolved list
                resolvedFiles = [libraryResolvedFile].concat(resolvedFiles);
            }
            TypeScript.fileResolutionGetDefaultLibraryTime += new Date().getTime() - defaultLibStart;

            this.resolvedFiles = resolvedFiles;

            TypeScript.fileResolutionTime = new Date().getTime() - start;
        }

        // Returns true if compilation failed from some reason.
        private compile(): void {
            var compiler = new TypeScriptCompiler(this.logger, this.compilationSettings);
                     
            this.resolvedFiles.forEach(resolvedFile => {
                var sourceFile = this.getSourceFile(resolvedFile.path);
                compiler.addFile(resolvedFile.path, sourceFile.scriptSnapshot, sourceFile.byteOrderMark, /*version:*/ 0, /*isOpen:*/ false, resolvedFile.referencedFiles);
            });

            for (var it = compiler.compile((path: string) => this.resolvePath(path)); it.moveNext();) {
                var result = it.current();

                result.diagnostics.forEach(d => this.addDiagnostic(d));
                if (!this.tryWriteOutputFiles(result.outputFiles)) {
                    return;
                }
            }
        }

        // Parse command line options
        private parseOptions() {
            var opts = new OptionsParser(this.ioHost, this.compilerVersion, this.researchCompilerVersion);
            var mutableSettings = new CompilationSettings();

            var parseKnownWarnings = (contents: string) => {
                var re = /^1>([^\(]*)\((\d+),(\d+)\): warning TS(\d+):.*/;
                var lines = contents.split("\n");
                var knownWarnings: KnownWarning[] = [];
                var category: string[] = [];
                var currentCategory: string = null;
                lines.forEach((line) => {
                    var matches = re.exec(line);
                    if (matches) {
                        if (category.length !== 0) {
                            currentCategory = category.join("\n");
                            category = [];
                        }
                        var kw = {
                            category: currentCategory,
                            fileName: matches[1].toLowerCase(),
                            line: parseInt(matches[2]),
                            column: parseInt(matches[3]),
                            code: parseInt(matches[4])
                        };
                        knownWarnings.push(kw);
                    } else {
                        category.push(line);
                    } 
                     
                });
                return knownWarnings;
            };

            opts.flag('safe', {
                usage: {
                    locCode: "TS* mode: emit type-safe JavaScript",
                    args: []
                },
                set: (s) => {
                    mutableSettings.safe = true;
                }
            });

            opts.flag('relaxNullChecks', {
                usage: {
                    locCode: "Safe mode: allow 'null' in all object types",
                },
                set: (s) => {
                    mutableSettings.relaxNullChecks = true;
                }
            });

            opts.flag('inlineCasts', {
                usage: {
                    locCode: "Safe mode: inline casts to class-instance types instead of making a function call",
                },
                set: (s) => {
                    mutableSettings.inlineCasts = true;
                }
            });
            opts.flag('tsstarTagging', {
                usage: {
                    locCode: "Safe mode: use TS* tagging scheme of tag on creation",
                },
                set: (s) => {
                    mutableSettings.tsstarTagging = true;
                }
            });
            opts.flag('noGetters', {
                usage: {
                    locCode: "Safe mode: assume no getters are used and apply RT optimizations",
                },
                set: (s) => {
                    mutableSettings.noGetters = true;
                }
            });

            opts.flag('noRuntimeChecks', {
                usage: {
                    locCode: "TS* mode: static checking only (runtime is still unsafe)",
                },
                set: (s) => {
                    mutableSettings.noRuntimeChecks = true;
                }
            });


            opts.flag('secure', {
                usage: {
                    locCode: "TS* mode: emit defensively protected JavaScript",
                },
                set: (s) => {
                    mutableSettings.secure = true;
                }                                                           
            });

            opts.option('nowarn', {
                usage: {
                    locCode: "TS* mode: warn about implicit conversions",
                },
                set: (str) => {
                    mutableSettings.noWarns.push(str);
                }
            });

            opts.option('skipInstrumentation', {
                usage: {
                    locCode: "Safe mode: do not instrument the <file> argument",
                },
                set: (str) => {
                    mutableSettings.noInstrs.push(str);
                }
            });
                                                                                          
            opts.option('knownWarnings', {
                usage: {
                    locCode: "TS* mode: suppress warnings that have already been triaged and logged (in a file)",
                },
                set: (str) => {
                    mutableSettings.addKnownWarnings(parseKnownWarnings(this.ioHost.readFile(str, null).contents));
                }
            });        
            
            opts.flag('errorStats', {
                usage: {
                    locCode: "TS* mode: produce a report of error statistics at the end of the compilation run",
                },
                set: (s) => {
                    mutableSettings.errorStats = true;
                }
            });                                                  
      

            opts.flag('weakMaps', {
                usage: {
                    locCode: "TS* mode: use weak maps in the runtime",
                },
                set: (s) => {
                    mutableSettings.weakMaps = true;
                }
            });    
            
            opts.flag('optimizePure', {
                usage: {
                    locCode: "TS* mode: optimize reads/writes/calls involving pure expressions (producing less readable code)",
                },
                set: (s) => {
                    mutableSettings.optimizePure = true;
                }
            });    
                                                          

            opts.flag('generics', {
                usage: {
                    locCode: "TS* mode: enable support for generic types",
                },
                set: (s) => {
                    mutableSettings.generics = true;
                }
            });

            opts.option('out', {
                usage: {
                    locCode: DiagnosticCode.Concatenate_and_emit_output_to_single_file,
                },
                type: DiagnosticCode.file2,
                set: (str) => {
                    mutableSettings.outFileOption = str;
                }
            });

            opts.option('outDir', {
                usage: {
                    locCode: DiagnosticCode.Redirect_output_structure_to_the_directory,
                },
                type: DiagnosticCode.DIRECTORY,
                set: (str) => {
                    mutableSettings.outDirOption = str;
                }
            });

            opts.flag('sourcemap', {
                usage: {
                    locCode: DiagnosticCode.Generates_corresponding_0_file,
                    args: ['.map']
                },
                set: (s) => {
                    mutableSettings.mapSourceFiles = true;
                }
            });

            opts.option('mapRoot', {
                usage: {
                    locCode: DiagnosticCode.Specifies_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations,
                },
                type: DiagnosticCode.LOCATION,
                set: (str) => {
                    mutableSettings.mapRoot = str;
                }
            });

            opts.option('sourceRoot', {
                usage: {
                    locCode: DiagnosticCode.Specifies_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations,
                },
                type: DiagnosticCode.LOCATION,
                set: (str) => {
                    mutableSettings.sourceRoot = str;
                }
            });

            opts.flag('declaration', {
                usage: {
                    locCode: DiagnosticCode.Generates_corresponding_0_file,
                    args: ['.d.ts']
                },
                set: (s) => {
                    mutableSettings.generateDeclarationFiles = true;
                }
            }, 'd');

            if (this.ioHost.watchFile) {
                opts.flag('watch', {
                    usage: {
                        locCode: DiagnosticCode.Watch_input_files,
                    },
                    set: (s) => {
                        mutableSettings.watch = true;
                    }
                }, 'w');
            }

            opts.flag('propagateEnumConstants', {
                experimental: true,
                set: (s) => { mutableSettings.propagateEnumConstants = true; }
            });

            opts.flag('removeComments', {
                usage: {
                    locCode: DiagnosticCode.Do_not_emit_comments_to_output,
                },
                set: (s) => {
                    mutableSettings.removeComments = true;
                }
            });

            opts.flag('noResolve', {
                usage: {
                    locCode: DiagnosticCode.Skip_resolution_and_preprocessing,
                },
                set: (s) => {
                    mutableSettings.noResolve = true;
                }
            });

            opts.flag('noLib', {
                experimental: true,
                set: (s) => {
                    mutableSettings.noLib = true;
                }
            });

            opts.flag('diagnostics', {
                experimental: true,
                set: (s) => {
                    mutableSettings.gatherDiagnostics = true;
                }
            });

            opts.option('target', {
                usage: {
                    locCode: DiagnosticCode.Specify_ECMAScript_target_version_0_default_or_1,
                    args: ['ES3', 'ES5']
                },
                type: DiagnosticCode.VERSION,
                set: (type) => {
                    type = type.toLowerCase();

                    if (type === 'es3') {
                        mutableSettings.codeGenTarget = LanguageVersion.EcmaScript3;
                    }
                    else if (type === 'es5') {
                        mutableSettings.codeGenTarget = LanguageVersion.EcmaScript5;
                    }
                    else {
                        this.addDiagnostic(
                            new Diagnostic(null, null, 0, 0, DiagnosticCode.ECMAScript_target_version_0_not_supported_Specify_a_valid_target_version_1_default_or_2, [type, "ES3", "ES5"]));
                    }
                }
            }, 't');

            opts.option('module', {
                usage: {
                    locCode: DiagnosticCode.Specify_module_code_generation_0_or_1,
                    args: ['commonjs', 'amd']
                },
                type: DiagnosticCode.KIND,
                set: (type) => {
                    type = type.toLowerCase();

                    if (type === 'commonjs') {
                        mutableSettings.moduleGenTarget = ModuleGenTarget.Synchronous;
                    }
                    else if (type === 'amd') {
                        mutableSettings.moduleGenTarget = ModuleGenTarget.Asynchronous;
                    }
                    else {
                        this.addDiagnostic(
                            new Diagnostic(null, null, 0, 0, DiagnosticCode.Module_code_generation_0_not_supported, [type]));
                    }
                }
            }, 'm');

            var needsHelp = false;
            opts.flag('help', {
                usage: {
                    locCode: DiagnosticCode.Print_this_message,
                },
                set: (s) => {
                    needsHelp = true;
                }
            }, 'h');

            opts.flag('useCaseSensitiveFileResolution', {
                experimental: true,
                set: (s) => {
                    mutableSettings.useCaseSensitiveFileResolution = true;
                }
            });
            var shouldPrintVersionOnly = false;
            opts.flag('version', {
                usage: {
                    locCode: DiagnosticCode.Print_the_compiler_s_version_0,
                    args: [this.compilerVersion, this.researchCompilerVersion]
                },
                set: (s) => {
                    shouldPrintVersionOnly = true;
                }
            }, 'v');

            var locale: string = null;
            opts.option('locale', {
                experimental: true,
                usage: {
                    locCode: DiagnosticCode.Specify_locale_for_errors_and_messages_For_example_0_or_1,
                    args: ['en', 'ja-jp']
                },
                type: DiagnosticCode.STRING,
                set: (value) => {
                    locale = value;
                }
            });

            opts.flag('noImplicitAny', {
                usage: {
                    locCode: DiagnosticCode.Warn_on_expressions_and_declarations_with_an_implied_any_type,
                },
                set: (s) => {
                    mutableSettings.noImplicitAny = true;
                }
            });

            if (Environment.supportsCodePage()) {
                opts.option('codepage', {
                    usage: {
                        locCode: DiagnosticCode.Specify_the_codepage_to_use_when_opening_source_files,
                    },
                    type: DiagnosticCode.NUMBER,
                    set: (arg) => {
                        mutableSettings.codepage = parseInt(arg, 10);
                    }
                });
            }

            opts.parse(this.ioHost.arguments);
            mutableSettings.serviceMode = false;
            this.compilationSettings = ImmutableCompilationSettings.fromCompilationSettings(mutableSettings);

            if (locale) {
                if (!this.setLocale(locale)) {
                    return false;
                }
            }

            RT.applyVariadic<string>(this.inputFiles, "push", opts.unnamed);            
            //this.inputFiles.push.apply(this.inputFiles, opts.unnamed);

            // If no source files provided to compiler - print usage information
            if (this.inputFiles.length === 0 || needsHelp) {
                opts.printUsage();
                return false;
            }
            else if (shouldPrintVersionOnly) {
                opts.printVersion();
            }

            return !this.hasErrors;
        }

        private setLocale(locale: string): boolean {
            var matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());
            if (!matchResult) {
                this.addDiagnostic(new Diagnostic(null, null, 0, 0, DiagnosticCode.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, ['en', 'ja-jp']));
                return false;
            }

            var language = matchResult[1];
            var territory = matchResult[3];

            // First try the entire locale, then fall back to just language if that's all we have.
            if (!this.setLanguageAndTerritory(language, territory) &&
                !this.setLanguageAndTerritory(language, null)) {

                this.addDiagnostic(new Diagnostic(null, null, 0, 0, DiagnosticCode.Unsupported_locale_0, [locale]));
                return false;
            }

            return true;
        }

        private setLanguageAndTerritory(language: string, territory: string): boolean {

            var compilerFilePath = this.ioHost.getExecutingFilePath();
            var containingDirectoryPath = this.ioHost.dirName(compilerFilePath);

            var filePath = IOUtils.combine(containingDirectoryPath, language);
            if (territory) {
                filePath = filePath + "-" + territory;
            }

            filePath = this.resolvePath(IOUtils.combine(filePath, "diagnosticMessages.generated.json"));

            if (!this.fileExists(filePath)) {
                return false;
            }

            var fileContents = this.ioHost.readFile(filePath, this.compilationSettings.codepage());
            TypeScript.LocalizedDiagnosticMessages = JSON.parse(fileContents.contents);
            return true;
        }

        // Handle -watch switch
        private watchFiles() {
            if (!this.ioHost.watchFile) {
                this.addDiagnostic(
                    new Diagnostic(null, null, 0, 0, DiagnosticCode.Current_host_does_not_support_0_option, ['-w[atch]']));
                return;
            }

            var lastResolvedFileSet: string[] = []
            var watchers: { [x: string]: IFileWatcher; } = {};
            var firstTime = true;
            var onWatchedFileChange: () => void;

            var addWatcher = (fileName: string) => {
                if (!watchers[fileName]) {
                    var watcher = this.ioHost.watchFile(fileName, onWatchedFileChange);
                    watchers[fileName] = watcher;
                }
                else {
                    CompilerDiagnostics.debugPrint("Cannot watch file, it is already watched.");
                }
            };

            var removeWatcher = (fileName: string) => {
                if (watchers[fileName]) {
                    watchers[fileName].close();
                    delete watchers[fileName];
                }
                else {
                    CompilerDiagnostics.debugPrint("Cannot stop watching file, it is not being watched.");
                }
            };

            var onWatchedFileChange = () => {
                // Clean errors for previous compilation
                this.hasErrors = false;

                // Clear out any source file data we've cached.
                this.fileNameToSourceFile = new StringHashTable<SourceFile>();

                // Resolve file dependencies, if requested
                this.resolve();

                // Check if any new files were added to the environment as a result of the file change
                var oldFiles = lastResolvedFileSet;
                var newFiles = this.resolvedFiles.map(resolvedFile => resolvedFile.path).sort();

                var i = 0, j = 0;
                while (i < oldFiles.length && j < newFiles.length) {

                    var compareResult = oldFiles[i].localeCompare(newFiles[j]);
                    if (compareResult === 0) {
                        // No change here
                        i++;
                        j++;
                    }
                    else if (compareResult < 0) {
                        // Entry in old list does not exist in the new one, it was removed
                        removeWatcher(oldFiles[i]);
                        i++;
                    }
                    else {
                        // Entry in new list does exist in the new one, it was added
                        addWatcher(newFiles[j]);
                        j++;
                    }
                }

                // All remaining unmatched items in the old list have been removed
                for (var k = i; k < oldFiles.length; k++) {
                    removeWatcher(oldFiles[k]);
                }

                // All remaing unmatched items in the new list have been added
                for (k = j; k < newFiles.length; k++) {
                    addWatcher(newFiles[k]);
                }

                // Update the state
                lastResolvedFileSet = newFiles;

                // Print header
                if (!firstTime) {
                    var fileNames = "";
                    for (var k = 0; k < lastResolvedFileSet.length; k++) {
                        fileNames += Environment.newLine + "    " + lastResolvedFileSet[k];
                    }
                    this.ioHost.printLine(getLocalizedText(DiagnosticCode.NL_Recompiling_0, [fileNames]));
                }
                else {
                    firstTime = false;
                }

                // Trigger a new compilation
                this.compile();
            };

            // Switch to using stdout for all error messages
            this.ioHost.stderr = this.ioHost.stdout;

            onWatchedFileChange();
        }

        private getSourceFile(fileName: string): SourceFile {
            var sourceFile: SourceFile = this.fileNameToSourceFile.lookup(fileName);
            if (!sourceFile) {
                // Attempt to read the file
                var fileInformation: FileInformation;

                try {
                    fileInformation = this.ioHost.readFile(fileName, this.compilationSettings.codepage());
                }
                catch (e) {
                    this.addDiagnostic(new Diagnostic(null, null, 0, 0, DiagnosticCode.Cannot_read_file_0_1, [fileName, (""+e.message)]));
                    fileInformation = new FileInformation("", ByteOrderMark.None);
                }

                var snapshot = ScriptSnapshot.fromString(fileInformation.contents);
                var sourceFile = new SourceFile(snapshot, fileInformation.byteOrderMark);
                this.fileNameToSourceFile.add(fileName, sourceFile);
            }

            return sourceFile;
        }

        private getDefaultLibraryFilePath(): string {
            var compilerFilePath = this.ioHost.getExecutingFilePath();
            var containingDirectoryPath = this.ioHost.dirName(compilerFilePath);
            var libraryFilePath = this.resolvePath(IOUtils.combine(containingDirectoryPath, "lib.d.ts"));

            return libraryFilePath;
        }

        /// IReferenceResolverHost methods
        getScriptSnapshot(fileName: string): IScriptSnapshot {
            return this.getSourceFile(fileName).scriptSnapshot;
        }

        resolveRelativePath(path: string, directory: string): string {
            var start = new Date().getTime();

            var unQuotedPath = stripStartAndEndQuotes(path);
            var normalizedPath: string;

            if (isRooted(unQuotedPath) || !directory) {
                normalizedPath = unQuotedPath;
            } else {
                normalizedPath = IOUtils.combine(directory, unQuotedPath);
            }

            // get the absolute path
            normalizedPath = this.resolvePath(normalizedPath);

            // Switch to forward slashes
            normalizedPath = switchToForwardSlashes(normalizedPath);

            return normalizedPath;
        }

        private fileExistsCache = createIntrinsicsObject<boolean>();

        fileExists(path: string): boolean {
            var exists = this.fileExistsCache[path];
            if (exists === undefined) {
                var start = new Date().getTime();
                exists = this.ioHost.fileExists(path);
                this.fileExistsCache[path] = exists;
                TypeScript.compilerFileExistsTime += new Date().getTime() - start;
            }

            return exists;
        }

        getParentDirectory(path: string): string {
            var start = new Date().getTime();
            var result = this.ioHost.dirName(path);
            TypeScript.compilerDirectoryNameTime += new Date().getTime() - start;

            return result;
        }
        private static errFileMap: { [errorNumber: string]: { count: number; msg: string; files: { [fileName: string]: { count: number } } } } = {};
        private static fileErrMap: { [fileName: string]: { count: number; errors: { [errorNumber: string]: { count: number } } } } = {};

        private reportDiagStats() {
            this.compilationSettings.reportUnmatchedKnownWarnings((fileName:string, contents:string) => this.writeFile(fileName, contents, false));
            if (!this.compilationSettings.errorStats()) return;
            var toSortedArray = (m: any): Pair<string,any>[] => {
                var out: Pair<string, any>[] = [];
                for (var x in m) {
                    if (m[x].hasOwnProperty("count")) {
                        out.push({ fst: <string>x, snd: <any>m[x] });
                    }
                }
                return out.sort((x, y) => x.snd.count - y.snd.count);
            };
            var errs = toSortedArray(BatchCompiler.errFileMap);
            this.ioHost.stderr.WriteLine("Error stats");
            errs.forEach((p) => {
                this.ioHost.stderr.WriteLine(p.fst + " : " + p.snd.count);
                this.ioHost.stderr.WriteLine(p.snd.msg);
                var files = toSortedArray(p.snd.files);
                files.forEach((f) => {
                    this.ioHost.stderr.WriteLine("\t " + f.snd.count + " occurrences in " + f.fst);
                }); 
            });

            var files = toSortedArray(BatchCompiler.fileErrMap);
            files.forEach((f) => {
                this.ioHost.stderr.WriteLine(f.snd.count + " errors in " + f.fst);
                var errors = toSortedArray(f.snd.errors);
                errors.forEach((p) => {
                    this.ioHost.stderr.WriteLine("\t " + p.fst + " occurs " + p.snd.count + " times");
                }); 
            });
        }

        private addDiagnostic(diagnostic: Diagnostic) {
            var diagnosticInfo = diagnostic.info();
            if (diagnosticInfo.category === DiagnosticCategory.Error) {
                this.hasErrors = true;
            }
            if (diagnostic.fileName()) {
                var location = diagnostic.fileName() + "(" + (diagnostic.line() + 1) + "," + (diagnostic.character() + 1) + ")";
                if (!this.compilationSettings.shouldWarn(diagnostic, diagnosticInfo)) return;
                this.ioHost.stderr.Write(location + ": ");
            }
            var errNum = diagnosticInfo.code.toString();
            var fileName = diagnostic.fileName();
            if (this.compilationSettings.errorStats()) {
                if (!BatchCompiler.errFileMap[errNum]) {
                    BatchCompiler.errFileMap[errNum] = {
                        count: 0, msg: diagnostic.diagnosticKey(), files: {}
                    };
                }
                if (!BatchCompiler.fileErrMap[fileName]) {
                    BatchCompiler.fileErrMap[fileName] = {
                        count: 0, errors: {}
                    };
                }
                BatchCompiler.errFileMap[errNum].count++;
                BatchCompiler.errFileMap[errNum].files[fileName]
                ? <any>BatchCompiler.errFileMap[errNum].files[fileName].count++
                : BatchCompiler.errFileMap[errNum].files[fileName] = { count: 1 };

                BatchCompiler.fileErrMap[fileName].count++;
                BatchCompiler.fileErrMap[fileName].errors[errNum]
                ? <any>BatchCompiler.fileErrMap[fileName].errors[errNum].count++
                : BatchCompiler.fileErrMap[fileName].errors[errNum] = { count: 1 };
            }
            this.ioHost.stderr.WriteLine(diagnostic.message());
        }

        private tryWriteOutputFiles(outputFiles: OutputFile[]): boolean {
            for (var i = 0, n = outputFiles.length; i < n; i++) {
                var outputFile = outputFiles[i];

                try {
                    this.writeFile(outputFile.name, outputFile.text, outputFile.writeByteOrderMark);
                }
                catch (e) {
                    this.addDiagnostic(
                        new Diagnostic(outputFile.name, null, 0, 0, DiagnosticCode.Emit_Error_0, [""+e.message]));
                    return false;
                }
            }

            return true;
        }

        writeFile(fileName: string, contents: string, writeByteOrderMark: boolean): void {
            var start = new Date().getTime();
            IOUtils.writeFileAndFolderStructure(this.ioHost, fileName, contents, writeByteOrderMark);
            TypeScript.emitWriteFileTime += new Date().getTime() - start;
        }

        directoryExists(path: string): boolean {
            var start = new Date().getTime();
            var result = this.ioHost.directoryExists(path);
            TypeScript.compilerDirectoryExistsTime += new Date().getTime() - start;
            return result;
        }

        // For performance reasons we cache the results of resolvePath.  This avoids costly lookup
        // on the disk once we've already resolved a path once.
        private resolvePathCache = createIntrinsicsObject<string>();

        resolvePath(path: string): string {
            var cachedValue = this.resolvePathCache[path];
            if (!cachedValue) {
                var start = new Date().getTime();
                cachedValue = this.ioHost.resolvePath(path);
                this.resolvePathCache[path] = cachedValue;
                TypeScript.compilerResolvePathTime += new Date().getTime() - start;
            }

            return cachedValue;
        }
    }

    // Start the batch compilation using the current hosts IO
    var batch = new TypeScript.BatchCompiler(IO);
    batch.batchCompile();
}