# Mizantra AutoHeal V1 safety policy

## Authority and defaults

The deterministic API policy is the only authority for risk and deployment eligibility. A coding model cannot lower a risk, approve deployment, or bypass a failed validation.

- Kill switch: `AUTOHEAL_ENABLED=false` by default. It leaves authenticated incident capture and status reads available, while preventing queue work, model execution, worktree creation, and deployment.
- Mode: `AUTOHEAL_MODE=SHADOW` by default. `SHADOW` runs enabled analysis/patch/validation work but never deploys. `APPROVAL` requires a privileged admin action. `AUTO` deploys only a LOW incident whose post-diff gate passes.
- Agent: `AUTOHEAL_AGENT_PROVIDER=mock` by default. Codex CLI is opt-in and uses `codex exec --sandbox workspace-write --ephemeral`; high/blocked risk receives no coding-model execution.
- Attempt limit: two patch attempts per incident. After two failures the incident becomes ESCALATED. Bull jobs have one delivery attempt; production deployment is never retried automatically.
- Fingerprint deduplication: same tenant, route, endpoint, status, normalized error, and build SHA within 15 minutes increments occurrence count on the existing incident.

## Risk matrix

| Classification | Examples | V1 behavior |
| --- | --- | --- |
| LOW | Visual rendering, label/text, date/day formatting, responsive layout, UI search/filter, table visibility, export formatting, client cache, frontend navigation, optional UI field, null/empty rendering | May enter isolated web patch workflow. AUTO deploy still requires every post-diff gate. |
| MEDIUM | Unknown, ambiguous, or mixed-scope report | Engineering review; never automatically deployed. |
| HIGH | Business/data, accounting, payroll, security, external integration, or protected write/correction behavior | Escalate; no low-risk auto-deploy. |
| BLOCKED | Protected paths, secret/config changes, or prohibited repository changes | Stop the attempt and escalate. |

Weekly attendance/date display can be LOW; attendance writes, corrections, and calculations are protected. A visual label does not downgrade a payroll/accounting/authentication/security classification.

## Always-protected areas

- Migrations, SQL, Prisma/schema, API/backend source, and database behavior.
- Inventory quantities/movements; GRN, SIV, SRV; purchase transaction creation; accounting, journals, payments; payroll/salary; attendance writes/corrections/calculations; leave balances; UID tracking.
- Authentication, authorization, permissions, security, secrets, environment/configuration, Nginx, PM2, deployment infrastructure, delete/reversal behavior, document numbering, and external integrations.
- `package.json`, lockfiles, and dependency changes.

The post-diff policy also blocks any file outside `apps/web/`, protected paths/names, suspicious secret/config additions, and protected-domain additions in the changed hunks. It is authoritative even when initial classification was LOW.

## Required post-diff gates for AUTO

Every item is required:

1. Initial incident risk is LOW and post-diff deterministic risk remains LOW.
2. All changed files are web-only, at most five files, and at most 250 total added plus removed lines. Env values can lower but cannot raise these hard ceilings.
3. No migration, package/lockfile, API/backend, protected path, secret, config, or prohibited business/write behavior changed.
4. A relevant focused test, web type-check, production web build, `git diff --check`, and local root plus affected-route smoke all pass.
5. Changes are committed on an incident-specific `autofix/<incident>-<slug>` branch based on the approved base; the worktree is not dirty; the fix branch is pushed without force.
6. A tenant deployment target is explicitly configured and valid; its HTTPS smoke URLs must use the configured domain.

Any failure means no AUTO deployment. The fix is marked FAILED or ESCALATED for privileged review. Medium/high work can be diagnosed and handled manually, but the V1 auto-deploy gate never accepts it.

## Data and credential rules

- The browser sends only title/description and safe page, route, module, browser, build, timestamp, optional screenshot reference, and recent failed endpoint/status/request ID.
- Query strings and URL fragments are stripped. Free text is truncated and redacts labeled password, token, cookie, authorization, secret, bank/account, salary, and payroll values. Data URL screenshots are rejected; screenshot bytes are never accepted.
- User, employee, and tenant references come from authenticated server context, not client-supplied IDs. Full request bodies, cookies, bearer tokens, DB URLs, and authorization headers are never stored.
- Generic audit-body logging is skipped for the support controller. Support-specific audit records contain safe event metadata and sanitized reasons.
- The coding CLI child receives an allowlisted OS environment and never receives `SUPABASE_KEY`, database URLs, API tokens, request headers, or request bodies. The AutoHeal code worker uses support tables for its own records; it has no general production data write interface.
- Deployment credentials are resolved by an environment variable name in the target registry. Secret values are not stored in incidents, attempts, deployment records, or Git.

## Isolated Git and deploy rules

Each attempt resolves the approved base SHA and creates a separate `autofix/<incident-id>-<slug>` branch/worktree under the configured worktree root outside the main worktree. Worktree operations validate their root. Agent output is inspected and staged only inside that worktree. The base worktree is never reset/cleaned and Git force-push is never used.

AUTO deployment first records the production SHA, fetches the verified fix branch, confirms a clean checkout on the configured target branch and fast-forward ancestry, then fast-forwards, builds web, restarts only the configured web PM2 process, and checks the site and affected route. Build or smoke failure restores the previous SHA only if production is still at the known previous or attempted SHA, rebuilds/restarts only web, and verifies rollback. A failed rollback becomes CRITICAL/ESCALATED and is not retried.
