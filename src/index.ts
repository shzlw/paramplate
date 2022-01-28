#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const PARAMS_ARG = '--params';
const SRC_ARG = '--src';
const DEST_ARG = '--dest';
const EXT_ARG = '--ext';

const DEFAULT_EXT = '.pp';

const bgYellow = "\x1b[43m"
const bgBlue = "\x1b[44m"
const bgMagenta = "\x1b[45m"
const bgCyan = "\x1b[46m"
const bgRed = "\x1b[41m";
const bgGreen = "\x1b[42m";
const reset = "\x1b[0m";

console.log(`${bgGreen}%s${reset}`, 'Paramplate');

const {
  paramsDirs,
  srcDir,
  destDir,
  templateExt
} = parseArgs();

console.log(`${bgGreen}Src dir${reset} ${srcDir}`);
console.log(`${bgGreen}Dest dir${reset} ${destDir}`);
console.log(`${bgGreen}Template ext${reset} ${templateExt}`);

const paramsFiles = paramsDirs.split(',');
const paramsMap = new Map<string, string>();
paramsFiles.forEach((paramsPath) => {
  console.log(`${bgGreen}Load param file${reset} ${paramsPath}`);
  loadParams(paramsPath, paramsMap);
})

parseSrcDir(srcDir, paramsMap);

console.log(`${bgGreen}%s${reset}`, "Done!");

interface Args {
  paramsDirs: string,
  srcDir: string,
  destDir: string,
  templateExt: string
}

function parseArgs(): Args {
  const argsMap = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length - 1; i = i + 2) {
    const key = args[i];
    let value = args[i + 1];
    if (key === SRC_ARG || key === DEST_ARG) {
      value = path.resolve(path.normalize(value));
    }
    argsMap.set(key, value);
  }

  const srcDir = validateInput(SRC_ARG, argsMap);
  const destDir = validateInput(DEST_ARG, argsMap);
  const paramsDirs = validateInput(PARAMS_ARG, argsMap);
  const templateExt = validateInput(EXT_ARG, argsMap, DEFAULT_EXT);

  return {
    paramsDirs,
    srcDir,
    destDir,
    templateExt
  };
}


function parseSrcDir(dir: string, paramsMap: Map<string, any>) {
  fs.readdirSync(dir).forEach((file: string) => {
    let fullPath = path.join(dir, file);
    if (isDir(fullPath)) {
      const diff = fullPath.substring(srcDir.length);
      const destFilePath = path.join(destDir, diff);
      mkdir(destFilePath);
      parseSrcDir(fullPath, paramsMap);
    } else {
      const currDir = path.dirname(fullPath);
      const filename = path.basename(fullPath);
      const originalFilename = isTemplateFile(filename);

      const srcFile = fs.readFileSync(fullPath, 'utf8');
      if (originalFilename === null) {
        const diff = currDir.substring(srcDir.length);
        const destFilePath = path.join(destDir, diff, filename);
        writeFile(destFilePath, srcFile);
      } else {
        const content = parseMustache(srcFile, paramsMap);
        const diff = currDir.substring(srcDir.length);
        const destFilePath = path.join(destDir, diff, originalFilename);

        console.log(`${bgGreen}Template parsed${reset} ${destFilePath}`);
        writeFile(destFilePath, content);
      }
    }  
  });
}

function writeFile(pathname: string, content: string) {
  try {
    const currDir = path.dirname(pathname);
    mkdir(currDir);
    fs.writeFileSync(pathname, content);
  } catch (err) {
    logError(err);
  }
}

function mkdir(pathname: string) {
  try {
    if (!fs.existsSync(pathname)) {
      fs.mkdirSync(pathname, { recursive: true });
    }
  } catch (err) {
    logError(err);
  }
}

function isDir(pathname: string) {
  try {
    const stat = fs.lstatSync(pathname);
    return stat.isDirectory();
  } catch (err) {
    logError(err);
    return false;
  }
}

function isTemplateFile(filename: string) {
  const offset = templateExt.length;
  const ext = filename.slice(-offset);
  if (ext === templateExt) {
    return filename.slice(0, -offset);
  }
  return null;
}

function parseMustache(file: string, paramsMap: Map<string, string>) {
  let content = "";

  let i = 0;
  const size = file.length;
  while (i < size) {
    if (file[i] === '{' && (i + 1 < size) && file[i + 1] == '{') {
      let j = i + 2;
      let tag = '';
      while (j < size) {
        if (file[j] == '}' && (j + 1 < size) && file[j + 1] == '}') {
          const value = paramsMap.get(tag);
          if (!value) {
            logError(`${tag} cannot be found in the param files`);
          }
          content += value;
          i = j + 2;
          tag = '';
          break;
        }

        if (file[j] !== ' ') {
          tag += file[j];
        }

        j++;
      }
    }

    if (i < size) {
      content += file[i];
      i++;
    }
  }

  return content;
}

function loadParams(pathname: string, paramsMap: Map<string, string>) {
  const file = fs.readFileSync(pathname, 'utf8').toString();
  const obj = JSON.parse(file);
  flattenObject(obj, '', paramsMap);
}

function flattenObject(obj: any, path: string, map: Map<string, string>) {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      // obj is array
      obj.forEach((nextObj, i) => {
        flattenObject(nextObj, path + '[' + i + ']', map);
      });
    } else {
      // obj is object
      let pathPrefix = path === '' ? '' : path + '.';
      Object.keys(obj).forEach((key) => {
        const nextObj = obj[key];
        flattenObject(nextObj, pathPrefix + key, map);
      });
    }
  } else {
    // obj is value
    if (map.has(path)) {
      console.log(`${bgYellow}Param overwritten${reset} ${path}`);
    }
    map.set(path, obj);
  }
}

function validateInput(param: string, argsMap: Map<string, string>, defaultValue?: string): string {
  const value = argsMap.get(param);
  if (!value) {
    if (defaultValue) {
      return defaultValue;
    }

    logError(`${value} value is required`);
    process.exit(0);
  }
  return value;
}

function logError(error: any) {
  console.error(`${bgRed}Error${reset} ${error}`);
}
