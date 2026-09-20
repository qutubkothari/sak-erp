const fs = require("fs");
const path = require("path");

const BASE = process.env.QA_BASE_URL || "https://mizantra.saksolution.com";
const EXPECTED_DB = "nwkaruzvzwwuftjquypk.supabase.co";

function loadEnv() {
  for (const name of ["apps/api/.env.test", "apps/api/.env"]) {
    const file = path.resolve(name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]])
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function payload(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return body;
  }
}

async function main() {
  loadEnv();
  if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE))
    throw new Error(`Refusing non-Mizantra URL: ${BASE}`);
  const supabase = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (new URL(supabase).hostname !== EXPECTED_DB)
    throw new Error("Refusing non-Mizantra database.");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!serviceKey) throw new Error("Mizantra service key is unavailable.");

  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: process.env.QA_USERNAME || "hnoman",
      password: process.env.QA_PASSWORD || "Password",
    }),
  });
  const auth = await payload(login);
  if (!login.ok || !auth?.accessToken) throw new Error("Mizantra QA login failed.");
  const tenantId = auth.user?.tenantId || auth.user?.tenant_id;
  const headers = {
    authorization: `Bearer ${auth.accessToken}`,
    "content-type": "application/json",
  };
  const cases = [
    {
      prompt: "what is stcok of super8 antina and which vendor payments are overdue?",
      expected: ["INVENTORY_POSITION", "SUPPLIER_DUES"],
    },
    {
      prompt: "unused supplier advances dikhao aur latest completed vendor payment bhi batao",
      expected: ["SUPPLIER_ADVANCES", "SUPPLIER_PAYMENTS"],
    },
  ];
  const results = [];
  const conversationIds = [];
  try {
    for (const test of cases) {
      const started = Date.now();
      const response = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: test.prompt }),
      });
      const data = await payload(response);
      if (data?.conversation_id) conversationIds.push(data.conversation_id);
      const actual = (data?.analytics?.sections || []).map((section) => section.kind);
      const sections = (data?.analytics?.sections || []).map((section) => ({
        kind: section.kind,
        status: section.status,
        headline: section.headline || null,
        questions: section.questions || [],
      }));
      const missing = test.expected.filter((kind) => !actual.includes(kind));
      const pass =
        response.ok &&
        data?.status === "READY_WITH_ANALYTICS" &&
        data?.analytics?.kind === "SEMANTIC_QUERY" &&
        data?.analytics?.semantic_plan?.mode === "MULTI" &&
        missing.length === 0 &&
        data.analytics.sections.every(
          (section) => section.read_only === true && section.status === "READY",
        );
      results.push({
        pass,
        prompt: test.prompt,
        http: response.status,
        latency_ms: Date.now() - started,
        status: data?.status,
        provider: data?.provider,
        expected: test.expected,
        actual,
        sections,
        missing,
        headline: data?.analytics?.headline,
      });
    }
  } finally {
    for (const id of conversationIds) {
      await fetch(
        `${supabase}/rest/v1/active_planner_conversations?id=eq.${id}&tenant_id=eq.${tenantId}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "content-type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            is_archived: true,
            updated_at: new Date().toISOString(),
          }),
        },
      );
    }
  }
  const report = {
    pass: results.every((result) => result.pass),
    environment: "MIZANTRA ONLY",
    read_only: true,
    records_created: 0,
    checked_at: new Date().toISOString(),
    results,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
