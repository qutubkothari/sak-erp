import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countActiveIssues,
  friendlyIssueStatus,
  isImportantIssueTransition,
  issueNotification,
  issueUpdateMessage,
} from "./support-issue-status.ts";

const issue = (id, status) => ({
  id,
  title: "PO Search not working",
  module: "Purchase Orders",
  status,
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
});

test("known engineering states have user-friendly labels", () => {
  assert.equal(friendlyIssueStatus("TRIAGING"), "Checking the problem");
  assert.equal(friendlyIssueStatus("TESTING"), "A safe fix is being tested");
  assert.equal(friendlyIssueStatus("ESCALATED"), "Engineering review required");
});

test("resolved state creates the fixed notification and Mizantra completion update", () => {
  const resolved = issue("1", "RESOLVED");
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
  assert.equal(isImportantIssueTransition("NEW", "TRIAGING"), true);
  assert.equal(
    isImportantIssueTransition("TESTING", "READY_FOR_APPROVAL"),
    true,
  );
  assert.equal(isImportantIssueTransition("PATCHING", "TESTING"), false);
  assert.equal(
    issueUpdateMessage(issue("1", "READY_FOR_APPROVAL")),
    "Update on your reported issue:\nPO Search not working — Fix tested and awaiting approval.",
  );
});
