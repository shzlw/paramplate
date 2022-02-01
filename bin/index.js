#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const COLORS = {
    reset: '\x1b[0m',
    fgRed: '\x1b[31m',
    fgYellow: '\x1b[33m'
};
const INPUT_ARGS = {
    params: '--params',
    src: '--src',
    dest: '--dest',
    ext: '--ext',
};
// Start
console.log(`# Validating inputs`);
const { paramsDirs, srcDir, destDir, templateExt } = parseArgs();
console.log(`- Src dir: ${srcDir}`);
console.log(`- Dest dir: ${destDir}`);
console.log(`- Template ext: ${templateExt}`);
const paramsFiles = paramsDirs.split(',');
const paramsMap = new Map();
paramsFiles.forEach((p) => {
    const paramsPath = path_1.default.resolve(path_1.default.normalize(p));
    console.log(`- Param file: ${paramsPath}`);
    loadParams(paramsPath, paramsMap);
});
console.log();
console.log(`# Parsing input dir`);
parseSrcDir(srcDir, paramsMap);
console.log();
console.log('# Done!');
function parseArgs() {
    const { params, src, dest, ext } = INPUT_ARGS;
    const defaultExt = '.pp';
    const argsMap = new Map();
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length - 1; i = i + 2) {
        const key = args[i];
        let value = args[i + 1];
        if (key === src || key === dest) {
            value = path_1.default.resolve(path_1.default.normalize(value));
        }
        argsMap.set(key, value);
    }
    const srcDir = validateInput(src, argsMap);
    const destDir = validateInput(dest, argsMap);
    const paramsDirs = validateInput(params, argsMap);
    const templateExt = validateInput(ext, argsMap, defaultExt);
    return {
        paramsDirs,
        srcDir,
        destDir,
        templateExt
    };
}
function parseSrcDir(dir, paramsMap) {
    fs_1.default.readdirSync(dir).forEach((file) => {
        let fullPath = path_1.default.join(dir, file);
        if (isDir(fullPath)) {
            const diff = fullPath.substring(srcDir.length);
            const destFilePath = path_1.default.join(destDir, diff);
            mkdir(destFilePath);
            parseSrcDir(fullPath, paramsMap);
        }
        else {
            const currDir = path_1.default.dirname(fullPath);
            const filename = path_1.default.basename(fullPath);
            const originalFilename = isTemplateFile(filename);
            const srcFile = fs_1.default.readFileSync(fullPath, 'utf8');
            if (originalFilename === null) {
                const diff = currDir.substring(srcDir.length);
                const destFilePath = path_1.default.join(destDir, diff, filename);
                writeFile(destFilePath, srcFile);
            }
            else {
                console.log(`- Parsing: ${fullPath}`);
                const content = parseMustache(srcFile, paramsMap);
                const diff = currDir.substring(srcDir.length);
                const destFilePath = path_1.default.join(destDir, diff, originalFilename);
                writeFile(destFilePath, content);
            }
        }
    });
}
function writeFile(pathname, content) {
    try {
        const currDir = path_1.default.dirname(pathname);
        mkdir(currDir);
        fs_1.default.writeFileSync(pathname, content);
    }
    catch (err) {
        logError(err);
    }
}
function mkdir(pathname) {
    try {
        if (!fs_1.default.existsSync(pathname)) {
            fs_1.default.mkdirSync(pathname, { recursive: true });
        }
    }
    catch (err) {
        logError(err);
    }
}
function isDir(pathname) {
    try {
        const stat = fs_1.default.lstatSync(pathname);
        return stat.isDirectory();
    }
    catch (err) {
        logError(err);
        return false;
    }
}
function isTemplateFile(filename) {
    const offset = templateExt.length;
    const ext = filename.slice(-offset);
    if (ext === templateExt) {
        return filename.slice(0, -offset);
    }
    return null;
}
function parseMustache(fileInput, paramsMap) {
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
                        logError(`${tag} cannot be found in the param files`);
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
function loadParams(pathname, paramsMap) {
    const file = fs_1.default.readFileSync(pathname, 'utf8').toString();
    const obj = JSON.parse(file);
    flattenObject(obj, '', paramsMap);
}
function flattenObject(obj, path, map) {
    if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
            // obj is array
            obj.forEach((nextObj, i) => {
                flattenObject(nextObj, path + '[' + i + ']', map);
            });
        }
        else {
            // obj is object
            let pathPrefix = path === '' ? '' : path + '.';
            Object.keys(obj).forEach((key) => {
                const nextObj = obj[key];
                flattenObject(nextObj, pathPrefix + key, map);
            });
        }
    }
    else {
        // obj is value
        if (map.has(path) && map.get(path) !== obj) {
            const oldValue = map.get(path);
            logWarning(`${path} is overwritten from: ${oldValue} to ${obj}`);
        }
        map.set(path, obj);
    }
}
function validateInput(param, argsMap, defaultValue) {
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
function logError(log, type = 'ERROR') {
    console.error(`${COLORS.fgRed}${type}${COLORS.reset} ${log}`);
}
function logWarning(log, type = 'WARNING') {
    console.log(`${COLORS.fgYellow}${type}${COLORS.reset} ${log}`);
}
