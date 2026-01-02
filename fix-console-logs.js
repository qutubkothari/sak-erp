const fs = require('fs');

const file = '/home/ubuntu/sak-erp/apps/api/src/purchase/services/purchase-orders.service.ts';
let content = fs.readFileSync(file, 'utf8');

// Remove all broken console.log lines
content = content.replace(/\s*console\.log\(.*?Payment.*?\);/gs, '');

// Add proper console.log at the start of create method
content = content.replace(
  /(async create\(tenantId: string, userId: string, data: any\) \{)/,
  `$1
    console.log("=== PO CREATE - Payment data:", {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });`
);

// Add proper console.log at the start of update method  
content = content.replace(
  /(async update\(tenantId: string, id: string, data: any\) \{)/,
  `$1
    console.log("=== PO UPDATE - Payment data:", {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });`
);

fs.writeFileSync(file, content);
console.log('✓ Fixed console.log statements in purchase-orders.service.ts');
