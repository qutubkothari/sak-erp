const fs = require("fs");
const path = require("path");

const BASE = "https://mizantra.saksolution.com";
for (const file of ["apps/api/.env", "apps/api/.env.test"]) {
  const absolute = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absolute)) continue;
  for (const line of fs.readFileSync(absolute, "utf8").replace(/\r/g, "").split("\n")) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

(async () => {
  const loginResponse = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: process.env.QA_USERNAME || "hnoman",
      password: process.env.QA_PASSWORD || "Password",
    }),
  });
  const login = await readJson(loginResponse);
  if (!loginResponse.ok || !login?.accessToken) throw new Error(`Login failed: ${loginResponse.status}`);
  const query = new URLSearchParams({
    itemId: process.env.QA_ITEM_ID || "0e8e1d4a-70b8-462c-88cf-2e4e6e00b074",
    quantity: process.env.QA_QUANTITY || "1",
    includeAllComponents: process.env.QA_INCLUDE_ALL || "true",
  });
  const response = await fetch(`${BASE}/api/v1/job-orders/smart/preview?${query}`, {
    headers: { authorization: `Bearer ${login.accessToken}` },
  });
  const preview = await readJson(response);
  if (!response.ok) throw new Error(`Preview failed ${response.status}: ${JSON.stringify(preview)}`);
  const nodes = Array.isArray(preview?.nodes) ? preview.nodes : [];
  console.log(JSON.stringify({
    status: "passed",
    product: preview?.finishedItem?.code,
    quantity: preview?.quantity,
    totalNodes: nodes.length,
    subAssemblyNodes: nodes.filter((node) => node.componentType === "BOM").length,
    directAndLeafItemNodes: nodes.filter((node) => node.componentType === "ITEM").length,
    deepestLevel: nodes.reduce((max, node) => Math.max(max, Number(node.level || 0)), 0),
    subAssembliesToMake: (preview?.subAssembliesToMake || []).map((row) => ({
      code: row.itemCode,
      required: row.requiredQuantity,
      available: row.availableQuantity,
      toMake: row.toMakeQuantity,
      policy: row.supplyPolicy,
    })),
    sample: nodes.slice(0, 12).map((node) => ({
      level: node.level,
      type: node.componentType,
      code: node.itemCode,
      required: node.requiredQuantity,
      available: node.availableQuantity,
      shortage: node.shortageQuantity,
      action: node.supplyAction,
      policy: node.supplyPolicy,
    })),
  }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
