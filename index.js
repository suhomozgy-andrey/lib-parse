"use strict";
exports.__esModule = true;
var ts = require("typescript");
var fs_1 = require("fs");
var path = require("path");
var LIBRARY_NAME = 'lodash';
var ALLOWED_FILE_TYPES = 'tsx, jsx, ts, js';
var RESULT_FILE_NAME = 'app-lodash-results.json';
var FILE_EXTENSION_PATTERN = new RegExp(".[".concat(ALLOWED_FILE_TYPES.split(',').map(function (el) { return "(".concat(el.trim(), ")"); }).join("|"), "]+$"), 'i');
var testFolder = '../../Testlio/app/src';
var saveToFile = function (data, fileName) {
    var json = JSON.stringify(data);
    (0, fs_1.writeFile)(fileName, json, 'utf8', function () {
        console.log('File saved');
    });
};
var getAllFiles = function (dirPath, arrayOfFiles) {
    if (arrayOfFiles === void 0) { arrayOfFiles = []; }
    var files = (0, fs_1.readdirSync)(dirPath, { withFileTypes: true });
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if ((0, fs_1.statSync)(dirPath + "/" + file.name).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file.name, arrayOfFiles);
        }
        else {
            arrayOfFiles.push({
                path: path.join(__dirname, dirPath, "/", file.name)
            });
        }
    });
    return arrayOfFiles;
};
var sourceFile = function (fileName) { return ts.createSourceFile(fileName, (0, fs_1.readFileSync)(fileName).toString(), ts.ScriptTarget.Latest, false, ts.ScriptKind.TS); };
// @ts-ignore
var getImportedComponentsByFile = function (tsSourceFile) { return function (libraryName) { return tsSourceFile.statements.filter(function (el) { return el.kind === ts.SyntaxKind.ImportDeclaration; }).filter(function (el) { return el.moduleSpecifier.text.includes(libraryName); }).flatMap(function (el) {
    var _a, _b, _c, _d;
    return ({
        file: path.relative(process.cwd(), tsSourceFile.fileName).replaceAll('../', ''),
        // @ts-ignore
        library: el.moduleSpecifier.text,
        // @ts-ignore
        components: (_d = (_c = (_b = (_a = el.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c.map(function (el) { return el.name.escapedText; })) !== null && _d !== void 0 ? _d : []
    });
}); }; };
var componentUsageByFiles = getAllFiles(testFolder).filter(function (file) { return file.path.match(FILE_EXTENSION_PATTERN); }).flatMap(function (file) { return getImportedComponentsByFile(sourceFile(file.path))(LIBRARY_NAME); }).filter(function (result) { return result.components.length > 0; });
saveToFile(componentUsageByFiles, RESULT_FILE_NAME);
