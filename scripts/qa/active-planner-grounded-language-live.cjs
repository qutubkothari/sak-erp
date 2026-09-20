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
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
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
  const response = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message: "super8 antenna ka stock kitna hai?" }),
  });
  const data = await payload(response);
  const conversationId = data?.conversation_id;
  try {
    const answer = String(data?.assistant_message || "");
    const headline = String(data?.analytics?.headline || "");
    const pass =
      response.ok &&
      data?.status === "READY_WITH_ANALYTICS" &&
      data?.analytics?.kind === "INVENTORY_POSITION" &&
      /\b15\b/.test(headline) &&
      /\b15\b/.test(answer) &&
      !/15000/.test(answer) &&
      answer !== headline &&
      /\b(hai|hein|bacha)\b/i.test(answer);
    const report = {
      pass,
      environment: "MIZANTRA ONLY",
      read_only: true,
      records_created: 0,
      checked_at: new Date().toISOString(),
      http: response.status,
      status: data?.status,
      kind: data?.analytics?.kind,
      verified_headline: headline,
      assistant_message: answer,
    };
    console.log(JSON.stringify(report, null, 2));
    if (!pass) process.exitCode = 2;
  } finally {
    if (conversationId) {
      await fetch(
        `${supabase}/rest/v1/active_planner_conversations?id=eq.${conversationId}&tenant_id=eq.${tenantId}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "content-type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ is_archived: true, updated_at: new Date().toISOString() }),
        },
      );
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
