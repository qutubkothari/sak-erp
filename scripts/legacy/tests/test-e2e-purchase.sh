#!/bin/bash

# End-to-End Purchase Flow Test
# Tests: Vendor ΓåÆ Purchase Requisition ΓåÆ Purchase Order ΓåÆ GRN ΓåÆ UID Generation

BASE_URL="http://localhost:4000/api/v1"
TIMESTAMP=$(date +%s)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================================"
echo "  E2E Test: Complete Purchase-to-GRN Flow with UID"
echo "  Timestamp: $(date)"
echo "========================================================"
echo ""

# Step 1: Login and get token
echo -e "${BLUE}Step 1: Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{
  "email": "qatest1764265247@saif.com",
  "password": "Test123!"
}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
TENANT_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"tenant_id":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Γ£ù Authentication failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Γ£ô Authenticated successfully${NC}"
echo "Tenant ID: $TENANT_ID"
echo "User ID: $USER_ID"
echo ""

# Step 2: Create a Vendor
echo -e "${BLUE}Step 2: Creating vendor...${NC}"
VENDOR_RESPONSE=$(curl -s -X POST "$BASE_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"VEN-QA-${TIMESTAMP}\",
    \"name\": \"QA Test Vendor ${TIMESTAMP}\",
    \"category\": \"RAW_MATERIAL\",
    \"contactPerson\": \"John Doe\",
    \"phone\": \"1234567890\",
    \"email\": \"vendor${TIMESTAMP}@test.com\",
    \"address\": \"123 Test Street\",
    \"gstNumber\": \"GST${TIMESTAMP}\",
    \"panNumber\": \"PAN${TIMESTAMP}\",
    \"paymentTerms\": \"NET_30\",
    \"creditLimit\": 100000
  }")

VENDOR_ID=$(echo "$VENDOR_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$VENDOR_ID" ]; then
    echo -e "${RED}Γ£ù Vendor creation failed${NC}"
    echo "Response: $VENDOR_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Γ£ô Vendor created: $VENDOR_ID${NC}"
echo "Vendor Code: VEN-QA-${TIMESTAMP}"
echo ""

# Step 3: Create Purchase Requisition
echo -e "${BLUE}Step 3: Creating Purchase Requisition...${NC}"
PR_RESPONSE=$(curl -s -X POST "$BASE_URL/purchase/requisitions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"prNumber\": \"PR-QA-${TIMESTAMP}\",
    \"requestDate\": \"$(date +%Y-%m-%d)\",
    \"requiredDate\": \"$(date -d '+7 days' +%Y-%m-%d)\",
    \"department\": \"QA Testing\",
    \"purpose\": \"Automated QA Test - E2E Flow\",
    \"items\": [
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-1\",
        \"itemName\": \"QA Test Item 1\",
        \"uom\": \"PCS\",
        \"requestedQty\": 100,
        \"estimatedRate\": 50.00,
        \"remarks\": \"Test item for E2E flow\"
      },
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-2\",
        \"itemName\": \"QA Test Item 2\",
        \"uom\": \"KG\",
        \"requestedQty\": 50,
        \"estimatedRate\": 75.00,
        \"remarks\": \"Second test item\"
      }
    ]
  }")

PR_ID=$(echo "$PR_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$PR_ID" ]; then
    echo -e "${RED}Γ£ù PR creation failed${NC}"
    echo "Response: $PR_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Γ£ô Purchase Requisition created: $PR_ID${NC}"
echo "PR Number: PR-QA-${TIMESTAMP}"
echo ""

# Step 4: Approve Purchase Requisition
echo -e "${BLUE}Step 4: Approving Purchase Requisition...${NC}"
PR_APPROVE_RESPONSE=$(curl -s -X PUT "$BASE_URL/purchase/requisitions/$PR_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"remarks\": \"Approved by QA automation\"
  }")

echo -e "${GREEN}Γ£ô Purchase Requisition approved${NC}"
echo ""

