#!/usr/bin/env node

const BASE = (
  process.env.QA_BASE_URL || "https://mizantra.saksolution.com"
).replace(/\/$/, "");

async function json(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    throw new Error(
      `Non-JSON response (${response.status}): ${body.slice(0, 300)}`,
    );
  }
}

async function main() {
  const loginResponse = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: process.env.QA_USERNAME || "hnoman",
      password: process.env.QA_PASSWORD || "Password",
    }),
  });
  const login = await json(loginResponse);
  if (!loginResponse.ok || !login?.accessToken)
    throw new Error("QA login failed.");
  const headers = {
    authorization: `Bearer ${login.accessToken}`,
    "content-type": "application/json",
  };
  let conversationId;
  const ask = async (message) => {
    const response = await fetch(`${BASE}/api/v1/active-planner/interpret`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
    const result = await json(response);
    if (!response.ok) throw new Error(`${message}: ${JSON.stringify(result)}`);
    conversationId = result.conversation_id;
    return result;
  };

  await ask("Prepare a production plan for 100 drones by 30-09-2026");
  const enquiry = await ask("latest enquiries");
  const result =
    enquiry.status === "NEEDS_INFORMATION" ? await ask("CRM leads") : enquiry;
  const failures = [];
  if (result.status !== "READY_WITH_ANALYTICS")
    failures.push(`status=${result.status}`);
  if (result.intent_type !== "REPORT")
    failures.push(`intent=${result.intent_type}`);
  if (result.analytics?.kind !== "CRM_PIPELINE")
    failures.push(`analytics=${result.analytics?.kind}`);
  if (result.extracted?.query_operation !== "LATEST")
    failures.push(`operation=${result.extracted?.query_operation}`);
  if (result.analytics?.semantic_plan?.operation !== "LATEST")
    failures.push(
      `executed operation=${result.analytics?.semantic_plan?.operation}`,
    );
  if (
    result.analytics?.rows?.length > 1 &&
    new Date(result.analytics.rows[0].last_updated).getTime() <
      new Date(result.analytics.rows[1].last_updated).getTime()
  )
    failures.push("latest CRM results are not sorted newest first");
  if (result.extracted?.quantity != null)
    failures.push(`stale quantity=${result.extracted.quantity}`);
  if (result.extracted?.delivery_date)
    failures.push(`stale date=${result.extracted.delivery_date}`);
  if (result.extracted?.crm_action)
    failures.push(`unexpected CRM mutation=${result.extracted.crm_action}`);
  if (failures.length) throw new Error(failures.join("; "));

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        base: BASE,
        conversation_id: conversationId,
        enquiry_intermediate: {
          status: enquiry.status,
          intent: enquiry.intent_type,
          analytics: enquiry.analytics?.kind || null,
          operation: enquiry.extracted?.query_operation || null,
          assistant_message: enquiry.assistant_message,
        },
        final: {
          status: result.status,
          intent: result.intent_type,
          analytics: result.analytics.kind,
          operation: result.extracted.query_operation,
          quantity: result.extracted.quantity,
          delivery_date: result.extracted.delivery_date,
          headline: result.analytics.headline,
          rows: result.analytics.rows?.length || 0,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({ status: "FAIL", error: error.message }, null, 2),
  );
  process.exit(1);
});
