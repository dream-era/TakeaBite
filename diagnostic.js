const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = walk(srcDir);

const issues = {
  taxErrors: [],
  currencyErrors: [],
  consoleLogs: [],
  missingForceDynamic: [],
  todoFixme: [],
  mockData: [],
  completedTab: [],
  hardcodedRest: [],
  razorpayExposure: [],
  googleFonts: []
};

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(__dirname, file);

  // Check for force-dynamic in api routes
  if (relativePath.includes('src/app/api/') && relativePath.endsWith('route.ts')) {
    if (!content.includes('force-dynamic')) {
      issues.missingForceDynamic.push(relativePath);
    }
  }

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    
    // Tax errors (0.05, 5%, * 5 / 100)
    if (line.match(/0\.05|\* 5 \/ 100|5%/) && !line.includes('//')) {
      issues.taxErrors.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // Currency errors ($ instead of ₹)
    if (line.includes('$') && !line.includes('${') && !line.includes('eslint') && !line.includes('jQuery')) {
       // Filter out common code syntaxes like $ set in regex or generic string interpolation without braces
       if (line.match(/\$[0-9]/) || line.match(/price.*\$|\$.*price/i)) {
         issues.currencyErrors.push({ file: relativePath, line: lineNum, text: line.trim() });
       }
    }

    // Console logs
    if (line.includes('console.log') && !line.includes('//')) {
      issues.consoleLogs.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // TODO / FIXME
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.todoFixme.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // Mock Data
    if (line.match(/Math\.random|picsum\.photos|unsplash\.com/) && !line.includes('//')) {
      issues.mockData.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // Completed Tab
    if ((relativePath.includes('cook') || relativePath.includes('juice') || relativePath.includes('server')) && line.includes('Completed')) {
      issues.completedTab.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // Razorpay Exposure
    if (line.match(/razorpay_key_secret|razorpay_secret/) && !line.includes('//')) {
      issues.razorpayExposure.push({ file: relativePath, line: lineNum, text: line.trim() });
    }

    // Google Fonts
    if (relativePath === 'src/app/layout.tsx' && line.includes('fonts.googleapis.com')) {
      issues.googleFonts.push({ file: relativePath, line: lineNum, text: line.trim() });
    }
  });
});

console.log(JSON.stringify(issues, null, 2));