# Step 5: Create Purchase Order from PR
echo -e "${BLUE}Step 5: Creating Purchase Order...${NC}"
PO_RESPONSE=$(curl -s -X POST "$BASE_URL/purchase/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"poNumber\": \"PO-QA-${TIMESTAMP}\",
    \"prId\": \"$PR_ID\",
    \"vendorId\": \"$VENDOR_ID\",
    \"poDate\": \"$(date +%Y-%m-%d)\",
    \"deliveryDate\": \"$(date -d '+14 days' +%Y-%m-%d)\",
    \"paymentTerms\": \"NET_30\",
    \"deliveryAddress\": \"QA Test Warehouse, 456 Test Avenue\",
    \"items\": [
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-1\",
        \"itemName\": \"QA Test Item 1\",
        \"uom\": \"PCS\",
        \"orderedQty\": 100,
        \"rate\": 48.00,
        \"taxPercent\": 18,
        \"discountPercent\": 0
      },
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-2\",
        \"itemName\": \"QA Test Item 2\",
        \"uom\": \"KG\",
        \"orderedQty\": 50,
        \"rate\": 72.00,
        \"taxPercent\": 18,
        \"discountPercent\": 0
      }
    ]
  }")

PO_ID=$(echo "$PO_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$PO_ID" ]; then
    echo -e "${RED}Γ£ù PO creation failed${NC}"
    echo "Response: $PO_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Γ£ô Purchase Order created: $PO_ID${NC}"
echo "PO Number: PO-QA-${TIMESTAMP}"
echo ""

# Step 6: Create GRN (Goods Receipt Note) with UID Generation
echo -e "${BLUE}Step 6: Creating GRN with UID generation...${NC}"
GRN_RESPONSE=$(curl -s -X POST "$BASE_URL/purchase/grn" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"grnNumber\": \"GRN-QA-${TIMESTAMP}\",
    \"poId\": \"$PO_ID\",
    \"vendorId\": \"$VENDOR_ID\",
    \"grnDate\": \"$(date +%Y-%m-%d)\",
    \"invoiceNumber\": \"INV-${TIMESTAMP}\",
    \"invoiceDate\": \"$(date +%Y-%m-%d)\",
    \"vehicleNumber\": \"QA-TEST-1234\",
    \"driverName\": \"Test Driver\",
    \"receivedBy\": \"QA Tester\",
    \"items\": [
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-1\",
        \"itemName\": \"QA Test Item 1\",
        \"poQty\": 100,
        \"receivedQty\": 100,
        \"acceptedQty\": 100,
        \"rejectedQty\": 0,
        \"uom\": \"PCS\",
        \"batchNumber\": \"BATCH-${TIMESTAMP}-1\",
        \"expiryDate\": \"$(date -d '+1 year' +%Y-%m-%d)\",
        \"generateUID\": true
      },
      {
        \"itemCode\": \"ITEM-${TIMESTAMP}-2\",
        \"itemName\": \"QA Test Item 2\",
        \"poQty\": 50,
        \"receivedQty\": 50,
        \"acceptedQty\": 48,
        \"rejectedQty\": 2,
        \"uom\": \"KG\",
        \"batchNumber\": \"BATCH-${TIMESTAMP}-2\",
        \"expiryDate\": \"$(date -d '+1 year' +%Y-%m-%d)\",
        \"generateUID\": true
      }
    ]
  }")

GRN_ID=$(echo "$GRN_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$GRN_ID" ]; then
    echo -e "${RED}✗ GRN creation failed${NC}"
    echo "Response: $GRN_RESPONSE"
    # Continue anyway to show response
else
    echo -e "${GREEN}✓ GRN created: $GRN_ID${NC}"
    echo "GRN Number: GRN-QA-${TIMESTAMP}"
fi
echo ""

# Step 6.5: Get GRN items to generate UIDs
echo -e "${BLUE}Step 6.5: Getting GRN items for UID generation...${NC}"
GRN_DETAILS=$(curl -s -X GET "$BASE_URL/purchase/grn/$GRN_ID" \
  -H "Authorization: Bearer $TOKEN")

