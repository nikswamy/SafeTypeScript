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

///<reference path='enumerator.ts' />
///<reference path='process.ts' />
///<reference path='core\references.ts' />

module TypeScript {

    export interface IFindFileResult extends RT.Virtual {
        fileInformation: FileInformation;
        path: string;
    }

    export interface IFileWatcher extends RT.Virtual {
        close(): void;
    }

    export interface IIO extends RT.Virtual {
        readFile(path: string, codepage: number): FileInformation;
        writeFile(path: string, contents: string, writeByteOrderMark: boolean): void;
        deleteFile(path: string): void;
        dir(path: string, re?: RegExp, options?: { recursive?: boolean; }): string[];
        fileExists(path: string): boolean;
        directoryExists(path: string): boolean;
        createDirectory(path: string): void;
        resolvePath(path: string): string;
        dirName(path: string): string;
        findFile(rootPath: string, partialFilePath: string): IFindFileResult;
        print(str: string): void;
        printLine(str: string): void;
        arguments: string[];
        stderr: ITextWriter;
        stdout: ITextWriter;
        watchFile : (fileName: string, callback: (x: string) => void) => IFileWatcher;
        run(source: string, fileName: string): void;
        getExecutingFilePath(): string;
        quit(exitCode?: number): void;
    }

    export module IOUtils {
        // Creates the directory including its parent if not already present
        function createDirectoryStructure(ioHost: IIO, dirName: string) {
            if (ioHost.directoryExists(dirName)) {
                return;
            }

            var parentDirectory = ioHost.dirName(dirName);
            if (parentDirectory != "") {
                createDirectoryStructure(ioHost, parentDirectory);
            }
            ioHost.createDirectory(dirName);
        }

        // Creates a file including its directory structure if not already present
        export function writeFileAndFolderStructure(ioHost: IIO, fileName: string, contents: string, writeByteOrderMark: boolean): void {
            var start = new Date().getTime();
            var path = ioHost.resolvePath(fileName);
            TypeScript.ioHostResolvePathTime += new Date().getTime() - start;

            var start = new Date().getTime();
            var dirName = ioHost.dirName(path);
            TypeScript.ioHostDirectoryNameTime += new Date().getTime() - start;

            var start = new Date().getTime();
            createDirectoryStructure(ioHost, dirName);
            TypeScript.ioHostCreateDirectoryStructureTime += new Date().getTime() - start;

            var start = new Date().getTime();
            ioHost.writeFile(path, contents, writeByteOrderMark);
            TypeScript.ioHostWriteFileTime += new Date().getTime() - start;
        }

        export function throwIOError(message: string, error: Error) {
            var errorMessage = message;
            if (error && error.message) {
                errorMessage += (" " + error.message);
            }
            throw new Error(errorMessage);
        }

        export function combine(prefix: string, suffix: string): string {
            return prefix + "/" + suffix;
        }

        export class BufferedTextWriter implements ITextWriter {
            public buffer = "";
            // Inner writer does not need a WriteLine method, since the BufferedTextWriter wraps it itself
            constructor(public writer: { Write: (str: string) => void; Close: () => void; }, public capacity = 1024) { }
            Write(str: string) {
                this.buffer += str;
                if (this.buffer.length >= this.capacity) {
                    this.writer.Write(this.buffer);
                    this.buffer = "";
                }
            }
            WriteLine(str: string) {
                this.Write(str + '\r\n');
            }
            Close() {
                this.writer.Write(this.buffer);
                this.writer.Close();
                this.buffer = null;
            }
        }
    }

