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

const newSidebarMapStr = `          {sidebarMenuItems.map((item, index) => (
            <div key={index} className="flex flex-col">
                <Link
                href={item.href || "#"}
                onClick={item.locked ? handleLockedClick : undefined}
                className={\`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 \${
                    item.active
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }\`}
                >
                <item.icon className={\`h-5 w-5 \${item.active ? "text-white" : "text-neutral-400"}\`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.locked && (
                    <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-1" />
                )}
                {item.badge && !item.locked && (
                    <span className={\`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold \${item.active ? "bg-white text-brand-600" : "bg-brand-600 text-white"}\`}>
                    {item.badge}
                    </span>
                )}
                {item.subItems && (
                     <ChevronDown className="h-4 w-4 text-neutral-400 opacity-80" />
                )}
                </Link>
                {/* Submenu Items */}
                {item.subItems && item.active && (
                    <div className="mt-1 ml-4 border-l-2 border-neutral-100 pl-4 space-y-1 py-1">
                        {item.subItems.map((sub, i) => (
                            <Link href={sub.href || "#"} key={i} className={\`flex items-center gap-2 w-full py-1.5 text-sm font-medium transition-colors \${sub.active ? "text-brand-600" : "text-neutral-500 hover:text-neutral-900"}\`}>
                                {sub.active ? <div className="h-1.5 w-1.5 rounded-full bg-brand-600"></div> : <div className="h-1.5 w-1.5 rounded-full bg-transparent"></div>}
                                {sub.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
          ))}
`;

const handleLockedClickFn = `
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("This page has not yet launched for commercial use.");
  };
`;

for (const file of files) {
    if (file.includes('payments/page.tsx')) continue; // already configured specifically
    let content = fs.readFileSync(file, 'utf8');

    let modified = false;

    // 1. Ensure Lock is imported from lucide-react
    if (!content.includes('Lock,')) {
        content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
            return `import { Lock, ${p1.trim()} } from "lucide-react";`;
        });
        modified = true;
    }

    // 2. Add handleLockedClick if missing
    if (!content.includes('handleLockedClick')) {
        // find start of component and insert it
        content = content.replace(/export default function \w+\(\) \{/, (match) => {
            return match + handleLockedClickFn;
        });
        modified = true;
    }

    // 3. Mark Analytics, Customers, Notifications as locked: true
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

    // We can also replace `Payments` href to point to `/payments` if it isn't already
    content = content.replace(/label:\s*["']Payments["'][^}]*?(?:href:\s*["'][^"']*["'])?/g, (match) => {
        if(match.includes('href:')) return match.replace(/href:\s*["'][^"']*["']/, 'href: "/payments"');
        return match.replace(/label:\s*["']Payments["']/, 'label: "Payments", href: "/payments"');
    });

    // 4. Since replacing the whole rendering map with regex is too error prone due to varying structures (like some use `<nav...>` differently, some use `item.active ? "text-brand-600"` while some use `bg-brand-600`), I'll just use regex to insert the onClick and Lock directly where it maps in the existing structure!

    // Wait, the existing structure inside `map` is like:
    // <Link href={item.href} ...> <item.icon .../> <span>{item.label}</span> ... </Link>
    
    // So let's just insert the onClick on `<Link` or `<button` if we missed one, or the outermost element inside the map block!
    // Or simpler: replace `<Link ` with `<Link onClick={item.locked ? handleLockedClick : undefined} `
    // Replace `{item.badge &&` with `{item.locked && <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-auto" />} {item.badge && !item.locked &&`
    
    // Wait! That's much safer!
    
    let original = content;
    
    // Adding onClick
    content = content.replace(/<Link\s+href=\{item.href/g, '<Link onClick={item.locked ? handleLockedClick : undefined} href={item.href');
    
    // Add Lock next to badge logic
    content = content.replace(/\{item.badge && \(/g, '{item.locked && <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-2" />} {item.badge && !item.locked && (');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated Locks in", file);
    }
}
