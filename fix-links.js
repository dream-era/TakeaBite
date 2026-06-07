const fs = require('fs');

const filesToFix = [
    './src/app/all-set/page.tsx',
    './src/app/onboarding/page.tsx'
];

for (const file of filesToFix) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the button mapped loop with a Link
    const target = /\{sidebarMenuItems\.map\(\(item, index\) => \(\s*<button/g;
    
    if (content.match(target)) {
        content = content.replace(target, '{sidebarMenuItems.map((item, index) => (\n            <Link\n              href={item.href || "#"}');
        
        // Also need to find the matching closing tag.
        // It's after {item.label} and maybe badges, so we can replace:
        //               )}
        //             </button>
        //           ))}
        
        // Since we know the structure, let's just do a regex replace on the closing button tag that is followed by `))}
        content = content.replace(/<\/button>\s*\)\)}/g, '</Link>\n          ))}');
        
        fs.writeFileSync(file, content);
        console.log("Fixed Links in", file);
    }
}
