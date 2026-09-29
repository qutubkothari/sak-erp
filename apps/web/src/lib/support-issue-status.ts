export type SupportIssue = {
  id: string;
  title: string;
  module?: string | null;
  status: string;
  friendly_status: string;
  created_at: string;
  updated_at?: string;
};

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
  return issues.filter((issue) => !terminalStatuses.has(issue.status)).length;
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
