const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://nwkaruzvzwwuftjquypk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
  console.log('Starting to clear all data...\n');

  const tables = [
    // Production & Manufacturing
    { name: 'job_order_bom_items', display: 'Job Order BOM Items' },
    { name: 'job_order_bom', display: 'Job Order BOMs' },
    { name: 'job_order_components', display: 'Job Order Components' },
    { name: 'job_orders', display: 'Job Orders' },
    { name: 'routing_steps', display: 'Routing Steps' },
    { name: 'routings', display: 'Routings' },
    { name: 'bom_items', display: 'BOM Items' },
    { name: 'bom', display: 'BOMs' },
    { name: 'uid_registry', display: 'UID Registry' },
    { name: 'uid_deployment', display: 'UID Deployment' },
    { name: 'work_stations', display: 'Work Stations' },
    
    // Purchase & Procurement
    { name: 'grn_uids', display: 'GRN UIDs' },
    { name: 'grn_items', display: 'GRN Items' },
    { name: 'grn', display: 'GRNs' },
    { name: 'po_tracking', display: 'PO Tracking' },
    { name: 'po_items', display: 'PO Items' },
    { name: 'purchase_orders', display: 'Purchase Orders' },
    { name: 'purchase_requisition_items', display: 'PR Items' },
    { name: 'purchase_requisitions', display: 'Purchase Requisitions' },
    { name: 'vendor_contacts', display: 'Vendor Contacts' },
    { name: 'vendors', display: 'Vendors' },
    { name: 'debit_notes', display: 'Debit Notes' },
    { name: 'rfq_responses', display: 'RFQ Responses' },
    { name: 'rfq_items', display: 'RFQ Items' },
    { name: 'rfqs', display: 'RFQs' },
    
    // Sales & Customers
    { name: 'quotation_items', display: 'Quotation Items' },
    { name: 'quotations', display: 'Quotations' },
    { name: 'sales_order_items', display: 'Sales Order Items' },
    { name: 'sales_orders', display: 'Sales Orders' },
    { name: 'customer_contacts', display: 'Customer Contacts' },
    { name: 'customers', display: 'Customers' },
    
    // Inventory & Warehouse
    { name: 'stock_entries', display: 'Stock Entries' },
    { name: 'inventory', display: 'Inventory' },
    { name: 'item_vendor_preferences', display: 'Item-Vendor Preferences' },
    { name: 'item_drawings', display: 'Item Drawings' },
    { name: 'items', display: 'Items' },
    { name: 'purchase_price_history', display: 'Price History' },
    
    // Quality Control
    { name: 'qc_inspections', display: 'QC Inspections' },
    { name: 'qc_test_results', display: 'QC Test Results' },
    
    // Service & Warranty
    { name: 'service_tickets', display: 'Service Tickets' },
    { name: 'warranty_claims', display: 'Warranty Claims' },
    
    // Documents & Files
    { name: 'document_workflow_history', display: 'Document Workflow History' },
    { name: 'document_approvals', display: 'Document Approvals' },
    { name: 'document_access_logs', display: 'Document Access Logs' },
    { name: 'document_revisions', display: 'Document Revisions' },
    { name: 'documents', display: 'Documents' },
    { name: 'document_categories', display: 'Document Categories' },
    
    // HR & Payroll
    { name: 'monthly_payroll', display: 'Monthly Payroll' },
    { name: 'payslips', display: 'Payslips' },
    { name: 'attendance', display: 'Attendance' },
    { name: 'leave_requests', display: 'Leave Requests' },
    { name: 'salary_components', display: 'Salary Components' },
    { name: 'employees', display: 'Employees' },
    { name: 'departments', display: 'Departments' },
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table.name).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows deleted" which is OK
        console.log(`❌ Error clearing ${table.display}: ${error.message}`);
      } else {
        console.log(`✅ Cleared ${table.display}`);
      }
    } catch (e) {
      console.log(`⚠️  Skipped ${table.display}: ${e.message}`);
    }
  }

  console.log('\n✅ All data cleared successfully!');
  console.log('You can now enter live data.');
}

clearAllData().catch(console.error);