    export var IO = (function () {

        // Create an IO object for use inside WindowsScriptHost hosts
        // Depends on WSCript and FileSystemObject
        function getWindowsScriptHostIO(): IIO {
            var fso = new ActiveXObject("Scripting.FileSystemObject");
            var streamObjectPool: any[] = [];

            function getStreamObject(): any {
                if (streamObjectPool.length > 0) {
                    return streamObjectPool.pop();
                } else {
                    return new ActiveXObject("ADODB.Stream");
                }
            }

            function releaseStreamObject(obj: any) {
                streamObjectPool.push(obj);
            }

            var args: any[] = [];
            for (var i = 0; i < WScript.Arguments.length; i++) {
                args[i] = WScript.Arguments.Item(i);
            }

            return {
                readFile (path: string, codepage: number=0): FileInformation {
                    return Environment.readFile(path, codepage);
                },

                writeFile (path: string, contents: string, writeByteOrderMark: boolean) {
                    Environment.writeFile(path, contents, writeByteOrderMark);
                },

                fileExists (path: string): boolean {
                    return fso.FileExists(path);
                },

                resolvePath (path: string): string {
                    return fso.GetAbsolutePathName(path);
                },

                dirName (path: string): string {
                    return fso.GetParentFolderName(path);
                },

                findFile (rootPath: string, partialFilePath: string): IFindFileResult {
                    var path = fso.GetAbsolutePathName(rootPath) + "/" + partialFilePath;
                    while (true) {
                        if (fso.FileExists(path)) {
                            return { fileInformation: <FileInformation>this.readFile(path), path: path };
                        }
                        else {
                            rootPath = fso.GetParentFolderName(fso.GetAbsolutePathName(rootPath));

                            if (rootPath == "") {
                                return null;
                            }
                            else {
                                path = fso.BuildPath(rootPath, partialFilePath);
                            }
                        }
                    }
                },

                deleteFile (path: string): void {
                    try {
                        if (fso.FileExists(path)) {
                            fso.DeleteFile(path, true); // true: delete read-only files
                        }
                    } catch (e) {
                        IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Could_not_delete_file_0, [path]), e);
                    }
                },

                directoryExists (path) {
                    return <boolean>fso.FolderExists(path);
                },

                createDirectory (path) {
                    try {
                        if (!this.directoryExists(path)) {
                            fso.CreateFolder(path);
                        }
                    } catch (e) {
                        IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Could_not_create_directory_0, [path]), e);
                    }
                },

                dir (path, spec?, options?) {
                    options = options || <{ recursive?: boolean; }>{};
                    function filesInFolder(folder: any, root: string): string[] {
                        var paths: string[] = [];
                        var fc: Enumerator;

                        if (options.recursive) {
                            fc = new Enumerator(folder.subfolders);

                            for (; !fc.atEnd(); fc.moveNext()) {
                                paths = paths.concat(filesInFolder(fc.item(), root + "/" + fc.item().Name));
                            }
                        }

                        fc = new Enumerator(folder.files);

                        for (; !fc.atEnd(); fc.moveNext()) {
                            if (!spec || fc.item().Name.match(spec)) {
                                paths.push(root + "/" + fc.item().Name);
                            }
                        }

                        return paths;
                    }

                    var folder = fso.GetFolder(path);
                    var paths: string[] = [];

                    return filesInFolder(folder, path);
                },

                print (str) {
                    WScript.StdOut.Write(str);
                },

                printLine (str) {
                    WScript.Echo(str);
                },

