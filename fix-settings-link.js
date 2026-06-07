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
    
    // Replace Settings link
    let newContent = content.replace(/label:\s*["']Settings["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/settings"');
        return match.replace(/label:\s*["']Settings["']/, 'label: "Settings", href: "/settings"');
    });
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent);
        console.log("Updated Settings link in", file);
    }
}
