import { incidentStatusLabel, isIncidentStatus } from "./incident-status";

describe("AutoHeal incident status contract", () => {
  it.each([
    ["NEW", "Issue received"],
    ["TRIAGING", "Checking the problem"],
    ["PATCHING", "Preparing a safe fix"],
    ["TESTING", "A safe fix is being tested"],
    ["READY_FOR_APPROVAL", "Fix tested and awaiting approval"],
    ["DEPLOYING", "Applying the fix"],
    ["VERIFYING", "Verifying the fix"],
    ["RESOLVED", "Fixed"],
    ["ESCALATED", "Engineering review required"],
    ["FAILED", "Engineering is reviewing the issue"],
    [
      "ROLLED_BACK",
      "The attempted change was safely reversed; engineering is reviewing it",
    ],
  ])("maps raw status %s to its friendly label", (status, label) => {
    expect(isIncidentStatus(status)).toBe(true);
    expect(incidentStatusLabel(status)).toBe(label);
  });
});
