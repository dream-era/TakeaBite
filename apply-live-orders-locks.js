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
    let original = content;

    // Replace the alert message
    content = content.replace(/alert\("This page has not yet launched for commercial use."\);/g, 'alert("This feature will be launched soon!");');

    // Add locked to Live Orders
    content = content.replace(/label:\s*["']Live Orders["'][^}]*?(?:href:\s*["'][^"']*["'])?(?:,\s*locked:\s*(true|false))?/g, (match) => {
        if(!match.includes('locked:')) {
            if(match.includes('href:')) return match + ', locked: true';
            return match + ', href: "#", locked: true';
        } else if (match.includes('locked: false')) {
            return match.replace(/locked:\s*false/, 'locked: true');
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated Locks in", file);
    }
}
