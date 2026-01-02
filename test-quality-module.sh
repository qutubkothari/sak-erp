#!/bin/bash

# Quality Module Test Script
# Tests quality inspections and NCR workflow

BASE_URL="http://localhost:4000/api/v1"
TIMESTAMP=$(date +%s)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================================"
echo "  Quality Module Test"
echo "  Timestamp: $(date)"
echo "========================================================"
echo ""

# Step 1: Authenticate
echo -e "${BLUE}Step 1: Authenticating...${NC}"

# Try to register first
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"qatest-quality-${TIMESTAMP}@saif.com\",
    \"password\": \"Test@123456\",
    \"firstName\": \"QA\",
    \"lastName\": \"Quality Tester\",
    \"tenantName\": \"QA Quality Test ${TIMESTAMP}\"
  }")

# Then login
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"qatest-quality-${TIMESTAMP}@saif.com\",
    \"password\": \"Test@123456\"
  }")

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
TENANT_ID=$(echo "$AUTH_RESPONSE" | grep -o '"tenantId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated successfully${NC}"
echo "Tenant ID: $TENANT_ID"
echo ""

# Step 2: Check if quality_inspections table exists
echo -e "${BLUE}Step 2: Testing Quality Inspection creation...${NC}"
# Generate a valid UUID for item_id
ITEM_ID="00000000-0000-0000-0000-$(printf '%012d' $TIMESTAMP)"

INSPECTION_RESPONSE=$(curl -s -X POST "$BASE_URL/quality/inspections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"inspection_type\": \"INCOMING\",
    \"inspection_date\": \"$(date +%Y-%m-%d)\",
    \"item_id\": \"$ITEM_ID\",
    \"item_code\": \"ITEM-TEST-${TIMESTAMP}\",
    \"item_name\": \"Test Item for Quality\",
    \"batch_number\": \"BATCH-${TIMESTAMP}\",
    \"inspected_quantity\": 100,
    \"inspector_name\": \"QA Tester\",
    \"inspection_checklist\": \"Visual check, Dimension check, Functional test\"
  }")

INSPECTION_ID=$(echo "$INSPECTION_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$INSPECTION_ID" ]; then
    echo -e "${GREEN}✓ Quality inspection created: $INSPECTION_ID${NC}"
else
    echo -e "${RED}✗ Quality inspection creation failed${NC}"
    echo "Response: $INSPECTION_RESPONSE"
    
    # Check if it's a table missing error
    if echo "$INSPECTION_RESPONSE" | grep -q "relation.*does not exist"; then
        echo -e "${YELLOW}⚠ Database tables missing - need to create quality schema${NC}"
    fi
fi
echo ""

# Step 3: List inspections
echo -e "${BLUE}Step 3: Listing quality inspections...${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/quality/inspections" \
  -H "Authorization: Bearer $TOKEN")

INSPECTION_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id"' | wc -l)
echo "Found $INSPECTION_COUNT inspections"
echo ""

# Step 4: Test NCR creation
echo -e "${BLUE}Step 4: Testing NCR creation...${NC}"
NCR_RESPONSE=$(curl -s -X POST "$BASE_URL/quality/ncr" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ncr_date\": \"$(date +%Y-%m-%d)\",
    \"inspection_id\": \"$INSPECTION_ID\",
    \"description\": \"Dimensional defect found during incoming inspection\",
    \"defect_type\": \"DIMENSIONAL\",
    \"defect_description\": \"Dimension out of specification\",
    \"quantity_affected\": 10,
    \"severity\": \"MAJOR\",
    \"reported_by\": \"QA Tester\"
  }")

NCR_ID=$(echo "$NCR_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NCR_ID" ]; then
    echo -e "${GREEN}✓ NCR created: $NCR_ID${NC}"
else
    echo -e "${RED}✗ NCR creation failed${NC}"
    echo "Response: $NCR_RESPONSE"
fi
echo ""

# Summary
echo "========================================================"
echo "  Test Summary"
echo "========================================================"
echo -e "${GREEN}✓ Authentication successful${NC}"

if [ -n "$INSPECTION_ID" ]; then
    echo -e "${GREEN}✓ Quality inspection module working${NC}"
else
    echo -e "${RED}✗ Quality inspection module needs setup${NC}"
fi

if [ -n "$NCR_ID" ]; then
    echo -e "${GREEN}✓ NCR module working${NC}"
else
    echo -e "${YELLOW}⚠ NCR module needs verification${NC}"
fi

echo ""
echo "========================================================"
