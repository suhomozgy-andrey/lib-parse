import * as ts from 'typescript';
import { readFileSync, readdirSync, statSync, writeFile } from "fs";

const path = require("path")

const LIBRARY_NAME = 'lodash';
const ALLOWED_FILE_TYPES = 'tsx, jsx, ts, js';
const RESULT_FILE_NAME = 'app-lodash-results.json';

const FILE_EXTENSION_PATTERN = new RegExp(`.[${ALLOWED_FILE_TYPES.split(',').map((el) => `(${el.trim()})`).join("|")}]+$`, 'i');

const testFolder = '../../Testlio/app/src';

const saveToFile = (data: any, fileName: string) => {
  const json = JSON.stringify(data);

  writeFile(fileName, json, 'utf8', () => {
    console.log('File saved')
  });
}


const getAllFiles = (dirPath, arrayOfFiles = []): {path: string; ext: string}[] => {
  const files = readdirSync(dirPath, { withFileTypes: true })  
  arrayOfFiles = arrayOfFiles || []

  files.forEach((file) => {
    if (statSync(dirPath + "/" + file.name).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file.name, arrayOfFiles)
    } else {
      arrayOfFiles.push({
        path: path.join(__dirname, dirPath, "/", file.name),
      })
    }
  })

  return arrayOfFiles
}

const sourceFile = (fileName: string) => ts.createSourceFile(
  fileName,
  readFileSync(fileName).toString(),
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TS
);
// @ts-ignore
const getImportedComponentsByFile = (tsSourceFile: ts.SourceFile) => (libraryName: string) => tsSourceFile.statements.filter((el) => el.kind === ts.SyntaxKind.ImportDeclaration).filter((el) => el.moduleSpecifier.text.includes(libraryName) ).flatMap((el) => ({
  file: path.relative(process.cwd(), tsSourceFile.fileName).replaceAll('../', ''),
  // @ts-ignore
  library: el.moduleSpecifier.text,
  // @ts-ignore
  components: el.importClause?.namedBindings?.elements?.map((el) => el.name.escapedText) ?? []
}));

const componentUsageByFiles = getAllFiles(testFolder).filter((file) => file.path.match(FILE_EXTENSION_PATTERN)).flatMap((file) => getImportedComponentsByFile(sourceFile(file.path))(LIBRARY_NAME)).filter((result) => result.components.length > 0);

saveToFile(componentUsageByFiles, RESULT_FILE_NAME)
