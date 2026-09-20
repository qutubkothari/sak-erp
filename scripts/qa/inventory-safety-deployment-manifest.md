# Inventory negative-stock safety deployment

## Mandatory preflight

Run from the repository root:

```powershell
.\scripts\assert-environment-isolation.ps1
```

Exit code `0` is required. Exit code `2` means Mizantra/test and pmstest/live
resolve to the same PostgreSQL database; stop the deployment.

## Application files

- `apps/api/src/inventory/services/inventory.service.ts`
- `apps/api/src/production/services/job-order.service.ts`
- Built equivalents under `apps/api/dist`

## Database migration

- `migrations/prevent-negative-inventory-stock.sql`

The migration replaces `adjust_inventory_stock` with a row-locked implementation
that validates total unreserved stock before changing any row and distributes a
deduction across available location rows.

## Automated verification

```powershell
pnpm --filter @sak-erp/api exec jest --runInBand `
  src/inventory/services/inventory.service.spec.ts `
  src/production/services/job-order.inventory.spec.ts
pnpm --filter @sak-erp/api build
```

Expected result: two suites and eight tests pass; the API build exits successfully.

## Deployment sequence

1. Verify database isolation with the mandatory preflight.
2. Back up the Mizantra/test database function and affected application files.
3. Deploy the application files and migration to Mizantra/test only.
4. Restart `sak-api-test` on Mizantra.
5. Run a stock-changing Mizantra test covering:
   - a valid deduction split across two location rows;
   - an insufficient deduction rejected without changing either row;
   - a deduction with no stock rejected without inserting a negative row;
   - a normal positive receipt;
   - inventory and movement trail agreement.
6. Run `sales-service-consistency-audit.cjs` and
   `inventory-reconciliation-audit.cjs` on Mizantra.
7. Back up live, deploy the same verified files and migration, and restart
   `sak-api-test` on pmstest/live.
8. Run read-only health, consistency, and HTTP checks on live.

## Existing balances

Do not automatically overwrite the two historic negative item balances. Correct
them only through approved stock-adjustment documents after a physical count and
movement-ledger review.
