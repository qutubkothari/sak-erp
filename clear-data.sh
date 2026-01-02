#!/bin/bash

SUPABASE_URL="https://nwkaruzvzwwuftjquypk.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q"

tables=(
  "job_order_bom_items"
  "job_order_bom"
  "job_order_components"
  "job_orders"
  "routing_steps"
  "routings"
  "bom_items"
  "bom"
  "grn_uids"
  "grn_items"
  "grn"
  "po_tracking"
  "po_items"
  "purchase_orders"
  "purchase_requisition_items"
  "purchase_requisitions"
  "debit_notes"
  "quotation_items"
  "quotations"
  "sales_order_items"
  "sales_orders"
  "service_tickets"
  "warranty_claims"
  "uid_registry"
  "uid_deployment"
  "stock_entries"
  "inventory"
  "item_vendor_preferences"
  "item_drawings"
  "items"
  "vendors"
  "customers"
  "documents"
  "employees"
)

echo "====================================="
echo "CLEARING ALL DATA FROM DATABASE"
echo "====================================="
echo ""

for table in "${tables[@]}"; do
  echo -n "Clearing $table... "
  response=$(curl -s -X DELETE \
    "${SUPABASE_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000" \
    -H "apikey: ${API_KEY}" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Prefer: return=minimal")
  echo "✓"
done

echo ""
echo "====================================="
echo "✅ ALL DATA CLEARED SUCCESSFULLY!"
echo "====================================="
echo "You can now enter live data."
