#!/bin/bash

SUPABASE_URL="https://nwkaruzvzwwuftjquypk.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q"

echo "Checking for existing tenants..."
curl -s -X GET \
  "$SUPABASE_URL/rest/v1/tenants?select=*" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" | jq '.'

echo -e "\n\nCreating default tenant..."
curl -s -X POST \
  "$SUPABASE_URL/rest/v1/tenants" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Saif Automations",
    "code": "SAIF",
    "is_active": true
  }' | jq '.'
