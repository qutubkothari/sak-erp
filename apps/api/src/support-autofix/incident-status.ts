export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  NEW: "Issue received",
  TRIAGING: "Checking the problem",
  PATCHING: "Preparing a safe fix",
  TESTING: "A safe fix is being tested",
  READY_FOR_APPROVAL: "Fix tested and awaiting approval",
  DEPLOYING: "Applying the fix",
  VERIFYING: "Verifying the fix",
  RESOLVED: "Fixed",
  ESCALATED: "Engineering review required",
  FAILED: "Engineering is reviewing the issue",
  ROLLED_BACK:
    "The attempted change was safely reversed; engineering is reviewing it",
};

export function incidentStatusLabel(status: string) {
  return INCIDENT_STATUS_LABELS[status] || "Engineering review required";
}

export function isIncidentStatus(status: string) {
  return Object.prototype.hasOwnProperty.call(INCIDENT_STATUS_LABELS, status);
}
