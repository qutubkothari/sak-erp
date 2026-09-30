export type SupportIssue = {
  id: string;
  title: string;
  module?: string | null;
  status: string;
  friendly_status: string;
  created_at: string;
  updated_at?: string;
  archived_at?: string | null;
  occurrence_count?: number;
  request_type?: "BUG" | "IMPROVEMENT" | "FEATURE_REQUEST";
};

export function requestTypeLabel(type?: SupportIssue["request_type"]) {
  return type === "IMPROVEMENT" ? "Improvement" : type === "FEATURE_REQUEST" ? "Feature" : "Bug";
}

export type SupportLifecycle = "ACTIVE" | "RESOLVED" | "ARCHIVED";
export type SupportIssueCounts = Record<SupportLifecycle, number>;
export type SupportIssueList = { issues: SupportIssue[]; counts: SupportIssueCounts; lifecycle: SupportLifecycle };

const terminalStatuses = new Set(["RESOLVED"]);
const rawStatuses = new Set([
  "NEW",
  "TRIAGING",
  "PATCHING",
  "TESTING",
  "READY_FOR_APPROVAL",
  "DEPLOYING",
  "VERIFYING",
  "RESOLVED",
  "ESCALATED",
  "FAILED",
  "ROLLED_BACK",
]);

export function countActiveIssues(issues: SupportIssue[]) {
  return issues.filter((issue) => !issue.archived_at && !terminalStatuses.has(issue.status)).length;
}

export function emptySupportIssueCounts(): SupportIssueCounts {
  return { ACTIVE: 0, RESOLVED: 0, ARCHIVED: 0 };
}

export function uniqueLatestStatusFeed<T extends { id: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const incidentId = entry.id.split(":", 1)[0];
    if (seen.has(incidentId)) return false;
    seen.add(incidentId);
    return true;
  });
}

export function friendlyIssueStatus(friendlyStatus?: string) {
  return friendlyStatus || "Issue status update available";
}

export function isRawIncidentStatus(status: string) {
  return rawStatuses.has(status);
}

export function isImportantIssueTransition(previous: string, current: string) {
  if (!isRawIncidentStatus(previous) || !isRawIncidentStatus(current))
    return false;
  if (previous === current) return false;
  return (
    (previous === "NEW" && current === "TRIAGING") ||
    (previous === "TESTING" && current === "READY_FOR_APPROVAL") ||
    ["ESCALATED", "RESOLVED", "ROLLED_BACK", "FAILED"].includes(current)
  );
}

export function issueUpdateMessage(issue: SupportIssue) {
  if (issue.status === "RESOLVED")
    return `Your reported issue “${issue.title}” has been fixed.`;
  return `Update on your reported issue:\n${issue.title} — ${friendlyIssueStatus(issue.friendly_status)}.`;
}

export function issueNotification(issue: SupportIssue) {
  const title =
    issue.status === "RESOLVED"
      ? "Your reported issue has been fixed."
      : "Support issue update";
  return `${title} ${issue.title}${issue.module ? ` · ${issue.module}` : ""}`;
}
