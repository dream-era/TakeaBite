#!/bin/bash
echo "=== TAX ERRORS ==="
rg -n "0\.05|\* 5 / 100|5%" src/
echo "=== CURRENCY ERRORS ==="
rg -n "\$" src/ | grep -v "\${"
echo "=== CONSOLE LOGS ==="
rg -n "console\.log" src/
echo "=== MISSING FORCE DYNAMIC ==="
for file in $(find src/app/api -name "route.ts"); do
  if ! grep -q "force-dynamic" "$file"; then
    echo "Missing in $file"
  fi
done
echo "=== TODO / FIXME ==="
rg -n "TODO|FIXME" src/
echo "=== MOCK DATA ==="
rg -n "Math\.random|picsum\.photos|unsplash\.com" src/
echo "=== COMPLETED TAB IN KITCHEN ==="
rg -n "Completed" src/app/staff/cook src/app/staff/juice-maker src/app/server-dashboard 2>/dev/null
echo "=== HARDCODED RESTAURANT IDS ==="
rg -n "restaurantId.*=.*'res_" src/
echo "=== RAZORPAY EXPOSURE ==="
rg -n "razorpay_key_secret|razorpay_secret" src/
echo "=== GOOGLE FONTS LINK ==="
rg -n "fonts\.googleapis\.com" src/app/layout.tsx
