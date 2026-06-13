const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const allFiles = getFiles(srcDir);
const allFilesSet = new Set(allFiles.map(f => f.toLowerCase()));
const actualFilesMap = new Map(allFiles.map(f => [f.toLowerCase(), f]));

let hasErrors = false;

for (const file of allFiles) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];
    
    // We only care about local imports for case sensitivity checks
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) continue;
    
    // Resolve alias
    if (importPath.startsWith('@/')) {
        importPath = importPath.replace('@/', './');
    }
    
    let targetPath = path.resolve(path.dirname(file), importPath);
    
    // Try to resolve without extension or with index
    let possiblePaths = [
        targetPath,
        `${targetPath}.ts`,
        `${targetPath}.tsx`,
        `${targetPath}.js`,
        `${targetPath}.jsx`,
        path.join(targetPath, 'index.ts'),
        path.join(targetPath, 'index.tsx'),
        path.join(targetPath, 'index.js'),
        path.join(targetPath, 'index.jsx'),
    ];
    
    let foundExact = false;
    let foundCaseInsensitive = null;
    
    for (const p of possiblePaths) {
        if (actualFilesMap.has(p.toLowerCase())) {
            foundCaseInsensitive = actualFilesMap.get(p.toLowerCase());
            if (foundCaseInsensitive === p) {
                foundExact = true;
            }
            break;
        }
    }
    
    // If we didn't find it exactly but found it case-insensitively
    if (!foundExact && foundCaseInsensitive) {
        console.error(`CASE MATCH ERROR in ${file}:`);
        console.error(`  Import: ${match[1]}`);
        console.error(`  Expected: ${foundCaseInsensitive}`);
        console.error(`  Got:      ${targetPath}`);
        hasErrors = true;
    }
  }
}

if (!hasErrors) {
  console.log("No case-sensitive import issues found.");
}
