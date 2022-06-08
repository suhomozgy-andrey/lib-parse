import arg from 'arg';
import inquirer from 'inquirer';

// import { libParse } from './main';

function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--packageName': String,
     '--targetDir': String,
     '--outputFileName': String,
     '--yes': Boolean,
     '-p': '--packageName',
     '-td': '--targetDir',
     '-ofn': '--outputFileName',
     '-y': '--yes',
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   skipPrompts: args['--yes'] || false,
   packageName: args['--packageName'] || '',
   targetDir: args['--targetDir'] || '',
   outputFileName: args['--outputFileName'] || 'example.json',
 };
}

async function promptForMissingOptions(options) {
    if (options.skipPrompts) {
      return {
        ...options,
      };
    }
   
    const questions = [];
   
    if (!options.packageName) {
      questions.push({
        type: 'input',
        name: 'packageName',
        message: 'Specify a library name:',
        default: '@testlio/panthera',
      });
    }
    if (!options.targetDir) {
      questions.push({
        type: 'input',
        name: 'targetDir',
        message: 'Specify a directory:'
      });
    }
   
    const answers = await inquirer.prompt(questions);
    return {
      ...options,
      packageName: options.packageName || answers.packageName,
      targetDir: options.targetDir || answers.targetDir,
    };
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  console.log("options", options);
  // await libParse(options);
}
