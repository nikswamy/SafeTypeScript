
exports.sys = (function () {
    function getWScriptSystem() {
        var fso = new ActiveXObject("Scripting.FileSystemObject");

        var fileStream = new ActiveXObject("ADODB.Stream");
        fileStream.Type = 2;

        var binaryStream = new ActiveXObject("ADODB.Stream");
        binaryStream.Type = 1;

        var args = [];
        for (var i = 0; i < WScript.Arguments.length; i++) {
            args[i] = WScript.Arguments.Item(i);
        }

        function readFile(fileName, encoding) {
            if (!fso.FileExists(fileName)) {
                return undefined;
            }
            fileStream.Open();
            try  {
                if (encoding) {
                    fileStream.Charset = encoding;
                    fileStream.LoadFromFile(fileName);
                } else {
                    fileStream.Charset = "x-ansi";
                    fileStream.LoadFromFile(fileName);
                    var bom = fileStream.ReadText(2) || "";

                    fileStream.Position = 0;

                    fileStream.Charset = bom.length >= 2 && (bom.charCodeAt(0) === 0xFF && bom.charCodeAt(1) === 0xFE || bom.charCodeAt(0) === 0xFE && bom.charCodeAt(1) === 0xFF) ? "unicode" : "utf-8";
                }

                return fileStream.ReadText();
            } catch (e) {
                throw e.number === -2147024809 ? new Error(ts.Diagnostics.Unsupported_file_encoding.key) : e;
            } finally {
                fileStream.Close();
            }
        }

        function writeFile(fileName, data) {
            fileStream.Open();
            binaryStream.Open();
            try  {
                fileStream.Charset = "utf-8";
                fileStream.WriteText(data);

                fileStream.Position = 3;
                fileStream.CopyTo(binaryStream);
                binaryStream.SaveToFile(fileName, 2);
            } finally {
                binaryStream.Close();
                fileStream.Close();
            }
        }

        return {
            args: args,
            newLine: "\r\n",
            useCaseSensitiveFileNames: false,
            write: function (s) {
                WScript.StdOut.Write(s);
            },
            writeErr: function (s) {
                WScript.StdErr.Write(s);
            },
            readFile: readFile,
            writeFile: writeFile,
            resolvePath: function (path) {
                return fso.GetAbsolutePathName(path);
            },
            fileExists: function (path) {
                return fso.FileExists(path);
            },
            directoryExists: function (path) {
                return fso.FolderExists(path);
            },
            createDirectory: function (directoryName) {
                if (!this.directoryExists(directoryName)) {
                    fso.CreateFolder(directoryName);
                }
            },
            getExecutingFilePath: function () {
                return WScript.ScriptFullName;
            },
            getCurrentDirectory: function () {
                return new ActiveXObject("WScript.Shell").CurrentDirectory;
            },
            getMemoryUsage: function () {
                return 0;
            },
            exit: function (exitCode) {
                try  {
                    WScript.Quit(exitCode);
                } catch (e) {
                }
            }
        };
    }
    function getNodeSystem() {
        var _fs = require("fs");
        var _path = require("path");
        var _os = require('os');

        var platform = _os.platform();

        var useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin";

        function readFile(fileName, encoding) {
            if (!_fs.existsSync(fileName)) {
                return undefined;
            }
            var buffer = _fs.readFileSync(fileName);
            var len = buffer.length;
            if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                len &= ~1;
                for (var i = 0; i < len; i += 2) {
                    var temp = buffer[i];
                    buffer[i] = buffer[i + 1];
                    buffer[i + 1] = temp;
                }
                return buffer.toString("utf16le", 2);
            }
            if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                return buffer.toString("utf16le", 2);
            }
            if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                return buffer.toString("utf8", 3);
            }

            return buffer.toString("utf8");
        }

        function writeFile(fileName, data) {
            _fs.writeFileSync(fileName, data, "utf8");
        }

        return {
            args: process.argv.slice(2),
            newLine: _os.EOL,
            useCaseSensitiveFileNames: useCaseSensitiveFileNames,
            write: function (s) {
                process.stdout.write(s);
            },
            writeErr: function (s) {
                process.stderr.write(s);
            },
            readFile: readFile,
            writeFile: writeFile,
            resolvePath: function (path) {
                return _path.resolve(path);
            },
            fileExists: function (path) {
                return _fs.existsSync(path);
            },
            directoryExists: function (path) {
                return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
            },
            createDirectory: function (directoryName) {
                if (!this.directoryExists(directoryName)) {
                    _fs.mkdirSync(directoryName);
                }
            },
            getExecutingFilePath: function () {
                return process.mainModule.filename;
            },
            getCurrentDirectory: function () {
                return process.cwd();
            },
            getMemoryUsage: function () {
                global.gc();
                return process.memoryUsage().heapUsed;
            },
            exit: function (exitCode) {
                process.exit(exitCode);
            }
        };
    }
    if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
        return getWScriptSystem();
    } else if (typeof module !== "undefined" && module.exports) {
        return getNodeSystem();
    } else {
        return undefined;
    }
})();
