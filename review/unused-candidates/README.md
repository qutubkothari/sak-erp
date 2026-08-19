# Review candidates (quarantined, not deleted)

This folder is a holding area for files that are safe to remove from their former working locations only after review.

## Moved automatically

`generated-qa/` contains untracked browser QA screenshots and the untracked web-build error log. They are retained here for audit and have not been deleted.
It also contains the ignored `qa-results` output folder (39 generated test reports), moved out of the workspace root intact.

`deploy-archives/` contains ignored root-level deployment bundles and transient build/test logs. These are historical artifacts, not application runtime inputs. They remain available here for review and rollback investigation.

`legacy-outputs/` contains four root-level, tracked generated test/import output files with no static references. They were moved rather than deleted so their content remains recoverable.

## Scripts and code

No executable code or operational script has been moved yet. Static reference searches cannot prove a script is unused: many deployment, migration, recovery, and QA scripts are intentionally run manually or by external operators. Each script needs an owner and a confirmed replacement or retirement decision before it is quarantined.

In particular, do not move or delete scripts that target production, test environments, migration history, backups, restores, or certificate/email setup until their runbook references have been checked.

## Security follow-up

The tracked file `saif-erp.pem` is an SSH private key. It is not a cleanup candidate: it must be rotated and revoked outside the repository before it can be safely removed from version control and historical commits. Treat it as exposed until that rotation is complete.
