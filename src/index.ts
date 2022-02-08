#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  fgRed: '\x1b[31m',
  fgYellow: '\x1b[33m'
}

const INPUT_ARGS = {
  params: '--params',
  src: '--src',
  dest: '--dest',
  ext: '--ext',
  debug: '--debug'
}

// Start
console.log('################');
console.log('Hello paramplate');
console.log('################');
console.log();

const {
  paramsDirs,
  srcDir,
  destDir,
  templateExt,
  isDebug
} = parseArgs();

debugLog(`# Inputs`, isDebug);
debugLog(`- Src dir: ${srcDir}`, isDebug);
debugLog(`- Dest dir: ${destDir}`, isDebug);
debugLog(`- Template ext: ${templateExt}`, isDebug);

const paramsFiles = paramsDirs.split(',');
const paramsMap = new Map<string, string>();
paramsFiles.forEach((p) => {
  const paramsPath = path.resolve(path.normalize(p));
  debugLog(`- Param file: ${paramsPath}`, isDebug);
  loadParams(paramsPath, paramsMap);
});

if (isDebug) {
  console.log();
  console.log('# All parameters');
  for (let [key, value] of paramsMap) {
    console.log(key + " = " + value);
  }
}
console.log();

parseSrcDir(srcDir, paramsMap);
console.log();

console.log('# Done!');
// End

interface Args {
  paramsDirs: string,
  srcDir: string,
  destDir: string,
  templateExt: string,
  isDebug: boolean
}

function parseArgs(): Args {
  const { params, src, dest, ext, debug } = INPUT_ARGS;
  const defaultExt = '.pp';
  const isDebugYes = 'y';
  const argsMap = new Map<string, string>();
  const args = process.argv.slice(2);
  let i = 0;
  while (i < args.length) {
    const key = args[i];
    if (key === debug) {
      argsMap.set(key, isDebugYes);
      i++;
    } else if (i + 1 < args.length) {
      let value = args[i + 1];
      if (key === src || key === dest) {
        value = path.resolve(path.normalize(value));
      }
      argsMap.set(key, value);
      i = i + 2;
    } else {
      logError(`Invalid args: ${key}`);
      process.exit(0);
    }
  }

  const srcDir = validateInput(src, argsMap);
  const destDir = validateInput(dest, argsMap);
  const paramsDirs = validateInput(params, argsMap);
  const templateExt = validateInput(ext, argsMap, defaultExt);
  const isDebug = validateInput(debug, argsMap) === isDebugYes ? true : false;

  return {
    paramsDirs,
    srcDir,
    destDir,
    templateExt,
    isDebug
  };
}

function parseSrcDir(dir: string, paramsMap: Map<string, string>) {
  fs.readdirSync(dir).forEach((file: string) => {
    const fullPath = path.join(dir, file);
    if (isDir(fullPath)) {
      const diff = fullPath.substring(srcDir.length);
      const destFilePath = path.join(destDir, diff);
      mkdir(destFilePath);
      parseSrcDir(fullPath, paramsMap);
    } else {
      const currDir = path.dirname(fullPath);
      const filename = path.basename(fullPath);
      const originalFilename = isTemplateFile(filename);

      if (originalFilename === null) {
        const diff = currDir.substring(srcDir.length);
        const destFilePath = path.join(destDir, diff, filename);
        fs.copyFile(fullPath, destFilePath, (err) => {
          if (err) {
            logError(err);
          }
        });
      } else {
        console.log(`- Parsing: ${fullPath}`);
        const srcFile = fs.readFileSync(fullPath, 'utf8');
        const content = parseMustache(srcFile, paramsMap);

        const diff = currDir.substring(srcDir.length);
        const destFilePath = path.join(destDir, diff, originalFilename);
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

function parseMustache(fileInput: string, paramsMap: Map<string, string>) {
  let fileOutput = "";

  let i = 0;
  const size = fileInput.length;
  while (i < size) {
    if (fileInput[i] === '{' && (i + 1 < size) && fileInput[i + 1] == '{') {
      let j = i + 2;
      let tag = '';
      while (j < size) {
        if (fileInput[j] == '}' && (j + 1 < size) && fileInput[j + 1] == '}') {
          const value = paramsMap.get(tag);
          if (!value) {
            logError(`Missing param: ${tag}`);
            break;
          }
          fileOutput += value;
          i = j + 2;
          tag = '';
          break;
        }

        if (fileInput[j] !== ' ') {
          tag += fileInput[j];
        }

        j++;
      }
    }

    if (i < size) {
      fileOutput += fileInput[i];
      i++;
    }
  }

  return fileOutput;
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
      const pathPrefix = path === '' ? '' : path + '.';
      Object.keys(obj).forEach((key) => {
        const nextObj = obj[key];
        flattenObject(nextObj, pathPrefix + key, map);
      });
    }
  } else {
    // obj is value
    if (map.has(path) && map.get(path) !== obj) {
      const oldValue = map.get(path);
      logWarning(`Param overwritten: ${path} ${oldValue} => ${obj}`);
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

function debugLog(log: string, isDebug = false) {
  if (isDebug) {
    console.log(log);
  }
}

function logError(log: any, type = 'ERROR') {
  console.error(`${COLORS.fgRed}${type}${COLORS.reset} ${log}`);
}

function logWarning(log: any, type = 'WARNING') {
  console.log(`${COLORS.fgYellow}${type}${COLORS.reset} ${log}`);
}
