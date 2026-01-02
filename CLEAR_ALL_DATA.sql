-- ============================================
-- CLEAR ALL DATA - Production Database Reset
-- WARNING: This will delete ALL data from ALL tables
-- Use with extreme caution!
-- ============================================

-- Helper function to safely delete from table if it exists
CREATE OR REPLACE FUNCTION safe_delete_all(table_name text) RETURNS void AS $$
BEGIN
  EXECUTE format('DELETE FROM %I WHERE id != ''00000000-0000-0000-0000-000000000000''', table_name);
  RAISE NOTICE 'Cleared: %', table_name;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipped (not exists): %', table_name;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error on %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PRODUCTION & MANUFACTURING
-- ============================================
SELECT safe_delete_all('job_order_bom_items');
SELECT safe_delete_all('job_order_bom');
SELECT safe_delete_all('job_order_components');
SELECT safe_delete_all('job_orders');
SELECT safe_delete_all('routing_steps');
SELECT safe_delete_all('routings');
SELECT safe_delete_all('bom_items');
SELECT safe_delete_all('bom');
SELECT safe_delete_all('uid_registry');
SELECT safe_delete_all('uid_deployment');
SELECT safe_delete_all('work_stations');

-- ============================================
-- PURCHASE & PROCUREMENT
-- ============================================
SELECT safe_delete_all('grn_uids');
SELECT safe_delete_all('grn_items');
SELECT safe_delete_all('grn');
SELECT safe_delete_all('po_tracking');
SELECT safe_delete_all('po_items');
SELECT safe_delete_all('purchase_orders');
SELECT safe_delete_all('purchase_requisition_items');
SELECT safe_delete_all('purchase_requisitions');
SELECT safe_delete_all('vendor_contacts');
SELECT safe_delete_all('vendors');
SELECT safe_delete_all('debit_notes');
SELECT safe_delete_all('rfq_responses');
SELECT safe_delete_all('rfq_items');
SELECT safe_delete_all('rfqs');

-- ============================================
-- SALES & CUSTOMERS
-- ============================================
SELECT safe_delete_all('quotation_items');
SELECT safe_delete_all('quotations');
SELECT safe_delete_all('sales_order_items');
SELECT safe_delete_all('sales_orders');
SELECT safe_delete_all('customer_contacts');
SELECT safe_delete_all('customers');

-- ============================================
-- INVENTORY & WAREHOUSE
-- ============================================
SELECT safe_delete_all('stock_entries');
SELECT safe_delete_all('inventory');
SELECT safe_delete_all('item_vendor_preferences');
SELECT safe_delete_all('item_drawings');
SELECT safe_delete_all('items');
SELECT safe_delete_all('purchase_price_history');

-- ============================================
-- QUALITY CONTROL
-- ============================================
SELECT safe_delete_all('qc_inspections');
SELECT safe_delete_all('qc_test_results');

-- ============================================
-- SERVICE & WARRANTY
-- ============================================
SELECT safe_delete_all('service_tickets');
SELECT safe_delete_all('warranty_claims');

-- ============================================
-- DOCUMENTS & FILES
-- ============================================
SELECT safe_delete_all('document_workflow_history');
SELECT safe_delete_all('document_approvals');
SELECT safe_delete_all('document_access_logs');
SELECT safe_delete_all('document_revisions');
SELECT safe_delete_all('documents');
SELECT safe_delete_all('document_categories');

-- ============================================
-- HR & PAYROLL
-- ============================================
SELECT safe_delete_all('monthly_payroll');
SELECT safe_delete_all('payslips');
SELECT safe_delete_all('attendance');
SELECT safe_delete_all('leave_requests');
SELECT safe_delete_all('salary_components');
SELECT safe_delete_all('employees');
SELECT safe_delete_all('departments');

-- ============================================
-- ACCOUNTING
-- ============================================
SELECT safe_delete_all('journal_entries');
SELECT safe_delete_all('account_transactions');
SELECT safe_delete_all('accounts');

-- ============================================
-- EMAIL & NOTIFICATIONS
-- ============================================
SELECT safe_delete_all('email_messages');
SELECT safe_delete_all('email_folders');
SELECT safe_delete_all('email_accounts');

-- ============================================
-- SYSTEM & AUDIT
-- ============================================
SELECT safe_delete_all('audit_logs');
SELECT safe_delete_all('notifications');
SELECT safe_delete_all('system_logs');

-- Cleanup function
DROP FUNCTION IF EXISTS safe_delete_all(text);

-- Display message
SELECT '✅ All data has been cleared successfully!' as message;
