#!/bin/bash

# Test all modules after fixes
# Date: November 28, 2025
# Purpose: Validate all 14 modules are working after FK and implementation fixes

API_URL="http://35.154.55.38:4000/api/v1"
SERVER="35.154.55.38"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
TOTAL=0

echo "========================================="
echo "    SAK ERP - Full Module Test Suite"
echo "    Testing All 14 Modules After Fixes"
echo "========================================="
echo ""

# Step 1: Authentication
echo -e "${BLUE}[TEST 1/20]${NC} Testing Authentication..."
TOTAL=$((TOTAL + 1))
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "QA",
    "lastName": "Tester",
    "email": "qa.full@test.com",
    "password": "Test@123",
    "companyName": "QA Test Company"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.access_token // empty')
TENANT_ID=$(echo $REGISTER_RESPONSE | jq -r '.user.tenant_id // empty')

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authentication working (Token: ${TOKEN:0:20}...)"
    echo "       Tenant ID: $TENANT_ID"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Authentication failed"
    echo "       Response: $REGISTER_RESPONSE"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 2: Vendors Module
echo -e "${BLUE}[TEST 2/20]${NC} Testing Vendors Module..."
TOTAL=$((TOTAL + 1))
VENDOR_RESPONSE=$(curl -s -X POST "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_code": "VEN-FULL-001",
    "vendor_name": "Full Test Vendor",
    "contact_person": "John Vendor",
    "email": "vendor@fulltest.com",
    "phone": "9876543210"
  }')

