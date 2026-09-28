# Mizantra AutoHeal V1 runbook

## Current state

This commit adds the platform only. It is not deployed, the SQL migration is not applied, `AUTOHEAL_ENABLED` remains false by default, and no target VPS was contacted. Do not set AUTO mode as part of the first shadow test.

## Emergency disable

Set `AUTOHEAL_ENABLED=false` for the API process and restart the API through the normal approved release process. Incident capture remains available; no queued coding/deploy work is started. As an additional mode override, set `AUTOHEAL_MODE=SHADOW`. Invalid mode values also resolve to SHADOW. Never disable the kill switch to recover a failed deployment; deployment rollback is a separate operation.

## Before a non-production shadow test

1. Apply `migrations/add-support-autofix.sql` manually to a non-production database after review. The application does not run schema changes on startup.
2. Grant `support_autofix:read`, `support_autofix:manage`, and `support_autofix:approve` to the intended support-admin role. Super Admin retains the existing platform override.
3. Configure `AUTOHEAL_ENABLED=true`, `AUTOHEAL_MODE=SHADOW`, and `AUTOHEAL_AGENT_PROVIDER=mock` first. Verify incidents are recorded, tenant boundaries hold, fingerprint repeats increment occurrence count, and the mock provider changes no files and cannot deploy.
4. For a real isolated patch exercise, configure `AUTOHEAL_AGENT_PROVIDER=codex-cli`, an approved `AUTOHEAL_CODEX_PATH`, a supported coding model, and the CLI's own authentication on the isolated worker host. Confirm the CLI runs with `workspace-write`, operates only in the incident worktree, and cannot read database credentials from its environment. If the host does not have a supported CLI/auth setup, leave the provider as mock.
5. Keep `AUTOHEAL_MODE=SHADOW`, leave `AUTOHEAL_DEPLOYMENT_TARGETS_JSON` empty, and verify the support/admin UI, audit history, risk gate, web tests, build, and local smoke result. Do not use production incidents as test data.

## Deployment target configuration

The registry is empty unless `AUTOHEAL_DEPLOYMENT_TARGETS_JSON` is set. An example shape (use only a test tenant and test host) is:

```json
[
  {
    "id": "nonprod-web",
    "tenantId": "00000000-0000-4000-8000-000000000000",
    "domain": "erp-test.example.invalid",
    "host": "test-host.example.invalid",
    "user": "deploy",
    "repositoryPath": "/srv/erp-test",
    "branch": "clean-main",
    "webPm2Process": "erp-test-web",
    "sshKeyEnvName": "AUTOHEAL_TEST_SSH_KEY_PATH",
    "smokeUrls": ["https://erp-test.example.invalid/", "https://erp-test.example.invalid/dashboard/support"]
  }
]
```

The named environment variable holds the SSH private-key *path* at runtime; never paste a key into JSON, source, or a support record. Keep host keys pre-verified in `known_hosts`; SSH uses strict host-key checking and batch mode. Configure the repository root, approved base ref, and worktree root explicitly on the worker. Worktrees should be outside the base checkout.

## Reviewing incidents

Open `/dashboard/support/admin` with a privileged account. Review the incident route/module and risk reason, then each attempt’s provider/model, changed paths, line counts, test/build results, post-diff reasons, branch/base/fix SHA, and deployment/rollback outcome. Client pages expose only “Issue received”, “Checking problem”, “Safe fix being tested”, “Fix deployed”/“Issue resolved”, or “Engineering review required”.

In SHADOW, even a clean LOW-risk patch stops before deployment and appears for engineering review. APPROVAL requires `support_autofix:approve` and a configured tenant target. AUTO is not permitted for the first shadow exercise; it is only eligible after all hard safety checks pass. Medium/high/blocked reports remain out of automatic deployment.

## Failure handling