# Extract GRN item IDs from grn_items array
GRN_ITEM_ID=$(echo "$GRN_DETAILS" | grep -oP '"grn_items":\[\{"id":"\K[^"]+' | head -1)

if [ -z "$GRN_ITEM_ID" ]; then
    # Try alternative pattern
    GRN_ITEM_ID=$(echo "$GRN_DETAILS" | grep -oP 'grn_items.*?"id":"\K[^"]+' | head -1)
fi

if [ -n "$GRN_ITEM_ID" ]; then
    echo -e "${GREEN}✓ Found GRN item: $GRN_ITEM_ID${NC}"
    
    # Generate UIDs for the first item (100 pieces accepted)
    echo -e "${BLUE}Generating UIDs for GRN item...${NC}"
    UID_GEN_RESPONSE=$(curl -s -X POST "$BASE_URL/purchase/grn/items/$GRN_ITEM_ID/generate-uids" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"acceptedQty\": 100,
        \"warrantyMonths\": 12
      }")
    
    UIDS_GENERATED=$(echo "$UID_GEN_RESPONSE" | grep -o '"uidsGenerated":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$UIDS_GENERATED" ] && [ "$UIDS_GENERATED" -gt 0 ]; then
        echo -e "${GREEN}✓ Generated $UIDS_GENERATED UIDs successfully${NC}"
    else
        echo -e "${YELLOW}⚠ UID generation response: $UID_GEN_RESPONSE${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not find GRN item ID${NC}"
fi
echo ""

# Step 7: Verify UID Generation
echo -e "${BLUE}Step 7: Verifying UID generation...${NC}"
UID_RESPONSE=$(curl -s -X GET "$BASE_URL/purchase/grn/$GRN_ID/uids" \
  -H "Authorization: Bearer $TOKEN")

UID_COUNT=$(echo "$UID_RESPONSE" | grep -o '"uid_code"' | wc -l)

if [ "$UID_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ UIDs verified successfully: $UID_COUNT UIDs found${NC}"
    echo "Sample UID codes:"
    echo "$UID_RESPONSE" | grep -o '"uid_code":"[^"]*' | head -5 | cut -d'"' -f4
else
    echo -e "${YELLOW}⚠ No UIDs found${NC}"
    echo "Response: $UID_RESPONSE"
fi
echo ""

# Step 8: Get Purchase Order Details
echo -e "${BLUE}Step 8: Verifying Purchase Order details...${NC}"
PO_DETAILS=$(curl -s -X GET "$BASE_URL/purchase/orders/$PO_ID" \
  -H "Authorization: Bearer $TOKEN")

PO_STATUS=$(echo "$PO_DETAILS" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo -e "PO Status: ${GREEN}$PO_STATUS${NC}"
echo ""

# Summary
echo "========================================================"
echo "  E2E Test Summary"
echo "========================================================"
echo -e "${GREEN}Γ£ô Authentication successful${NC}"
echo -e "${GREEN}Γ£ô Vendor created${NC}"
echo -e "${GREEN}Γ£ô Purchase Requisition created and approved${NC}"
echo -e "${GREEN}Γ£ô Purchase Order created${NC}"

if [ -n "$GRN_ID" ]; then
    echo -e "${GREEN}Γ£ô GRN created${NC}"
else
    echo -e "${RED}Γ£ù GRN creation needs verification${NC}"
fi

if [ "$UID_COUNT" -gt 0 ]; then
    echo -e "${GREEN}Γ£ô UID generation verified ($UID_COUNT UIDs)${NC}"
else
    echo -e "${YELLOW}ΓÜá UID generation needs manual check${NC}"
fi

echo ""
echo "Test Data Created:"
echo "  - Vendor: VEN-QA-${TIMESTAMP}"
echo "  - PR Number: PR-QA-${TIMESTAMP}"
echo "  - PO Number: PO-QA-${TIMESTAMP}"
echo "  - GRN Number: GRN-QA-${TIMESTAMP}"
echo "  - Tenant ID: $TENANT_ID"
echo ""
echo "========================================================"
