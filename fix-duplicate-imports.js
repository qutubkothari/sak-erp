const fs = require('fs');
const path = require('path');

// Files with duplicate PermissionsGuard imports
const files = [
  'apps/api/src/items/controllers/items.controller.ts',
  'apps/api/src/purchase/controllers/purchase-orders.controller.ts',
  'apps/api/src/purchase/controllers/grn.controller.ts',
  'apps/api/src/purchase/controllers/purchase-requisitions.controller.ts',
  'apps/api/src/bom/controllers/bom.controller.ts',
  'apps/api/src/production/controllers/job-order.controller.ts',
  'apps/api/src/production/controllers/production.controller.ts',
  'apps/api/src/categories/controllers/categories.controller.ts',
  'apps/api/src/inventory/controllers/inventory.controller.ts',
  'apps/api/src/hr/controllers/hr.controller.ts',
  'apps/api/src/sales/controllers/sales.controller.ts',
];

console.log('🧹 Fixing duplicate PermissionsGuard imports\n');

let fixed = 0;

files.forEach((file) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Remove PermissionsGuard from JwtAuthGuard import line
  content = content.replace(
    /import\s*{\s*JwtAuthGuard\s*,\s*PermissionsGuard\s*}\s*from\s*['"]\.\.\/\.\.\/auth\/guards\/jwt-auth\.guard['"]/g,
    "import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'"
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  } else {
    console.log(`⏭️  No change: ${file}`);
  }
});

console.log(`\n✅ Fixed ${fixed} files`);
