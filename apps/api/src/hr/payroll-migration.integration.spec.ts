import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";

jest.setTimeout(120000);

const baseline = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TYPE public.salary_component_type AS ENUM ('BASIC','HRA','ALLOWANCE','BONUS','DEDUCTION','PF','ESI','TAX');
  CREATE TABLE public.employees(id uuid PRIMARY KEY, tenant_id uuid NOT NULL);
  CREATE TABLE public.salary_components(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_id uuid NOT NULL REFERENCES public.employees(id), tenant_id uuid, component_type public.salary_component_type NOT NULL, component_name text NOT NULL, amount numeric(15,2) NOT NULL, is_taxable boolean DEFAULT true, created_at timestamptz DEFAULT now());
  CREATE TABLE public.payroll_runs(id uuid PRIMARY KEY, tenant_id uuid NOT NULL, payroll_month varchar(7) NOT NULL, run_date date NOT NULL, status text DEFAULT 'PENDING', remarks text, created_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE public.payslips(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid,
    payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES public.employees(id),
    payslip_number varchar(50) UNIQUE NOT NULL,
    salary_month varchar(7) NOT NULL,
    gross_salary numeric(15,2) NOT NULL,
    total_deductions numeric(15,2) DEFAULT 0,
    net_salary numeric(15,2) NOT NULL,
    attendance_days numeric(6,2) NOT NULL DEFAULT 0,
    leave_days numeric(6,2) NOT NULL DEFAULT 0,
    travel_days numeric(8,2) NOT NULL DEFAULT 0,
    per_diem_amount numeric(15,2) NOT NULL DEFAULT 0,
    total_per_diem numeric(15,2) NOT NULL DEFAULT 0,
    working_days numeric(6,2) NOT NULL DEFAULT 0,
    paid_leave_days numeric(6,2) NOT NULL DEFAULT 0,
    unpaid_leave_days numeric(6,2) NOT NULL DEFAULT 0,
    absent_days numeric(6,2) NOT NULL DEFAULT 0,
    late_days integer NOT NULL DEFAULT 0,
    late_minutes integer NOT NULL DEFAULT 0,
    overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
    overtime_amount numeric(15,2) NOT NULL DEFAULT 0,
    attendance_deduction numeric(15,2) NOT NULL DEFAULT 0,
    late_deduction numeric(15,2) NOT NULL DEFAULT 0,
    payroll_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
    approved_by uuid,
    approved_at timestamptz,
    released_by uuid,
    released_at timestamptz,
    created_at timestamptz DEFAULT now()
  );
  CREATE TABLE public.hr_attendance_policies(
    tenant_id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  );
`;

describe("HR Payroll Control migration rehearsal", () => {
  const migration = readFileSync(resolve(__dirname, "../../../../migrations/add-hr-payroll-control-v1.sql"), "utf8");
  const attendancePolicyMigration = readFileSync(resolve(__dirname, "../../../../migrations/add-hr-attendance-policy-effective-dates.sql"), "utf8");
  const profiles = ["SAIFSEAS", "MIZANTRA", "ARWA"];

function isolatedDatabase() {
  const worker = new Worker(`const {parentPort}=require('node:worker_threads');const {PGlite}=require(${JSON.stringify(require.resolve("@electric-sql/pglite"))});const database=new PGlite();parentPort.on('message',async job=>{try{const result=await database[job.method](...job.args);parentPort.postMessage({id:job.id,result});}catch(error){parentPort.postMessage({id:job.id,error:error.message});}});`, { eval: true });
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();
  worker.on("message", (message: any) => { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request?.reject(new Error(message.error)); else request?.resolve(message.result); });
  worker.on("error", (error) => { for (const request of pending.values()) request.reject(error); pending.clear(); });
  const invoke = (method: string, ...args: any[]) => new Promise<any>((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); worker.postMessage({ id, method, args }); });
  return { exec: (sql: string) => invoke("exec", sql), query: (sql: string, args?: any[]) => invoke("query", sql, args), close: async () => { await invoke("close"); await worker.terminate(); } };
}

  it.each(profiles)("applies idempotently for the %s shared schema, preserves legacy payroll rows, and guards finalized data", async profile => {
    const db = isolatedDatabase();
    const tenantId = profile === "SAIFSEAS" ? "11111111-1111-4111-8111-111111111111" : profile === "MIZANTRA" ? "22222222-2222-4222-8222-222222222222" : "33333333-3333-4333-8333-333333333333";
    const employeeId = "44444444-4444-4444-8444-444444444444";
    const runId = "55555555-5555-4555-8555-555555555555";
    const payslipId = "66666666-6666-4666-8666-666666666666";
    const controlId = "77777777-7777-4777-8777-777777777777";
    try {
      await db.exec(baseline);
      await db.exec(`INSERT INTO hr_attendance_policies(tenant_id,created_at,updated_at) VALUES('${tenantId}','2026-09-20T00:00:00Z','2026-09-28T03:00:00Z')`);
      await db.exec(`CREATE TABLE public.hr_payroll_feature_flags(tenant_id uuid NOT NULL,feature_key text NOT NULL CHECK(feature_key IN ('PAYROLL_MONTH_COCKPIT_ENABLED','PAYROLL_EFFECTIVE_DATED_SALARY_ENABLED','HR_TEAM_DESK_ENABLED','PAYROLL_WORKING_ENABLED','PAYROLL_CORRECTION_VERSIONS_ENABLED')),is_enabled boolean NOT NULL DEFAULT false,updated_by uuid,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,feature_key)); INSERT INTO hr_payroll_feature_flags(tenant_id,feature_key,is_enabled) VALUES('${tenantId}','PAYROLL_WORKING_ENABLED',false);`);
      if (profile !== "ARWA") {
        await db.exec(`INSERT INTO employees VALUES('${employeeId}','${tenantId}'); INSERT INTO salary_components(employee_id,tenant_id,component_type,component_name,amount) VALUES('${employeeId}','${tenantId}','BASIC','Basic',100); INSERT INTO payroll_runs(id,tenant_id,payroll_month,run_date,status) VALUES('${runId}','${tenantId}','2026-09','2026-10-01','APPROVED'); INSERT INTO payslips(id,tenant_id,payroll_run_id,employee_id,payslip_number,salary_month,gross_salary,total_deductions,net_salary,attendance_days,leave_days,travel_days,working_days,paid_leave_days,unpaid_leave_days,absent_days,payroll_breakdown) VALUES('${payslipId}','${tenantId}','${runId}','${employeeId}','LEGACY-${profile}','2026-09',100,0,100,20.50,0.50,0.50,20.50,1.25,0.25,0.50,'{}'::jsonb);`);
      }
      const before = await db.query("SELECT (SELECT count(*) FROM employees)::int employees,(SELECT count(*) FROM salary_components)::int salaries,(SELECT count(*) FROM payroll_runs)::int runs,(SELECT count(*) FROM payslips)::int slips") as any;
      const legacyColumnNames = ["tenant_id", "attendance_days", "leave_days", "travel_days", "per_diem_amount", "total_per_diem", "working_days", "paid_leave_days", "unpaid_leave_days", "absent_days", "late_days", "late_minutes", "overtime_hours", "overtime_amount", "attendance_deduction", "late_deduction", "payroll_breakdown"];
      const beforeShape = await db.query("SELECT column_name,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='payslips' AND column_name = ANY($1::text[]) ORDER BY column_name", [legacyColumnNames]) as any;
      const beforeRows = await db.query("SELECT id,attendance_days::text,leave_days::text,travel_days::text,per_diem_amount::text,total_per_diem::text,working_days::text,paid_leave_days::text,unpaid_leave_days::text,absent_days::text,late_days::text,late_minutes::text,overtime_hours::text,overtime_amount::text,attendance_deduction::text,late_deduction::text,payroll_breakdown::text FROM payslips ORDER BY id") as any;
      const beforePolicyColumns = await db.query("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance_policies' AND column_name IN ('effective_from','effective_to')") as any;
      expect(beforePolicyColumns.rows[0].count).toBe(0);
      await db.exec(attendancePolicyMigration);
      await db.exec(attendancePolicyMigration);
      await db.exec(migration);
      await db.exec(migration);
      const after = await db.query("SELECT (SELECT count(*) FROM employees)::int employees,(SELECT count(*) FROM salary_components)::int salaries,(SELECT count(*) FROM payroll_runs)::int runs,(SELECT count(*) FROM payslips)::int slips") as any;
      expect(after.rows[0]).toEqual(before.rows[0]);
      const afterShape = await db.query("SELECT column_name,data_type,udt_name,is_nullable,column_default,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='payslips' AND column_name = ANY($1::text[]) ORDER BY column_name", [legacyColumnNames]) as any;
      const afterRows = await db.query("SELECT id,attendance_days::text,leave_days::text,travel_days::text,per_diem_amount::text,total_per_diem::text,working_days::text,paid_leave_days::text,unpaid_leave_days::text,absent_days::text,late_days::text,late_minutes::text,overtime_hours::text,overtime_amount::text,attendance_deduction::text,late_deduction::text,payroll_breakdown::text FROM payslips ORDER BY id") as any;
      expect(afterShape.rows).toEqual(beforeShape.rows);
      expect(afterRows.rows).toEqual(beforeRows.rows);
      if (profile !== "ARWA") expect(afterRows.rows[0]?.payroll_breakdown).toBe("{}");
      const effectivePolicy = await db.query("SELECT effective_from::text,effective_to::text FROM hr_attendance_policies WHERE tenant_id=$1", [tenantId]) as any;
      expect(effectivePolicy.rows).toEqual([{ effective_from: "2026-09-28", effective_to: null }]);
      const flags = await db.query("SELECT is_enabled FROM hr_payroll_feature_flags WHERE tenant_id=$1", [tenantId]) as any;
      expect(flags.rows).toEqual([{ is_enabled: false }]);
      await db.query("INSERT INTO hr_payroll_feature_flags(tenant_id,feature_key) VALUES($1,'PAYROLL_STATE_TRANSITIONS_ENABLED')", [tenantId]);
      expect(((await db.query("SELECT is_enabled FROM hr_payroll_feature_flags WHERE tenant_id=$1 AND feature_key='PAYROLL_STATE_TRANSITIONS_ENABLED'", [tenantId])) as any).rows[0].is_enabled).toBe(false);
      const rls = await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.hr_payroll_corrections'::regclass") as any;
      expect(rls.rows[0].relrowsecurity).toBe(true);
      if (profile !== "ARWA") {
        await db.exec(`INSERT INTO hr_payroll_month_controls(id,tenant_id,payroll_month,version,stage,payroll_run_id,opened_by,last_action_by,input_checksum,calculation_checksum) VALUES('${controlId}','${tenantId}','2026-09',1,'APPROVED','${runId}','88888888-8888-4888-8888-888888888888','88888888-8888-4888-8888-888888888888','input-checksum','calculation-checksum');`);
        await expect(db.query("UPDATE payslips SET net_salary=99 WHERE id=$1", [payslipId])).rejects.toThrow("Finalized payroll calculation evidence is immutable");
        await expect(db.query("UPDATE hr_payroll_month_controls SET calculation_checksum='altered' WHERE id=$1", [controlId])).rejects.toThrow("Finalized payroll calculation checksum and control evidence are immutable");
        await db.query("UPDATE hr_payroll_month_controls SET stage='PAID' WHERE id=$1", [controlId]);
      }
    } finally {
      await db.close();
    }
  });
});
