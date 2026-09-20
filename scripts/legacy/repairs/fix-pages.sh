#!/bin/bash
cd /home/ubuntu/sak-erp

# Add force-dynamic to HR page
head -n1 apps/web/src/app/dashboard/hr/page.tsx > temp.txt
echo "export const dynamic = 'force-dynamic';" >> temp.txt
tail -n +2 apps/web/src/app/dashboard/hr/page.tsx >> temp.txt
mv temp.txt apps/web/src/app/dashboard/hr/page.tsx

# Add force-dynamic to inventory page  
head -n1 apps/web/src/app/dashboard/inventory/page.tsx > temp.txt
echo "export const dynamic = 'force-dynamic';" >> temp.txt
tail -n +2 apps/web/src/app/dashboard/inventory/page.tsx >> temp.txt
mv temp.txt apps/web/src/app/dashboard/inventory/page.tsx

echo "Done fixing pages"
