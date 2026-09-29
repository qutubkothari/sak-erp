export type SupportIssue = {
  id: string;
  title: string;
  module?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
};

const terminalStatuses = new Set(["RESOLVED"]);

export function countActiveIssues(issues: SupportIssue[]) {
  return issues.filter((issue) => !terminalStatuses.has(issue.status)).length;
}

export function friendlyIssueStatus(status: string) {
  const labels: Record<string, string> = {
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
  return labels[status] || "Issue received";
}

export function isImportantIssueTransition(previous: string, current: string) {
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
  return `Update on your reported issue:\n${issue.title} — ${friendlyIssueStatus(issue.status)}.`;
}

export function issueNotification(issue: SupportIssue) {
  const title =
    issue.status === "RESOLVED"
      ? "Your reported issue has been fixed."
      : "Support issue update";
  return `${title} ${issue.title}${issue.module ? ` · ${issue.module}` : ""}`;
}
