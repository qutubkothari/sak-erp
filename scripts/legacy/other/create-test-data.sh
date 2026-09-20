#!/bin/bash
# Create test data for ALL modules
# Date: 2025-11-28

API_URL="http://localhost:4000/api/v1"
TOKEN=""

echo "========================================"
echo "  Creating Test Data for All Modules"
echo "========================================"
echo ""

# Step 1: Login
echo "1. Logging in..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sak.com","password":"admin123"}')

TOKEN=$(echo $LOGIN | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✓ Logged in"
echo ""

# Step 2: Create BOM
echo "2. Creating BOM (Bill of Materials)..."
BOM=$(curl -s -X POST "$API_URL/bom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "00000000-0000-0000-0000-000000000001",
    "version": "v1.0",
    "is_active": true,
    "description": "Test BOM for assembly"
  }')

BOM_ID=$(echo $BOM | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$BOM_ID" ]; then
  echo "✓ BOM created: $BOM_ID"
else
  echo "⚠ BOM creation response: $BOM"
fi
echo ""

# Step 3: Create Employee
echo "3. Creating HR Employee..."
EMP=$(curl -s -X POST "$API_URL/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_code": "EMP-001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@company.com",
    "phone": "9876543210",
    "department": "Production",
    "designation": "Operator",
    "date_of_joining": "2025-01-01",
    "status": "ACTIVE"
  }')

EMP_ID=$(echo $EMP | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$EMP_ID" ]; then
  echo "✓ Employee created: $EMP_ID"
else
  echo "⚠ Employee creation response: $EMP"
fi
echo ""

# Step 4: Create Attendance Record
echo "4. Creating Attendance Record..."
ATT=$(curl -s -X POST "$API_URL/hr/attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": \"$EMP_ID\",
    \"attendance_date\": \"$(date +%Y-%m-%d)\",
    \"check_in\": \"09:00:00\",
    \"check_out\": \"18:00:00\",
    \"status\": \"PRESENT\",
    \"work_hours\": 9
  }")

if echo "$ATT" | grep -q "id"; then
  echo "✓ Attendance recorded"
else
  echo "⚠ Attendance response: $ATT"
fi
echo ""

# Step 5: Create Production Order
echo "5. Creating Production Order..."
PROD=$(curl -s -X POST "$API_URL/production" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "00000000-0000-0000-0000-000000000002",
    "quantity": 100,
    "startDate": "2025-11-28",
    "endDate": "2025-12-05",
    "priority": "HIGH",
    "notes": "Urgent production order"
  }')

PROD_ID=$(echo $PROD | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$PROD_ID" ]; then
  echo "✓ Production order created: $PROD_ID"
else
  echo "⚠ Production response: $PROD"
fi
echo ""

# Step 6: Create Customer
echo "6. Creating Customer (Sales)..."
CUST=$(curl -s -X POST "$API_URL/sales/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_code": "CUST-001",
    "name": "ABC Industries",
    "contact_person": "Jane Smith",
    "email": "jane@abc.com",
    "phone": "9876543211",
    "address": "456 Industrial Area",
    "city": "Delhi",
    "payment_terms": "NET30"
  }')

CUST_ID=$(echo $CUST | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$CUST_ID" ]; then
  echo "✓ Customer created: $CUST_ID"
else
  echo "⚠ Customer response: $CUST"
fi
echo ""

# Step 7: Create Service Ticket
echo "7. Creating Service Ticket..."
TICKET=$(curl -s -X POST "$API_URL/service/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUST_ID\",
    \"uid\": \"UID-TEST-001\",
    \"issue_description\": \"Machine not starting\",
    \"priority\": \"HIGH\",
    \"status\": \"OPEN\"
  }")

TICKET_ID=$(echo $TICKET | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$TICKET_ID" ]; then
  echo "✓ Service ticket created: $TICKET_ID"
else
  echo "⚠ Service ticket response: $TICKET"
fi
echo ""

# Step 8: Create Warehouse
echo "8. Creating Warehouse (Inventory)..."
WH=$(curl -s -X POST "$API_URL/inventory/warehouses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_code": "WH-001",
    "warehouse_name": "Main Warehouse",
    "location": "Mumbai",
    "plant_code": "MUM"
  }')

WH_ID=$(echo $WH | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ ! -z "$WH_ID" ]; then
  echo "✓ Warehouse created: $WH_ID"
else
  echo "⚠ Warehouse response: $WH"
fi
echo ""

# Step 9: Verify Data Created
echo "========================================"
echo "  Verifying Created Data"
echo "========================================"
echo ""

echo "Checking BOM..."
curl -s "$API_URL/bom" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "BOMs found:"

echo "Checking Employees..."
curl -s "$API_URL/hr/employees" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Employees found:"

echo "Checking Attendance..."
curl -s "$API_URL/hr/attendance" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Attendance records found:"

echo "Checking Production Orders..."
curl -s "$API_URL/production" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Production orders found:"

echo "Checking Customers..."
curl -s "$API_URL/sales/customers" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Customers found:"

echo "Checking Service Tickets..."
curl -s "$API_URL/service/tickets" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Service tickets found:"

echo "Checking Warehouses..."
curl -s "$API_URL/inventory/warehouses" -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | xargs echo "Warehouses found:"

echo ""
echo "========================================"
echo "✓ Test data creation complete"
echo "========================================"