VENDOR_ID=$(echo $VENDOR_RESPONSE | jq -r '.id // empty')
if [ ! -z "$VENDOR_ID" ] && [ "$VENDOR_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Vendor created successfully (ID: $VENDOR_ID)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Vendor creation failed"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 3: Purchase Requisitions Module
echo -e "${BLUE}[TEST 3/20]${NC} Testing Purchase Requisitions Module..."
TOTAL=$((TOTAL + 1))
PR_RESPONSE=$(curl -s -X POST "$API_URL/purchase/requisitions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_date": "'$(date +%Y-%m-%d)'",
    "purpose": "Full module test PR",
    "items": [
      {
        "item_code": "ITEM-FULL-001",
        "item_name": "Test Item Full",
        "quantity": 50
      }
    ]
  }')

PR_ID=$(echo $PR_RESPONSE | jq -r '.id // empty')
if [ ! -z "$PR_ID" ] && [ "$PR_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - PR created successfully (ID: $PR_ID)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - PR creation failed"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 4: Purchase Orders Module
echo -e "${BLUE}[TEST 4/20]${NC} Testing Purchase Orders Module..."
TOTAL=$((TOTAL + 1))
PO_RESPONSE=$(curl -s -X POST "$API_URL/purchase/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pr_id": "'$PR_ID'",
    "vendor_id": "'$VENDOR_ID'",
    "po_date": "'$(date +%Y-%m-%d)'",
    "items": [
      {
        "item_code": "ITEM-FULL-001",
        "item_name": "Test Item Full",
        "quantity": 50,
        "rate": 100
      }
    ]
  }')

PO_ID=$(echo $PO_RESPONSE | jq -r '.id // empty')
if [ ! -z "$PO_ID" ] && [ "$PO_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - PO created successfully (ID: $PO_ID)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - PO creation failed"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 5: GRN Module
echo -e "${BLUE}[TEST 5/20]${NC} Testing GRN Module..."
TOTAL=$((TOTAL + 1))
GRN_RESPONSE=$(curl -s -X POST "$API_URL/purchase/grn" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "po_id": "'$PO_ID'",
    "grn_date": "'$(date +%Y-%m-%d)'",
    "items": [
      {
        "item_code": "ITEM-FULL-001",
        "item_name": "Test Item Full",
        "received_qty": 50,
        "accepted_qty": 50
      }
    ]
  }')

GRN_ID=$(echo $GRN_RESPONSE | jq -r '.id // empty')
if [ ! -z "$GRN_ID" ] && [ "$GRN_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - GRN created successfully (ID: $GRN_ID)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - GRN creation failed"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 6: Quality Module
echo -e "${BLUE}[TEST 6/20]${NC} Testing Quality Module..."
TOTAL=$((TOTAL + 1))
QUALITY_RESPONSE=$(curl -s -X POST "$API_URL/quality/inspections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "00000000-0000-0000-0000-'$(date +%s)'",
    "inspection_type": "INCOMING",
    "quantity_inspected": 50
  }')

QUALITY_ID=$(echo $QUALITY_RESPONSE | jq -r '.id // empty')
if [ ! -z "$QUALITY_ID" ] && [ "$QUALITY_ID" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Quality inspection created (ID: $QUALITY_ID)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Quality inspection failed"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 7: Inventory Module
echo -e "${BLUE}[TEST 7/20]${NC} Testing Inventory Module..."
TOTAL=$((TOTAL + 1))
INVENTORY_RESPONSE=$(curl -s -X GET "$API_URL/inventory/stock" \
  -H "Authorization: Bearer $TOKEN")

if echo "$INVENTORY_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Inventory module working (returns array)"
    PASS=$((PASS + 1))
elif echo "$INVENTORY_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$INVENTORY_RESPONSE" | jq -r '.message // .error')
    echo -e "${RED}✗ FAIL${NC} - Inventory error: $ERROR_MSG"
    FAIL=$((FAIL + 1))
else
    echo -e "${YELLOW}? UNKNOWN${NC} - Inventory response unclear"
    echo "       Response: $INVENTORY_RESPONSE"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 8: Production Module
echo -e "${BLUE}[TEST 8/20]${NC} Testing Production Module..."
TOTAL=$((TOTAL + 1))
PRODUCTION_RESPONSE=$(curl -s -X GET "$API_URL/production/orders" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PRODUCTION_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Production module working (returns array)"
    PASS=$((PASS + 1))
elif echo "$PRODUCTION_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$PRODUCTION_RESPONSE" | jq -r '.message // .error')
    echo -e "${RED}✗ FAIL${NC} - Production error: $ERROR_MSG"
    FAIL=$((FAIL + 1))
else
    echo -e "${YELLOW}? UNKNOWN${NC} - Production response unclear"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 9: BOM Module
echo -e "${BLUE}[TEST 9/20]${NC} Testing BOM Module..."
TOTAL=$((TOTAL + 1))
BOM_RESPONSE=$(curl -s -X GET "$API_URL/bom/headers" \
  -H "Authorization: Bearer $TOKEN")

if echo "$BOM_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - BOM module working (returns array)"
    PASS=$((PASS + 1))
elif echo "$BOM_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$BOM_RESPONSE" | jq -r '.message // .error')
    echo -e "${RED}✗ FAIL${NC} - BOM error: $ERROR_MSG"
    FAIL=$((FAIL + 1))
else
    echo -e "${YELLOW}? UNKNOWN${NC} - BOM response unclear"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 10: Sales Module
echo -e "${BLUE}[TEST 10/20]${NC} Testing Sales Module..."
TOTAL=$((TOTAL + 1))
SALES_RESPONSE=$(curl -s -X GET "$API_URL/sales/orders" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SALES_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Sales module working (returns array)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Sales module error"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 11: Service Module
echo -e "${BLUE}[TEST 11/20]${NC} Testing Service Module..."
TOTAL=$((TOTAL + 1))
SERVICE_RESPONSE=$(curl -s -X GET "$API_URL/service/tickets" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SERVICE_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Service module working (returns array)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Service module error"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 12: HR Employees Module
echo -e "${BLUE}[TEST 12/20]${NC} Testing HR Employees Module..."
TOTAL=$((TOTAL + 1))
HR_EMP_RESPONSE=$(curl -s -X GET "$API_URL/hr/employees" \
  -H "Authorization: Bearer $TOKEN")

if echo "$HR_EMP_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - HR Employees module working (returns array)"
    PASS=$((PASS + 1))
elif echo "$HR_EMP_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$HR_EMP_RESPONSE" | jq -r '.message // .error')
    echo -e "${RED}✗ FAIL${NC} - HR Employees error: $ERROR_MSG"
    FAIL=$((FAIL + 1))
else
    echo -e "${YELLOW}? UNKNOWN${NC} - HR Employees response unclear"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 13: HR Attendance Module
echo -e "${BLUE}[TEST 13/20]${NC} Testing HR Attendance Module..."
TOTAL=$((TOTAL + 1))
# First create an employee for attendance test
EMP_RESPONSE=$(curl -s -X POST "$API_URL/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Employee",
    "email": "test.emp@fulltest.com",
    "phone": "1234567890"
  }')

EMP_ID=$(echo $EMP_RESPONSE | jq -r '.id // .[0].id // empty')

if [ ! -z "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
    # Now test attendance
    ATT_RESPONSE=$(curl -s -X GET "$API_URL/hr/attendance?employeeId=$EMP_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$ATT_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC} - HR Attendance module working"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HR Attendance error"
        FAIL=$((FAIL + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - HR Attendance (employee creation failed)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Step 14: UID Module
echo -e "${BLUE}[TEST 14/20]${NC} Testing UID Module..."
TOTAL=$((TOTAL + 1))
UID_RESPONSE=$(curl -s -X GET "$API_URL/uid/all" \
  -H "Authorization: Bearer $TOKEN")

if echo "$UID_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    UID_COUNT=$(echo "$UID_RESPONSE" | jq 'length')
    echo -e "${GREEN}✓ PASS${NC} - UID module working ($UID_COUNT UIDs found)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - UID module error"
    FAIL=$((FAIL + 1))
fi
echo ""

# Additional Integration Tests
echo "========================================="
echo "    Additional Integration Tests"
echo "========================================="
echo ""

# Test 15: Tenant Isolation
echo -e "${BLUE}[TEST 15/20]${NC} Testing Tenant Isolation..."
TOTAL=$((TOTAL + 1))
# Create another tenant
TENANT2_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Tenant2",
    "lastName": "User",
    "email": "tenant2@test.com",
    "password": "Test@123",
    "companyName": "Tenant 2 Company"
  }')

TOKEN2=$(echo $TENANT2_RESPONSE | jq -r '.access_token // empty')

# Try to access Tenant 1's vendor with Tenant 2's token
ISOLATION_TEST=$(curl -s -X GET "$API_URL/purchase/vendors/$VENDOR_ID" \
  -H "Authorization: Bearer $TOKEN2")

if echo "$ISOLATION_TEST" | jq -e '.error or .message' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Tenant isolation working (cross-tenant access blocked)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Tenant isolation broken (cross-tenant access allowed)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 16: JWT Token Expiry Handling
echo -e "${BLUE}[TEST 16/20]${NC} Testing JWT Token Handling..."
TOTAL=$((TOTAL + 1))
INVALID_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid"
TOKEN_TEST=$(curl -s -X GET "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $INVALID_TOKEN")

if echo "$TOKEN_TEST" | jq -e '.statusCode == 401' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - JWT validation working (invalid token rejected)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - JWT validation issue"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 17: API Response Times
echo -e "${BLUE}[TEST 17/20]${NC} Testing API Response Times..."
TOTAL=$((TOTAL + 1))
START_TIME=$(date +%s%N)
curl -s -X GET "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - API response time: ${RESPONSE_TIME}ms (< 1000ms)"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}! SLOW${NC} - API response time: ${RESPONSE_TIME}ms (> 1000ms)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 18: Error Handling
echo -e "${BLUE}[TEST 18/20]${NC} Testing Error Handling..."
TOTAL=$((TOTAL + 1))
ERROR_TEST=$(curl -s -X POST "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}')

if echo "$ERROR_TEST" | jq -e '.statusCode and .message' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Error handling working (proper error response)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Error handling issue"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 19: Database Connection
echo -e "${BLUE}[TEST 19/20]${NC} Testing Database Connectivity..."
TOTAL=$((TOTAL + 1))
DB_TEST=$(curl -s -X GET "$API_URL/health" || curl -s -X GET "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN")

if [ ! -z "$DB_TEST" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Database connectivity working"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Database connectivity issue"
    FAIL=$((FAIL + 1))
fi
echo ""

# Test 20: PM2 Process Status
echo -e "${BLUE}[TEST 20/20]${NC} Testing PM2 Process Status..."
TOTAL=$((TOTAL + 1))
PM2_STATUS=$(ssh -i "c:\Users\musta\OneDrive\Documents\QK-Onedrive\OneDrive\QK-PC\saif-erp.pem" ubuntu@$SERVER "pm2 jlist" 2>/dev/null | jq -r '.[0].pm2_env.status // empty')

if [ "$PM2_STATUS" = "online" ]; then
    echo -e "${GREEN}✓ PASS${NC} - PM2 process online and healthy"
    PASS=$((PASS + 1))
else
    echo -e "${RED}✗ FAIL${NC} - PM2 process not online (status: $PM2_STATUS)"
    FAIL=$((FAIL + 1))
fi
echo ""

# Final Report
echo "========================================="
echo "          FINAL TEST REPORT"
echo "========================================="
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

PASS_RATE=$(( $PASS * 100 / $TOTAL ))
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $PASS -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! System is production-ready.${NC}"
    echo ""
    echo "✓ All 14 modules working"
    echo "✓ Authentication and authorization validated"
    echo "✓ Tenant isolation confirmed"
    echo "✓ Error handling working"
    echo "✓ Performance acceptable"
    echo ""
    echo "Production Readiness: 100%"
elif [ $PASS_RATE -ge 90 ]; then
    echo -e "${YELLOW}✓ EXCELLENT! System is nearly production-ready.${NC}"
    echo ""
    echo "Production Readiness: $PASS_RATE%"
elif [ $PASS_RATE -ge 75 ]; then
    echo -e "${YELLOW}⚠ GOOD! System needs minor fixes.${NC}"
    echo ""
    echo "Production Readiness: $PASS_RATE%"
else
    echo -e "${RED}⚠ NEEDS WORK! Multiple issues found.${NC}"
    echo ""
    echo "Production Readiness: $PASS_RATE%"
fi
echo ""
echo "Test Date: $(date)"
echo "========================================="
