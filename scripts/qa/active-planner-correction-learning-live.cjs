const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BASE = process.env.QA_BASE_URL || "https://mizantra.saksolution.com";
const EXPECTED_DB = "nwkaruzvzwwuftjquypk.supabase.co";
const PROMPT = "QA only: show which suppliers we still owe money to";
const CORRECTION =
  "I meant unused supplier advances available by supplier, not outstanding payables.";

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

async function body(response) {
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
  const auth = await body(login);
  if (!login.ok || !auth?.accessToken) throw new Error("Mizantra QA login failed.");
  const tenantId = auth.user?.tenantId || auth.user?.tenant_id;
  if (!tenantId) throw new Error("Login did not return a tenant id.");

  const hash = crypto
    .createHash("sha256")
    .update(PROMPT.trim().toLowerCase().replace(/\s+/g, " "))
    .digest("hex");
  const learningFilter =
    `${supabase}/rest/v1/active_planner_learning_examples` +
    `?tenant_id=eq.${encodeURIComponent(tenantId)}` +
    `&utterance_hash=eq.${hash}`;
  const serviceHeaders = {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
  let conversationId = null;

  await fetch(learningFilter, { method: "DELETE", headers: serviceHeaders });
  try {
    const interpretedResponse = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: PROMPT }),
    });
    const interpreted = await body(interpretedResponse);
    conversationId = interpreted?.conversation_id;
    if (!interpretedResponse.ok || !conversationId)
      throw new Error(`Initial interpretation failed: ${JSON.stringify(interpreted)}`);

    const feedbackResponse = await fetch(`${BASE}/api/v1/active-planner/feedback`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        helpful: false,
        correction: CORRECTION,
      }),
    });
    const feedback = await body(feedbackResponse);

    const learnedResponse = await fetch(
      `${learningFilter}&select=intent_type,analytics_kind,status,source,negative_count`,
      { headers: serviceHeaders },
    );
    const learned = await body(learnedResponse);
    const verified = Array.isArray(learned)
      ? learned.find(
          (row) =>
            row.intent_type === "REPORT" &&
            row.analytics_kind === "SUPPLIER_ADVANCES" &&
            row.status === "VERIFIED" &&
            row.source === "USER_FEEDBACK",
        )
      : null;
    const rejected = Array.isArray(learned)
      ? learned.find((row) => row.status === "REJECTED")
      : null;
    const pass =
      feedbackResponse.ok &&
      feedback?.recorded === true &&
      feedback?.correction_verified === true &&
      feedback?.corrected_target?.intent_type === "REPORT" &&
      feedback?.corrected_target?.analytics_kind === "SUPPLIER_ADVANCES" &&
      feedback?.operational_values_learned === false &&
      Boolean(verified) &&
      Boolean(rejected);

    console.log(JSON.stringify({
      pass,
      environment: "MIZANTRA ONLY",
      controlled_learning_test: true,
      operational_records_created: 0,
      prompt: PROMPT,
      correction: CORRECTION,
      initial_target: {
        intent_type: interpreted?.intent_type,
        analytics_kind: interpreted?.analytics?.kind || null,
      },
      feedback,
      stored_learning_rows: learned,
    }, null, 2));
    if (!pass) process.exitCode = 2;
  } finally {
    await fetch(learningFilter, { method: "DELETE", headers: serviceHeaders });
    if (conversationId) {
      await fetch(
        `${supabase}/rest/v1/active_planner_conversations?id=eq.${conversationId}&tenant_id=eq.${tenantId}`,
        {
          method: "PATCH",
          headers: { ...serviceHeaders, Prefer: "return=minimal" },
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
