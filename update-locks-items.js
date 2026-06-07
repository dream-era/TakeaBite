const fs = require('fs');

const filesToFix = [
    './src/app/business-setup/page.tsx',
    './src/app/menu-management/page.tsx',
    './src/app/menu-management/add-item/page.tsx',
    './src/app/qr-generation/page.tsx'
];

const handleLockedClickFn = `
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("This page has not yet launched for commercial use.");
  };
`;

for (const file of filesToFix) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Ensure Lock is imported from lucide-react
    if (!content.includes('Lock,')) {
        content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
            return `import { Lock, ${p1.trim()} } from "lucide-react";`;
        });
    }

    // 2. Add handleLockedClick if missing
    if (!content.includes('handleLockedClick')) {
        content = content.replace(/export default function \w+\(\) \{/, (match) => {
            return match + handleLockedClickFn;
        });
    }

    // 3. Mark locked and fix Payments link
    content = content.replace(/label:\s*["']Analytics["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(!match.includes('locked:')) {
            if(match.includes('href:')) return match + ', locked: true';
            return match + ', href: "#", locked: true';
        }
        return match;
    });

    content = content.replace(/label:\s*["']Customers["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(!match.includes('locked:')) {
            if(match.includes('href:')) return match + ', locked: true';
            return match + ', href: "#", locked: true';
        }
        return match;
    });

    content = content.replace(/label:\s*["']Notifications["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(!match.includes('locked:')) {
            if(match.includes('href:')) return match + ', locked: true';
            return match + ', href: "#", locked: true';
        }
        return match;
    });

    content = content.replace(/label:\s*["']Payments["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/payments"');
        return match.replace(/label:\s*["']Payments["']/, 'label: "Payments", href: "/payments"');
    });
    
    // 4. Add onClick and Lock
    let original = content;
    
    // Some might use button still if I missed them, but let's assume <Link or <button
    content = content.replace(/<button\s+key/g, '<Link href={item.href || "#"} key');
    content = content.replace(/<Link\s+href=\{item.href/g, '<Link onClick={item.locked ? handleLockedClick : undefined} href={item.href');
    
    content = content.replace(/\{item.badge && \(/g, '{item.locked && <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-2" />} {item.badge && !item.locked && (');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated Locks in", file);
    }
}