                arguments: <string[]>args,
                stderr: WScript.StdErr,
                stdout: WScript.StdOut,
                watchFile: <(fileName: string, callback: (x: string) => void) => IFileWatcher>null,
                run (source, fileName) {
                    try {
                        eval(source);
                    } catch (e) {
                        IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Error_while_executing_file_0, [fileName]), e);
                    }
                },
                getExecutingFilePath () {
                    return WScript.ScriptFullName;
                },
                quit (exitCode: number = 0) {
                    try {
                        WScript.Quit(exitCode);
                    } catch (e) {
                    }
                }
            };

        };

        // Create an IO object for use inside Node.js hosts
        // Depends on 'fs' and 'path' modules
        function getNodeIO(): IIO {

            var _fs = require('fs');
            var _path = require('path');
            var _module = require('module');

        return {
                readFile (file: string, codepage: number=0): FileInformation {
                    return Environment.readFile(file, codepage);
                },

                writeFile (path: string, contents: string, writeByteOrderMark: boolean) {
                    Environment.writeFile(path, contents, writeByteOrderMark);
                },

                deleteFile (path) {
                    try {
                        _fs.unlinkSync(path);
                    } catch (e) {
                        IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Could_not_delete_file_0, [path]), e);
                    }
                },
                fileExists (path: string): boolean {
                    return _fs.existsSync(path);
                },

                dir (path, spec?, options?) {
                    options = options || <{ recursive?: boolean; }>{};

                    function filesInFolder(folder: string): string[] {
                        var paths: string[] = [];

                        try {
                            var files = _fs.readdirSync(folder);
                            for (var i = 0; i < files.length; i++) {
                                var stat = _fs.statSync(folder + "/" + files[i]);
                                if (options.recursive && stat.isDirectory()) {
                                    paths = paths.concat(filesInFolder(folder + "/" + files[i]));
                                } else if (stat.isFile() && (!spec || files[i].match(spec))) {
                                    paths.push(folder + "/" + files[i]);
                                }
                            }
                        } catch (err) {
                            /*
                            *   Skip folders that are inaccessible
                            */
                        }

                        return paths;
                    }

                    return filesInFolder(path);
                },
                createDirectory (path: string): void {
                    try {
                        if (!this.directoryExists(path)) {
                            _fs.mkdirSync(path);
                        }
                    } catch (e) {
                        IOUtils.throwIOError(TypeScript.getDiagnosticMessage(TypeScript.DiagnosticCode.Could_not_create_directory_0, [path]), e);
                    }
                },

                directoryExists (path: string): boolean {
                    return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
                },
                resolvePath (path: string): string {
                    return _path.resolve(path);
                },
                dirName (path: string): string {
                    var dirPath = _path.dirname(path);

                    // Node will just continue to repeat the root path, rather than return null
                    if (dirPath === path) {
                        dirPath = null;
                    }

                    return dirPath;
                },
                findFile (rootPath: string, partialFilePath: string): IFindFileResult {
                    var path = rootPath + "/" + partialFilePath;

                    while (true) {
                        if (_fs.existsSync(path)) {
                            return { fileInformation: <FileInformation>this.readFile(path), path: path };
                        }
                        else {
                            var parentPath = _path.resolve(rootPath, "..");

                            // Node will just continue to repeat the root path, rather than return null
                            if (rootPath === parentPath) {
                                return null;
                            }
                            else {
                                rootPath = parentPath;
                                path = _path.resolve(rootPath, partialFilePath);
                            }
                        }
                    }
                },
                print (str) { process.stdout.write(str); },
                printLine (str) { process.stdout.write(str + '\n') },
                arguments: process.argv.slice(2),
                stderr: {
                    Write (str) { process.stderr.write(str); },
                    WriteLine (str) { process.stderr.write(str + '\n'); },
                    Close () { }
                },
                stdout: {
                    Write (str) { process.stdout.write(str); },
                    WriteLine (str) { process.stdout.write(str + '\n'); },
                    Close () { }
                },
                watchFile: function (fileName: string, callback: (x: string) => void): IFileWatcher {
                    var firstRun = true;
                    var processingChange = false;

                    var fileChanged: any = function (curr: any, prev: any) {
                        if (!firstRun) {
                            if (curr.mtime < prev.mtime) {
                                return;
                            }

                            _fs.unwatchFile(fileName, fileChanged);
                            if (!processingChange) {
                                processingChange = true;
                                callback(fileName);
                                setTimeout(function () { processingChange = false; }, 100);
                            }
                        }
                        firstRun = false;
                        _fs.watchFile(fileName, { persistent: true, interval: 500 }, fileChanged);
                    };

                    fileChanged();
                    return {
                        fileName: fileName,
                        close() {
                            _fs.unwatchFile(fileName, fileChanged);
                        }
                    };
                },
                run (source, fileName) {
                    require.main.fileName = fileName;
                    require.main.paths = _module._nodeModulePaths(_path.dirname(_fs.realpathSync(fileName)));
                    require.main._compile(source, fileName);
                },
                getExecutingFilePath () {
                    return process.mainModule.filename;
                },
                quit (code?: number) {
                    var stderrFlushed = process.stderr.write('');
                    var stdoutFlushed = process.stdout.write('');
                    process.stderr.on('drain', function () {
                        stderrFlushed = true;
                        if (stdoutFlushed) {
                            process.exit(code);
                        }
                    });
                    process.stdout.on('drain', function () {
                        stdoutFlushed = true;
                        if (stderrFlushed) {
                            process.exit(code);
                        }
                    });
                    setTimeout(function () {
                        process.exit(code);
                    }, 5);
                }
            }
    };

        if (typeof WScript !== "undefined" && typeof ActiveXObject === "function")
            return getWindowsScriptHostIO();
        else if (typeof module !== 'undefined' && module.exports)
            return getNodeIO();
        else
            return null; // Unsupported host
    })();
}