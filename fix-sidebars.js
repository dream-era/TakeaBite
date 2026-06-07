const fs = require('fs');
const glob = require('glob'); // Note: we might not have glob, better use fs recursively

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
    
    // We want to replace the whole sidebarMenuItems or sidebarItems array.
    // It usually looks like: const sidebarMenuItems = [ ... ];
    const regex1 = /const sidebarMenuItems = \[\s*\{[\s\S]*?\];/g;
    const regex2 = /const sidebarItems = \[\s*\{[\s\S]*?\];/g;
    
    let modified = false;

    // A generic string we want to replace it with, but we need to preserve `active` and `badge` properties!
    // Since each page has different `active` states, we should rather parse or regex replace specific labels.

    // Let's replace the labels:
    content = content.replace(/label:\s*["']Orders["']/g, 'label: "Live Orders"');
    content = content.replace(/label:\s*["']Staff Management["']/g, 'label: "Staff Workspace"');
    
    // Let's remove the Marketing item if it exists
    content = content.replace(/\s*\{\s*icon:\s*Megaphone,\s*label:\s*["']Marketing["'].*?\},/g, '');
    
    // Now let's fix the hrefs
    content = content.replace(/label:\s*["']Dashboard["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/dashboard"');
        return match.replace(/label:\s*["']Dashboard["']/, 'label: "Dashboard", href: "/dashboard"');
    });

    content = content.replace(/label:\s*["']Menu Management["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/menu-management"');
        return match.replace(/label:\s*["']Menu Management["']/, 'label: "Menu Management", href: "/menu-management"');
    });

    content = content.replace(/label:\s*["']Staff Workspace["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/staff-management"');
        return match.replace(/label:\s*["']Staff Workspace["']/, 'label: "Staff Workspace", href: "/staff-management"');
    });

    content = content.replace(/label:\s*["']QR & Tables["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/qr-generation"');
        return match.replace(/label:\s*["']QR & Tables["']/, 'label: "QR & Tables", href: "/qr-generation"');
    });

    // Make sure all-set and onboarding have Link tags for sidebar instead of buttons, otherwise href doesn't work.
    // Actually, in all-set and onboarding, they were rendered as <button>.
    
    // Write back
    if (content !== fs.readFileSync(file, 'utf8')) {
        fs.writeFileSync(file, content);
        console.log("Updated", file);
    }
}
