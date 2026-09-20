const base = (process.env.QA_BASE_URL || "https://mizantra.ae").replace(/\/$/, "");
const username = process.env.QA_USERNAME || "hnoman";
const password = process.env.QA_PASSWORD || "Password";
const itemCode = process.argv[2] || "700-0002";

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}\n${JSON.stringify(detail, null, 2)}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}/api/v1${path}`, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert(response.ok, `${path} returned HTTP ${response.status}`, data);
  return data;
}

async function main() {
  const auth = await request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const listed = await request(
    `/inventory/items?search=${encodeURIComponent(itemCode)}&includeInactive=true`,
    { headers },
  );
  const rows = Array.isArray(listed) ? listed : listed?.data || listed?.items || [];
  const item = rows.find((row) => row.code === itemCode);
  assert(item, "Item not returned by Inventory Items", listed);
  const trail = await request(`/items/${item.id}/stock-trail`, { headers });
  const trailBalance = (trail.trails || []).reduce(
    (sum, row) => sum + Number(row.qty_in || 0) - Number(row.qty_out || 0),
    0,
  );
  assert(trail.trails?.length > 0, "Stock Trail is empty", trail);
  assert(
    Math.abs(trailBalance - Number(trail.currentBalance || 0)) < 0.000001,
    "Stock Trail does not reconcile",
    { trailBalance, currentBalance: trail.currentBalance },
  );
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        base,
        item: `${item.code} — ${item.name}`,
        currentBalance: trail.currentBalance,
        eventCount: trail.trails.length,
        events: trail.trails.map((row) => ({
          type: row.type,
          reference: row.reference,
          in: row.qty_in,
          out: row.qty_out,
          balance: row.balance,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
