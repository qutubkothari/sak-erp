#!/bin/bash
# COMPLETE GO-LIVE TEST - Self-contained with registration
API="http://localhost:4000/api/v1"
EMAIL="golive$(date +%s)@test.com"
PASSWORD="Test123!"

echo "========================================================"
echo "  COMPLETE GO-LIVE VALIDATION - Creating Fresh Test Data"
echo "========================================================"

# Register new user
echo "Registering test user: $EMAIL"
curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"Go\",\"lastName\":\"Live\",\"companyName\":\"Test Co\"}" > /dev/null

# Login
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✓ Authenticated"
echo ""

# Create test data in each module
ERRORS=0

# Warehouse
echo -n "Creating Warehouse... "
WH=$(curl -s -X POST "$API/inventory/warehouses" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"warehouse_code":"WH-001","warehouse_name":"Main WH","location":"Mumbai","plant_code":"MUM"}')
[ -z "$(echo $WH | grep '"id"')" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"

# BOM
echo -n "Creating BOM... "
BOM=$(curl -s -X POST "$API/bom" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"item_id":"00000000-0000-0000-0000-000000000001","version":"v1.0","is_active":true}')
[ -z "$(echo $BOM | grep '"id"')" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"

# Employee
echo -n "Creating Employee... "
EMP=$(curl -s -X POST "$API/hr/employees" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"employee_code":"EMP-001","first_name":"John","last_name":"Doe","email":"john@test.com","department":"Production","designation":"Operator","status":"ACTIVE"}')
EMP_ID=$(echo $EMP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -z "$EMP_ID" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"

# Attendance
if [ ! -z "$EMP_ID" ]; then
  echo -n "Creating Attendance... "
  ATT=$(curl -s -X POST "$API/hr/attendance" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"employee_id\":\"$EMP_ID\",\"attendance_date\":\"$(date +%Y-%m-%d)\",\"check_in\":\"09:00\",\"status\":\"PRESENT\"}")
  [ -z "$(echo $ATT | grep '"id"')" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"
fi

# Production
echo -n "Creating Production Order... "
PROD=$(curl -s -X POST "$API/production" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"itemId":"00000000-0000-0000-0000-000000000002","quantity":100,"startDate":"2025-11-28","endDate":"2025-12-05"}')
[ -z "$(echo $PROD | grep '"id"')" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"

# Customer
echo -n "Creating Customer... "
CUST=$(curl -s -X POST "$API/sales/customers" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"customer_code":"CUST-001","name":"ABC Ltd","contact_person":"Jane","email":"jane@abc.com","phone":"1234567890"}')
CUST_ID=$(echo $CUST | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -z "$CUST_ID" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"

# Service Ticket
if [ ! -z "$CUST_ID" ]; then
  echo -n "Creating Service Ticket... "
  TICKET=$(curl -s -X POST "$API/service/tickets" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"customer_id\":\"$CUST_ID\",\"uid\":\"UID-TEST\",\"issue_description\":\"Test issue\",\"priority\":\"HIGH\",\"status\":\"OPEN\"}")
  [ -z "$(echo $TICKET | grep '"id"')" ] && ERRORS=$((ERRORS+1)) && echo "❌" || echo "✓"
fi

echo ""
echo "========================================================"
echo "  FINAL VERIFICATION"
echo "========================================================"

# Count records
echo -n "Warehouses: "; curl -s "$API/inventory/warehouses" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "BOMs: "; curl -s "$API/bom" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "Employees: "; curl -s "$API/hr/employees" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "Attendance: "; curl -s "$API/hr/attendance" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "Production: "; curl -s "$API/production" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "Customers: "; curl -s "$API/sales/customers" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l
echo -n "Service Tickets: "; curl -s "$API/service/tickets" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ GO-LIVE READY - All modules have test data, zero errors"
else
  echo "⚠️ $ERRORS errors encountered"
fi
echo "========================================================"
