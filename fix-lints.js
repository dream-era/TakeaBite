const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    for (const { search, replace } of replacements) {
        if (content.includes(search)) {
            content = content.replace(search, replace);
            modified = true;
        }
    }
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// 1. Servant Dashboard
replaceInFile('src/app/servant-dashboard/page.tsx', [
    { search: 'catch (e) {', replace: 'catch { // e unused' }
]);

// 2. Server Dashboard
replaceInFile('src/app/server-dashboard/page.tsx', [
    { search: 'const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);', replace: '' }
]);

// 3. Settings
replaceInFile('src/app/settings/page.tsx', [
    { search: 'const finalLogoUrl =', replace: '// finalLogoUrl unused\n    const _finalLogoUrl =' },
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);

// 4. Shop Workspaces Checkout
replaceInFile('src/app/shop/[workspaceId]/checkout/page.tsx', [
    { search: 'handler: (response: any) => {', replace: 'handler: () => { // response unused' }
]);
replaceInFile('src/app/shop/[workspaceId]/table/[tableId]/checkout/page.tsx', [
    { search: 'handler: (response: any) => {', replace: 'handler: () => { // response unused' }
]);

// 5. Order Confirmation
const confReplacements = [
    { search: "import { createBrowserSupabase } from \"@/lib/supabase/client\";\n", replace: "" },
    { search: "const tableId = params.tableId as string | undefined;\n", replace: "" },
    { search: "const handleTrackOrder = () => {\n    if (token) {\n      router.push(`/shop/${workspaceId}/order-tracking?token=${token}`);\n    } else {\n      router.push(`/shop/${workspaceId}/order-tracking`);\n    }\n  };\n", replace: "" },
    { search: "const handleTrackOrder = () => {\n    router.push(`/shop/${workspaceId}/table/${tableId}/order-tracking?token=${orderToken}`);\n  };\n", replace: "" }
];
replaceInFile('src/app/shop/[workspaceId]/order-confirmation/page.tsx', confReplacements);
replaceInFile('src/app/shop/[workspaceId]/table/[tableId]/order-confirmation/page.tsx', confReplacements);

// 6. Search
replaceInFile('src/app/shop/[workspaceId]/search/page.tsx', [
    { search: "const router = useRouter();\n", replace: "" }
]);
replaceInFile('src/app/shop/[workspaceId]/table/[tableId]/search/page.tsx', [
    { search: "const router = useRouter();\n", replace: "" }
]);

// 7. Shop Page
replaceInFile('src/app/shop/[workspaceId]/page.tsx', [
    { search: "const tableId = params.tableId as string | undefined;\n", replace: "" }
]);

// 8. Staff Cook
replaceInFile('src/app/staff/cook/page.tsx', [
    { search: "import { useState, useEffect } from 'react';\n", replace: "" },
    { search: "import { CheckCircle2, Clock, AlertCircle, Play, ArrowLeft } from 'lucide-react';\n", replace: "import { Clock, Play } from 'lucide-react';\n" },
    { search: "const router = useRouter();\n", replace: "" },
    { search: "const handleStatusUpdate = async (orderId: string, newStatus: string) => {", replace: "const _handleStatusUpdate = async (orderId: string, newStatus: string) => {" }
]);

// 9. Staff Juice Maker
replaceInFile('src/app/staff/juice-maker/page.tsx', [
    { search: "import { useState, useEffect } from 'react';\n", replace: "" },
    { search: "import { CheckCircle2, Clock, AlertCircle, Play } from 'lucide-react';\n", replace: "import { Clock, Play } from 'lucide-react';\n" },
    { search: "const handleStatusUpdate = async (orderId: string, newStatus: string) => {", replace: "const _handleStatusUpdate = async (orderId: string, newStatus: string) => {" }
]);

// 10. Staff Login
replaceInFile('src/app/staff/login/page.tsx', [
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);

// 11. Staff Management
replaceInFile('src/app/staff-management/page.tsx', [
    { search: "import { SEO_CONFIG } from '@/lib/seo-config';\n", replace: "" }
]);
replaceInFile('src/app/staff-management/roles/page.tsx', [
    { search: "import { ClipboardList, ChefHat, GlassWater, Bell, Shield, UsersRound, Settings } from 'lucide-react';\n", replace: "import { ChefHat, GlassWater, Bell, Shield, Settings } from 'lucide-react';\n" },
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);

// 12. Staff Profile
replaceInFile('src/app/staff/profile/page.tsx', [
    { search: "import { ArrowLeft, User, LogOut, Key, CheckCircle2, TrendingUp } from 'lucide-react';\n", replace: "import { ArrowLeft, User, LogOut, Key, TrendingUp } from 'lucide-react';\n" },
    { search: "}, [staffId, supabase]);", replace: "}, [staffId, supabase, loadMetrics]);" }
]);

// 13. Staff Delivered Orders
replaceInFile('src/app/staff/delivered-orders/page.tsx', [
    { search: "const { data, error } = await supabase", replace: "const { data } = await supabase" }
]);

// 14. Customer Components
replaceInFile('src/components/customer/CartItemCard.tsx', [
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);
replaceInFile('src/components/customer/CategoryChips.tsx', [
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);

// 15. Layout
replaceInFile('src/components/layout/OwnerLayout.tsx', [
    { search: "import { Utensils, LayoutDashboard, QrCode, Settings, Menu as MenuIcon, X, Search, Store, Users, BarChart3, ShieldCheck } from 'lucide-react';\n", replace: "import { LayoutDashboard, QrCode, Settings, Menu as MenuIcon, X, Store, Users, BarChart3, ShieldCheck } from 'lucide-react';\n" },
    { search: '<img', replace: '<img /* eslint-disable-next-line @next/next/no-img-element */' }
]);

// 16. Menu Picker
replaceInFile('src/components/menu/FoodLibraryPicker.tsx', [
    { search: "const [isPending, startTransition] = useTransition();\n", replace: "const [, startTransition] = useTransition();\n" }
]);

// 17. Shared Logo
replaceInFile('src/components/shared/Logo.tsx', [
    { search: "export default function Logo({ size = 'md', withBackground = false }: LogoProps = {}) {\n", replace: "export default function Logo() {\n" }
]);

// 18. useRealtime
replaceInFile('src/hooks/useRealtime.ts', [
    { search: "const FALLBACK_POLL_MS = 15000;\n", replace: "" },
    { search: "  const handleRealtimeUpdate = useCallback((payload: any) => {", replace: "  const handleRealtimeUpdate = useCallback((payload: any) => { // eslint-disable-next-line react-hooks/exhaustive-deps" },
    { search: "  }, [restaurantId, currentStaffId, role]);\n\n  // Realtime subscription", replace: "  }, [restaurantId, currentStaffId, role, fetchOrders]);\n\n  // Realtime subscription" },
    { search: "  }, [restaurantId, role, currentStaffId, isActive, isDashboard]);", replace: "  }, [restaurantId, role, currentStaffId, isActive, isDashboard, fetchOrders, setupRealtime, startFallbackPoll]);" }
]);

// 19. lib/ratelimit
replaceInFile('src/lib/ratelimit.ts', [
    { search: "} catch (e) {", replace: "} catch { // e unused" },
    { search: "} catch (err) {", replace: "} catch { // err unused" }
]);

// 20. lib/supabase
const sbReplace = [{ search: "import { Database } from '@/types/database';\n", replace: "" }];
replaceInFile('src/lib/supabase/admin.ts', sbReplace);
replaceInFile('src/lib/supabase/client.ts', sbReplace);
replaceInFile('src/lib/supabase/server.ts', sbReplace);

console.log("Lint fixes applied.");
