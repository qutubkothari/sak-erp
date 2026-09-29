import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countActiveIssues,
  friendlyIssueStatus,
  isRawIncidentStatus,
  isImportantIssueTransition,
  issueNotification,
  issueUpdateMessage,
  emptySupportIssueCounts,
  uniqueLatestStatusFeed,
} from "./support-issue-status.ts";

const issue = (id, status, friendly_status) => ({
  id,
  title: "PO Search not working",
  module: "Purchase Orders",
  status,
  friendly_status,
  created_at: "2026-09-29T10:00:00.000Z",
  updated_at: "2026-09-29T10:10:00.000Z",
});

test("active badge counts open issues and excludes resolved history", () => {
  assert.equal(countActiveIssues([issue("1", "NEW")]), 1);
  assert.equal(
    countActiveIssues([issue("1", "NEW"), issue("2", "TRIAGING")]),
    2,
  );
  assert.equal(countActiveIssues([issue("1", "RESOLVED")]), 0);
  assert.equal(countActiveIssues([{ ...issue("2", "ESCALATED"), archived_at: "2026-09-29T10:00:00Z" }]), 0);
});

test("lifecycle UI uses backend counts and keeps only the newest feed item per incident", () => {
  assert.deepEqual(emptySupportIssueCounts(), { ACTIVE: 0, RESOLVED: 0, ARCHIVED: 0 });
  const feed = uniqueLatestStatusFeed([
    { id: "incident-a", message: "Engineering review required" },
    { id: "incident-a:ESCALATED", message: "Earlier update" },
    { id: "incident-b", message: "Issue received" },
  ]);
  assert.deepEqual(feed.map((entry) => entry.id), ["incident-a", "incident-b"]);
});

test("known engineering states have user-friendly labels", () => {
  assert.equal(friendlyIssueStatus("Engineering review required"), "Engineering review required");
  assert.equal(friendlyIssueStatus("Issue received"), "Issue received");
  assert.equal(friendlyIssueStatus("A safe fix is being tested"), "A safe fix is being tested");
  assert.equal(friendlyIssueStatus("Fix tested and awaiting approval"), "Fix tested and awaiting approval");
  assert.equal(friendlyIssueStatus("Fixed"), "Fixed");
});

test("resolved state creates the fixed notification and Mizantra completion update", () => {
  const resolved = issue("1", "RESOLVED", "Fixed");
  assert.equal(isImportantIssueTransition("VERIFYING", "RESOLVED"), true);
  assert.match(
    issueNotification(resolved),
    /Your reported issue has been fixed.*PO Search not working.*Purchase Orders/,
  );
  assert.equal(
    issueUpdateMessage(resolved),
    "Your reported issue “PO Search not working” has been fixed.",
  );
});

test("important transitions surface automatically; routine changes stay quiet", () => {
  assert.equal(isRawIncidentStatus("ESCALATED"), true);
  assert.equal(isImportantIssueTransition("NEW", "TRIAGING"), true);
  assert.equal(
    isImportantIssueTransition("TESTING", "READY_FOR_APPROVAL"),
    true,
  );
  assert.equal(isImportantIssueTransition("PATCHING", "TESTING"), false);
  assert.equal(isImportantIssueTransition("TESTING", "Fix tested and awaiting approval"), false);
  assert.equal(isImportantIssueTransition("ESCALATED", "RESOLVED"), true);
  assert.equal(
    issueUpdateMessage(issue("1", "READY_FOR_APPROVAL", "Fix tested and awaiting approval")),
    "Update on your reported issue:\nPO Search not working — Fix tested and awaiting approval.",
  );
});
