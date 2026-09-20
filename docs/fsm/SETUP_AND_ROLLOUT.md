# FSM setup and rollout

1. Create a backup and populated non-production clone.
2. Apply `migrations/add-mizantra-fsm.sql` to that clone. Do not run against production until AT-01–AT-35 pass and rollback is rehearsed.
3. In Feature Access, enable `crm-field-sales` only for the pilot tenant(s).
4. In Roles, grant the `Field Sales` module/screen actions. Representatives normally need view/create/edit; managers also need approve; precise location review should be limited to authorised managers.
5. Configure tenant timezone, working days, GPS freshness/accuracy/radius, required report/attachment rules and optional route provider.
6. Confirm CRM account owners, territories, members, contacts and WhatsApp consent. Add verified customer sites and effective assignments.
7. Create frequency rules, generate the pilot week twice, verify no duplicate occurrences, publish a plan and retain its revision.
8. Test offline save/reconnect, logout identity purge, token expiry, stale versions, concurrent check-in and private attachment access.
9. Run a controlled WhatsApp draft/send test through the existing connector. FSM must not send directly.
10. Pilot with supported Android and iPhone versions, recording OS/browser/version and permission results.

## Rollback

Disable the `crm-field-sales` tenant entitlement. This removes FSM routes while leaving CRM operational and FSM rows/queued client work intact. Do not drop FSM tables during rollback. Re-enable the same contract version to recover pending work, or export/purge it under an approved data-retention procedure.

## Environment variables

Existing `SUPABASE_URL` and service/API key settings are reused. External routing is optional; without it, set `routing_enabled=false`. The core visit workflow continues with explicit straight-line/manual routing labels.

