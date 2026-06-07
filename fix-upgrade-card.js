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

const goodCard = `{/* Premium Upgrade Card */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-600 to-brand-700 p-5 shadow-[0_8px_20px_rgba(229,9,20,0.3)]">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-400/30 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-brand-400/30 blur-xl"></div>
            
            <div className="relative z-10">
              <div className="mb-1 flex items-center gap-2 text-yellow-300">
                <Flame className="h-4 w-4" />
              </div>
              <h4 className="mb-2 font-bold text-white leading-tight text-sm">Upgrade Your Plan</h4>
              <p className="mb-4 text-xs text-brand-100 leading-tight">Unlock more features and grow your business faster.</p>
              <Link href="/pricing" className="flex w-full justify-center items-center rounded-full bg-white py-2.5 text-xs font-bold text-brand-600 shadow-sm transition-all hover:scale-[1.02]">
                Upgrade Now
              </Link>
            </div>
            
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-90 drop-shadow-lg transform -rotate-12">
              🚀
            </div>
          </div>
        </div>`;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Ensure Flame is imported
    if (!content.includes('Flame,')) {
        content = content.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
            return `import { Flame, ${p1.trim()} } from "lucide-react";`;
        });
    }

    // 2. Find the Premium Upgrade Card block and replace it.
    // The block usually starts with {/* Premium Upgrade Card */}
    // and ends before </aside>
    
    // We can use a regex to match from {/* Premium Upgrade Card */} up to but not including </aside>
    const regex = /\{\/\* Premium Upgrade Card \*\/\}(?:.|\n)*?(?=<\/aside>)/;
    
    if (content.match(regex)) {
        content = content.replace(regex, goodCard + '\n      ');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log("Updated Upgrade Card in", file);
    }
}
