#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log("Testing CLI e2e");

const input = path.resolve(path.normalize('./test/output/root'));
const expected = path.resolve(path.normalize('./test/expected/root'));

compareTwoDirs(input, expected);
console.log("Tests passed");

function logAndExit(log, type = 'ERROR') {
  console.error(`${type} ${log}`);
  process.exit(0);
}

function compareTwoDirs(path1, path2) {
  const isPath1Dir = isDir(path1);
  const isPath2Dir = isDir(path2);
  if (isPath1Dir && isPath2Dir) {
    const files1 = fs.readdirSync(path1);
    const files2 = fs.readdirSync(path2);

    if (files1.length !== files2.length) {
      logAndExit(`Number of subfolders doesn't match. Length1: ${files1.length}, Length2:${files2.length}`);
    }

    for (let i = 0; i < files1.length; i++) {
      const nextPath1 = path.join(path1, files1[i]);
      const nextPath2 = path.join(path2, files2[i]);
      compareTwoDirs(nextPath1, nextPath2);
    }

  } else if (!isPath1Dir && !isPath2Dir) {
    const filename1 = path.basename(path1);
    const filename2 = path.basename(path2);
    if (filename1 !== filename2) {
      logAndExit(`Filenames don't match. Filename1: ${filename1}, Filename2 ${filename2}`);
    }

    const fileContent1 = fs.readFileSync(path1, 'utf8');
    const fileContent2 = fs.readFileSync(path2, 'utf8');
    if (fileContent1 !== fileContent2) {
      logAndExit(`File contents don't match. Filename1: ${filename1}, Filename2 ${filename2}`);
    }

  } else {
    logAndExit(`One is file. The other one is folder.`);
  }
}

function isDir(pathname) {
  try {
    const stat = fs.lstatSync(pathname);
    return stat.isDirectory();
  } catch (err) {
    logAndExit(err);
    return false;
  }
}