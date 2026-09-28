// Local-only browser acceptance. All API requests are intercepted; no live service is used.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const {
  supportIntent,
} = require("../../apps/api/dist/intelligence/planner-support.service.js");
const base = process.env.MIZANTRA_LOCAL_QA_URL || "http://127.0.0.1:3217";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Local server only.");

(async () => {
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  const check = (condition, name) => {
    assert(condition, name);
    passed++;
    console.log(`PASS ${name}`);
  };
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const user = {
      id: "22222222-2222-4222-8222-222222222222",
      tenantId: "11111111-1111-4111-8111-111111111111",
      username: "local-test",
      roles: ["Admin"],
    };
    await page.addInitScript((user) => {
      localStorage.setItem("accessToken", "local-test-token");
      localStorage.setItem("user", JSON.stringify(user));
    }, user);
    let uploadFails = true;
    let submissions = [];
    let incidents = [];
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace(
        "/api/v1",
        "",
      );
      let data = [];
      if (path === "/auth/me") data = user;
      if (path === "/features/me") data = { configured: false };
      if (path === "/active-planner/capabilities") data = { capabilities: [] };
      if (path.startsWith("/active-planner/conversations"))
        data = { conversations: [] };
      if (path === "/active-planner/support-intent") {
        const body = route.request().postDataJSON();
        data = { intent: supportIntent(body.message, body.support_mode) };
      }
      if (path === "/active-planner/support-screenshot") {
        if (uploadFails)
          return route.fulfill({
            status: 503,
            json: { message: "Upload unavailable" },
          });
        data = { ref: "33333333-3333-4333-8333-333333333333" };
      }
      if (path === "/purchase/grn/invoice/upload")
        data = { url: "/uploads/local/planner.png" };
      if (path === "/active-planner/support-status")
        data = { support_incidents: incidents };
      if (path === "/active-planner/interpret") {
        const body = route.request().postDataJSON();
        submissions.push(body);
        const intent = supportIntent(body.message, body.support_mode);
        data = {
          status: intent,
          intent_type: intent,
          questions: [],
          extracted: {},
          resolved: {},
          safety: {},
          context_token: "",
          assistant_message: "Planning request received.",
        };
        if (intent === "SUPPORT_INCIDENT") {
          const incident = {
            id: `INC-${1042 + incidents.length}`,
            status: "Checking the problem.",
          };
          incidents.unshift(incident);
          data = {
            ...data,
            support_incident: incident,
            assistant_message: `I've logged this issue. Incident: ${incident.id}. Checking the problem.`,
          };
        }
        if (intent === "SUPPORT_STATUS")
          data = {
            ...data,
            support_incidents: incidents,
            assistant_message:
              "Your recent support issues: INC-1042. Checking the problem.",
          };
      }
      await route.fulfill({ json: data });
    });
    // Visit the actual originating route before opening the existing bot link.
    await page.goto(`${base}/dashboard/purchase/orders`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () =>
        sessionStorage.getItem("mizantra-source-route") ===
        "/dashboard/purchase/orders",
    );
    await page.locator('a[href="/dashboard/active-planner"]').first().click();
    const input = page.getByRole("textbox", { name: "Message to Mizantra" });
    const send = page.getByRole("button", { name: "Send message to Mizantra" });
    await input.waitFor();
    check(
      (await page.evaluate(() =>
        sessionStorage.getItem("mizantra-source-route"),
      )) === "/dashboard/purchase/orders",
      "source route survives Ask Mizantra navigation",
    );
    const description =
      "While trying to enter name in Search Bar of PO, there is some error, and unable to search.";
    await input.fill(description);
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "po-search.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await send.click();
    await page
      .getByText(
        "Attachment upload failed. Your description is still here; retry or remove the attachment.",
        { exact: true },
      )
      .waitFor();
    check(
      (await input.inputValue()) === description && submissions.length === 0,
      "upload failure preserves description and creates no incident",
    );
    uploadFails = false;
    await send.click();
    await page
      .getByText(/I've logged this issue. Incident: INC-1042/)
      .waitFor();
    check(
      submissions[0].support_screenshot_ref ===
        "33333333-3333-4333-8333-333333333333" &&
        submissions[0].source_route === "/dashboard/purchase/orders",
      "screenshot and original route attached",
    );
    check(
      !JSON.stringify(submissions[0]).includes("local-test-token"),
      "credential excluded from incident payload",
    );
    await input.fill("Create a PR for 50 bearings");
    await send.click();
    await page
      .getByText("Planning request received.", { exact: true })
      .waitFor();
    check(
      supportIntent(
        submissions.at(-1).message,
        submissions.at(-1).support_mode,
      ) === "NORMAL_PLANNER_REQUEST",
      "normal PR still reaches planner",
    );
    await input.fill("There is a problem with my order");
    const before = submissions.length;
    await send.click();
    await page.getByRole("button", { name: "Yes, report a problem" }).waitFor();
    check(
      submissions.length === before &&
        (await input.inputValue()) === "There is a problem with my order",
      "ambiguous message waits for clarification",
    );
    await page.getByRole("button", { name: "Yes, report a problem" }).click();
    await page
      .getByText(/I've logged this issue. Incident: INC-1043/)
      .waitFor();
    check(
      submissions.at(-1).support_mode === "support",
      "confirmation forces incident mode",
    );
    await page
      .getByRole("button", { name: "Report a problem", exact: true })
      .click();
    await input.fill("The supplier field");
    await send.click();
    await page
      .getByText(/I've logged this issue. Incident: INC-1044/)
      .waitFor();
    check(
      submissions.at(-1).support_mode === "support",
      "Report a problem button forces support",
    );
    await page.getByRole("button", { name: "My issue status" }).click();
    await page
      .getByText(
        "Your recent support issues: INC-1042. Checking the problem.",
        { exact: true },
      )
      .waitFor();
    check(
      supportIntent(submissions.at(-1).message) === "SUPPORT_STATUS",
      "support status appears in chat",
    );
    console.log(`${passed} browser checks passed.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
