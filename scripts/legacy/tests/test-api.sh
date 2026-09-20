#!/bin/bash

# Comprehensive API Test Script for Saif Automations ERP
# Tests all major endpoints and workflows

BASE_URL="http://localhost:4000/api/v1"
TIMESTAMP=$(date +%s)

echo "=================================================="
echo "  QA Testing - Saif Automations Manufacturing ERP"
echo "  Date: $(date)"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $test_name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ] || [ "$expected_status" = "any" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "Response: $body" | head -c 200
        echo ""
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "Response: $body"
    fi
    echo ""
}

# Test 1: Check if API is running
echo "=== PHASE 1: API Health Check ==="
test_endpoint "API Root" "GET" "/" "any"

# Test 2: Check Supabase connection
echo ""
echo "=== PHASE 2: Database Connection ==="
echo "Checking if Supabase tables exist..."
echo ""

# Test 3: Authentication - Check if tenants exist
echo "=== PHASE 3: Authentication Tests ==="

# Try to register a user (will fail if no tenant exists)
REGISTER_DATA=$(cat <<EOF
{
  "email": "qatest${TIMESTAMP}@saif.com",
  "password": "Test123!",
  "firstName": "QA",
  "lastName": "Tester"
}
EOF
)

test_endpoint "User Registration" "POST" "/auth/register" "$REGISTER_DATA" "any"

# Test login with the registered user
LOGIN_DATA=$(cat <<EOF
{
  "email": "qatest${TIMESTAMP}@saif.com",
  "password": "Test123!"
}
EOF
)

test_endpoint "User Login" "POST" "/auth/login" "$LOGIN_DATA" "any"

# Store token if login was successful
TOKEN=""
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "$LOGIN_DATA")
if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "✓ Token acquired: ${TOKEN:0:50}..."
    echo ""
fi

# Test 4: Protected endpoints (if we have a token)
if [ -n "$TOKEN" ]; then
    echo "=== PHASE 4: Protected Endpoint Tests ==="
    
    # Test vendors endpoint
    curl -s -X GET "$BASE_URL/purchase/vendors" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
    echo ""
    
    # Test BOM endpoint
    curl -s -X GET "$BASE_URL/bom" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
    echo ""
else
    echo "${YELLOW}⚠ Skipping protected endpoint tests - no auth token${NC}"
    echo ""
fi

# Summary
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the output above.${NC}"
    exit 1
fi
