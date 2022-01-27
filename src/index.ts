#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const EMPTY_STR = '';
const PARAMS_ARG = '--params';
const SRC_ARG = '--src';
const DEST_ARG = '--dest';

const BgGreen = "\x1b[42m";
const Reset = "\x1b[0m";

console.log(`${BgGreen}%s${Reset} %s`, "paramplate", "starts");
// console.log(process.argv);

const argsMap = new Map<string, string>();
argsMap.set(PARAMS_ARG, EMPTY_STR);
argsMap.set(SRC_ARG, EMPTY_STR);
argsMap.set(DEST_ARG, EMPTY_STR);

const args = process.argv.slice(2);
for (let i = 0; i < args.length - 1; i = i + 2) {
  const key = args[i];
  let value = args[i + 1];
  if (key === SRC_ARG || key === DEST_ARG) {
    value = path.resolve(path.normalize(value));
  }
  argsMap.set(key, value);
}

const currWorkDir = process.cwd();
console.log("currWorkDir", currWorkDir);

let srcDir = '';
if (argsMap.get(SRC_ARG) === EMPTY_STR) {
  srcDir = currWorkDir;
} else {
  srcDir = argsMap.get(SRC_ARG) || EMPTY_STR;
}

let destDir = '';
if (argsMap.get(DEST_ARG) === EMPTY_STR) {
  destDir = currWorkDir;
} else {
  destDir = argsMap.get(DEST_ARG) || EMPTY_STR;
}

const paramsFilePaths = argsMap.get(PARAMS_ARG) || EMPTY_STR;
if (paramsFilePaths === EMPTY_STR) {
  console.error("--params cannot be empty");
  process.exit(0);
}
// Parse file
const paramsFiles = paramsFilePaths.split(',');
const paramsMap = new Map<string, string>();
paramsFiles.forEach((paramsPath) => {
  loadParams(paramsPath, paramsMap);
})

console.log("Params");
for (let [key, value] of paramsMap) {
  console.log(key + "=" + value);
}

parseSrcDir(srcDir, paramsMap);
console.log(`${BgGreen}%s${Reset} %s`, "paramplate", "ends");

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
    console.error(err);
  }
}

function mkdir(pathname: string) {
  try {
    if (!fs.existsSync(pathname)) {
      fs.mkdirSync(pathname, { recursive: true });
    }
  } catch (err) {
    console.error(err);
  }
}

function isDir(pathname: string) {
  try {
    const stat = fs.lstatSync(pathname);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

function isTemplateFile(filename: string) {
  const mExt = filename.slice(-2);
  if (mExt === '.pp') {
    return filename.slice(0, -2);
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
          content += paramsMap.get(tag);
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
    map.set(path, obj);
  }
}
