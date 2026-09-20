#!/usr/bin/env node
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(process.argv[2] || "apps/api/.env"), quiet: true });
const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!rawUrl) throw new Error("Database URL missing");
const db = new Client({ connectionString: rawUrl.replace(/([?&])sslmode=require(&|$)/, (_m,p,s)=>s?p:""), ssl: { rejectUnauthorized: false } });
(async () => {
  await db.connect();
  try {
    const targets = await db.query("SELECT id,customer_id FROM crm_leads WHERE company_name LIKE 'QA-CRM-INBOUND-%'");
    const customerIds = targets.rows.map((row) => row.customer_id).filter(Boolean);
    const leadIds = targets.rows.map((row) => row.id);
    if (leadIds.length) {
      await db.query("DELETE FROM crm_inbound_events WHERE lead_id = ANY($1::uuid[])", [leadIds]);
      await db.query("DELETE FROM crm_leads WHERE id = ANY($1::uuid[])", [leadIds]);
    }
    await db.query("DELETE FROM crm_inbound_channels WHERE channel_name LIKE 'QA-CRM-INBOUND-%'");
    if (customerIds.length) await db.query("DELETE FROM customers WHERE id = ANY($1::uuid[])", [customerIds]);
    console.log(JSON.stringify({ status: "PASS", qa_leads_removed: leadIds.length, qa_customers_removed: customerIds.length }));
  } finally { await db.end(); }
})().catch((error) => { console.error(error.message); process.exit(1); });
