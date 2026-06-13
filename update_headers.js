const fs = require('fs');
const files = [
  'src/app/cook-dashboard/page.tsx',
  'src/app/juice-dashboard/page.tsx',
  'src/app/server-dashboard/page.tsx',
  'src/app/cashier-dashboard/orders/page.tsx',
  'src/app/kitchen/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    const isSession = content.includes('currentSession: session');
    const varName = isSession ? 'session' : 'currentSession';

    content = content.replace(
      /headers:\s*\{\s*['"]Content-Type['"]:\s*['"]application\/json['"]\s*\}/g,
      `headers: { 'Content-Type': 'application/json', 'x-kitchen-session': ${varName}?.fingerprint || '', 'x-staff-id': ${varName}?.staffId || '' }`
    );
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
