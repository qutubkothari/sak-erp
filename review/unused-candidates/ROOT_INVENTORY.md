# Root cleanup inventory

The workspace root currently contains 601 tracked files. The largest groups are 244 SQL files, 122 JavaScript files, 115 Markdown files, 28 shell scripts, 27 PowerShell scripts, and 10 batch files. At least 372 root files use imperative names such as `fix-*`, `check-*`, `test-*`, `import-*`, `clear-*`, or `recover-*`.

## Runtime source of truth

- `apps/`, `packages/`, `services/`, and root workspace manifests are runtime/build inputs.
- `migrations/` is active migration history.
- `scripts/qa/` is the supported QA-harness location.
- `deploy/` and the selected current deployment scripts need runbook validation before any retirement.

## Candidates for later archival

1. Root-level one-off database probes, imports, repairs, and data-clearing scripts.
2. Root-level dated implementation summaries and duplicate deployment guides.
3. Legacy EC2/Hostinger scripts superseded by the current Mizantra deployment process.
4. Historical spreadsheets, exports, backup bundles, and test output.

## Do not move automatically

- SQL that might be required for a disaster recovery or a schema audit.
- Any script that can change a remote database, deployment, DNS, certificates, email, users, or stock.
- The tracked SSH private key. It requires rotation and revocation before removal.

This report intentionally distinguishes archival candidates from unused code: a missing static reference does not prove an operational script is safe to retire.
