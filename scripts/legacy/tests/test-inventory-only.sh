#!/bin/bash
# Test Inventory Module ONLY
# Date: 2025-11-28

API_URL="http://35.154.55.38:4000/api/v1"
TOKEN=""

echo "======================================"
echo "   INVENTORY MODULE TEST"
echo "======================================"
echo ""

# Step 1: Register & Login
echo "1. Authenticating..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inventory-test@example.com",
    "password": "Test123456!",
    "firstName": "Inventory",
    "lastName": "Tester",
    "companyName": "Test Inventory Co"
  }')

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inventory-test@example.com",
    "password": "Test123456!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✓ Authentication successful"
echo ""

# Step 2: Get Stock Levels
echo "2. Testing GET /inventory/stock..."
STOCK_RESPONSE=$(curl -s -X GET "$API_URL/inventory/stock" \
  -H "Authorization: Bearer $TOKEN")

if echo "$STOCK_RESPONSE" | grep -q "error"; then
  echo "❌ FAILED: $STOCK_RESPONSE"
  exit 1
fi

echo "✓ PASSED: Stock endpoint working"
echo "Response: $STOCK_RESPONSE"
echo ""

# Step 3: Get Stock Movements
echo "3. Testing GET /inventory/movements..."
MOVEMENTS_RESPONSE=$(curl -s -X GET "$API_URL/inventory/movements" \
  -H "Authorization: Bearer $TOKEN")

if echo "$MOVEMENTS_RESPONSE" | grep -q "error"; then
  echo "❌ FAILED: $MOVEMENTS_RESPONSE"
  exit 1
fi

echo "✓ PASSED: Movements endpoint working"
echo "Response: $MOVEMENTS_RESPONSE"
echo ""

# Step 4: Get Warehouses
echo "4. Testing GET /inventory/warehouses..."
WAREHOUSES_RESPONSE=$(curl -s -X GET "$API_URL/inventory/warehouses" \
  -H "Authorization: Bearer $TOKEN")

if echo "$WAREHOUSES_RESPONSE" | grep -q "error"; then
  echo "❌ FAILED: $WAREHOUSES_RESPONSE"
  exit 1
fi

echo "✓ PASSED: Warehouses endpoint working"
echo "Response: $WAREHOUSES_RESPONSE"
echo ""

# Step 5: Get Alerts
echo "5. Testing GET /inventory/alerts..."
ALERTS_RESPONSE=$(curl -s -X GET "$API_URL/inventory/alerts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ALERTS_RESPONSE" | grep -q "error"; then
  echo "❌ FAILED: $ALERTS_RESPONSE"
  exit 1
fi

echo "✓ PASSED: Alerts endpoint working"
echo "Response: $ALERTS_RESPONSE"
echo ""

echo "======================================"
echo "   ✓ INVENTORY MODULE: ALL TESTS PASSED"
echo "======================================"
