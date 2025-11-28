#!/bin/bash

# Complete Module Validation Script
# Checks all 14 modules for data and functionality

BASE_URL="http://localhost:4000/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================================"
echo "  GO-LIVE VALIDATION REPORT"
echo "  Date: $(date)"
echo "========================================================"
echo ""

# Login
echo -e "${BLUE}Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{
  "email": "qatest1764265247@saif.com",
  "password": "Test123!"
}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
TENANT_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"tenant_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Function to count records
count_records() {
    local endpoint=$1
    local name=$2
    
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/$endpoint")
    
    # Check if response is an array
    if echo "$RESPONSE" | grep -q "^\["; then
        COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
    else
        # Response might be object with data array
        COUNT=$(echo "$RESPONSE" | grep -o '"id":' | wc -l)
    fi
    
    if [ "$COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} $name: $COUNT records"
    else
        echo -e "${YELLOW}○${NC} $name: No data"
    fi
}

# Test all modules
echo "========== MODULE VALIDATION =========="
echo ""

count_records "purchase/vendors" "1. Vendors"
count_records "purchase/requisitions" "2. Purchase Requisitions"
count_records "purchase/orders" "3. Purchase Orders"
count_records "purchase/grn" "4. GRNs"
count_records "uid" "5. UIDs"
count_records "quality/inspections" "6. Quality Inspections"
count_records "bom" "7. Bill of Materials"
count_records "hr/employees" "8. HR Employees"
count_records "hr/attendance" "9. HR Attendance"
count_records "production" "10. Production Orders"
count_records "sales" "11. Sales"
count_records "service" "12. Service Tickets"
count_records "inventory" "13. Inventory"
count_records "documents" "14. Documents"

echo ""
echo "======================================="
echo ""

# Check module accessibility
echo "========== ENDPOINT HEALTH CHECK =========="
echo ""

check_endpoint() {
    local endpoint=$1
    local name=$2
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/$endpoint")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} $name: HTTP $HTTP_CODE"
    elif [ "$HTTP_CODE" = "401" ]; then
        echo -e "${RED}✗${NC} $name: HTTP $HTTP_CODE (Auth issue)"
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}✗${NC} $name: HTTP $HTTP_CODE (Not Found)"
    else
        echo -e "${YELLOW}!${NC} $name: HTTP $HTTP_CODE"
    fi
}

check_endpoint "purchase/vendors" "Vendors"
check_endpoint "purchase/requisitions" "Purchase Requisitions"
check_endpoint "purchase/orders" "Purchase Orders"
check_endpoint "purchase/grn" "GRNs"
check_endpoint "uid" "UIDs"
check_endpoint "quality/inspections" "Quality"
check_endpoint "bom" "BOM"
check_endpoint "hr/employees" "HR Employees"
check_endpoint "hr/attendance" "HR Attendance"
check_endpoint "production" "Production"
check_endpoint "sales" "Sales"
check_endpoint "service" "Service"
check_endpoint "inventory" "Inventory"
check_endpoint "documents" "Documents"

echo ""
echo "============================================"
echo ""
echo "VALIDATION COMPLETE"
echo ""
