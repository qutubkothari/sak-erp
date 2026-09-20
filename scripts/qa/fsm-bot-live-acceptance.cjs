const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: process.env.FSM_ENV_FILE || "/var/www/sak-erp-test/apps/api/.env" });
const { createClient } = require("@supabase/supabase-js");

const BASE = String(process.env.FSM_BASE_URL || "https://mizantra.saksolution.com").replace(/\/$/, "");
const PROJECT = "nwkaruzvzwwuftjquypk";
const OUTPUT = process.env.FSM_BOT_RESULT_FILE || path.resolve("artifacts/qa/fsm-bot-live-acceptance.json");

if (BASE !== "https://mizantra.saksolution.com") throw new Error("Refusing to test a non-Mizantra URL.");
if (!String(process.env.SUPABASE_URL || "").includes(PROJECT)) throw new Error("Refusing to use a non-Mizantra database.");

async function read(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : null; } catch { return raw; }
}

async function main() {
  const loginResponse = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: process.env.QA_USERNAME || "hnoman", password: process.env.QA_PASSWORD || "Password" }),
  });
  const auth = await read(loginResponse);
  if (!loginResponse.ok || !auth?.accessToken) throw new Error("Mizantra QA login failed.");
  const tenantId = String(auth.user?.tenantId || auth.user?.tenant_id || "");
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, { auth: { persistSession: false } });
  const conversations = [];
  const scenarios = [
    { prompt: "Where am I going today?", kind: "FIELD_SALES", title: /customer visits/i },
    { prompt: "Who do I need to meet today?", kind: "FIELD_SALES", title: /customers to visit/i },
    { prompt: "Show customers I have not seen for a while", kind: "FIELD_SALES", title: /customers to visit/i },
    { prompt: "Any customer visit GPS problems?", kind: "FIELD_SALES", title: /location reviews/i },
    { prompt: "How is my field sales team doing?", kind: "FIELD_SALES", title: /team performance/i },
    { prompt: "Which employees checked in late today?", kind: "EMPLOYEE_ATTENDANCE", title: /attendance|employees marked late/i },
  ];
  const tests = [];

  try {
    for (const scenario of scenarios) {
      const response = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
        method: "POST",
        headers: { authorization: `Bearer ${auth.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ message: scenario.prompt }),
      });
      const data = await read(response);
      if (data?.conversation_id) conversations.push(data.conversation_id);
      const analytics = data?.analytics || {};
      const passed = response.ok && analytics.kind === scenario.kind && scenario.title.test(String(analytics.title || "")) && String(data?.assistant_message || "").trim().length > 0 && analytics.read_only === true;
      tests.push({
        prompt: scenario.prompt,
        passed,
        http_status: response.status,
        response_status: data?.status,
        detected_kind: analytics.kind,
        title: analytics.title,
        headline: analytics.headline,
        read_only: analytics.read_only,
        assistant_message: String(data?.assistant_message || "").slice(0, 500),
      });
    }
  } finally {
    if (conversations.length) {
      const { error } = await db.from("active_planner_conversations").update({ is_archived: true, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).in("id", conversations);
      if (error) throw new Error(`Unable to archive QA conversations: ${error.message}`);
    }
  }

  const report = {
    environment: "MIZANTRA ONLY",
    database_project_ref: PROJECT,
    checked_at: new Date().toISOString(),
    read_only_business_data: true,
    conversations_archived: conversations.length,
    tests,
    summary: { passed: tests.filter((test) => test.passed).length, failed: tests.filter((test) => !test.passed).length, total: tests.length },
  };
  report.passed = report.summary.failed === 0;
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