- If a focused test, type-check, build, diff check, or local smoke fails, the fix cannot pass the gate. Inspect the isolated branch; at most one additional patch attempt may be requested. After two failed attempts the incident is ESCALATED.
- If a production web build or smoke fails after an authorized deployment, the orchestrator attempts one guarded rollback to the saved previous SHA, rebuilds web, restarts only web, and verifies smoke. It does not restart API or retry deployment.
- If rollback cannot be verified, the deployment and incident are marked ROLLBACK_FAILED/ESCALATED. Stop automated deployment and use the normal manual recovery procedure.
- A duplicate fingerprint within 15 minutes increments occurrence count. Inspect the incident’s updated timestamp and occurrence count before creating another ticket.
- If the support tables are missing, apply the reviewed additive migration in the intended environment. Do not add runtime DDL or grant browser access to service-role tables.

## Troubleshooting

- **Incident accepted but no attempt appears:** check `AUTOHEAL_ENABLED`, Bull/Redis health, and queue worker logs. The default false kill switch intentionally captures only.
- **Incident waits for engineering:** risk is not LOW, mode is SHADOW/APPROVAL, provider is mock, target is missing, or a safety gate failed. Review the deterministic risk reason; do not override it by changing model output.
- **No focused test:** add a narrow test alongside the UI behavior. Auto deployment stays blocked until one can run.
- **Codex CLI unavailable:** keep provider mock, install nothing automatically, and provision a supported CLI/auth setup on an isolated worker before testing.
- **Target rejected:** verify tenant ID, HTTPS domain, host, absolute repository path, configured branch/process, smoke URL hostnames, SSH key environment reference, and verified host key. No target configuration is bundled in this feature.
- **Disable immediately:** set `AUTOHEAL_ENABLED=false`; optionally force `AUTOHEAL_MODE=SHADOW`. New incidents will still be captured.


## Ask Mizantra intake integration

The existing Active Planner composer is the primary reporting surface. Use **Report a problem**, or describe an obvious ERP failure. Ambiguous reports ask for confirmation before any incident or planner request is created. **My issue status** and natural-language follow-ups show authenticated-user history; open-chat statuses refresh every 15 seconds. `/dashboard/support` is history only.

The paperclip accepts one optional PNG/JPEG screenshot per report (up to 10 MB); pasted images use the same control. Upload occurs after intent routing, so ordinary planner PDF/image attachments retain the GRN upload flow. Support uploads require a private `erp-documents` bucket, verify image signatures, and return only a UUID. Metadata lives in `support_screenshots`, scoped by tenant and uploader; incident rows contain the reference only. Support admins can download through an authenticated, tenant-scoped endpoint. Failed uploads keep the typed description and selected file for retry.

Source routes are captured per browser tab before navigating to the planner. Intake strips queries/fragments, includes coarse browser/device metadata, existing safe failed-API endpoint/status, and an available build SHA. Incident descriptions pass unchanged into AutoHeal's existing redaction boundary; support messages do not enter planner memory or the LLM. Intake accepts no risk, approval, deployment, mode, target, or execution overrides. Automatic raw-body audit capture is disabled on intake/interpret; AutoHeal retains its sanitized incident audit event, and planner execution/approval endpoints retain their controls.

Before a live pilot, complete the non-production shadow procedure above, apply both `add-support-autofix.sql` and `add-planner-support-screenshots.sql` through the approved migration process, verify service-role access and the private document bucket, and exercise screenshot upload/download and tenant isolation against the real test storage. No migration or deployment is performed by this integration commit. Apply the organization's screenshot retention policy, including cleanup of uploads that never became incidents.

Local verification:

```text
pnpm --filter @sak-erp/database generate
pnpm --filter @sak-erp/api exec jest --runInBand planner-support support-autofix active-planner
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web type-check
pnpm --filter @sak-erp/web build
git diff --check
```

For browser acceptance, run the local web server on `127.0.0.1:3217`, then `node scripts/qa/mizantra-support-intake-local.cjs`. The script refuses remote server addresses and intercepts all API calls with fixtures; it never submits production incidents or invokes deployment.
