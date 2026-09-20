#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const appRoot = process.argv[2] || process.cwd();
const envPath = path.join(appRoot, "apps/api/.env");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  process.env[match[1]] = value;
}

const { createClient } = require(path.join(appRoot, "node_modules/@supabase/supabase-js"));
const { HrAttendanceControlService } = require(path.join(appRoot, "apps/api/dist/hr/services/hr-attendance-control.service.js"));

(async () => {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);
  const { data: employees, error } = await client.from("employees").select("tenant_id").limit(100);
  if (error) throw error;
  const tenantId = employees?.find((row) => row.tenant_id)?.tenant_id;
  if (!tenantId) throw new Error("No tenant with employees available for read-only HR smoke test");

  const service = new HrAttendanceControlService();
  const policy = await service.getPolicy(tenantId);
  const metrics = await service.calculateAttendanceMetrics(
    tenantId,
    "2026-09-12T04:00:00.000Z",
    "2026-09-12T14:30:00.000Z",
    9.5,
  );
  const report = await service.buildRegister(tenantId, "2026-09-01", "2026-09-12");
  const workbook = await service.exportRegister(tenantId, "2026-09-01", "2026-09-12");
  const signature = Buffer.from(workbook).subarray(0, 2).toString("ascii");

  if (!Array.isArray(report.summary) || !Array.isArray(report.daily)) throw new Error("Invalid consolidated register shape");
  if (signature !== "PK") throw new Error("Export is not a valid XLSX/ZIP workbook");
  if (!Number.isFinite(metrics.lateMinutes) || !Number.isFinite(metrics.overtimeHours)) throw new Error("Invalid attendance metrics");

  console.log(JSON.stringify({
    ok: true,
    policyTimezone: policy.timezone,
    summaryEmployees: report.summary.length,
    dailyRows: report.daily.length,
    xlsxBytes: Buffer.byteLength(Buffer.from(workbook)),
    workbookSignature: signature,
    metricFields: ["lateMinutes", "overtimeHours"],
  }));
})().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
