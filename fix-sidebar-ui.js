const fs = require('fs');

const filesToFix = [
    './src/app/business-setup/page.tsx',
    './src/app/menu-management/page.tsx',
    './src/app/qr-generation/page.tsx'
];

const handleLockedClickFn = `
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("This page has not yet launched for commercial use.");
  };
`;

const correctSidebarItems = `  const sidebarMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: ClipboardList, label: "Live Orders", badge: 12, href: "#" },
    { icon: MenuSquare, label: "Menu Management", href: "/menu-management", active: true },
    { icon: Users, label: "Staff Workspace", href: "/staff-management" },
    { icon: QrCode, label: "QR & Tables", href: "/qr-generation" },
    { icon: CreditCard, label: "Payments", href: "/payments" },
    { icon: BarChart3, label: "Analytics", href: "#", locked: true },
    { icon: UsersRound, label: "Customers", href: "#", locked: true },
    { icon: Bell, label: "Notifications", badge: 5, href: "#", locked: true },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];`;

for (const file of filesToFix) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Ensure Lock is imported
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

    // 3. Replace sidebarItems array definition
    // Usually defined as const sidebarMenuItems = [ ... ] or const sidebarItems = [ ... ]
    content = content.replace(/const sidebarMenuItems = \[\s*\{[\s\S]*?\];/g, correctSidebarItems);
    content = content.replace(/const sidebarItems = \[\s*\{[\s\S]*?\];/g, correctSidebarItems);
    
    // In menu-management/page.tsx, we need to set active: true for Menu Management.
    // In business-setup, we don't have active true for Menu Management. Let's dynamically fix active state.
    if (file.includes('business-setup')) {
        content = content.replace(/label: "Menu Management", href: "\/menu-management", active: true/, 'label: "Menu Management", href: "/menu-management"');
        content = content.replace(/label: "Business Settings", href: "\/business-setup"/, 'label: "Business Settings", href: "/business-setup", active: true');
    }
    if (file.includes('qr-generation')) {
        content = content.replace(/label: "Menu Management", href: "\/menu-management", active: true/, 'label: "Menu Management", href: "/menu-management"');
        content = content.replace(/label: "QR & Tables", href: "\/qr-generation"/, 'label: "QR & Tables", href: "/qr-generation", active: true');
    }

    // 4. Update the render loop!
    // Since we know the exact loop for menu-management, business-setup, qr-generation
    // They are almost identical.
    content = content.replace(/\{sidebarMenuItems\.map\(\(item, (?:index|i)\) => \([\s\S]*?<\/Link>\s*\)\)}/g, 
`{sidebarMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href || "#"}
              onClick={item.locked ? handleLockedClick : undefined}
              className={\`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 \${
                item.active
                  ? "bg-brand-50 text-brand-600 shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }\`}
            >
              <item.icon className={\`h-5 w-5 \${item.active ? "text-brand-600" : "text-neutral-400"}\`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.locked && (
                  <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-1" />
              )}
            </Link>
          ))}`);
          
    content = content.replace(/\{sidebarItems\.map\(\(item, (?:index|i)\) => \([\s\S]*?<\/Link>\s*\)\)}/g, 
`{sidebarMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href || "#"}
              onClick={item.locked ? handleLockedClick : undefined}
              className={\`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 \${
                item.active
                  ? "bg-brand-50 text-brand-600 shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }\`}
            >
              <item.icon className={\`h-5 w-5 \${item.active ? "text-brand-600" : "text-neutral-400"}\`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.locked && (
                  <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-1" />
              )}
            </Link>
          ))}`);

    fs.writeFileSync(file, content);
    console.log("Fixed manually for", file);
}
