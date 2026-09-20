const base = (process.env.QA_BASE_URL || "https://erp.saifseas.com").replace(/\/$/, "");
const username = process.env.QA_USERNAME || "hnoman";
const password = process.env.QA_PASSWORD || "Password";
const poNumber = process.argv[2] || "PO-2026-09-283";

function fail(message, detail) {
  const suffix = detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`;
  throw new Error(`${message}${suffix}`);
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${base}/api/v1${path}`, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) fail(`${path} returned HTTP ${response.status}`, data);
  return data;
}

function rowsOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function main() {
  const auth = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const headers = { Authorization: `Bearer ${auth.accessToken}` };
  const listed = await jsonRequest(
    `/purchase/orders?search=${encodeURIComponent(poNumber)}`,
    { headers },
  );
  const po = rowsOf(listed).find(
    (row) => String(row.po_number || "").trim() === poNumber,
  );
  if (!po?.id) fail(`Purchase Order ${poNumber} was not returned`, listed);

  const detail = await jsonRequest(`/purchase/orders/${po.id}`, { headers });
  const grns = await jsonRequest(
    `/purchase/grn?compact=true&poId=${encodeURIComponent(po.id)}`,
    { headers },
  );

  const pdfResponse = await fetch(
    `${base}/api/v1/purchase/orders/${encodeURIComponent(po.id)}/pdf/world-class`,
    { headers },
  );
  const contentType = pdfResponse.headers.get("content-type") || "";
  const bytes = (await pdfResponse.arrayBuffer()).byteLength;
  if (!pdfResponse.ok || !contentType.toLowerCase().includes("application/pdf") || bytes < 1000) {
    fail("Linked PO PDF endpoint did not return a usable PDF", {
      httpStatus: pdfResponse.status,
      contentType,
      bytes,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        base,
        po: {
          id: po.id,
          poNumber: detail.po_number,
          status: detail.status,
          receiptStatus: detail.receipt_status || null,
        },
        linkedGrns: rowsOf(grns).map((grn) => ({
          id: grn.id,
          grnNumber: grn.grn_number,
          poId: grn.po_id || grn.purchase_order_id || grn.purchase_order?.id || null,
          status: grn.status,
        })),
        pdf: {
          httpStatus: pdfResponse.status,
          contentType,
          bytes,
          filename: pdfResponse.headers.get("x-document-filename") || null,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
