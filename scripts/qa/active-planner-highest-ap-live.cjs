const fs = require("fs");
const path = require("path");

const BASE = process.env.QA_BASE_URL || "https://mizantra.saksolution.com";
const EXPECTED_DB = "nwkaruzvzwwuftjquypk.supabase.co";

function loadEnv() {
  for (const name of ["apps/api/.env", "apps/api/.env.test"]) {
    const file = path.resolve(name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]])
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function json(response) {
  const value = await response.text();
  try { return value ? JSON.parse(value) : null; } catch { return value; }
}

async function main() {
  loadEnv();
  if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE))
    throw new Error(`Refusing non-Mizantra URL: ${BASE}`);
  const supabase = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (new URL(supabase).hostname !== EXPECTED_DB)
    throw new Error(`Refusing non-Mizantra database: ${new URL(supabase).hostname}`);
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  const dbHeaders = { apikey: key, authorization: `Bearer ${key}` };
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: process.env.QA_USERNAME || "hnoman",
      password: process.env.QA_PASSWORD || "Password",
    }),
  });
  const auth = await json(login);
  if (!login.ok || !auth?.accessToken) throw new Error("Mizantra QA login failed.");
  const tenantId = auth.user?.tenantId || auth.user?.tenant_id;
  const headers = {
    authorization: `Bearer ${auth.accessToken}`,
    "content-type": "application/json",
  };
  const db = async (table, query) => {
    const response = await fetch(`${supabase}/rest/v1/${table}?${query}`, { headers: dbHeaders });
    const data = await json(response);
    if (!response.ok || !Array.isArray(data)) throw new Error(`Unable to read ${table}.`);
    return data;
  };

  const [parties, items] = await Promise.all([
    db("accounting_parties", `select=id,party_name,party_code&tenant_id=eq.${tenantId}&party_type=eq.SUPPLIER&is_active=eq.true`),
    db("accounting_open_items", `select=party_id,original_amount,settled_amount,currency_code,status&tenant_id=eq.${tenantId}&direction=eq.PAYABLE&status=in.(OPEN,PARTIAL)`),
  ]);
  const partyById = new Map(parties.map((row) => [row.id, row]));
  const totals = new Map();
  for (const item of items) {
    const party = partyById.get(item.party_id);
    const outstanding = Math.max(0, Number(item.original_amount || 0) - Number(item.settled_amount || 0));
    if (!party || outstanding <= 0) continue;
    const currency = item.currency_code || "INR";
    const groupKey = `${party.id}:${currency}`;
    const current = totals.get(groupKey) || { supplier: party.party_name || party.party_code, currency, outstanding: 0 };
    current.outstanding += outstanding;
    totals.set(groupKey, current);
  }
  let expected = [...totals.values()].sort((a, b) => b.outstanding - a.outstanding)[0] || null;
  if (!expected) {
    const [vendors, grns, services] = await Promise.all([
      db("vendors", `select=id,name,code&tenant_id=eq.${tenantId}&is_active=eq.true`),
      db("grns", `select=vendor_id,net_payable_amount,paid_amount,payment_status,status,invoice_approved&tenant_id=eq.${tenantId}&invoice_approved=eq.true`),
      db("service_invoices", `select=invoice_amount,paid_amount,status,ses:service_entry_sheets(vendor_id)&tenant_id=eq.${tenantId}`),
    ]);
    const vendorsById = new Map(vendors.map((row) => [row.id, row]));
    const operational = new Map();
    const add = (vendorId, original, settled) => {
      const vendor = vendorsById.get(vendorId);
      const outstanding = Math.max(0, Number(original || 0) - Number(settled || 0));
      if (!vendor || outstanding <= 0) return;
      const current = operational.get(vendorId) || { supplier: vendor.name, currency: "INR", outstanding: 0 };
      current.outstanding += outstanding;
      operational.set(vendorId, current);
    };
    for (const row of grns) {
      if (["PAID", "CANCELLED", "REJECTED"].includes(String(row.payment_status || row.status || "").toUpperCase())) continue;
      add(row.vendor_id, row.net_payable_amount, row.paid_amount);
    }
    for (const row of services) {
      if (["PAID", "CANCELLED", "REJECTED"].includes(String(row.status || "").toUpperCase())) continue;
      const ses = Array.isArray(row.ses) ? row.ses[0] : row.ses;
      add(ses?.vendor_id, row.invoice_amount, row.paid_amount);
    }
    expected = [...operational.values()].sort((a, b) => b.outstanding - a.outstanding)[0] || null;
  }
  const prompts = [
    "supplier with highest AP",
    "Which vendor has the largest payable balance?",
    "Who do we owe the most?",
    "Show the top supplier outstanding amount",
    "sabse zyada supplier payment kisko dena hai?",
  ];
  const results = [];
  let conversationId = "";
  try {
    for (const prompt of prompts) {
      const response = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: prompt, conversation_id: conversationId || undefined }),
      });
      const data = await json(response);
      conversationId = data?.conversation_id || conversationId;
      const row = data?.analytics?.rows?.[0];
      const issues = [];
      if (!response.ok) issues.push(`HTTP ${response.status}`);
      if (data?.status !== "READY_WITH_ANALYTICS") issues.push(`status ${data?.status}`);
      if (data?.analytics?.kind !== "SUPPLIER_DUES") issues.push(`kind ${data?.analytics?.kind}`);
      if (!row) issues.push("top supplier row missing");
      if (data?.analytics?.rows?.length !== 1) issues.push("answer was not narrowed to one top supplier");
      results.push({ prompt, status: data?.status, headline: data?.analytics?.headline, row, issues });
    }
    if (expected && results[0]?.row) {
      if (results[0].row.supplier !== expected.supplier)
        results[0].issues.push(`expected supplier ${expected.supplier}`);
      if (Number(results[0].row.total_outstanding) !== expected.outstanding)
        results[0].issues.push(`expected outstanding ${expected.outstanding}`);
      if (results[0].row.currency_code !== expected.currency)
        results[0].issues.push(`expected currency ${expected.currency}`);
    }
    const failures = results.filter((result) => result.issues.length);
    console.log(JSON.stringify({
      pass: failures.length === 0,
      environment: "MIZANTRA ONLY",
      database_host: EXPECTED_DB,
      expected,
      cases: results.length,
      passed: results.length - failures.length,
      failed: failures.length,
      results,
    }, null, 2));
    if (failures.length) process.exitCode = 2;
  } finally {
    if (conversationId) {
      await fetch(`${supabase}/rest/v1/active_planner_conversations?id=eq.${conversationId}&tenant_id=eq.${tenantId}`, {
        method: "PATCH",
        headers: { ...dbHeaders, "content-type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ is_archived: true, updated_at: new Date().toISOString() }),
      });
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
