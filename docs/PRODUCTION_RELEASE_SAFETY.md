# Production release safety

Production must never be changed directly from an uncommitted working tree.

## Mandatory release sequence

1. Commit the intended source and create a reviewed, immutable release tag.
2. Run **Production pre-deploy backup** with the reason for the change.
3. Confirm that the workflow published both the live artifact and its SHA-256 file in a GitHub Release.
4. Deploy only the reviewed tag; never deploy the contents of a dirty workstation or server checkout.
5. Run login, dashboard, critical-route, API-health, and tenant-isolation smoke tests.
6. If any smoke test fails, restore the pre-deploy GitHub artifact and restart the two PM2 services.
7. Record the deployed tag, backup release, operator, timestamp, and smoke-test result in the change record.

## Required GitHub configuration

Create a protected GitHub Environment named `production` with required reviewers and these secrets:

- `PROD_SSH_HOST`
- `PROD_SSH_USER`
- `PROD_SSH_PRIVATE_KEY`

Restrict the environment to the approved production branch. Protect that branch from force pushes and direct unreviewed changes.

## What the backup contains

The workflow captures the exact compiled web and API artifacts that production is running, plus the package metadata needed to identify the deployment. It deliberately excludes environment files, credentials, uploaded documents, logs, caches, and databases.

Database backups must remain an independent encrypted process with retention and restore testing. A deployment artifact is not a database backup.

## Rollback record created on 2026-08-25

The restored live artifact is stored in GitHub Release `production-live-restored-20260825` with SHA-256:

`510fa6eaf48e4124d59ecbf111f8c2da8c277ce1435cfc7f7513f581bc2157d7`

That release asset -- not its reference commit -- is the authoritative snapshot because the superseded deployment was not produced from a traceable clean tag.
