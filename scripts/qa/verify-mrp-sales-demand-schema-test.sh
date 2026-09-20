#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test/apps/api
test "$(readlink -f "$app")" = "$app"
cd "$app"

node <<'NODE'
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

Promise.all([
  db.from('sales_orders').select('id,so_number,status,release_status,credit_status,delivery_block,expected_delivery_date,sales_order_items(id,item_id,quantity,dispatched_quantity,promised_date)').limit(1),
  db.from('production_programs').select('id,sales_order_item_id,target_quantity,status,demand_source').limit(1),
  db.from('production_job_orders').select('id,status,item_id,quantity,completed_quantity,sales_order_id,sales_order_item_id').limit(1),
  db.from('bom_headers').select('id,item_id,version,is_active').limit(1),
  db.from('bom_items').select('bom_id,item_id,child_bom_id,quantity,scrap_percentage,component_type').limit(1),
]).then((results) => {
  const errors = results.map((result) => result.error?.message).filter(Boolean);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('Mizantra TEST sales-demand MRP schema contract verified (read only).');
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
NODE
