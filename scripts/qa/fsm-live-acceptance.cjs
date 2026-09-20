const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: process.env.FSM_ENV_FILE || "/var/www/sak-erp-test/apps/api/.env",
});
const { createClient } = require("@supabase/supabase-js");

const BASE = String(process.env.FSM_BASE_URL || "https://mizantra.saksolution.com").replace(/\/$/, "");
const EXPECTED_BASE = "https://mizantra.saksolution.com";
const EXPECTED_PROJECT_REF = "nwkaruzvzwwuftjquypk";
const OUTPUT = process.env.FSM_RESULT_FILE || path.resolve("artifacts/qa/fsm-live-acceptance.json");
const RUN_ID = `FSM-QA-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

if (BASE !== EXPECTED_BASE) {
  throw new Error(`Safety stop: FSM acceptance may run only against ${EXPECTED_BASE}. Received ${BASE}.`);
}

const result = {
  run_id: RUN_ID,
  environment: "Mizantra",
  base_url: BASE,
  started_at: new Date().toISOString(),
  synthetic_data: true,
  tests: [],
  created: {},
  cleanup: { attempted: false, passed: false },
};

function record(name, passed, evidence = {}) {
  result.tests.push({ name, passed: Boolean(passed), evidence });
  if (!passed) throw new Error(`${name}: ${JSON.stringify(evidence)}`);
}

async function body(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : null; } catch { return raw; }
}

async function api(route, { method = "GET", payload, token, expected = [200, 201] } = {}) {
  const response = await fetch(`${BASE}/api/v1${route}`, {
    method,
    headers: {
      ...(payload === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const data = await body(response);
  return { ok: expected.includes(response.status), status: response.status, data };
}

async function remove(db, table, column, values) {
  if (!values || (Array.isArray(values) && !values.length)) return;
  let query = db.from(table).delete();
  query = Array.isArray(values) ? query.in(column, values) : query.eq(column, values);
  const { error } = await query;
  if (error) throw new Error(`Cleanup ${table} failed: ${error.message}`);
}

async function cleanup(db) {
  result.cleanup.attempted = true;
  const visitIds = [result.created.main_visit_id, result.created.sync_visit_id, result.created.future_visit_id].filter(Boolean);
  const operationIds = [result.created.sync_operation_id].filter(Boolean);
  await remove(db, "fsm_sync_operations", "client_operation_id", operationIds);
  await remove(db, "fsm_visits", "id", visitIds);
  await remove(db, "fsm_customer_sites", "id", result.created.site_id);
  await remove(db, "crm_contacts", "id", result.created.contact_id);
  await remove(db, "crm_accounts", "id", result.created.account_id);

  const checks = [];
  for (const [table, id] of [
    ["fsm_visits", result.created.main_visit_id],
    ["fsm_visits", result.created.sync_visit_id],
    ["fsm_visits", result.created.future_visit_id],
    ["fsm_customer_sites", result.created.site_id],
    ["crm_contacts", result.created.contact_id],
    ["crm_accounts", result.created.account_id],
  ]) {
    if (!id) continue;
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("id", id);
    if (error) throw new Error(`Cleanup verification ${table} failed: ${error.message}`);
    checks.push({ table, id, remaining: count || 0 });
  }
  result.cleanup.checks = checks;
  result.cleanup.passed = checks.every((entry) => entry.remaining === 0);
  if (!result.cleanup.passed) throw new Error("Synthetic data cleanup verification failed.");
}

async function run() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("Mizantra Supabase credentials are unavailable in the configured API environment file.");
  }
  if (!String(process.env.SUPABASE_URL).includes(EXPECTED_PROJECT_REF)) {
    throw new Error(`Safety stop: database is not the Mizantra project ${EXPECTED_PROJECT_REF}.`);
  }
  result.database_project_ref = EXPECTED_PROJECT_REF;
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let token;
  let tenantId;
  let userId;

  try {
    const login = await api("/auth/login", {
      method: "POST",
      payload: {
        username: process.env.QA_USERNAME || "hnoman",
        password: process.env.QA_PASSWORD || "Password",
      },
    });
    token = login.data?.accessToken;
    tenantId = String(login.data?.user?.tenantId || login.data?.user?.tenant_id || "");
    userId = String(login.data?.user?.id || login.data?.user?.userId || "");
    record("Authenticated Mizantra pilot identity", login.ok && token && tenantId && userId, {
      http_status: login.status,
      tenant_bound: Boolean(tenantId),
      user_bound: Boolean(userId),
    });
    result.tenant_id = tenantId;
    result.user_id = userId;

    const capabilities = await api("/fsm/capabilities", { token });
    record("FSM capability endpoint", capabilities.ok && capabilities.data?.module === "MIZANTRA_FSM", {
      http_status: capabilities.status,
      module: capabilities.data?.module,
      offline_manual_sync: capabilities.data?.offline?.manual_sync,
      whatsapp_mode: capabilities.data?.messaging?.whatsapp,
    });

    const settings = await api("/fsm/settings", { token });
    record("Tenant FSM settings", settings.ok && Number(settings.data?.checkin_radius_m) > 0, {
      http_status: settings.status,
      checkin_radius_m: settings.data?.checkin_radius_m,
      checkout_report_required: settings.data?.require_checkout_report,
    });

    const accountResponse = await api("/crm/accounts", {
      method: "POST", token,
      payload: {
        account_name: `[FSM QA] Synthetic Account ${RUN_ID}`,
        account_type: "PROSPECT",
        owner_user_id: userId,
        industry: "Synthetic acceptance testing",
      },
    });
    const account = accountResponse.data;
    result.created.account_id = account?.id;
    record("Create isolated account through CRM API", accountResponse.ok && result.created.account_id, {
      http_status: accountResponse.status,
      account_id: result.created.account_id,
      account_number: account?.account_number,
      response: accountResponse.ok ? undefined : accountResponse.data,
    });

    const contactResponse = await api("/crm/contacts", {
      method: "POST", token,
      payload: {
        account_id: result.created.account_id,
        first_name: "FSM QA",
        last_name: "Synthetic Contact",
        mobile: "+201000000000",
        whatsapp: "+201000000000",
        whatsapp_consent: "OPTED_IN",
        is_primary: true,
        owner_user_id: userId,
      },
    });
    const contact = contactResponse.data;
    result.created.contact_id = contact?.id;
    record("Create opted-in contact through CRM API", contactResponse.ok && result.created.contact_id, {
      http_status: contactResponse.status,
      contact_id: result.created.contact_id,
      consent: contact?.whatsapp_consent,
      response: contactResponse.ok ? undefined : contactResponse.data,
    });

    const coordinates = { latitude: 30.0444, longitude: 31.2357 };
    const site = await api("/fsm/sites", {
      method: "POST", token,
      payload: {
        account_id: result.created.account_id,
        primary_contact_id: result.created.contact_id,
        site_code: `QA-${RUN_ID.slice(-10)}`,
        site_name: `[FSM QA] Synthetic Cairo Site ${RUN_ID}`,
        address_text: "Synthetic test location, Cairo, Egypt",
        ...coordinates,
        geocode_status: "VERIFIED",
        geofence_radius_m: 150,
      },
    });
    result.created.site_id = site.data?.id;
    record("Create geocoded customer site", site.ok && result.created.site_id, {
      http_status: site.status,
      site_id: result.created.site_id,
      geocode_status: site.data?.geocode_status,
      version: site.data?.version,
    });

    const staleSite = await api(`/fsm/sites/${result.created.site_id}`, {
      method: "PATCH", token, expected: [409],
      payload: {
        account_id: result.created.account_id,
        primary_contact_id: result.created.contact_id,
        site_code: site.data.site_code,
        site_name: site.data.site_name,
        address_text: site.data.address_text,
        ...coordinates,
        geocode_status: "VERIFIED",
        geofence_radius_m: 150,
        expected_version: 0,
      },
    });
    record("Reject stale site update", staleSite.ok, {
      http_status: staleSite.status,
      code: staleSite.data?.code || staleSite.data?.message?.code,
    });

    const nearby = await api(`/fsm/sites/nearby?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius_m=500`, { token });
    record("Nearby site lookup", nearby.ok && Array.isArray(nearby.data) && nearby.data.some((row) => row.id === result.created.site_id && Number(row.distance_m) === 0), {
      http_status: nearby.status,
      matched: Array.isArray(nearby.data) && nearby.data.some((row) => row.id === result.created.site_id),
    });

    const now = new Date();
    // The application-wide future-date guard currently rejects scheduled FSM dates.
    // Use a completed time window so the remaining live acceptance flow can execute.
    const start = new Date(now.getTime() - 65 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const date = now.toISOString().slice(0, 10);
    const commonVisit = {
      account_id: result.created.account_id,
      site_id: result.created.site_id,
      contact_id: result.created.contact_id,
      representative_user_id: userId,
      scheduled_start: start,
      scheduled_end: end,
      purpose: `[FSM QA] Synthetic acceptance visit ${RUN_ID}`,
      source: "MANUAL",
    };

    const futureVisit = await api("/fsm/visits", {
      method: "POST", token,
      payload: {
        ...commonVisit,
        scheduled_start: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        scheduled_end: new Date(now.getTime() + 65 * 60 * 1000).toISOString(),
        purpose: `[FSM QA] Future scheduling guard probe ${RUN_ID}`,
      },
    });
    result.created.future_visit_id = futureVisit.data?.id;
    record("Future visit scheduling is accepted", futureVisit.ok && result.created.future_visit_id && futureVisit.data?.status === "PLANNED", {
      http_status: futureVisit.status,
      visit_id: result.created.future_visit_id,
      scheduled_start: futureVisit.data?.scheduled_start,
    });

    const cancelFuture = await api(`/fsm/visits/${result.created.future_visit_id}/cancel`, {
      method: "POST", token, payload: { reason_code: "SYNTHETIC_FUTURE_SCHEDULE_TEST" },
    });
    record("Future test visit can be cancelled", cancelFuture.ok && cancelFuture.data?.status === "CANCELLED", {
      http_status: cancelFuture.status,
      status: cancelFuture.data?.status,
    });

    result.created.sync_operation_id = `${RUN_ID}-SYNC-CREATE`;
    const syncCreatePayload = { ...commonVisit, sequence_no: 2 };
    const syncCreate = await api("/fsm/sync/batch", {
      method: "POST", token,
      payload: { operations: [{ client_operation_id: result.created.sync_operation_id, type: "VISIT_CREATE", payload: syncCreatePayload }] },
    });
    const syncCreated = syncCreate.data?.results?.[0];
    result.created.sync_visit_id = syncCreated?.resource_id;
    record("Offline visit operation commits", syncCreate.ok && syncCreated?.status === "COMMITTED" && result.created.sync_visit_id, {
      http_status: syncCreate.status,
      operation_status: syncCreated?.status,
      visit_id: result.created.sync_visit_id,
      response: syncCreate.ok ? undefined : syncCreate.data,
    });

    const syncReplay = await api("/fsm/sync/batch", {
      method: "POST", token,
      payload: { operations: [{ client_operation_id: result.created.sync_operation_id, type: "VISIT_CREATE", payload: syncCreatePayload }] },
    });
    const replayed = syncReplay.data?.results?.[0];
    record("Identical offline replay is idempotent", syncReplay.ok && replayed?.status === "COMMITTED" && replayed?.replayed === true && replayed?.resource_id === result.created.sync_visit_id, {
      http_status: syncReplay.status,
      replayed: replayed?.replayed,
      same_resource: replayed?.resource_id === result.created.sync_visit_id,
    });

    const syncMismatch = await api("/fsm/sync/batch", {
      method: "POST", token,
      payload: { operations: [{ client_operation_id: result.created.sync_operation_id, type: "VISIT_CREATE", payload: { ...syncCreatePayload, purpose: "Changed payload must conflict" } }] },
    });
    const mismatch = syncMismatch.data?.results?.[0];
    record("Changed offline replay is rejected", syncMismatch.ok && mismatch?.status === "CONFLICT" && mismatch?.code === "idempotency_payload_mismatch", {
      http_status: syncMismatch.status,
      operation_status: mismatch?.status,
      code: mismatch?.code,
    });

    const mainVisit = await api("/fsm/visits", {
      method: "POST", token,
      payload: { ...commonVisit, sequence_no: 1, client_operation_id: `${RUN_ID}-MAIN` },
    });
    result.created.main_visit_id = mainVisit.data?.id;
    record("Create online visit", mainVisit.ok && result.created.main_visit_id && mainVisit.data?.status === "PLANNED", {
      http_status: mainVisit.status,
      visit_id: result.created.main_visit_id,
      status: mainVisit.data?.status,
    });

    const dayList = await api(`/fsm/visits?date=${date}`, { token });
    record("My Day returns planned visits", dayList.ok && Array.isArray(dayList.data) && dayList.data.some((row) => row.id === result.created.main_visit_id), {
      http_status: dayList.status,
      synthetic_visits_found: Array.isArray(dayList.data) ? dayList.data.filter((row) => [result.created.main_visit_id, result.created.sync_visit_id].includes(row.id)).length : 0,
    });

    const enRoute = await api(`/fsm/visits/${result.created.main_visit_id}/en-route`, {
      method: "POST", token, payload: { source: "QA_ONLINE" },
    });
    record("Visit enters EN_ROUTE", enRoute.ok && enRoute.data?.status === "EN_ROUTE", {
      http_status: enRoute.status,
      status: enRoute.data?.status,
      version: enRoute.data?.version,
    });

    const activeConflict = await api(`/fsm/visits/${result.created.sync_visit_id}/en-route`, {
      method: "POST", token, payload: { source: "QA_CONFLICT" }, expected: [409],
    });
    record("Second active visit is blocked", activeConflict.ok, {
      http_status: activeConflict.status,
      message: activeConflict.data?.message,
    });

    const checkIn = await api(`/fsm/visits/${result.created.main_visit_id}/check-in`, {
      method: "POST", token,
      payload: { location: { ...coordinates, accuracy_m: 10, captured_at: new Date().toISOString() }, source: "QA_SYNTHETIC_LOCATION" },
    });
    record("Fresh in-geofence check-in is verified", checkIn.ok && checkIn.data?.status === "CHECKED_IN" && checkIn.data?.location_verification === "VERIFIED" && checkIn.data?.evidence?.status === "VERIFIED", {
      http_status: checkIn.status,
      status: checkIn.data?.status,
      location_verification: checkIn.data?.location_verification,
      distance_m: checkIn.data?.evidence?.distanceM,
    });

    const prematureCheckout = await api(`/fsm/visits/${result.created.main_visit_id}/check-out`, {
      method: "POST", token, payload: { source: "QA_VALIDATION" }, expected: [400],
    });
    record("Checkout without mandatory report is rejected", prematureCheckout.ok, {
      http_status: prematureCheckout.status,
      message: prematureCheckout.data?.message,
    });

    const report = await api(`/fsm/visits/${result.created.main_visit_id}/report`, {
      method: "POST", token,
      payload: {
        outcome: "Successful synthetic visit",
        summary: `[FSM QA] Full live acceptance lifecycle completed for ${RUN_ID}.`,
        next_action: "No customer action; synthetic record will be removed.",
        answers: { synthetic_test: true, run_id: RUN_ID },
        submit: true,
      },
    });
    result.created.report_id = report.data?.id;
    record("Submit mandatory visit report", report.ok && report.data?.status === "SUBMITTED", {
      http_status: report.status,
      report_id: result.created.report_id,
      status: report.data?.status,
      revision: report.data?.revision,
    });

    const checkout = await api(`/fsm/visits/${result.created.main_visit_id}/check-out`, {
      method: "POST", token, payload: { source: "QA_ONLINE" },
    });
    record("Reported visit completes", checkout.ok && checkout.data?.status === "COMPLETED" && checkout.data?.checkout_at, {
      http_status: checkout.status,
      status: checkout.data?.status,
      checkout_recorded: Boolean(checkout.data?.checkout_at),
    });

    const cancelSecond = await api(`/fsm/visits/${result.created.sync_visit_id}/cancel`, {
      method: "POST", token, payload: { reason_code: "SYNTHETIC_TEST_CLEANUP" },
    });
    record("Planned visit cancellation", cancelSecond.ok && cancelSecond.data?.status === "CANCELLED", {
      http_status: cancelSecond.status,
      status: cancelSecond.data?.status,
    });

    const whatsapp = await api(`/fsm/visits/${result.created.main_visit_id}/whatsapp-draft`, {
      method: "POST", token,
      payload: { contact_id: result.created.contact_id, message_text: `[FSM QA] Synthetic follow-up ${RUN_ID}` },
    });
    result.created.notification_draft_id = whatsapp.data?.id;
    record("WhatsApp integration creates governed draft only", whatsapp.ok && whatsapp.data?.sent === false && whatsapp.data?.confirmation_required === "SEND", {
      http_status: whatsapp.status,
      draft_id: result.created.notification_draft_id,
      sent: whatsapp.data?.sent,
      confirmation_required: whatsapp.data?.confirmation_required,
    });

    const [detail, route, commercial, dashboard, syncPackage, recommendations] = await Promise.all([
      api(`/fsm/visits/${result.created.main_visit_id}`, { token }),
      api("/fsm/routes/preview", { method: "POST", token, payload: { visit_ids: [result.created.main_visit_id, result.created.sync_visit_id] } }),
      api(`/fsm/visits/${result.created.main_visit_id}/commercial`, { token }),
      api(`/fsm/manager/dashboard?date=${date}`, { token }),
      api("/fsm/sync/package", { token }),
      api("/fsm/recommendations", { token }),
    ]);
    const eventTypes = (detail.data?.events || []).map((entry) => entry.event_type);
    record("Visit detail preserves append-only lifecycle evidence", detail.ok && ["VISIT_CREATED", "VISIT_EN_ROUTE", "VISIT_CHECKED_IN", "VISIT_COMPLETED"].every((type) => eventTypes.includes(type)) && detail.data?.reports?.[0]?.status === "SUBMITTED", {
      http_status: detail.status,
      event_types: eventTypes,
      report_status: detail.data?.reports?.[0]?.status,
    });
    record("Route preview uses declared fallback", route.ok && route.data?.sequence?.includes(result.created.main_visit_id) && route.data?.is_road_route === false, {
      http_status: route.status,
      provider: route.data?.provider,
      provider_available: route.data?.provider_available,
      is_road_route: route.data?.is_road_route,
    });
    record("Commercial context remains read-only and authoritative", commercial.ok && commercial.data?.authoritative_revalidation_required === true, {
      http_status: commercial.status,
      authoritative_revalidation_required: commercial.data?.authoritative_revalidation_required,
      invoice_count: commercial.data?.invoices?.length,
    });
    record("Manager dashboard counts completed test visit", dashboard.ok && Number(dashboard.data?.completed) >= 1 && Number(dashboard.data?.location_verified) >= 1, {
      http_status: dashboard.status,
      planned: dashboard.data?.planned,
      completed: dashboard.data?.completed,
      location_verified: dashboard.data?.location_verified,
      compliance_rate: dashboard.data?.compliance_rate,
    });
    record("Offline sync package contains scoped test records", syncPackage.ok && syncPackage.data?.tenant_id === tenantId && syncPackage.data?.visits?.some((row) => row.id === result.created.main_visit_id) && syncPackage.data?.sites?.some((row) => row.id === result.created.site_id), {
      http_status: syncPackage.status,
      tenant_matches: syncPackage.data?.tenant_id === tenantId,
      test_visit_present: syncPackage.data?.visits?.some((row) => row.id === result.created.main_visit_id),
      test_site_present: syncPackage.data?.sites?.some((row) => row.id === result.created.site_id),
    });
    record("Recommendations include scoped synthetic account", recommendations.ok && recommendations.data?.some((row) => row.account?.id === result.created.account_id), {
      http_status: recommendations.status,
      synthetic_account_present: recommendations.data?.some((row) => row.account?.id === result.created.account_id),
    });

    const { count: operationCount, error: operationError } = await db
      .from("fsm_sync_operations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("client_operation_id", result.created.sync_operation_id);
    record("Database contains one idempotency ledger row", !operationError && operationCount === 1, {
      row_count: operationCount,
      database_error: operationError?.message,
    });

    const { data: persistedVisit, error: visitError } = await db
      .from("fsm_visits")
      .select("id,tenant_id,status,location_verification,checkin_at,checkout_at")
      .eq("tenant_id", tenantId)
      .eq("id", result.created.main_visit_id)
      .single();
    record("Database persisted completed verified visit in authenticated tenant", !visitError && persistedVisit?.tenant_id === tenantId && persistedVisit?.status === "COMPLETED" && persistedVisit?.location_verification === "VERIFIED", {
      status: persistedVisit?.status,
      location_verification: persistedVisit?.location_verification,
      checkin_recorded: Boolean(persistedVisit?.checkin_at),
      checkout_recorded: Boolean(persistedVisit?.checkout_at),
      database_error: visitError?.message,
    });
  } finally {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const cleanupDb = db;
      try { await cleanup(cleanupDb); }
      catch (error) {
        result.cleanup.error = error.message;
        throw error;
      }
    }
  }
}

(async () => {
  try {
    await run();
    result.passed = result.tests.every((test) => test.passed) && result.cleanup.passed;
  } catch (error) {
    result.passed = false;
    result.error = error.message;
  } finally {
    result.finished_at = new Date().toISOString();
    result.summary = {
      passed: result.tests.filter((test) => test.passed).length,
      failed: result.tests.filter((test) => !test.passed).length,
      total: result.tests.length,
      cleanup_passed: result.cleanup.passed,
    };
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.passed ? 0 : 1;
  }
})();
