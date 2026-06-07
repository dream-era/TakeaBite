const fs = require('fs');

function walk(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (let file of list) {
        const path = dir + '/' + file;
        const stat = fs.statSync(path);
        if (stat && stat.isDirectory()) {
            walk(path, files);
        } else if (path.endsWith('.tsx')) {
            files.push(path);
        }
    }
    return files;
}

const files = walk('./src/app');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const startIdx = content.indexOf('const sidebarMenuItems = [');
    if (startIdx === -1) continue;

    const arrayStart = content.indexOf('[', startIdx);
    let openBrackets = 0;
    let arrayEnd = -1;
    for (let i = arrayStart; i < content.length; i++) {
        if (content[i] === '[') openBrackets++;
        if (content[i] === ']') {
            openBrackets--;
            if (openBrackets === 0) {
                arrayEnd = i;
                break;
            }
        }
    }

    if (arrayEnd === -1) continue;

    const arrayContent = content.substring(arrayStart + 1, arrayEnd);
    
    let items = [];
    let currentItem = '';
    let braces = 0;
    
    for (let i = 0; i < arrayContent.length; i++) {
        const char = arrayContent[i];
        
        if (braces === 0 && char !== '{') {
            continue; // ignore spaces and commas between items
        }
        
        if (char === '{') braces++;
        
        currentItem += char;
        
        if (char === '}') braces--;
        
        if (braces === 0 && currentItem.length > 0) {
            items.push(currentItem);
            currentItem = '';
        }
    }
    
    const unlocked = items.filter(item => !item.includes('locked: true') && !item.includes('label: "Settings"'));
    const locked = items.filter(item => item.includes('locked: true'));
    const settings = items.filter(item => item.includes('label: "Settings"'));
    
    const combined = [...unlocked, ...locked, ...settings];
    
    const formatted = combined.map(item => {
        if (!item.includes('\n')) {
            return '    ' + item + ',';
        } else {
            const lines = item.split('\n');
            const indented = lines.map((l, idx) => idx === 0 ? '    ' + l : l).join('\n');
            return indented + ',';
        }
    });
    
    const newArrayContent = '\n' + formatted.join('\n') + '\n  ';
    
    const newContent = content.substring(0, arrayStart + 1) + newArrayContent + content.substring(arrayEnd);
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log("Reordered sidebar in", file);
    }
}
