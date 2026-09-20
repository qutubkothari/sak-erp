const fs = require('fs');
const path = require('path');

// Map of resource names for each controller
const RESOURCE_MAPPINGS = {
  'vendors.controller.ts': 'vendors',
  'purchase-orders.controller.ts': 'purchase_orders',
  'purchase-requisitions.controller.ts': 'purchase_requisitions',
  'grn.controller.ts': 'grns',
  'items.controller.ts': 'items',
  'sales.controller.ts': 'sales_orders',
  'quotations.controller.ts': 'quotations',
  'customers.controller.ts': 'customers',
  'dispatch.controller.ts': 'dispatch',
  'warranties.controller.ts': 'warranties',
  'bom.controller.ts': 'bom',
  'production.controller.ts': 'production',
  'job-order.controller.ts': 'job_orders',
  'work-stations.controller.ts': 'work_stations',
  'inventory.controller.ts': 'inventory',
  'categories.controller.ts': 'categories',
  'quality.controller.ts': 'quality',
  'deployment.controller.ts': 'uid',
  'user.controller.ts': 'users',
  'role.controller.ts': 'roles',
  'hr.controller.ts': 'hr',
};

// Find all controller files recursively
function findControllers(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findControllers(filePath, fileList);
    } else if (file.endsWith('.controller.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Fix a single controller file
function fixController(filePath) {
  const fileName = path.basename(filePath);
  const resourceName = RESOURCE_MAPPINGS[fileName];

  if (!resourceName) {
    console.log(`⚠️  Skipping ${fileName} - no resource mapping defined`);
    return null;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = [];

  // 1. Add PermissionsGuard import if not exists
  if (!content.includes('PermissionsGuard')) {
    const guardImportRegex = /import\s*{[^}]*JwtAuthGuard[^}]*}\s*from\s*['"]\.\.\/\.\.\/auth\/guards\/jwt-auth\.guard['"]/;
    if (guardImportRegex.test(content)) {
      content = content.replace(
        guardImportRegex,
        (match) => match.replace(
          /}\s*from/,
          ', PermissionsGuard } from'
        )
      );
      
      // Also need to import PermissionsGuard from its file
      const authGuardsImport = "import { PermissionsGuard } from '../../auth/guards/permissions.guard';";
      const lastImport = content.lastIndexOf('import ');
      const endOfLastImport = content.indexOf('\n', lastImport);
      content = content.slice(0, endOfLastImport + 1) + authGuardsImport + '\n' + content.slice(endOfLastImport + 1);
      
      changes.push('Added PermissionsGuard import');
    }
  }

  // 2. Add decorator imports if not exists
  if (!content.includes('@RequireDelete') && 
      !content.includes('RequireDelete')) {
    const decoratorImport = "import { RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';";
    const lastImport = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImport);
    content = content.slice(0, endOfLastImport + 1) + decoratorImport + '\n' + content.slice(endOfLastImport + 1);
    changes.push('Added permission decorators import');
  }

  // 3. Add PermissionsGuard to @UseGuards decorator
  const useGuardsRegex = /@UseGuards\(JwtAuthGuard\)/g;
  if (useGuardsRegex.test(content)) {
    content = content.replace(
      useGuardsRegex,
      '@UseGuards(JwtAuthGuard, PermissionsGuard)'
    );
    changes.push('Added PermissionsGuard to @UseGuards');
  }

  // 4. Add @RequireDelete to delete methods
  const deleteMethodRegex = /(@Delete\([^)]*\)\s*(?:@[A-Za-z]+(?:\([^)]*\))?\s*)*)(async\s+(?:remove|delete)\s*\()/g;
  let match;
  let deleteCount = 0;
  while ((match = deleteMethodRegex.exec(content)) !== null) {
    const decorators = match[1];
    if (!decorators.includes('@RequireDelete')) {
      const insertPos = match.index + match[1].length;
      content = content.slice(0, insertPos) + 
                `@RequireDelete('${resourceName}')\n  ` + 
                content.slice(insertPos);
      deleteCount++;
    }
  }
  if (deleteCount > 0) {
    changes.push(`Added @RequireDelete to ${deleteCount} delete method(s)`);
  }

  // 5. Add @RequireCreate to post methods
  const postMethodRegex = /(@Post\([^)]*\)\s*(?:@[A-Za-z]+(?:\([^)]*\))?\s*)*)(async\s+create\s*\()/g;
  let createCount = 0;
  while ((match = postMethodRegex.exec(content)) !== null) {
    const decorators = match[1];
    if (!decorators.includes('@RequireCreate')) {
      const insertPos = match.index + match[1].length;
      content = content.slice(0, insertPos) + 
                `@RequireCreate('${resourceName}')\n  ` + 
                content.slice(insertPos);
      createCount++;
    }
  }
  if (createCount > 0) {
    changes.push(`Added @RequireCreate to ${createCount} create method(s)`);
  }

  // 6. Add @RequireUpdate to put/patch methods
  const updateMethodRegex = /(@(?:Put|Patch)\([^)]*\)\s*(?:@[A-Za-z]+(?:\([^)]*\))?\s*)*)(async\s+update\s*\()/g;
  let updateCount = 0;
  while ((match = updateMethodRegex.exec(content)) !== null) {
    const decorators = match[1];
    if (!decorators.includes('@RequireUpdate')) {
      const insertPos = match.index + match[1].length;
      content = content.slice(0, insertPos) + 
                `@RequireUpdate('${resourceName}')\n  ` + 
                content.slice(insertPos);
      updateCount++;
    }
  }
  if (updateCount > 0) {
    changes.push(`Added @RequireUpdate to ${updateCount} update method(s)`);
  }

  // Write back if changes were made
  if (changes.length > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { fileName, changes };
  }

  return null;
}

// Main execution
console.log('🔒 FIXING ALL CONTROLLER PERMISSIONS\n');
console.log('Scanning for controllers...\n');

const apiDir = path.join(__dirname, 'apps', 'api', 'src');
const controllers = findControllers(apiDir);

console.log(`Found ${controllers.length} controller files\n`);
console.log('Applying fixes...\n');

const results = [];
let totalFixed = 0;

controllers.forEach((filePath) => {
  const result = fixController(filePath);
  if (result) {
    results.push(result);
    totalFixed++;
    console.log(`✅ ${result.fileName}`);
    result.changes.forEach((change) => {
      console.log(`   - ${change}`);
    });
    console.log();
  }
});

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));
console.log(`Total controllers scanned: ${controllers.length}`);
console.log(`Controllers fixed: ${totalFixed}`);
console.log(`Controllers skipped: ${controllers.length - totalFixed}`);
console.log('═'.repeat(60));

if (totalFixed > 0) {
  console.log('\n✅ All fixes applied successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the changes: git diff');
  console.log('2. Test locally: pnpm start:dev');
  console.log('3. Run migrations: Execute add-activity-logs-and-soft-delete.sql');
  console.log('4. Deploy: ./deploy-hostinger.ps1');
  console.log('\n⚠️  IMPORTANT: Test each user role before deploying to production!');
} else {
  console.log('\n✅ All controllers already have proper permissions!');
}
