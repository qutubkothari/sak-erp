import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Worker } from "node:worker_threads";
import { operatorChecksum } from "./action-operator.registry";
import { PurchaseRequisitionsService } from "../purchase/services/purchase-requisitions.service";

jest.setTimeout(60000);

describe("Action Operator PostgreSQL transaction controls", () => {
  let database: Pick<PGlite, "exec" | "query" | "close">;
  const tenant = "11111111-1111-4111-8111-111111111111",
    user = "22222222-2222-4222-8222-222222222222",
    item = "33333333-3333-4333-8333-333333333333";
  const planId = "44444444-4444-4444-8444-444444444444",
    sha = "a".repeat(40),
    checksum = "b".repeat(64);
  const payload = {
    inputs: {
      department: "PRODUCTION",
      requiredDate: "2099-01-01",
      items: [{ itemId: item, requestedQty: 3, uom: "PCS" }],
    },
    master_states: [
      {
        id: item,
        code: "RM-1",
        name: "Material",
        uom: "PCS",
        updated_at: null,
      },
    ],
  };
  const header = {
    tenant_id: tenant,
    requested_by: user,
    pr_number: "PR-2099-01-001",
    request_date: "2099-01-01",
    required_date: "2099-01-01",
    department: "PRODUCTION",
    status: "DRAFT",
    priority: "MEDIUM",
  };
  const lines = [
    {
      item_id: item,
      item_code: "RM-1",
      item_name: "Material",
      requested_qty: 3,
      uom: "PCS",
    },
  ];
  const transition = async (event: string, binding = checksum) =>
    (
      await database.query<any>(
        "SELECT mizantra_operator_transition($1,$2,$3,$4,$5,$6,$7) AS result",
        [planId, tenant, "MIZANTRA", user, binding, sha, event],
      )
    ).rows[0].result;
  const commit = async (entries = lines) =>
    (
      await database.query<any>(
        "SELECT mizantra_operator_commit_pr($1,$2,$3,$4,$5,$6,$7,$8) AS result",
        [
          planId,
          tenant,
          "MIZANTRA",
          user,
          checksum,
          sha,
          JSON.stringify(header),
          JSON.stringify(entries),
        ],
      )
    ).rows[0].result;
  beforeEach(async () => {
    const worker = new Worker(
      `const {parentPort}=require('node:worker_threads');const {PGlite}=require(${JSON.stringify(require.resolve("@electric-sql/pglite"))});const database=new PGlite();parentPort.on('message',async job=>{try{const result=await database[job.method](...job.args);parentPort.postMessage({id:job.id,result});}catch(error){parentPort.postMessage({id:job.id,error:error.message});}});`,
      { eval: true },
    );
    let sequence = 0;
    const pending = new Map<
      number,
      { resolve: (value: any) => void; reject: (reason: Error) => void }
    >();
    worker.on("message", (message) => {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request?.reject(new Error(message.error));
      else request?.resolve(message.result);
    });
    worker.on("error", (error) => {
      for (const request of pending.values()) request.reject(error);
      pending.clear();
    });
    const invoke = (method: string, ...args: any[]) =>
      new Promise<any>((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, method, args });
      });
    database = {
      exec: (sql: string) => invoke("exec", sql),
      query: (sql: string, args?: any[]) => invoke("query", sql, args),
      close: async () => {
        await invoke("close");
        await worker.terminate();
      },
    } as any;
    await database.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
      CREATE TABLE tenants(id uuid PRIMARY KEY);
      CREATE TABLE items(id uuid PRIMARY KEY,tenant_id uuid,code text,name text,uom text,is_active boolean,is_verified boolean,updated_at timestamptz);
      CREATE TABLE purchase_requisitions(id uuid PRIMARY KEY,tenant_id uuid,pr_number text,request_date date,department text,purpose text,requested_by uuid,required_date date,priority text,status text,remarks text,created_at timestamptz DEFAULT now(),UNIQUE(tenant_id,pr_number));
      CREATE TABLE autoqa_findings(tenant_id uuid,profile text,entity_type text,entity_id text,severity text,status text);
      CREATE TABLE purchase_requisition_items(id uuid DEFAULT gen_random_uuid(),pr_id uuid REFERENCES purchase_requisitions(id),item_id uuid REFERENCES items(id),item_code text,item_name text,uom text,requested_qty numeric(15,3) CHECK(requested_qty<100),required_date date);
      INSERT INTO tenants VALUES('${tenant}');INSERT INTO items VALUES('${item}','${tenant}','RM-1','Material','PCS',true,true,null);`);
    await database.exec(
      readFileSync(
        resolve(__dirname, "../../../../migrations/add-action-operator.sql"),
        "utf8",
      ),
    );
    await database.query(
      "INSERT INTO mizantra_action_plans(id,tenant_id,profile,requester_id,action_key,risk,status,payload,checksum,build_sha,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        planId,
        tenant,
        "MIZANTRA",
        user,
        "CREATE_DRAFT_PR",
        "MEDIUM",
        "READY_FOR_APPROVAL",
        JSON.stringify(payload),
        checksum,
        sha,
        "2099-01-01",
      ],
    );
  });
  afterEach(async () => {
    await database.close();
  });
  it("preview metadata creates zero PR headers and lines", async () =>
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(0));
  it("requires explicit approval before claiming or committing", async () => {
    await expect(transition("CLAIM")).rejects.toThrow(
      "EXPLICIT_APPROVAL_REQUIRED",
    );
    await expect(commit()).rejects.toThrow("EXPLICIT_APPROVAL_REQUIRED");
  });
  it("binds approval to checksum", async () => {
    await expect(transition("APPROVE", "changed")).rejects.toThrow(
      "PLAN_CHANGED_REVIEW_REQUIRED",
    );
  });
  it("claims a human approval once and atomically creates one draft with its lines", async () => {
    await transition("APPROVE");
    expect((await transition("CLAIM")).claimed).toBe(true);
    expect((await transition("CLAIM")).claimed).toBe(false);
    const created = await commit();
    expect(created).toMatchObject({
      status: "DRAFT",
      line_count: 1,
      effects: {
        po: 0,
        grn: 0,
        stock_movement: 0,
        accounting: 0,
        submission: 0,
        approval: 0,
        rfq: 0,
      },
    });
    expect(await commit()).toEqual(created);
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("rolls back the header when line insertion fails", async () => {
    const changed = {
      ...payload,
      inputs: {
        ...payload.inputs,
        items: [{ itemId: item, requestedQty: 101, uom: "PCS" }],
      },
    };
    await database.query(
      "UPDATE mizantra_action_plans SET payload=$1 WHERE id=$2",
      [JSON.stringify(changed), planId],
    );
    await transition("APPROVE");
    await transition("CLAIM");
    await expect(
      commit([{ ...lines[0], requested_qty: 101 }]),
    ).rejects.toThrow();
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it("rejects current master changes immediately before writing", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    await database.query("UPDATE items SET uom=$1 WHERE id=$2", ["KG", item]);
    await expect(commit()).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("rolls back quantities that database precision would change", async () => {
    const changed = { ...payload, inputs: { ...payload.inputs, items: [{ itemId: item, requestedQty: 3.1234, uom: "PCS" }] } };
    await database.query("UPDATE mizantra_action_plans SET payload=$1 WHERE id=$2", [JSON.stringify(changed), planId]);
    await transition("APPROVE"); await transition("CLAIM");
    await expect(commit([{ ...lines[0], requested_qty: 3.1234 }])).rejects.toThrow("PR_LINE_VERIFICATION_FAILED");
    expect((await database.query<any>("SELECT count(*)::int AS count FROM purchase_requisitions")).rows[0].count).toBe(0);
  });
  it("expires an approval instead of writing", async () => {
    await database.exec(
      "UPDATE mizantra_action_plans SET expires_at='2000-01-01'",
    );
    expect((await transition("APPROVE")).plan.status).toBe("EXPIRED");
    await expect(commit()).rejects.toThrow();
  });
  it("cancels before execution without creating a PR", async () => {
    expect((await transition("CANCEL")).plan.status).toBe("CANCELLED");
    await expect(transition("APPROVE")).rejects.toThrow();
  });
  it("never deletes the PR when cancelled after execution", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    const created = await commit();
    expect((await transition("CANCEL")).cancelled).toBe(false);
    expect(await commit()).toEqual(created);
  });
  it("records the complete approval, claim and creation trail", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    await commit();
    expect(
      (
        await database.query<any>(
          "SELECT event FROM mizantra_action_plan_audit ORDER BY created_at",
        )
      ).rows.map((row) => row.event),
    ).toEqual(["APPROVE", "CLAIM", "COMPLETED"]);
  });
  it("blocks a relevant AutoQA finding inserted after approval", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    await database.query(
      "INSERT INTO autoqa_findings VALUES($1,'MIZANTRA','item',$2,'HIGH','OPEN')",
      [tenant, item],
    );
    await expect(commit()).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it("blocks a recent duplicate committed after planning", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    await database.query(
      "INSERT INTO purchase_requisitions(id,tenant_id,pr_number,status) VALUES($1,$2,'OTHER','DRAFT')",
      [user, tenant],
    );
    await database.query(
      "INSERT INTO purchase_requisition_items(pr_id,item_id,item_code,requested_qty) VALUES($1,$2,'RM-1',3)",
      [user, item],
    );
    await expect(commit()).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("rejects invented master names and nonnumeric quantities", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    await expect(
      commit([{ ...lines[0], item_name: "Invented" }]),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
    await expect(
      commit([{ ...lines[0], requested_qty: "3" }] as any),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("denies RPC execution to direct authenticated callers", async () => {
    await database.exec("SET ROLE authenticated");
    await expect(commit()).rejects.toThrow("permission denied");
    await database.exec("RESET ROLE");
  });
  it("persists the checksummed preview and invalidates approval when replaced", async () => {
    await transition("APPROVE");
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const preview = {
      ...payload,
      scope: { tenant_id: tenant, profile: "MIZANTRA", requester_id: user },
      action_key: "CREATE_DRAFT_PR",
      risk: "MEDIUM",
      status: "READY_FOR_APPROVAL",
      build_sha: sha,
      expires_at: expires,
    };
    const digest = operatorChecksum(preview);
    const created = (
      await database.query<any>(
        "SELECT mizantra_operator_create_plan($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS result",
        [
          tenant,
          "MIZANTRA",
          user,
          "CREATE_DRAFT_PR",
          "MEDIUM",
          "READY_FOR_APPROVAL",
          JSON.stringify(preview),
          digest,
          sha,
          expires,
          planId,
        ],
      )
    ).rows[0].result;
    expect(operatorChecksum(created.payload)).toBe(digest);
    expect(created.approved_by).toBeNull();
    expect(
      (
        await database.query<any>(
          "SELECT status FROM mizantra_action_plans WHERE id=$1",
          [planId],
        )
      ).rows[0].status,
    ).toBe("CANCELLED");
    await expect(transition("CLAIM")).rejects.toThrow(
      "EXPLICIT_APPROVAL_REQUIRED",
    );
  });
  it("rejects payload/action mismatches and foreign owner or build transitions", async () => {
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const preview = {
      ...payload,
      scope: { tenant_id: tenant, profile: "MIZANTRA", requester_id: user },
      action_key: "CREATE_DRAFT_PR",
      risk: "MEDIUM",
      status: "READY_FOR_APPROVAL",
      build_sha: sha,
      expires_at: expires,
    };
    await expect(
      database.query(
        "SELECT mizantra_operator_create_plan($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          tenant,
          "MIZANTRA",
          user,
          "CREATE_DRAFT_RFQ_FROM_PR",
          "MEDIUM",
          "READY_FOR_APPROVAL",
          JSON.stringify(preview),
          operatorChecksum(preview),
          sha,
          expires,
        ],
      ),
    ).rejects.toThrow("PLAN_SCOPE_INVALID");
    await expect(
      database.query(
        "SELECT mizantra_operator_transition($1,$2,$3,$4,$5,$6,$7)",
        [planId, tenant, "MIZANTRA", item, checksum, sha, "APPROVE"],
      ),
    ).rejects.toThrow("PLAN_NOT_FOUND");
    await expect(
      database.query(
        "SELECT mizantra_operator_transition($1,$2,$3,$4,$5,$6,$7)",
        [planId, tenant, "MIZANTRA", user, checksum, "c".repeat(40), "APPROVE"],
      ),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("handles simultaneous same-plan commits without duplicate business rows", async () => {
    await transition("APPROVE");
    await transition("CLAIM");
    const results = await Promise.all([commit(), commit()]);
    expect(results[0]).toEqual(results[1]);
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisitions",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("creates the verified local draft through the real existing PR service", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_KEY = "test-key";
    await transition("APPROVE");
    await transition("CLAIM");
    const subject = new PurchaseRequisitionsService(
      { ensureSchema: jest.fn().mockResolvedValue(undefined) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    (subject as any).projectsService = {
      ensureSchema: jest.fn().mockResolvedValue(undefined),
    };
    jest
      .spyOn(subject as any, "assertItemsVerified")
      .mockResolvedValue(undefined);
    jest
      .spyOn(subject as any, "assertVendorsVerified")
      .mockResolvedValue(undefined);
    jest
      .spyOn(subject as any, "generatePRNumber")
      .mockResolvedValue(header.pr_number);
    (subject as any).supabase = {
      rpc: async (_name: string, args: any) => ({
        data: (
          await database.query<any>(
            "SELECT mizantra_operator_commit_pr($1,$2,$3,$4,$5,$6,$7,$8) AS result",
            [
              args.p_id,
              args.p_tenant,
              args.p_profile,
              args.p_user,
              args.p_checksum,
              args.p_build,
              JSON.stringify(args.p_header),
              JSON.stringify(args.p_lines),
            ],
          )
        ).rows[0].result,
        error: null,
      }),
    };
    jest
      .spyOn(subject, "findOne")
      .mockImplementation(
        async (_tenant: string, id: string) =>
          (
            await database.query<any>(
              "SELECT * FROM purchase_requisitions WHERE id=$1",
              [id],
            )
          ).rows[0],
      );
    const revalidate = jest.fn().mockResolvedValue(undefined);
    expect(
      await subject.create(
        tenant,
        user,
        {
          status: "DRAFT",
          department: "PRODUCTION",
          requiredDate: "2099-01-01",
          items: [
            {
              itemId: item,
              itemCode: "RM-1",
              itemName: "Material",
              uom: "PCS",
              requestedQty: 3,
            },
          ],
        },
        { planId, checksum, profile: "MIZANTRA", buildSha: sha, revalidate },
      ),
    ).toMatchObject({ status: "DRAFT", tenant_id: tenant });
    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(
      (
        await database.query<any>(
          "SELECT count(*)::int AS count FROM purchase_requisition_items",
        )
      ).rows[0].count,
    ).toBe(1);
  });
});
