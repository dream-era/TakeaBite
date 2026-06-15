const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('export default function OrderConfirmationPage() {')) {
    content = content.replace(
      'export default function OrderConfirmationPage() {',
      'function OrderConfirmationContent() {'
    );
    
    const wrapper = `
import { Suspense } from "react";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin material-symbols-outlined text-primary text-4xl">refresh</div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}
`;
    // ensure Suspense import
    if (!content.includes('import { Suspense } from "react";')) {
      content = content + wrapper;
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Patched', filePath);
  }
}

patchFile('src/app/shop/[workspaceId]/order-confirmation/page.tsx');
patchFile('src/app/shop/[workspaceId]/table/[tableId]/order-confirmation/page.tsx');
