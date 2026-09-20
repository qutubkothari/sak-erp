#!/bin/bash

# Test Vendor API Endpoint
# This script tests if the vendor API is working correctly

API_URL="http://13.205.17.214:4000/api/v1"

echo "========================================="
echo "Testing Vendor API"
echo "========================================="
echo ""

# Step 1: Login to get token
echo "Step 1: Logging in to get access token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@sak.com",
    "password": "test123"
  }')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ FAILED to get access token"
    echo "Please provide valid credentials or check if user exists"
    exit 1
fi

echo "✅ Got access token: ${TOKEN:0:20}..."
echo ""

# Step 2: Fetch vendors
echo "Step 2: Fetching vendors list..."
VENDOR_RESPONSE=$(curl -s -X GET "$API_URL/purchase/vendors" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Vendor Response:"
echo "$VENDOR_RESPONSE" | jq '.'
echo ""

# Step 3: Check if response is array with vendors
VENDOR_COUNT=$(echo "$VENDOR_RESPONSE" | jq 'length // 0')
echo "Vendor Count: $VENDOR_COUNT"
echo ""

if [ "$VENDOR_COUNT" -gt 0 ]; then
    echo "✅ SUCCESS: API returned $VENDOR_COUNT vendors"
    echo ""
    echo "Vendor Details:"
    echo "$VENDOR_RESPONSE" | jq -r '.[] | "- \(.code): \(.name) (Active: \(.is_active))"'
else
    echo "❌ FAILED: API returned empty vendor list or error"
    echo "This means either:"
    echo "  1. User's tenant_id doesn't match vendor tenant_id"
    echo "  2. API has an error"
    echo "  3. Token is invalid or expired"
fi

echo ""
echo "========================================="
echo "Test Complete"
echo "========================================="
