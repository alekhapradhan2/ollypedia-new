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

const targetDirs = [path.join(__dirname, 'src')];

let filesToProcess = [];
targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    filesToProcess = filesToProcess.concat(walk(dir));
  }
});

let replaceCount = 0;

filesToProcess.forEach(file => {
  if (file.endsWith('seo.ts')) return;
  if (file.endsWith('ReviewForm.tsx')) return;

  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // 1. Double quotes: "https://www.ollypedia.in/something" -> `${SITE_URL}/something`
  newContent = newContent.replace(/"https:\/\/(?:www\.)?ollypedia\.in([^"]*)"/g, '`${SITE_URL}$1`');
  
  // 2. Single quotes: 'https://www.ollypedia.in/something' -> `${SITE_URL}/something`
  newContent = newContent.replace(/'https:\/\/(?:www\.)?ollypedia\.in([^']*)'/g, '`${SITE_URL}$1`');
  
  // 3. Backticks: `https://www.ollypedia.in/something${var}` -> `${SITE_URL}/something${var}`
  newContent = newContent.replace(/`https:\/\/(?:www\.)?ollypedia\.in([^`]*)`/g, '`${SITE_URL}$1`');

  // Handle new URL("https://www.ollypedia.in") -> new URL(SITE_URL)
  newContent = newContent.replace(/new URL\(`\$\{SITE_URL\}`\)/g, 'new URL(SITE_URL)');

  if (content !== newContent) {
    // Inject import if missing
    if (!newContent.includes('import { SITE_URL }')) {
      const importStmt = `import { SITE_URL } from "@/lib/seo";\n`;
      // Insert after the last import, or at the top
      const lastImportIndex = newContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = newContent.indexOf('\n', lastImportIndex);
        newContent = newContent.slice(0, nextLineIndex + 1) + importStmt + newContent.slice(nextLineIndex + 1);
      } else {
        newContent = importStmt + newContent;
      }
    }
    
    fs.writeFileSync(file, newContent, 'utf8');
    replaceCount++;
    console.log("Updated:", file);
  }
});

console.log(`Successfully fixed SITE_URL consistency in ${replaceCount} files.`);
