#!/bin/bash

# Comprehensive Module Test - Tests all remaining modules
# Tests: Inventory, Production, Sales, Service, BOM, HR

BASE_URL="http://localhost:4000/api/v1"
TIMESTAMP=$(date +%s)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================================"
echo "  Comprehensive ERP Module Test"
echo "  Testing: Inventory, Production, Sales, Service, BOM, HR"
echo "  Timestamp: $(date)"
echo "========================================================"
echo ""

# Authenticate
echo -e "${BLUE}Authenticating...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"qatest-comprehensive-${TIMESTAMP}@saif.com\",
    \"password\": \"Test@123456\",
    \"firstName\": \"QA\",
    \"lastName\": \"Comprehensive\",
    \"tenantName\": \"QA Comprehensive Test ${TIMESTAMP}\"
  }")

AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"qatest-comprehensive-${TIMESTAMP}@saif.com\",
    \"password\": \"Test@123456\"
  }")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Test results counter
PASS=0
FAIL=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -X GET "$BASE_URL/$endpoint" -H "Authorization: Bearer $TOKEN")
    else
        RESPONSE=$(curl -s -X POST "$BASE_URL/$endpoint" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data")
    fi
    
    # Check for common error patterns
    if echo "$RESPONSE" | grep -q "does not exist\|violates\|Invalid\|Unauthorized"; then
        echo -e "${RED}✗ FAIL${NC} - $name"
        echo "   Error: $(echo "$RESPONSE" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)"
        FAIL=$((FAIL + 1))
        return 1
    elif echo "$RESPONSE" | grep -q '"id"'; then
        echo -e "${GREEN}✓ PASS${NC} - $name"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠ UNKNOWN${NC} - $name"
        echo "   Response: $RESPONSE" | head -c 100
        FAIL=$((FAIL + 1))
        return 1
    fi
}

echo "========================================================"
echo "  Module Tests"
echo "========================================================"
echo ""

# Inventory Module
echo -e "${BLUE}=== Inventory Module ===${NC}"
test_endpoint "Get Stock Levels" "GET" "inventory/stock" ""
test_endpoint "Get Stock Movements" "GET" "inventory/movements" ""
echo ""

# Production Module  
echo -e "${BLUE}=== Production Module ===${NC}"
test_endpoint "List Production Orders" "GET" "production/orders" ""
test_endpoint "List Work Orders" "GET" "production/work-orders" ""
echo ""

# Sales Module
echo -e "${BLUE}=== Sales Module ===${NC}"
test_endpoint "List Customers" "GET" "sales/customers" ""
test_endpoint "List Sales Orders" "GET" "sales/orders" ""
test_endpoint "List Quotations" "GET" "sales/quotations" ""
echo ""

# Service Module
echo -e "${BLUE}=== Service Module ===${NC}"
test_endpoint "List Service Tickets" "GET" "service/tickets" ""
test_endpoint "List Service Requests" "GET" "service/requests" ""
echo ""

# BOM Module
echo -e "${BLUE}=== BOM Module ===${NC}"
test_endpoint "List BOMs" "GET" "bom" ""
echo ""

# HR Module
echo -e "${BLUE}=== HR Module ===${NC}"
test_endpoint "List Employees" "GET" "hr/employees" ""
test_endpoint "List Attendance" "GET" "hr/attendance" ""
echo ""

# Summary
echo "========================================================"
echo "  Test Summary"
echo "========================================================"
echo -e "${GREEN}✓ PASS: $PASS${NC}"
echo -e "${RED}✗ FAIL: $FAIL${NC}"
echo ""

if [ $PASS -gt 10 ]; then
    echo -e "${GREEN}✓✓ Excellent! Most modules working${NC}"
elif [ $PASS -gt 5 ]; then
    echo -e "${YELLOW}⚠ Good progress, some modules need work${NC}"
else
    echo -e "${RED}✗ Many modules need database setup${NC}"
fi

echo "========================================================"
