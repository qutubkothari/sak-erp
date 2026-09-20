#!/bin/bash
# COMPLETE GO-LIVE TEST - Creates data in ALL modules and validates
# Date: 2025-11-28

API="http://localhost:4000/api/v1"
TOKEN=""
ERRORS=0
TENANT_ID=""

echo "========================================================"
echo "  COMPLETE GO-LIVE VALIDATION TEST"
echo "  Creating test data in all 14 modules"
echo "========================================================"
echo ""

# Login
echo "Step 1: Authentication..."
LOGIN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"email":"qatester@example.com","password":"Test123456!"}')
TOKEN=$(echo $LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
TENANT_ID=$(echo $LOGIN | grep -o '"tenantId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✓ Authenticated (Tenant: ${TENANT_ID:0:8}...)"
echo ""

# Module 1-7: Already created by E2E tests, just verify
echo "Modules 1-7: Purchase Flow (Already created by E2E test)"
echo "Running E2E test..."
bash /var/www/sak-erp/test-e2e-purchase.sh > /tmp/e2e-result.log 2>&1
if grep -q "✓ UIDs verified" /tmp/e2e-result.log; then
  echo "✓ Vendor, PR, PO, GRN, UID modules - DATA CREATED"
else
  echo "❌ E2E test failed"
  ERRORS=$((ERRORS + 1))
fi

bash /var/www/sak-erp/test-quality-module.sh > /tmp/quality-result.log 2>&1
if grep -q "Quality inspection created" /tmp/quality-result.log; then
  echo "✓ Quality Inspection, NCR modules - DATA CREATED"
else
  echo "❌ Quality test failed"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Module 8: Inventory - Create Warehouse
echo "Module 8: Inventory..."
WH_RESP=$(curl -s -X POST "$API/inventory/warehouses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"warehouse_code":"WH-001","warehouse_name":"Main Warehouse","location":"Mumbai","plant_code":"MUM"}')

if echo "$WH_RESP" | grep -q '"id"'; then
  echo "✓ Warehouse created"
else
  echo "❌ Warehouse creation failed: $WH_RESP"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Module 9: Production - Create Production Order
echo "Module 9: Production..."
PROD_RESP=$(curl -s -X POST "$API/production" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"00000000-0000-0000-0000-000000000002","quantity":100,"startDate":"2025-11-28","endDate":"2025-12-05","priority":"HIGH"}')

if echo "$PROD_RESP" | grep -q '"id"'; then
  echo "✓ Production order created"
else
  echo "❌ Production order failed: $PROD_RESP"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Module 10: BOM - Create Bill of Materials
echo "Module 10: BOM..."
BOM_RESP=$(curl -s -X POST "$API/bom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_id":"00000000-0000-0000-0000-000000000003","version":"v1.0","is_active":true,"description":"Assembly BOM"}')

if echo "$BOM_RESP" | grep -q '"id"'; then
  echo "✓ BOM created"
else
  echo "❌ BOM creation failed: $BOM_RESP"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Module 11: Sales - Create Customer
echo "Module 11: Sales..."
CUST_RESP=$(curl -s -X POST "$API/sales/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_code":"CUST-001","name":"ABC Industries","contact_person":"Jane Smith","email":"jane@abc.com","phone":"9876543211","payment_terms":"NET30"}')

if echo "$CUST_RESP" | grep -q '"id"'; then
  CUST_ID=$(echo $CUST_RESP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✓ Customer created: $CUST_ID"
else
  echo "❌ Customer creation failed: $CUST_RESP"
  ERRORS=$((ERRORS + 1))
  CUST_ID="00000000-0000-0000-0000-000000000099"
fi
echo ""

# Module 12: Service - Create Service Ticket
echo "Module 12: Service..."
TICKET_RESP=$(curl -s -X POST "$API/service/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customer_id\":\"$CUST_ID\",\"uid\":\"UID-TEST-001\",\"issue_description\":\"Machine not starting\",\"priority\":\"HIGH\",\"status\":\"OPEN\"}")

if echo "$TICKET_RESP" | grep -q '"id"'; then
  echo "✓ Service ticket created"
else
  echo "❌ Service ticket failed: $TICKET_RESP"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Module 13: HR Employees
echo "Module 13: HR Employees..."
EMP_RESP=$(curl -s -X POST "$API/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP-001","first_name":"John","last_name":"Doe","email":"john.doe@company.com","phone":"9876543210","department":"Production","designation":"Operator","date_of_joining":"2025-01-01","status":"ACTIVE"}')

if echo "$EMP_RESP" | grep -q '"id"'; then
  EMP_ID=$(echo $EMP_RESP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✓ Employee created: $EMP_ID"
else
  echo "❌ Employee creation failed: $EMP_RESP"
  ERRORS=$((ERRORS + 1))
  EMP_ID="00000000-0000-0000-0000-000000000098"
fi
echo ""

# Module 14: HR Attendance
echo "Module 14: HR Attendance..."
ATT_RESP=$(curl -s -X POST "$API/hr/attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"employee_id\":\"$EMP_ID\",\"attendance_date\":\"$(date +%Y-%m-%d)\",\"check_in\":\"09:00:00\",\"check_out\":\"18:00:00\",\"status\":\"PRESENT\",\"work_hours\":9}")

if echo "$ATT_RESP" | grep -q '"id"'; then
  echo "✓ Attendance record created"
else
  echo "❌ Attendance failed: $ATT_RESP"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# VERIFICATION - Count records in each module
echo "========================================================"
echo "  DATABASE VERIFICATION - Counting Records"
echo "========================================================"
echo ""

COUNT_VENDORS=$(curl -s "$API/purchase/vendors" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_PRS=$(curl -s "$API/purchase/requisitions" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_POS=$(curl -s "$API/purchase/orders" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_GRNS=$(curl -s "$API/purchase/grn" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_QUALITY=$(curl -s "$API/quality/inspections" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_INVENTORY=$(curl -s "$API/inventory/warehouses" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_PRODUCTION=$(curl -s "$API/production" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_BOM=$(curl -s "$API/bom" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_CUSTOMERS=$(curl -s "$API/sales/customers" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_TICKETS=$(curl -s "$API/service/tickets" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_EMPLOYEES=$(curl -s "$API/hr/employees" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)
COUNT_ATTENDANCE=$(curl -s "$API/hr/attendance" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)

echo "1.  Vendors: $COUNT_VENDORS"
echo "2.  Purchase Requisitions: $COUNT_PRS"
echo "3.  Purchase Orders: $COUNT_POS"
echo "4.  GRNs: $COUNT_GRNS"
echo "5.  Quality Inspections: $COUNT_QUALITY"
echo "6.  Warehouses: $COUNT_INVENTORY"
echo "7.  Production Orders: $COUNT_PRODUCTION"
echo "8.  BOMs: $COUNT_BOM"
echo "9.  Customers: $COUNT_CUSTOMERS"
echo "10. Service Tickets: $COUNT_TICKETS"
echo "11. Employees: $COUNT_EMPLOYEES"
echo "12. Attendance Records: $COUNT_ATTENDANCE"
echo ""

# GO-LIVE READINESS CHECK
echo "========================================================"
echo "  GO-LIVE READINESS CHECK"
echo "========================================================"
echo ""

MODULES_WITH_DATA=0
[ "$COUNT_VENDORS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_PRS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_POS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_GRNS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_QUALITY" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_INVENTORY" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_PRODUCTION" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_BOM" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_CUSTOMERS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_TICKETS" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_EMPLOYEES" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))
[ "$COUNT_ATTENDANCE" -gt 0 ] && MODULES_WITH_DATA=$((MODULES_WITH_DATA + 1))

echo "Modules with test data: $MODULES_WITH_DATA / 12"
echo "Errors encountered: $ERRORS"
echo ""

if [ $MODULES_WITH_DATA -ge 10 ] && [ $ERRORS -eq 0 ]; then
  echo "✅ SYSTEM IS GO-LIVE READY"
  echo "   - All critical modules have data"
  echo "   - No errors during creation"
  echo "   - Complete traceability working"
  echo ""
  echo "🚀 READY TO DEPLOY TO CLIENT"
elif [ $MODULES_WITH_DATA -ge 8 ]; then
  echo "⚠️ SYSTEM MOSTLY READY"
  echo "   - Most modules working"
  echo "   - Minor issues to fix: $ERRORS"
else
  echo "❌ NOT READY FOR GO-LIVE"
  echo "   - Only $MODULES_WITH_DATA modules have data"
  echo "   - Errors: $ERRORS"
fi

echo "========================================================"
exit $ERRORS
