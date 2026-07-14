const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const targetDirs = [
  path.join(__dirname, 'src/app'),
  path.join(__dirname, 'src/components'),
  path.join(__dirname, 'src/lib')
];

let filesToProcess = [];
targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    filesToProcess = filesToProcess.concat(walk(dir));
  }
});

let replaceCount = 0;

filesToProcess.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Global replacement of non-www to www for ollypedia.in
  // We use regex to catch both strings and template literals
  newContent = newContent.replace(/https:\/\/ollypedia\.in/g, 'https://www.ollypedia.in');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    replaceCount++;
    console.log("Updated:", file);
  }
});

console.log(`Successfully fixed WWW consistency in ${replaceCount} files.`);
